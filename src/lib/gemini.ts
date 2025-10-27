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

/**
 * Check if URL is a collection/category page (not an individual recipe)
 * 
 * IMPROVED LOGIC:
 * - Allows individual recipes with numeric IDs (e.g., recipe-11815611)
 * - Filters collections like "best-pasta-recipes-8737255"
 * - Key difference: Collections end in -recipes-<ID> (plural), recipes end in -recipe-<ID> (singular)
 */
function isCollectionUrl(url: string): boolean {
  // Pattern 1: Category landing pages ending in /recipes or /recipes/
  if (/\/recipes\/?$/i.test(url)) {
    return true;
  }
  
  // Pattern 2: Gallery pages with /g followed by digits (e.g., /g1456/)
  if (/\/g\d+\//i.test(url)) {
    return true;
  }
  
  // Pattern 3: Explicit gallery/collection/category/guide pages
  if (/\/(gallery|collection|category|guide)\//i.test(url)) {
    return true;
  }
  
  // Pattern 4: URLs ending with -recipes-<numbers> (plural without -recipe- before ID)
  // Example: best-pasta-recipes-8737255 (collection) vs pasta-bake-recipe-11815611 (recipe)
  if (/-recipes-\d+$/i.test(url)) {
    return true;
  }
  
  // Pattern 5: URLs with /best- AND ending in /recipes/ (e.g., /best-chocolate-recipes/)
  if (/\/best-[^/]+-recipes\/?$/i.test(url)) {
    return true;
  }
  
  // Pattern 6: Recipe index/listing pages (recipes-a-z, all-recipes, etc.)
  if (/\/recipes-[a-z]|\/all-recipes/i.test(url)) {
    return true;
  }
  
  return false;
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
      
      // Extract ingredients with deduplication
      const ingredients: string[] = [];
      const seenIngredients = new Set<string>();

      if (Array.isArray(recipeData.recipeIngredient)) {
        recipeData.recipeIngredient.forEach((ing: string) => {
          const cleaned = ing?.trim();
          if (cleaned && !seenIngredients.has(cleaned.toLowerCase())) {
            ingredients.push(cleaned);
            seenIngredients.add(cleaned.toLowerCase());
          }
        });
      }
      
      // Extract instructions (handles ItemList, HowToSection, HowToStep, and plain strings)
      const instructions: string[] = [];
      if (Array.isArray(recipeData.recipeInstructions)) {
        recipeData.recipeInstructions.forEach((inst: any) => {
          // Handle HowToSection (multi-part recipes like "For the sauce:", "For assembly:")
          if (inst['@type'] === 'HowToSection') {
            // Add section name as a header
            if (inst.name) {
              instructions.push(`\n**${inst.name}**`);
            }
            // Process steps within section
            if (Array.isArray(inst.itemListElement)) {
              inst.itemListElement.forEach((step: any) => {
                if (step['@type'] === 'HowToStep' && step.text) {
                  const cleaned = step.text.trim().replace(/^Step\s+\d+:\s*/i, '').trim();
                  if (cleaned) instructions.push(cleaned);
                }
              });
            }
          }
          // Handle plain string
          else if (typeof inst === 'string') {
            const cleaned = inst.trim().replace(/^Step\s+\d+:\s*/i, '').trim();
            if (cleaned) instructions.push(cleaned);
          }
          // Handle HowToStep object
          else if (inst['@type'] === 'HowToStep' && inst.text) {
            const cleaned = inst.text.trim().replace(/^Step\s+\d+:\s*/i, '').trim();
            if (cleaned) instructions.push(cleaned);
          }
          // Handle ItemList of HowToStep objects (CRITICAL - Bon Appétit, Epicurious, Serious Eats)
          else if (inst['@type'] === 'ItemList' && Array.isArray(inst.itemListElement)) {
            inst.itemListElement.forEach((step: any) => {
              if (step['@type'] === 'HowToStep' && step.text) {
                const cleaned = step.text.trim().replace(/^Step\s+\d+:\s*/i, '').trim();
                if (cleaned) instructions.push(cleaned);
              } else if (typeof step === 'string') {
                const cleaned = step.trim().replace(/^Step\s+\d+:\s*/i, '').trim();
                if (cleaned) instructions.push(cleaned);
              }
            });
          }
          // Fallback: any object with .text property
          else if (inst.text) {
            const cleaned = inst.text.trim().replace(/^Step\s+\d+:\s*/i, '').trim();
            if (cleaned) instructions.push(cleaned);
          }
        });
      } else if (typeof recipeData.recipeInstructions === 'string') {
        // Handle single string instruction (rare but possible)
        const cleaned = recipeData.recipeInstructions.trim().replace(/^Step\s+\d+:\s*/i, '').trim();
        if (cleaned) instructions.push(cleaned);
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
      // Log parsing failures for debugging
      console.warn('Failed to parse JSON-LD schema:', e);
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
    let prepTime: string | undefined = undefined;
    const prepTimeEl = $('[itemprop="prepTime"], .prep-time, .prepTime, .recipe-meta-item-header:contains("Prep")').first();
    if (prepTimeEl.length > 0) {
      prepTime = extractTime(prepTimeEl.text()) || extractTime(prepTimeEl.next().text()) || undefined;
    }
    
    // Extract cook time
    let cookTime: string | undefined = undefined;
    const cookTimeEl = $('[itemprop="cookTime"], .cook-time, .cookTime, .recipe-meta-item-header:contains("Cook")').first();
    if (cookTimeEl.length > 0) {
      cookTime = extractTime(cookTimeEl.text()) || extractTime(cookTimeEl.next().text()) || undefined;
    }
    
    // Extract servings
    let servings: string | undefined = undefined;
    const servingsEl = $('[itemprop="recipeYield"], .servings, .yield, .recipe-meta-item-header:contains("Servings")').first();
    if (servingsEl.length > 0) {
      servings = extractServings(servingsEl.text()) || extractServings(servingsEl.next().text()) || undefined;
    }
    
    // Determine difficulty based on cook time and ingredient count
    let difficulty: "Easy" | "Medium" | "Hard" | undefined = undefined;
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
      console.warn('No individual recipe URLs found. Sample resolved URLs:', actualUrls.slice(0, 5));
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
      
      // FALLBACK 1: Heading-based extraction (most reliable after JSON-LD)
      // All 8 sites use semantic headings: "Ingredients" + "Directions/Preparation/Method"
      if (ingredients.length === 0) {
        $('h1, h2, h3, h4, h5, h6').each((_, el) => {
          const headingText = $(el).text().trim().toLowerCase();
          if (headingText === 'ingredients' || headingText.startsWith('ingredients')) {
            // Get the next UL or list container
            let nextEl = $(el).next();
            let attempts = 0;
            while (nextEl.length > 0 && attempts < 5) {
              const tagName = nextEl.prop('tagName')?.toLowerCase();
              if (tagName === 'ul' || tagName === 'div') {
                nextEl.find('li').each((_, li) => {
                  // Filter out buttons, checkboxes, UI controls (e.g., Allrecipes scaling)
                  const hasControl = $(li).find('button, input[type="checkbox"], input[type="radio"]').length > 0;
                  if (!hasControl) {
                    const text = $(li).text().trim();
                    if (text && text.length > 0 && !ingredients.includes(text)) {
                      ingredients.push(text);
                    }
                  }
                });
                break;
              }
              if (tagName === 'h1' || tagName === 'h2' || tagName === 'h3' || tagName === 'h4' || tagName === 'h5' || tagName === 'h6') {
                // Hit another heading, stop
                break;
              }
              nextEl = nextEl.next();
              attempts++;
            }
            return false; // Break outer loop
          }
        });
      }

      if (instructions.length === 0) {
        // Find "Directions", "Preparation", "Method", or "Instructions" heading
        $('h1, h2, h3, h4, h5, h6').each((_, el) => {
          const headingText = $(el).text().trim().toLowerCase();
          const isInstructionHeading = 
            headingText === 'directions' || 
            headingText === 'preparation' || 
            headingText === 'method' || 
            headingText === 'instructions' ||
            headingText.startsWith('directions') ||
            headingText.startsWith('preparation') ||
            headingText.startsWith('method') ||
            headingText.startsWith('instructions');
          
          if (isInstructionHeading) {
            // Get the next OL, UL, or DIV container
            let nextEl = $(el).next();
            let attempts = 0;
            while (nextEl.length > 0 && attempts < 5) {
              const tagName = nextEl.prop('tagName')?.toLowerCase();
              if (tagName === 'ol' || tagName === 'ul' || tagName === 'div') {
                nextEl.find('li, p').each((_, item) => {
                  const text = $(item).text().trim();
                  if (text && text.length > 0 && !instructions.includes(text)) {
                    // Clean up "Step N:" prefixes
                    const cleaned = text.replace(/^Step\s+\d+:\s*/i, '').trim();
                    if (cleaned) {
                      instructions.push(cleaned);
                    }
                  }
                });
                break;
              }
              if (tagName === 'h1' || tagName === 'h2' || tagName === 'h3' || tagName === 'h4' || tagName === 'h5' || tagName === 'h6') {
                // Hit another major heading, stop
                break;
              }
              nextEl = nextEl.next();
              attempts++;
            }
            return false; // Break outer loop
          }
        });
      }
      
      // FALLBACK 2: Schema.org markup in HTML
      $('[itemprop="recipeIngredient"]').each((_, el) => {
        const text = $(el).text().trim();
        if (text && text.length > 0) ingredients.push(text);
      });
      
      $('[itemprop="recipeInstructions"] li, [itemprop="recipeInstructions"] p, [itemprop="step"]').each((_, el) => {
        const text = $(el).text().trim();
        if (text && text.length > 0 && !instructions.includes(text)) {
          instructions.push(text);
        }
      });
      
      // FALLBACK 3: Common class names and nested elements
      if (ingredients.length === 0) {
        // Try common ingredient selectors
        $('li[class*="ingredient"], .ingredients li, .ingredient-list li').each((_, el) => {
          // Skip if it contains buttons or inputs (UI controls like Allrecipes scaling)
          if ($(el).find('button, input').length > 0) return;
          
          const text = $(el).text().trim();
          if (text && text.length > 0 && !ingredients.includes(text)) {
            ingredients.push(text);
          }
        });
        
        // If still empty, try nested p tags in ingredient lists
        if (ingredients.length === 0) {
          $('.ingredients li p, ul[class*="ingredient"] li p').each((_, el) => {
            const text = $(el).text().trim();
            if (text && text.length > 0) ingredients.push(text);
          });
        }
      }
      
      if (instructions.length === 0) {
        // Try common instruction selectors
        $(
          'li[class*="instruction"], .instructions li, .directions li, .method li, ' +
          'ol[class*="instructions"] li, ol[class*="directions"] li, .preparation-step'
        ).each((_, el) => {
          const text = $(el).text().trim();
          if (text && text.length > 0 && !instructions.includes(text)) {
            instructions.push(text);
          }
        });
        
        // If still empty, try nested p tags in ordered/unordered lists
        // This handles AllRecipes and similar sites that nest <p> inside <li>
        if (instructions.length === 0) {
          $('ol li p, .directions li p, .instructions li p, .method li p, .steps li p, [class*="recipe-steps"] li p').each((_, el) => {
            const text = $(el).text().trim();
            if (text && text.length > 0 && !instructions.includes(text)) {
              instructions.push(text);
            }
          });
        }
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
      ingredients: ingredients.length > 0 ? ingredients : ['Unable to extract ingredients from this page. This may be a collection page or the page structure is not supported.'],
      instructions: instructions.length > 0 ? instructions : ['Unable to extract instructions from this page. This may be a collection page or the page structure is not supported.'],
      nutrition,
    };
  } catch (error) {
    console.error("Error getting recipe detail:", error);
    return null;
  }
}
