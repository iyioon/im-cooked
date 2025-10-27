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
