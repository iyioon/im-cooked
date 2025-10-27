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

export interface RecipeDetail extends Recipe {
  ingredients: string[];
  instructions: string[];
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
