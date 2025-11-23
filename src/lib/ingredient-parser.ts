import { ParsedIngredient } from "@/types/recipe";

// Common units for ingredient measurements
const UNITS = [
  // Volume
  "cup",
  "cups",
  "tablespoon",
  "tablespoons",
  "tbsp",
  "teaspoon",
  "teaspoons",
  "tsp",
  "fluid ounce",
  "fluid ounces",
  "fl oz",
  "milliliter",
  "milliliters",
  "ml",
  "liter",
  "liters",
  "l",
  "pint",
  "pints",
  "quart",
  "quarts",
  "gallon",
  "gallons",

  // Weight
  "pound",
  "pounds",
  "lb",
  "lbs",
  "ounce",
  "ounces",
  "oz",
  "gram",
  "grams",
  "g",
  "kilogram",
  "kilograms",
  "kg",
  "milligram",
  "milligrams",
  "mg",

  // Count/Other
  "piece",
  "pieces",
  "slice",
  "slices",
  "clove",
  "cloves",
  "can",
  "cans",
  "package",
  "packages",
  "bunch",
  "bunches",
  "pinch",
  "pinches",
  "dash",
  "dashes",
  "handful",
  "handfuls",
  "large",
  "medium",
  "small",
  "whole",
];

// Common preparation methods
const PREPARATIONS = [
  "chopped",
  "diced",
  "minced",
  "sliced",
  "grated",
  "shredded",
  "melted",
  "softened",
  "beaten",
  "whisked",
  "crushed",
  "ground",
  "peeled",
  "cubed",
  "julienned",
  "halved",
  "quartered",
  "fresh",
  "dried",
  "frozen",
  "canned",
  "cooked",
  "raw",
  "finely chopped",
  "roughly chopped",
  "thinly sliced",
  "thickly sliced",
];

/**
 * Parse a fraction string to decimal
 */
function parseFraction(str: string): number {
  if (str.includes("/")) {
    const [numerator, denominator] = str.split("/").map(Number);
    return numerator / denominator;
  }
  return parseFloat(str);
}

/**
 * Parse quantity from ingredient string
 * Handles: "2", "1/2", "1 1/2", "2.5", "2-3"
 */
function parseQuantity(text: string): { quantity?: number; remaining: string } {
  // Match patterns like: "2", "1/2", "1 1/2", "2.5", "2-3"
  const quantityPattern = /^(\d+(?:\s+\d+\/\d+|\.\d+|\/\d+)?(?:\s*-\s*\d+)?)\s+/;
  const match = text.match(quantityPattern);

  if (!match) {
    return { remaining: text };
  }

  let quantityStr = match[1].trim();
  const remaining = text.slice(match[0].length);

  // Handle ranges (e.g., "2-3") - take the midpoint
  if (quantityStr.includes("-")) {
    const [min, max] = quantityStr.split("-").map((s) => parseFloat(s.trim()));
    return { quantity: (min + max) / 2, remaining };
  }

  // Handle mixed fractions (e.g., "1 1/2")
  if (quantityStr.includes(" ") && quantityStr.includes("/")) {
    const parts = quantityStr.split(" ");
    const whole = parseFloat(parts[0]);
    const fraction = parseFraction(parts[1]);
    return { quantity: whole + fraction, remaining };
  }

  // Handle simple fractions or decimals
  return { quantity: parseFraction(quantityStr), remaining };
}

/**
 * Parse unit from ingredient string
 */
function parseUnit(text: string): { unit?: string; remaining: string } {
  const lowerText = text.toLowerCase();

  // Try to match any known unit at the start
  for (const unit of UNITS) {
    const pattern = new RegExp(`^${unit}\\b`, "i");
    if (pattern.test(lowerText)) {
      return {
        unit: unit,
        remaining: text.slice(unit.length).trim(),
      };
    }
  }

  return { remaining: text };
}

/**
 * Extract preparation method from ingredient string
 */
function parsePreparation(text: string): { preparation?: string; ingredient: string } {
  const lowerText = text.toLowerCase();

  // Check for preparation in parentheses first (e.g., "butter (melted)")
  const parenMatch = text.match(/\(([^)]+)\)/);
  if (parenMatch) {
    const prep = parenMatch[1].trim();
    const ingredient = text.replace(parenMatch[0], "").trim();
    return { preparation: prep, ingredient };
  }

  // Check for comma-separated preparation (e.g., "onion, diced")
  const commaMatch = text.match(/,\s*(.+)$/);
  if (commaMatch) {
    const potentialPrep = commaMatch[1].trim().toLowerCase();
    if (PREPARATIONS.some((p) => potentialPrep.includes(p))) {
      return {
        preparation: commaMatch[1].trim(),
        ingredient: text.substring(0, text.lastIndexOf(",")).trim(),
      };
    }
  }

  // Check for preparation at the end
  for (const prep of PREPARATIONS) {
    if (lowerText.endsWith(prep)) {
      return {
        preparation: prep,
        ingredient: text.slice(0, -prep.length).trim(),
      };
    }
  }

  return { ingredient: text };
}

/**
 * Parse an ingredient string into structured components
 *
 * Examples:
 * - "2 cups all-purpose flour" → {quantity: 2, unit: "cups", ingredient: "all-purpose flour"}
 * - "1/2 teaspoon salt" → {quantity: 0.5, unit: "teaspoon", ingredient: "salt"}
 * - "3 large eggs, beaten" → {quantity: 3, unit: "large", ingredient: "eggs", preparation: "beaten"}
 * - "1 onion, diced" → {quantity: 1, ingredient: "onion", preparation: "diced"}
 */
export function parseIngredient(ingredientStr: string): ParsedIngredient {
  let text = ingredientStr.trim();

  // Remove any leading bullets or numbers
  text = text.replace(/^[•\-\*\d+\.]\s*/, "");

  // Parse quantity
  const { quantity, remaining: afterQuantity } = parseQuantity(text);

  // Parse unit
  const { unit, remaining: afterUnit } = parseUnit(afterQuantity);

  // Parse preparation and ingredient name
  const { preparation, ingredient } = parsePreparation(afterUnit);

  return {
    original: ingredientStr,
    quantity,
    unit,
    ingredient: ingredient.trim(),
    preparation,
  };
}

/**
 * Parse multiple ingredient strings
 */
export function parseIngredients(ingredients: string[]): ParsedIngredient[] {
  return ingredients.map(parseIngredient);
}

/**
 * Format a parsed ingredient back to string
 */
export function formatIngredient(parsed: ParsedIngredient): string {
  const parts: string[] = [];

  if (parsed.quantity) {
    parts.push(parsed.quantity.toString());
  }

  if (parsed.unit) {
    parts.push(parsed.unit);
  }

  parts.push(parsed.ingredient);

  if (parsed.preparation) {
    parts.push(`(${parsed.preparation})`);
  }

  return parts.join(" ");
}
