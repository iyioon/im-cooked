/**
 * Whitelisted recipe sites configuration
 */
export const WHITELISTED_SITES = [
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
export function isCollectionUrl(url: string): boolean {
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
