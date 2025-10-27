import { GoogleGenAI } from "@google/genai";
import * as cheerio from "cheerio";
import { Recipe, RecipeDetail, IntentDetectionResponse } from "@/types/recipe";

// Initialize Gemini AI
const genAI = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "",
});

const MODEL_NAME = process.env.GEMINI_MODEL || "gemini-2.0-flash-lite";

// Whitelisted recipe sites
const WHITELISTED_SITES = [
  "allrecipes.com",
  "foodnetwork.com",
  "simplyrecipes.com",
  "delish.com",
  "bonappetit.com",
  "epicurious.com",
  "seriouseats.com",
  "tasteofhome.com",
];

// URL patterns to exclude (category/collection pages)
const EXCLUDED_URL_PATTERNS = [
  /\/best-[^/]+$/i,           // e.g., /best-pasta-recipes-8737255
  /\/gallery\//i,             // Gallery pages
  /\/recipes\/?$/i,           // Category landing pages ending in /recipes or /recipes/
  /\/collection/i,            // Collection pages
  /\/category\//i,            // Category pages
  /\/guide\//i,               // Guide pages
  /-\d{7,}$/i,                // IDs at end like -8737255 (often collections)
];

/**
 * Check if URL is a category/collection page (not an individual recipe)
 */
function isCollectionUrl(url: string): boolean {
  return EXCLUDED_URL_PATTERNS.some(pattern => pattern.test(url));
}

/**
 * Detect if user message is a recipe search intent
 */
export async function detectRecipeIntent(
  userMessage: string
): Promise<IntentDetectionResponse> {
  try {
    const prompt = `Analyze this user message and determine if they are searching for a recipe or asking for recipe recommendations.

User message: "${userMessage}"

Respond with ONLY valid JSON in this exact format (no markdown, no code blocks):
{
  "isRecipeSearch": boolean,
  "searchQuery": string or null
}

Examples:
- "chocolate chip cookies" -> {"isRecipeSearch": true, "searchQuery": "chocolate chip cookies"}
- "how long to cook chicken?" -> {"isRecipeSearch": false, "searchQuery": null}
- "find me a pasta recipe" -> {"isRecipeSearch": true, "searchQuery": "pasta"}
- "show me some cake recipes" -> {"isRecipeSearch": true, "searchQuery": "cake"}
- "what's a good dinner idea?" -> {"isRecipeSearch": true, "searchQuery": "dinner"}`;

    const result = await genAI.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
    });
    const response = result.text || "";
    
    // Clean up response - remove markdown code blocks if present
    const cleanResponse = response
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();
    
    const parsed = JSON.parse(cleanResponse);
    return parsed as IntentDetectionResponse;
  } catch (error) {
    console.error("Error detecting recipe intent:", error);
    return { isRecipeSearch: false, searchQuery: null };
  }
}

/**
 * Extract time string from text (e.g., "30 minutes", "1 hour 15 mins")
 */
function extractTime(text: string): string | null {
  if (!text) return null;
  
  // Look for patterns like "30 minutes", "1 hour", "1h 30m", etc.
  const timeMatch = text.match(/(\d+)\s*(hour|hr|h|minute|min|m)/i);
  if (timeMatch) {
    return text.trim();
  }
  
  return null;
}

/**
 * Extract servings from text (e.g., "4 servings", "Serves 6")
 */
function extractServings(text: string): string | null {
  if (!text) return null;
  
  const servingsMatch = text.match(/(\d+)\s*(serving|serve)/i);
  if (servingsMatch) {
    return `${servingsMatch[1]} servings`;
  }
  
  return null;
}

/**
 * Extract recipe data from JSON-LD schema
 */
function extractFromJsonLd($: cheerio.CheerioAPI): { 
  ingredients: string[], 
  instructions: string[], 
  nutrition: any 
} | null {
  let result = null;
  
  $('script[type="application/ld+json"]').each((_, el) => {
    const content = $(el).html();
    if (!content) return;
    
    try {
      const parsed = JSON.parse(content);
      let recipeData = null;
      
      // Check if it's an array or single object
      if (Array.isArray(parsed)) {
        recipeData = parsed.find(item => item['@type'] === 'Recipe');
      } else if (parsed['@type'] === 'Recipe') {
        recipeData = parsed;
      }
      
      if (!recipeData) return;
      
      // Extract ingredients
      const ingredients: string[] = [];
      if (Array.isArray(recipeData.recipeIngredient)) {
        recipeData.recipeIngredient.forEach((ing: string) => {
          if (ing && ing.trim()) ingredients.push(ing.trim());
        });
      }
      
      // Extract instructions
      const instructions: string[] = [];
      if (Array.isArray(recipeData.recipeInstructions)) {
        recipeData.recipeInstructions.forEach((inst: any) => {
          if (typeof inst === 'string') {
            instructions.push(inst);
          } else if (inst['@type'] === 'HowToStep' && inst.text) {
            instructions.push(inst.text);
          } else if (inst.text) {
            instructions.push(inst.text);
          }
        });
      }
      
      // Extract nutrition
      let nutrition = null;
      if (recipeData.nutrition) {
        nutrition = {
          calories: recipeData.nutrition.calories || undefined,
          protein: recipeData.nutrition.proteinContent || undefined,
          carbs: recipeData.nutrition.carbohydrateContent || undefined,
          fat: recipeData.nutrition.fatContent || undefined,
        };
      }
      
      if (ingredients.length > 0 || instructions.length > 0) {
        result = { ingredients, instructions, nutrition };
      }
    } catch (e) {
      // Skip non-JSON or invalid JSON
    }
  });
  
  return result;
}

/**
 * Scrape recipe data from a URL using only cheerio (NO AI calls)
 */
async function scrapeRecipe(url: string): Promise<Recipe | null> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
    });
    
    if (!response.ok) {
      console.warn(`Failed to fetch ${url}: ${response.status}`);
      return null;
    }
    
    const html = await response.text();
    const $ = cheerio.load(html);
    
    // Extract title from multiple possible locations
    const title = 
      $('h1').first().text().trim() ||
      $('meta[property="og:title"]').attr('content') ||
      $('title').first().text().split('|')[0].trim() ||
      '';
    
    // Extract description
    const description = 
      $('meta[name="description"]').attr('content') ||
      $('meta[property="og:description"]').attr('content') ||
      $('p').first().text().trim().substring(0, 200) ||
      '';
    
    // Extract image URL
    let imageUrl = 
      $('meta[property="og:image"]').attr('content') ||
      $('img[src*="recipe"]').first().attr('src') ||
      $('img').first().attr('src') ||
      '';
    
    // Ensure image URL is absolute
    if (imageUrl && !imageUrl.startsWith('http')) {
      imageUrl = imageUrl.startsWith('//') ? `https:${imageUrl}` : `https://${new URL(url).hostname}${imageUrl}`;
    }
    
    // Validate required fields
    if (!title || !imageUrl) {
      console.warn(`Missing required fields for ${url}: title=${!!title}, image=${!!imageUrl}`);
      return null;
    }
    
    // Extract prep time (look in common locations)
    let prepTime: string | null = null;
    const prepTimeEl = $('[itemprop="prepTime"], .prep-time, .prepTime, .recipe-meta-item-header:contains("Prep")').first();
    if (prepTimeEl.length > 0) {
      prepTime = extractTime(prepTimeEl.text()) || extractTime(prepTimeEl.next().text());
    }
    
    // Extract cook time
    let cookTime: string | null = null;
    const cookTimeEl = $('[itemprop="cookTime"], .cook-time, .cookTime, .recipe-meta-item-header:contains("Cook")').first();
    if (cookTimeEl.length > 0) {
      cookTime = extractTime(cookTimeEl.text()) || extractTime(cookTimeEl.next().text());
    }
    
    // Extract servings
    let servings: string | null = null;
    const servingsEl = $('[itemprop="recipeYield"], .servings, .yield, .recipe-meta-item-header:contains("Servings")').first();
    if (servingsEl.length > 0) {
      servings = extractServings(servingsEl.text()) || extractServings(servingsEl.next().text());
    }
    
    // Determine difficulty based on cook time and ingredient count
    let difficulty: "Easy" | "Medium" | "Hard" | null = null;
    const totalTimeText = (prepTime || '') + ' ' + (cookTime || '');
    const totalMinutes = parseInt(totalTimeText.match(/(\d+)/)?.[0] || '0');
    
    if (totalMinutes > 0) {
      if (totalMinutes <= 30) difficulty = "Easy";
      else if (totalMinutes <= 60) difficulty = "Medium";
      else difficulty = "Hard";
    }
    
    // Get source name from URL
    const sourceName = new URL(url).hostname.replace('www.', '').split('.')[0];
    
    return {
      id: Buffer.from(url).toString('base64'),
      title: title.substring(0, 100), // Limit title length
      description: description.substring(0, 200),
      imageUrl,
      prepTime,
      cookTime,
      servings,
      difficulty,
      sourceUrl: url,
      sourceName: sourceName.charAt(0).toUpperCase() + sourceName.slice(1),
    };
  } catch (error) {
    console.error(`Error scraping recipe from ${url}:`, error);
    return null;
  }
}

/**
 * Follow a grounding redirect URL to get the actual destination URL
 */
async function resolveGroundingUrl(groundingUrl: string): Promise<string | null> {
  try {
    const response = await fetch(groundingUrl, {
      method: 'HEAD',
      redirect: 'manual', // Don't auto-follow redirects
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
    });
    
    // Get the Location header which contains the actual URL
    const actualUrl = response.headers.get('location');
    return actualUrl;
  } catch (error) {
    console.error(`Error resolving grounding URL ${groundingUrl}:`, error);
    return null;
  }
}

/**
 * Search for recipes based on query using Google Search Grounding
 */
export async function searchRecipes(query: string): Promise<Recipe[]> {
  try {
    console.log(`Searching recipes with Google Search Grounding for: ${query}`);
    
    // Use Gemini with Google Search grounding to find recipe URLs
    const response = await genAI.models.generateContent({
      model: MODEL_NAME,
      contents: `Find ${query} recipes from these cooking websites: allrecipes.com, foodnetwork.com, simplyrecipes.com, delish.com, bonappetit.com, epicurious.com, seriouseats.com, tasteofhome.com`,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });
    
    console.log('Gemini response received');
    
    // Extract URLs from grounding metadata
    const groundingData = response.candidates?.[0]?.groundingMetadata;
    
    if (!groundingData || !groundingData.groundingChunks) {
      console.warn('No grounding metadata found');
      return [];
    }
    
    console.log(`Found ${groundingData.groundingChunks.length} grounding chunks`);
    
    // Extract grounding redirect URLs from chunks
    const groundingUrls = groundingData.groundingChunks
      .filter(chunk => chunk.web?.uri)
      .map(chunk => chunk.web!.uri!)
      .filter((url): url is string => !!url);
    
    console.log(`Extracted ${groundingUrls.length} grounding URLs`);
    
    if (groundingUrls.length === 0) {
      console.warn('No grounding URLs found in chunks');
      return [];
    }
    
    // Resolve redirect URLs to get actual recipe URLs
    console.log('Resolving grounding redirect URLs...');
    const resolvePromises = groundingUrls.map(url => 
      Promise.race([
        resolveGroundingUrl(url),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000))
      ])
    );
    
    const resolvedUrls = await Promise.all(resolvePromises);
    const actualUrls = resolvedUrls.filter((url): url is string => url !== null);
    
    console.log(`Resolved ${actualUrls.length} actual URLs`);
    
    // Filter by whitelisted domains AND exclude collection pages
    const recipeUrls = actualUrls
      .filter(url => {
        const isWhitelisted = WHITELISTED_SITES.some(site => url.includes(site));
        const isNotCollection = !isCollectionUrl(url);
        
        if (isWhitelisted && !isNotCollection) {
          console.log(`Filtered out collection URL: ${url}`);
        }
        
        return isWhitelisted && isNotCollection;
      })
      .slice(0, 10);
    
    console.log(`Filtered to ${recipeUrls.length} individual recipe URLs from whitelisted sites`);
    
    if (recipeUrls.length === 0) {
      console.warn('No individual recipe URLs found. All resolved URLs:', actualUrls.slice(0, 5));
      return [];
    }
    
    // Scrape recipes with timeout protection (NO AI calls here!)
    console.log('Scraping recipes with cheerio (no AI calls)...');
    const recipePromises = recipeUrls.map(url => 
      Promise.race([
        scrapeRecipe(url),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 10000))
      ])
    );
    
    const recipes = await Promise.all(recipePromises);
    
    // Filter out null results
    const validRecipes = recipes.filter((r): r is Recipe => r !== null);
    
    console.log(`Successfully scraped ${validRecipes.length} recipes (cheerio-only, no AI)`);
    
    return validRecipes;
  } catch (error) {
    console.error("Error searching recipes with Google Search Grounding:", error);
    return [];
  }
}

/**
 * Get detailed recipe information
 */
export async function getRecipeDetail(recipeId: string): Promise<RecipeDetail | null> {
  try {
    // Decode URL from ID
    const url = Buffer.from(recipeId, 'base64').toString('utf-8');
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
    });
    
    if (!response.ok) return null;
    
    const html = await response.text();
    const $ = cheerio.load(html);
    
    // PRIORITY 1: Try to extract from JSON-LD (most reliable)
    console.log('Attempting to extract recipe from JSON-LD...');
    const jsonLdData = extractFromJsonLd($);
    
    let ingredients: string[] = [];
    let instructions: string[] = [];
    let nutrition: any = null;
    
    if (jsonLdData) {
      console.log(`JSON-LD extraction successful: ${jsonLdData.ingredients.length} ingredients, ${jsonLdData.instructions.length} instructions`);
      ingredients = jsonLdData.ingredients;
      instructions = jsonLdData.instructions;
      nutrition = jsonLdData.nutrition;
    } else {
      console.log('JSON-LD extraction failed, falling back to HTML selectors...');
      
      // FALLBACK 1: Schema.org markup in HTML
      $('[itemprop="recipeIngredient"]').each((_, el) => {
        const text = $(el).text().trim();
        if (text && text.length > 0) ingredients.push(text);
      });
      
      $('[itemprop="recipeInstructions"] li, [itemprop="step"]').each((_, el) => {
        const text = $(el).text().trim();
        if (text && text.length > 0) instructions.push(text);
      });
      
      // FALLBACK 2: Common class names
      if (ingredients.length === 0) {
        $('li[class*="ingredient"], .ingredients li, .ingredient-list li').each((_, el) => {
          const text = $(el).text().trim();
          if (text && text.length > 0) ingredients.push(text);
        });
      }
      
      if (instructions.length === 0) {
        $('li[class*="instruction"], .instructions li, ol[class*="instructions"] li, .preparation-step').each((_, el) => {
          const text = $(el).text().trim();
          if (text && text.length > 0) instructions.push(text);
        });
      }
      
      // Extract nutrition info from HTML
      const caloriesEl = $('[itemprop="calories"], .calories, .nutrition-calories').first();
      const proteinEl = $('[itemprop="proteinContent"], .protein').first();
      const carbsEl = $('[itemprop="carbohydrateContent"], .carbs, .carbohydrates').first();
      const fatEl = $('[itemprop="fatContent"], .fat').first();
      
      if (caloriesEl.length > 0 || proteinEl.length > 0 || carbsEl.length > 0 || fatEl.length > 0) {
        nutrition = {
          calories: caloriesEl.text().trim() || undefined,
          protein: proteinEl.text().trim() || undefined,
          carbs: carbsEl.text().trim() || undefined,
          fat: fatEl.text().trim() || undefined,
        };
      }
    }
    
    // Get basic recipe info (using cheerio-only scraping)
    const basicRecipe = await scrapeRecipe(url);
    if (!basicRecipe) return null;
    
    return {
      ...basicRecipe,
      ingredients: ingredients.length > 0 ? ingredients : ['Ingredients not available'],
      instructions: instructions.length > 0 ? instructions : ['Instructions not available'],
      nutrition,
    };
  } catch (error) {
    console.error("Error getting recipe detail:", error);
    return null;
  }
}
