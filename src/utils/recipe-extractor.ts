import * as cheerio from "cheerio";
import { RecipeStep } from "@/types/recipe";
import { stripHtmlTags } from "./html-parser";

/**
 * Extract recipe data from JSON-LD schema
 */
export function extractFromJsonLd($: cheerio.CheerioAPI): { 
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
                  if (cleaned) instructions.push(stripHtmlTags(cleaned));
                }
              });
            }
          }
          // Handle plain string
          else if (typeof inst === 'string') {
            const cleaned = inst.trim().replace(/^Step\s+\d+:\s*/i, '').trim();
            if (cleaned) instructions.push(stripHtmlTags(cleaned));
          }
          // Handle HowToStep object
          else if (inst['@type'] === 'HowToStep' && inst.text) {
            const cleaned = inst.text.trim().replace(/^Step\s+\d+:\s*/i, '').trim();
            if (cleaned) instructions.push(stripHtmlTags(cleaned));
          }
          // Handle ItemList of HowToStep objects (CRITICAL - Bon Appétit, Epicurious, Serious Eats)
          else if (inst['@type'] === 'ItemList' && Array.isArray(inst.itemListElement)) {
            inst.itemListElement.forEach((step: any) => {
              if (step['@type'] === 'HowToStep' && step.text) {
                const cleaned = step.text.trim().replace(/^Step\s+\d+:\s*/i, '').trim();
                if (cleaned) instructions.push(stripHtmlTags(cleaned));
              } else if (typeof step === 'string') {
                const cleaned = step.trim().replace(/^Step\s+\d+:\s*/i, '').trim();
                if (cleaned) instructions.push(stripHtmlTags(cleaned));
              }
            });
          }
          // Fallback: any object with .text property
          else if (inst.text) {
            const cleaned = inst.text.trim().replace(/^Step\s+\d+:\s*/i, '').trim();
            if (cleaned) instructions.push(stripHtmlTags(cleaned));
          }
        });
      } else if (typeof recipeData.recipeInstructions === 'string') {
        // Handle single string instruction (rare but possible)
        const cleaned = recipeData.recipeInstructions.trim().replace(/^Step\s+\d+:\s*/i, '').trim();
        if (cleaned) instructions.push(stripHtmlTags(cleaned));
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
 * Extract step-by-step images from AllRecipes.com DOM
 */
export function extractStepImages($: cheerio.CheerioAPI, url: string, instructions: string[]): RecipeStep[] {
  const steps: RecipeStep[] = [];
  const hostname = new URL(url).hostname.toLowerCase();
  
  // AllRecipes.com: Steps in <ol> under "Directions" with inline images
  if (hostname.includes('allrecipes.com')) {
    // Structure: <h2>Directions</h2> <div> <ol> <li> <p>text</p> <figure><img/></figure> </li> </ol> </div>
    $('h2, h3, h4').each((_, el) => {
      const headingText = $(el).text().trim().toLowerCase();
      if (headingText === 'directions' || headingText.startsWith('directions')) {
        // Look for <ol> in next siblings (could be direct or nested in div)
        let nextEl = $(el).next();
        let attempts = 0;
        let foundOl = null;
        
        while (nextEl.length > 0 && attempts < 5) {
          const tagName = nextEl.prop('tagName')?.toLowerCase();
          
          // Check if it's directly an <ol>
          if (tagName === 'ol') {
            foundOl = nextEl;
            break;
          }
          
          // Check if <ol> is nested inside (common for Allrecipes)
          if (tagName === 'div') {
            const nestedOl = nextEl.find('ol').first();
            if (nestedOl.length > 0) {
              foundOl = nestedOl;
              break;
            }
          }
          
          nextEl = nextEl.next();
          attempts++;
        }
        
        // Extract steps from found <ol>
        if (foundOl) {
          foundOl.find('li').each((idx, li) => {
            // Extract text from <p> tag (cleaner than cloning)
            const p = $(li).find('p').first();
            const text = p.length > 0 ? p.text().trim() : $(li).clone().children('figure, img, div').remove().end().text().trim();
            
            // Extract image from <figure> or direct <img>
            const figure = $(li).find('figure').first();
            const img = figure.length > 0 ? figure.find('img').first() : $(li).find('img').first();
            const imgUrl = img.attr('src') || img.attr('data-src') || img.attr('data-lazy-src');
            
            if (text) {
              steps.push({
                stepNumber: idx + 1,
                text: stripHtmlTags(text.replace(/^Step\s+\d+:\s*/i, '').trim()),
                imageUrl: imgUrl && imgUrl.startsWith('http') ? imgUrl : undefined,
                caption: img.attr('alt') || undefined,
              });
            }
          });
        }
        
        return false; // Break outer loop
      }
    });
  }
  
  // Fallback: If no steps found with images, create steps from instructions array
  if (steps.length === 0 && instructions.length > 0) {
    return instructions.map((text, idx) => ({
      stepNumber: idx + 1,
      text: stripHtmlTags(text),
    }));
  }
  
  return steps;
}

/**
 * Extract ingredients and instructions from HTML fallback
 */
export function extractFromHtml($: cheerio.CheerioAPI): {
  ingredients: string[];
  instructions: string[];
  nutrition: any;
} {
  const ingredients: string[] = [];
  const instructions: string[] = [];
  let nutrition: any = null;

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
                  instructions.push(stripHtmlTags(cleaned));
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
      instructions.push(stripHtmlTags(text));
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
        instructions.push(stripHtmlTags(text));
      }
    });
    
    // If still empty, try nested p tags in ordered/unordered lists
    // This handles AllRecipes and similar sites that nest <p> inside <li>
    if (instructions.length === 0) {
      $('ol li p, .directions li p, .instructions li p, .method li p, .steps li p, [class*="recipe-steps"] li p').each((_, el) => {
        const text = $(el).text().trim();
        if (text && text.length > 0 && !instructions.includes(text)) {
          instructions.push(stripHtmlTags(text));
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

  return { ingredients, instructions, nutrition };
}
