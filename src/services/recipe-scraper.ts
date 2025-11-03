import * as cheerio from "cheerio";
import { Recipe, RecipeDetail, UserPreferences } from "@/types/recipe";
import { extractTime, extractServings } from "@/utils/html-parser";
import { extractFromJsonLd, extractStepImages, extractFromHtml } from "@/utils/recipe-extractor";
import { WHITELISTED_SITES, isCollectionUrl } from "@/constants/recipe-sites";
import { getGenAI, getModelName } from "./ai";

/**
 * Scrape recipe data from a URL using only cheerio (NO AI calls)
 */
export async function scrapeRecipe(url: string): Promise<Recipe | null> {
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
export async function searchRecipes(query: string, preferences?: UserPreferences): Promise<Recipe[]> {
  try {
    console.log(`Searching recipes with Google Search Grounding for: ${query}`);

    // Build context-aware search query
    let searchQuery = `Find ${query} recipes`;

    // Add dietary restrictions
    if (preferences?.dietaryRestrictions?.length) {
      searchQuery += ` that are ${preferences.dietaryRestrictions.join(", ")}`;
    }

    // Add allergy considerations
    if (preferences?.allergies?.length) {
      searchQuery += ` without ${preferences.allergies.join(", ")}`;
    }

    // Add preferred cuisines
    if (preferences?.preferredCuisines?.length) {
      searchQuery += ` (prefer ${preferences.preferredCuisines.join(", ")} cuisine)`;
    }

    // Add location context for regional ingredients
    if (preferences?.location?.country) {
      searchQuery += ` suitable for ${preferences.location.country}`;
      if (preferences.location.region) {
        searchQuery += ` (${preferences.location.region})`;
      }
    }

    // Add difficulty preference
    if (preferences?.difficultyPreference && preferences.difficultyPreference !== "any") {
      searchQuery += ` ${preferences.difficultyPreference} difficulty`;
    }

    // Add time constraints
    if (preferences?.maxPrepTime || preferences?.maxCookTime) {
      const timeConstraints = [];
      if (preferences.maxPrepTime) {
        timeConstraints.push(`prep time under ${preferences.maxPrepTime} minutes`);
      }
      if (preferences.maxCookTime) {
        timeConstraints.push(`cook time under ${preferences.maxCookTime} minutes`);
      }
      searchQuery += ` with ${timeConstraints.join(" and ")}`;
    }

    searchQuery += ` from these cooking websites: allrecipes.com, foodnetwork.com, simplyrecipes.com, delish.com, bonappetit.com, epicurious.com, seriouseats.com, tasteofhome.com`;

    console.log(`Enhanced search query: ${searchQuery}`);

    const genAI = getGenAI();
    const MODEL_NAME = getModelName();

    // Use Gemini with Google Search grounding to find recipe URLs
    const response = await genAI.models.generateContent({
      model: MODEL_NAME,
      contents: [{ role: "user", parts: [{ text: searchQuery }] }],
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
      const htmlData = extractFromHtml($);
      ingredients = htmlData.ingredients;
      instructions = htmlData.instructions;
      nutrition = htmlData.nutrition;
    }
    
    // Extract step images (site-specific DOM scraping)
    console.log('Extracting step images from DOM...');
    const steps = extractStepImages($, url, instructions);
    console.log(`Extracted ${steps.length} steps, ${steps.filter(s => s.imageUrl).length} with images`);
    
    // Get basic recipe info (using cheerio-only scraping)
    const basicRecipe = await scrapeRecipe(url);
    if (!basicRecipe) return null;
    
    return {
      ...basicRecipe,
      ingredients: ingredients.length > 0 ? ingredients : ['Unable to extract ingredients from this page. This may be a collection page or the page structure is not supported.'],
      instructions: instructions.length > 0 ? instructions : ['Unable to extract instructions from this page. This may be a collection page or the page structure is not supported.'],
      steps: steps.length > 0 ? steps : undefined,
      nutrition,
    };
  } catch (error) {
    console.error("Error getting recipe detail:", error);
    return null;
  }
}
