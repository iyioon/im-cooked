export interface Recipe {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  prepTime?: string;
  cookTime?: string;
  servings?: string;
  difficulty?: string;
  sourceUrl: string;
  sourceName: string;
}

export interface RecipeStep {
  stepNumber: number;
  text: string;
  imageUrl?: string;
  caption?: string;
}

export interface RecipeDetail extends Recipe {
  ingredients: string[];
  instructions: string[]; // Keep for backward compatibility
  steps?: RecipeStep[]; // NEW: enhanced step data with images
  nutrition?: {
    calories?: string;
    protein?: string;
    carbs?: string;
    fat?: string;
  };
}

export interface RecipeSearchResponse {
  recipes: Recipe[];
  query: string;
}

export interface IntentDetectionResponse {
  isRecipeSearch: boolean;
  searchQuery: string | null;
}

export interface ParsedIngredient {
  original: string;
  quantity?: number;
  unit?: string;
  ingredient: string;
  preparation?: string; // e.g., "chopped", "diced", "melted"
}

export interface IngredientSubstitution {
  original: ParsedIngredient;
  substitute: {
    ingredient: string;
    quantity?: number;
    unit?: string;
    preparation?: string;
  };
  reason: string;
  impact?: {
    taste?: string;
    texture?: string;
    nutrition?: string;
    cookingTime?: string;
  };
}

export interface DishContext {
  dishType: string; // e.g., "dessert", "main course", "soup"
  cuisine?: string; // e.g., "Italian", "Asian"
  cookingMethod?: string; // e.g., "baking", "frying"
  dietaryTags?: string[]; // e.g., ["vegetarian", "gluten-free"]
}

export interface SubstitutionRequest {
  recipeId: string;
  recipeTitle: string;
  originalIngredient: string;
  userInput?: string; // User's desired substitute
  dietaryRestrictions?: string[];
}

export interface SubstitutionResponse {
  dishContext: DishContext;
  suggestions: IngredientSubstitution[];
  modifiedRecipe?: {
    ingredients: string[];
    instructionChanges?: Array<{
      step: number;
      original: string;
      modified: string;
    }>;
    warnings?: string[];
  };
}

export interface UserPreferences {
  // Location & Regional
  location?: {
    country?: string;
    region?: string; // e.g., "California", "Ontario"
  };
  measurementSystem?: "metric" | "imperial";

  // Dietary
  dietaryRestrictions?: string[]; // e.g., ["vegetarian", "gluten-free", "dairy-free"]
  allergies?: string[]; // e.g., ["peanuts", "shellfish", "eggs"]

  // Preferences
  skillLevel?: "beginner" | "intermediate" | "advanced";
  preferredCuisines?: string[]; // e.g., ["Italian", "Asian", "Mexican"]
  avoidedIngredients?: string[]; // General dislikes

  // Household
  defaultServings?: number;
  availableEquipment?: string[]; // e.g., ["oven", "air fryer", "instant pot"]

  // Search behavior
  maxPrepTime?: number; // in minutes
  maxCookTime?: number; // in minutes
  difficultyPreference?: "easy" | "medium" | "hard" | "any";
}

// Cooking Session Types
export interface CookingSessionMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export interface CookingSession {
  id: string;
  recipeId: string;
  recipeTitle: string;
  currentStep: number; // 1-based index
  completedSteps: number[]; // Array of completed step numbers
  startedAt: Date;
  lastActiveAt: Date;
  notes: Record<number, string>; // Notes per step number
  ingredientsCollapsed: boolean;
  messages: CookingSessionMessage[]; // Chat messages
}
