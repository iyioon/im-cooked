import * as cheerio from "cheerio";
import { Recipe, RecipeDetail, UserPreferences } from "@/types/recipe";
import { extractTime, extractServings } from "@/utils/html-parser";
import { extractFromJsonLd, extractStepImages, extractFromHtml } from "@/utils/recipe-extractor";

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
 * Scrape recipe URLs from AllRecipes.com search results
 */
async function scrapeAllRecipesSearch(
  query: string, 
  maxResults: number = 10
): Promise<string[]> {
  try {
    const allRecipeUrls: string[] = [];
    const resultsPerPage = 24;
    const pagesToFetch = Math.ceil(maxResults / resultsPerPage);
    
    for (let page = 0; page < pagesToFetch; page++) {
      const offset = page * resultsPerPage;
      const searchUrl = `https://www.allrecipes.com/search?q=${encodeURIComponent(query)}&offset=${offset}`;
      
      console.log(`Fetching AllRecipes search page ${page + 1} (offset: ${offset})...`);
      
      const response = await fetch(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });
      
      if (!response.ok) {
        console.warn(`Failed to fetch AllRecipes search page: ${response.status}`);
        break;
      }
      
      const html = await response.text();
      const $ = cheerio.load(html);
      
      // Select recipe cards and extract URLs
      const recipeCards = $('a.mntl-card-list-card--extendable');
      
      if (recipeCards.length === 0) {
        console.log('No more recipe cards found, stopping pagination');
        break;
      }
      
      recipeCards.each((_, element) => {
        const href = $(element).attr('href');
        if (href) {
          allRecipeUrls.push(href);
        }
      });
      
      console.log(`Found ${recipeCards.length} recipes on page ${page + 1}`);
      
      // If we've collected enough results, stop
      if (allRecipeUrls.length >= maxResults) {
        break;
      }
    }
    
    // Deduplicate URLs using Set and return up to maxResults
    const uniqueUrls = Array.from(new Set(allRecipeUrls));
    return uniqueUrls.slice(0, maxResults);
    
  } catch (error) {
    console.error('Error scraping AllRecipes search:', error);
    return [];
  }
}

/**
 * Search for recipes from AllRecipes.com
 * Note: Does NOT filter by preferences - returns all recipes and lets substitution logic handle dietary needs
 */
export async function searchRecipes(query: string, preferences?: UserPreferences): Promise<Recipe[]> {
  try {
    console.log(`Searching AllRecipes.com for: ${query}`);

    // Step 1: Get recipe URLs from AllRecipes search
    const recipeUrls = await scrapeAllRecipesSearch(query, 10);

    console.log(`Found ${recipeUrls.length} recipe URLs from AllRecipes`);

    if (recipeUrls.length === 0) {
      console.warn('No recipe URLs found from AllRecipes search');
      return [];
    }

    // Step 2: Scrape each recipe
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

    console.log(`Successfully scraped ${validRecipes.length} recipes`);

    return validRecipes;
  } catch (error) {
    console.error("Error searching recipes from AllRecipes:", error);
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
