/**
 * Allergen Validation Service
 *
 * Validates ingredients against user allergen preferences with support for:
 * - Hierarchical allergen matching (e.g., "dairy" includes "milk", "cheese")
 * - Ingredient name normalization
 * - Cross-contamination detection (traces)
 * - Confidence scoring
 */

import {
  searchProductsByIngredient,
  getAllergenTaxonomy,
  AllergenInfo,
  AllergenSeverity,
  ProductAllergenData,
} from '@/services/open-food-facts';

/**
 * Allergen validation result for a single ingredient
 */
export interface AllergenValidationResult {
  ingredient: string;
  hasAllergen: boolean;
  matches: AllergenMatch[];
  confidence: number; // Overall confidence (0-1)
  dataAvailable: boolean; // Whether Open Food Facts had data for this ingredient
}

/**
 * Details about an allergen match
 */
export interface AllergenMatch {
  userAllergen: string;      // The allergen from user's preferences
  detectedAllergen: string;  // The allergen detected in the ingredient
  severity: AllergenSeverity;
  confidence: number;
  matchType: 'exact' | 'hierarchical' | 'derivative';
  source: string;            // Where the allergen was detected
}

/**
 * Allergen validation result for a full recipe
 */
export interface RecipeAllergenValidation {
  recipeSafe: boolean;
  allergenMatches: Map<string, AllergenValidationResult>; // ingredient -> validation result
  warnings: string[];
  blockedIngredients: string[]; // Ingredients that contain allergens
}

/**
 * Normalize ingredient name for better matching
 * Removes common preparation terms, quantities, and extra details
 */
export function normalizeIngredientName(ingredient: string): string {
  let normalized = ingredient.toLowerCase().trim();

  // Remove quantity and measurement units
  normalized = normalized.replace(/^\d+(\.\d+)?\s*(\/\s*\d+)?\s*(cups?|tbsp|tsp|oz|g|kg|ml|l|pounds?|lbs?|pinch|dash|to taste)?\s*/gi, '');

  // Remove common preparation terms
  const preparationTerms = [
    'fresh', 'frozen', 'canned', 'dried', 'chopped', 'diced', 'sliced', 'minced',
    'grated', 'shredded', 'crushed', 'whole', 'halved', 'quartered',
    'cooked', 'raw', 'roasted', 'toasted', 'blanched',
    'optional', 'divided', 'plus more',
    'for serving', 'for garnish', 'to taste',
    'organic', 'kosher', 'sea', 'iodized',
  ];

  for (const term of preparationTerms) {
    const regex = new RegExp(`\\b${term}\\b`, 'gi');
    normalized = normalized.replace(regex, '');
  }

  // Remove parenthetical notes
  normalized = normalized.replace(/\([^)]*\)/g, '');

  // Remove extra whitespace
  normalized = normalized.replace(/\s+/g, ' ').trim();

  // Remove trailing commas or dashes
  normalized = normalized.replace(/[,\-]+$/, '').trim();

  return normalized;
}

/**
 * Check if an allergen matches hierarchically
 * For example: "milk" matches against user allergen "dairy"
 */
async function checkHierarchicalMatch(
  detectedAllergen: string,
  userAllergens: string[]
): Promise<{ matched: string; matchType: 'exact' | 'hierarchical' | 'derivative' } | null> {
  const detectedLower = detectedAllergen.toLowerCase();

  // First check for exact matches
  for (const userAllergen of userAllergens) {
    if (detectedLower === userAllergen.toLowerCase()) {
      return { matched: userAllergen, matchType: 'exact' };
    }
  }

  // Check hierarchical matches using taxonomy
  const taxonomy = await getAllergenTaxonomy();

  for (const userAllergen of userAllergens) {
    const userLower = userAllergen.toLowerCase();

    // Check if detected allergen is a child of user allergen
    const children = taxonomy.get(userLower) || [];
    if (children.some(child => child.toLowerCase() === detectedLower)) {
      return { matched: userAllergen, matchType: 'hierarchical' };
    }

    // Check if user allergen is a child of detected allergen
    const detectedChildren = taxonomy.get(detectedLower) || [];
    if (detectedChildren.some(child => child.toLowerCase() === userLower)) {
      return { matched: userAllergen, matchType: 'hierarchical' };
    }

    // Check for partial word matches (e.g., "soy" in "soybean")
    if (detectedLower.includes(userLower) || userLower.includes(detectedLower)) {
      return { matched: userAllergen, matchType: 'derivative' };
    }
  }

  return null;
}

/**
 * Validate a single ingredient against user allergen preferences
 */
export async function validateIngredient(
  ingredient: string,
  userAllergens: string[]
): Promise<AllergenValidationResult> {
  if (!userAllergens || userAllergens.length === 0) {
    return {
      ingredient,
      hasAllergen: false,
      matches: [],
      confidence: 1.0,
      dataAvailable: false,
    };
  }

  const normalized = normalizeIngredientName(ingredient);

  // Search Open Food Facts for this ingredient
  const products = await searchProductsByIngredient(normalized);

  if (products.length === 0) {
    // No data available from Open Food Facts
    // Fall back to simple string matching
    return await fallbackValidation(ingredient, normalized, userAllergens);
  }

  // Aggregate allergen data from all matching products
  const allAllergens: AllergenInfo[] = [];
  for (const product of products) {
    allAllergens.push(...product.allergens);
  }

  // Check each detected allergen against user allergens
  const matches: AllergenMatch[] = [];

  for (const allergenInfo of allAllergens) {
    const hierarchicalMatch = await checkHierarchicalMatch(
      allergenInfo.allergen,
      userAllergens
    );

    if (hierarchicalMatch) {
      matches.push({
        userAllergen: hierarchicalMatch.matched,
        detectedAllergen: allergenInfo.allergen,
        severity: allergenInfo.severity,
        confidence: allergenInfo.confidence,
        matchType: hierarchicalMatch.matchType,
        source: allergenInfo.source,
      });
    }
  }

  // Calculate overall confidence
  const confidence = matches.length > 0
    ? Math.max(...matches.map(m => m.confidence))
    : 0.9; // High confidence when no allergens found in Open Food Facts

  return {
    ingredient,
    hasAllergen: matches.length > 0,
    matches,
    confidence,
    dataAvailable: true,
  };
}

/**
 * Fallback validation when Open Food Facts has no data
 * Uses simple string matching against user allergens
 */
async function fallbackValidation(
  ingredient: string,
  normalizedIngredient: string,
  userAllergens: string[]
): Promise<AllergenValidationResult> {
  const matches: AllergenMatch[] = [];

  for (const userAllergen of userAllergens) {
    const userLower = userAllergen.toLowerCase();
    const ingredientLower = normalizedIngredient.toLowerCase();

    // Check for direct substring match
    if (ingredientLower.includes(userLower) || userLower.includes(ingredientLower)) {
      matches.push({
        userAllergen,
        detectedAllergen: normalizedIngredient,
        severity: AllergenSeverity.DIRECT,
        confidence: 0.7, // Lower confidence for string matching
        matchType: 'exact',
        source: 'string-matching',
      });
    }
  }

  // Also check hierarchical relationships
  const taxonomy = await getAllergenTaxonomy();
  for (const userAllergen of userAllergens) {
    const userLower = userAllergen.toLowerCase();
    const children = taxonomy.get(userLower) || [];

    for (const child of children) {
      if (normalizedIngredient.toLowerCase().includes(child.toLowerCase())) {
        // Only add if not already matched
        if (!matches.some(m => m.userAllergen === userAllergen)) {
          matches.push({
            userAllergen,
            detectedAllergen: child,
            severity: AllergenSeverity.HIERARCHY,
            confidence: 0.6,
            matchType: 'hierarchical',
            source: 'taxonomy-matching',
          });
        }
      }
    }
  }

  return {
    ingredient,
    hasAllergen: matches.length > 0,
    matches,
    confidence: matches.length > 0 ? 0.7 : 0.5, // Lower confidence without Open Food Facts data
    dataAvailable: false,
  };
}

/**
 * Validate all ingredients in a recipe against user allergen preferences
 */
export async function validateRecipe(
  ingredients: string[],
  userAllergens: string[]
): Promise<RecipeAllergenValidation> {
  if (!userAllergens || userAllergens.length === 0) {
    return {
      recipeSafe: true,
      allergenMatches: new Map(),
      warnings: [],
      blockedIngredients: [],
    };
  }

  const allergenMatches = new Map<string, AllergenValidationResult>();
  const blockedIngredients: string[] = [];
  const warnings: string[] = [];

  // Validate each ingredient
  const validationPromises = ingredients.map(ingredient =>
    validateIngredient(ingredient, userAllergens)
  );

  const results = await Promise.all(validationPromises);

  for (let i = 0; i < ingredients.length; i++) {
    const ingredient = ingredients[i];
    const result = results[i];

    allergenMatches.set(ingredient, result);

    if (result.hasAllergen) {
      // Filter to only direct and hierarchical allergens (not just traces)
      const directMatches = result.matches.filter(
        m => m.severity === AllergenSeverity.DIRECT || m.severity === AllergenSeverity.HIERARCHY
      );

      if (directMatches.length > 0) {
        blockedIngredients.push(ingredient);
        const allergenList = [...new Set(directMatches.map(m => m.userAllergen))].join(', ');
        warnings.push(`${ingredient} contains: ${allergenList}`);
      }

      // Add warning for trace allergens
      const traceMatches = result.matches.filter(m => m.severity === AllergenSeverity.TRACE);
      if (traceMatches.length > 0) {
        const allergenList = [...new Set(traceMatches.map(m => m.userAllergen))].join(', ');
        warnings.push(`${ingredient} may contain traces of: ${allergenList}`);
      }
    }
  }

  return {
    recipeSafe: blockedIngredients.length === 0,
    allergenMatches,
    warnings,
    blockedIngredients,
  };
}

/**
 * Validate a list of substitution suggestions
 * Filters out any substitutions that contain user allergens
 */
export async function validateSubstitutions<T extends { substitute: { ingredient: string } }>(
  substitutions: T[],
  userAllergens: string[]
): Promise<{ safe: T[]; blocked: T[]; validationResults: Map<string, AllergenValidationResult> }> {
  if (!userAllergens || userAllergens.length === 0) {
    return {
      safe: substitutions,
      blocked: [],
      validationResults: new Map(),
    };
  }

  const validationResults = new Map<string, AllergenValidationResult>();
  const safe: T[] = [];
  const blocked: T[] = [];

  // Validate each substitution
  for (const substitution of substitutions) {
    const ingredient = substitution.substitute.ingredient;
    const result = await validateIngredient(ingredient, userAllergens);

    validationResults.set(ingredient, result);

    // Block if it has direct or hierarchical allergen matches
    const hasDirectAllergen = result.matches.some(
      m => m.severity === AllergenSeverity.DIRECT || m.severity === AllergenSeverity.HIERARCHY
    );

    if (hasDirectAllergen) {
      blocked.push(substitution);
    } else {
      safe.push(substitution);
    }
  }

  return { safe, blocked, validationResults };
}

/**
 * Format allergen validation results as human-readable text
 */
export function formatAllergenWarning(result: AllergenValidationResult): string {
  if (!result.hasAllergen) {
    return '';
  }

  const directMatches = result.matches.filter(
    m => m.severity === AllergenSeverity.DIRECT || m.severity === AllergenSeverity.HIERARCHY
  );

  const traceMatches = result.matches.filter(m => m.severity === AllergenSeverity.TRACE);

  const warnings: string[] = [];

  if (directMatches.length > 0) {
    const allergens = [...new Set(directMatches.map(m => m.userAllergen))].join(', ');
    warnings.push(`Contains: ${allergens}`);
  }

  if (traceMatches.length > 0) {
    const allergens = [...new Set(traceMatches.map(m => m.userAllergen))].join(', ');
    warnings.push(`May contain traces: ${allergens}`);
  }

  return warnings.join('. ');
}
