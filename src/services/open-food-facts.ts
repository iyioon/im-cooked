/**
 * Open Food Facts API Service
 *
 * Provides allergen detection and ingredient information from the Open Food Facts database.
 * Implements caching to respect API rate limits (100/min for products, 10/min for search).
 *
 * @see https://openfoodfacts.github.io/openfoodfacts-server/api/
 */

import { CACHE_DURATIONS, RATE_LIMITS, RECIPE_SETTINGS } from "@/lib/constants";

const OPEN_FOOD_FACTS_BASE_URL = "https://world.openfoodfacts.org";
const CACHE_PREFIX = "off_cache_";

/**
 * Allergen severity levels for enhanced detection
 */
export enum AllergenSeverity {
  DIRECT = "direct", // Ingredient contains the allergen
  TRACE = "trace", // May contain traces (cross-contamination)
  DERIVED = "derived", // Derived from allergenic source
  HIERARCHY = "hierarchy", // Parent allergen category
}

/**
 * Allergen information from Open Food Facts
 */
export interface AllergenInfo {
  allergen: string; // Standardized allergen name
  severity: AllergenSeverity; // How the allergen is present
  source: string; // Where the allergen was detected (ingredient name)
  confidence: number; // Confidence score (0-1)
}

/**
 * Product allergen data from Open Food Facts API
 */
export interface ProductAllergenData {
  productName: string;
  allergens: AllergenInfo[];
  allergensText?: string; // Human-readable allergen description
  traces?: string[]; // Trace allergens (may contain)
  dataSource: "open-food-facts";
  lastUpdated: string;
}

/**
 * Cached data structure
 */
interface CachedData<T> {
  data: T;
  timestamp: number;
}

/**
 * Open Food Facts API response for product
 */
interface OFFProductResponse {
  status: number;
  status_verbose?: string;
  product?: {
    product_name?: string;
    allergens?: string;
    allergens_tags?: string[];
    allergens_from_ingredients?: string;
    allergens_hierarchy?: string[];
    traces?: string;
    traces_tags?: string[];
    ingredients_text?: string;
  };
}

/**
 * Open Food Facts API response for search
 */
interface OFFSearchResponse {
  count: number;
  page: number;
  page_size: number;
  products: Array<{
    code?: string;
    product_name?: string;
    allergens_tags?: string[];
    allergens_hierarchy?: string[];
    traces_tags?: string[];
  }>;
}

/**
 * Allergen taxonomy entry from Open Food Facts
 */
interface OFFAllergenTaxonomy {
  [key: string]: {
    name?: {
      en?: string;
      [lang: string]: string | undefined;
    };
    children?: string[];
    parents?: string[];
  };
}

/**
 * Get data from localStorage cache
 */
function getFromCache<T>(key: string): T | null {
  if (typeof window === "undefined") return null;

  try {
    const cached = localStorage.getItem(CACHE_PREFIX + key);
    if (!cached) return null;

    const cachedData: CachedData<T> = JSON.parse(cached);
    const now = Date.now();

    // Check if cache is expired
    if (now - cachedData.timestamp > CACHE_DURATIONS.OPEN_FOOD_FACTS) {
      localStorage.removeItem(CACHE_PREFIX + key);
      return null;
    }

    return cachedData.data;
  } catch (error) {
    console.error("Error reading from cache:", error);
    return null;
  }
}

/**
 * Save data to localStorage cache
 */
function saveToCache<T>(key: string, data: T): void {
  if (typeof window === "undefined") return;

  try {
    const cachedData: CachedData<T> = {
      data,
      timestamp: Date.now(),
    };
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(cachedData));
  } catch (error) {
    console.error("Error saving to cache:", error);
    // If localStorage is full, try to clear old cache entries
    try {
      clearOldCacheEntries();
      localStorage.setItem(CACHE_PREFIX + key, JSON.stringify({ data, timestamp: Date.now() }));
    } catch {
      // Still failing, ignore
    }
  }
}

/**
 * Clear old cache entries to free up space
 */
function clearOldCacheEntries(): void {
  if (typeof window === "undefined") return;

  const now = Date.now();
  const keys = Object.keys(localStorage);

  for (const key of keys) {
    if (key.startsWith(CACHE_PREFIX)) {
      try {
        const cached = localStorage.getItem(key);
        if (cached) {
          const cachedData: CachedData<unknown> = JSON.parse(cached);
          if (now - cachedData.timestamp > CACHE_DURATIONS.OPEN_FOOD_FACTS) {
            localStorage.removeItem(key);
          }
        }
      } catch {
        // If parsing fails, remove the entry
        localStorage.removeItem(key);
      }
    }
  }
}

/**
 * Normalize allergen tag from Open Food Facts format (e.g., "en:milk" -> "milk")
 */
function normalizeAllergenTag(tag: string): string {
  // Remove language prefix
  const normalized = tag.replace(/^[a-z]{2}:/, "");
  // Convert hyphens to spaces
  return normalized.replace(/-/g, " ");
}

/**
 * Parse allergen severity from tag hierarchy
 */
function determineAllergenSeverity(tag: string, isTrace: boolean): AllergenSeverity {
  if (isTrace) {
    return AllergenSeverity.TRACE;
  }

  // Check if it's a derived allergen (e.g., milk derivatives)
  if (tag.includes("derivative") || tag.includes("derived")) {
    return AllergenSeverity.DERIVED;
  }

  return AllergenSeverity.DIRECT;
}

/**
 * Search for products by ingredient name
 */
export async function searchProductsByIngredient(
  ingredientName: string
): Promise<ProductAllergenData[]> {
  const cacheKey = `search_${ingredientName.toLowerCase()}`;
  const cached = getFromCache<ProductAllergenData[]>(cacheKey);

  if (cached) {
    return cached;
  }

  try {
    // Use the v2 search API
    const url = new URL(`${OPEN_FOOD_FACTS_BASE_URL}/cgi/search.pl`);
    url.searchParams.append("search_terms", ingredientName);
    url.searchParams.append("search_simple", "1");
    url.searchParams.append("action", "process");
    url.searchParams.append("json", "1");
    url.searchParams.append("page_size", String(RECIPE_SETTINGS.SEARCH_PAGE_SIZE));
    url.searchParams.append(
      "fields",
      "code,product_name,allergens_tags,allergens_hierarchy,traces_tags"
    );

    const response = await fetch(url.toString(), {
      headers: {
        "User-Agent": "im-cooked/1.0 (Allergen Detection)",
      },
    });

    if (!response.ok) {
      throw new Error(`Open Food Facts API error: ${response.status}`);
    }

    const data: OFFSearchResponse = await response.json();

    const results: ProductAllergenData[] = data.products
      .filter((product) => product.product_name) // Only products with names
      .map((product) => parseProductAllergens(product));

    saveToCache(cacheKey, results);
    return results;
  } catch (error) {
    console.error("Error searching Open Food Facts:", error);
    return [];
  }
}

/**
 * Get allergen information for a specific product by barcode
 */
export async function getProductAllergens(barcode: string): Promise<ProductAllergenData | null> {
  const cacheKey = `product_${barcode}`;
  const cached = getFromCache<ProductAllergenData>(cacheKey);

  if (cached) {
    return cached;
  }

  try {
    const url = `${OPEN_FOOD_FACTS_BASE_URL}/api/v0/product/${barcode}.json`;

    const response = await fetch(url, {
      headers: {
        "User-Agent": "im-cooked/1.0 (Allergen Detection)",
      },
    });

    if (!response.ok) {
      throw new Error(`Open Food Facts API error: ${response.status}`);
    }

    const data: OFFProductResponse = await response.json();

    if (data.status !== 1 || !data.product) {
      return null;
    }

    const result = parseProductAllergens({
      product_name: data.product.product_name,
      allergens_tags: data.product.allergens_tags,
      allergens_hierarchy: data.product.allergens_hierarchy,
      traces_tags: data.product.traces_tags,
    });

    saveToCache(cacheKey, result);
    return result;
  } catch (error) {
    console.error("Error fetching product from Open Food Facts:", error);
    return null;
  }
}

/**
 * Parse allergen data from Open Food Facts product
 */
function parseProductAllergens(product: {
  product_name?: string;
  allergens_tags?: string[];
  allergens_hierarchy?: string[];
  traces_tags?: string[];
}): ProductAllergenData {
  const allergens: AllergenInfo[] = [];
  const traces: string[] = [];

  // Parse direct allergens
  if (product.allergens_tags && product.allergens_tags.length > 0) {
    for (const tag of product.allergens_tags) {
      allergens.push({
        allergen: normalizeAllergenTag(tag),
        severity: AllergenSeverity.DIRECT,
        source: product.product_name || "unknown",
        confidence: 0.9, // High confidence for tagged allergens
      });
    }
  }

  // Parse allergen hierarchy (parent categories)
  if (product.allergens_hierarchy && product.allergens_hierarchy.length > 0) {
    for (const tag of product.allergens_hierarchy) {
      const normalized = normalizeAllergenTag(tag);
      // Only add if not already in the list
      if (!allergens.some((a) => a.allergen === normalized)) {
        allergens.push({
          allergen: normalized,
          severity: AllergenSeverity.HIERARCHY,
          source: product.product_name || "unknown",
          confidence: 0.8,
        });
      }
    }
  }

  // Parse trace allergens
  if (product.traces_tags && product.traces_tags.length > 0) {
    for (const tag of product.traces_tags) {
      const normalized = normalizeAllergenTag(tag);
      traces.push(normalized);
      allergens.push({
        allergen: normalized,
        severity: AllergenSeverity.TRACE,
        source: product.product_name || "unknown",
        confidence: 0.6, // Lower confidence for traces
      });
    }
  }

  return {
    productName: product.product_name || "Unknown Product",
    allergens,
    traces: traces.length > 0 ? traces : undefined,
    dataSource: "open-food-facts",
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Get allergen taxonomy (common allergen list with hierarchies)
 */
export async function getAllergenTaxonomy(): Promise<Map<string, string[]>> {
  const cacheKey = "allergen_taxonomy";
  const cached = getFromCache<Map<string, string[]>>(cacheKey);

  if (cached) {
    return new Map(Object.entries(cached));
  }

  try {
    const url = `${OPEN_FOOD_FACTS_BASE_URL}/data/taxonomies/allergens.json`;

    const response = await fetch(url, {
      headers: {
        "User-Agent": "im-cooked/1.0 (Allergen Detection)",
      },
    });

    if (!response.ok) {
      // Return default common allergens if taxonomy fetch fails
      return getDefaultAllergenHierarchy();
    }

    const data: OFFAllergenTaxonomy = await response.json();
    const hierarchy = new Map<string, string[]>();

    // Build allergen hierarchy map
    for (const [key, value] of Object.entries(data)) {
      const allergenName = normalizeAllergenTag(key);
      const children = value.children?.map(normalizeAllergenTag) || [];
      hierarchy.set(allergenName, children);
    }

    // Save as plain object for JSON serialization
    saveToCache(cacheKey, Object.fromEntries(hierarchy));
    return hierarchy;
  } catch (error) {
    console.error("Error fetching allergen taxonomy:", error);
    return getDefaultAllergenHierarchy();
  }
}

/**
 * Default allergen hierarchy based on common allergens
 */
function getDefaultAllergenHierarchy(): Map<string, string[]> {
  return new Map([
    [
      "tree nuts",
      [
        "almonds",
        "walnuts",
        "cashews",
        "pecans",
        "pistachios",
        "hazelnuts",
        "macadamia nuts",
        "brazil nuts",
      ],
    ],
    ["shellfish", ["shrimp", "crab", "lobster", "crayfish", "prawns"]],
    ["fish", ["salmon", "tuna", "cod", "halibut", "sea bass"]],
    ["dairy", ["milk", "cheese", "butter", "cream", "yogurt", "whey", "casein", "lactose"]],
    ["eggs", ["egg white", "egg yolk", "egg albumin"]],
    ["soy", ["soybean", "soy protein", "soy lecithin", "tofu", "tempeh", "edamame"]],
    ["wheat", ["wheat flour", "wheat bran", "wheat germ", "semolina", "durum"]],
    ["gluten", ["wheat", "barley", "rye", "spelt", "kamut"]],
    ["peanuts", ["peanut butter", "peanut oil"]],
    ["sesame", ["sesame seeds", "sesame oil", "tahini"]],
  ]);
}

/**
 * Suggest allergens for autocomplete (used in preferences UI)
 */
export async function suggestAllergens(query: string): Promise<string[]> {
  if (!query || query.length < 2) {
    // Return common allergens for empty query
    return [
      "peanuts",
      "tree nuts",
      "shellfish",
      "fish",
      "eggs",
      "dairy",
      "soy",
      "wheat",
      "gluten",
      "sesame",
    ];
  }

  const cacheKey = `suggest_${query.toLowerCase()}`;
  const cached = getFromCache<string[]>(cacheKey);

  if (cached) {
    return cached;
  }

  try {
    const url = new URL(`${OPEN_FOOD_FACTS_BASE_URL}/cgi/suggest.pl`);
    url.searchParams.append("tagtype", "allergens");
    url.searchParams.append("term", query);

    const response = await fetch(url.toString(), {
      headers: {
        "User-Agent": "im-cooked/1.0 (Allergen Detection)",
      },
    });

    if (!response.ok) {
      throw new Error(`Open Food Facts API error: ${response.status}`);
    }

    const suggestions = await response.json();

    // The API returns an array of suggestions
    const results = Array.isArray(suggestions)
      ? suggestions.map((s: { id?: string; name?: string }) => s.name || s.id || "").filter(Boolean)
      : [];

    saveToCache(cacheKey, results);
    return results;
  } catch (error) {
    console.error("Error fetching allergen suggestions:", error);
    // Fallback to local filtering of common allergens
    const commonAllergens = [
      "peanuts",
      "tree nuts",
      "almonds",
      "walnuts",
      "cashews",
      "shellfish",
      "shrimp",
      "crab",
      "lobster",
      "fish",
      "salmon",
      "tuna",
      "eggs",
      "egg white",
      "egg yolk",
      "dairy",
      "milk",
      "cheese",
      "butter",
      "cream",
      "lactose",
      "soy",
      "soybean",
      "tofu",
      "wheat",
      "gluten",
      "barley",
      "rye",
      "sesame",
      "sesame seeds",
    ];
    return commonAllergens.filter((a) => a.toLowerCase().includes(query.toLowerCase()));
  }
}

/**
 * Clear all cached data
 */
export function clearCache(): void {
  if (typeof window === "undefined") return;

  const keys = Object.keys(localStorage);
  for (const key of keys) {
    if (key.startsWith(CACHE_PREFIX)) {
      localStorage.removeItem(key);
    }
  }
}
