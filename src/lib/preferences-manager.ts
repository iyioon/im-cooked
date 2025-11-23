import { UserPreferences } from "@/types/recipe";

const PREFERENCES_KEY = "im-cooked-user-preferences";

/**
 * Load user preferences from localStorage
 */
export function loadPreferences(): UserPreferences | null {
  if (typeof window === "undefined") return null;

  try {
    const stored = localStorage.getItem(PREFERENCES_KEY);
    if (!stored) return null;

    return JSON.parse(stored) as UserPreferences;
  } catch (error) {
    console.error("Failed to load preferences:", error);
    return null;
  }
}

/**
 * Save user preferences to localStorage
 */
export function savePreferences(preferences: UserPreferences): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
  } catch (error) {
    console.error("Failed to save preferences:", error);
  }
}

/**
 * Update specific preference fields
 */
export function updatePreferences(updates: Partial<UserPreferences>): UserPreferences {
  const current = loadPreferences() || {};
  const updated = { ...current, ...updates };
  savePreferences(updated);
  return updated;
}

/**
 * Clear all preferences
 */
export function clearPreferences(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(PREFERENCES_KEY);
}

/**
 * Get default preferences (used for new users)
 */
export function getDefaultPreferences(): UserPreferences {
  return {
    measurementSystem: "imperial", // Default to imperial for US
    difficultyPreference: "any",
    defaultServings: 4,
  };
}

/**
 * Detect user's location from browser (requires Geolocation API)
 */
export async function detectLocation(): Promise<{
  country?: string;
  region?: string;
} | null> {
  if (typeof window === "undefined" || !navigator.geolocation) return null;

  try {
    const position = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        timeout: 5000,
      });
    });

    // Use reverse geocoding API (you could use Google Maps, OpenStreetMap, etc.)
    // For now, we'll just return coordinates and let the user set manually
    // In production, you'd call a geocoding service here

    console.log("User coordinates:", {
      lat: position.coords.latitude,
      lng: position.coords.longitude,
    });

    return null; // Return null for now, implement geocoding if needed
  } catch (error) {
    console.error("Failed to detect location:", error);
    return null;
  }
}

/**
 * Format dietary restrictions for AI prompts
 */
export function formatDietaryRestrictions(preferences: UserPreferences): string {
  const restrictions: string[] = [];

  if (preferences.dietaryRestrictions?.length) {
    restrictions.push(...preferences.dietaryRestrictions);
  }

  if (preferences.allergies?.length) {
    restrictions.push(...preferences.allergies.map((allergy) => `allergic to ${allergy}`));
  }

  if (preferences.avoidedIngredients?.length) {
    restrictions.push(...preferences.avoidedIngredients.map((ing) => `avoids ${ing}`));
  }

  return restrictions.length > 0 ? restrictions.join(", ") : "none";
}

/**
 * Format location context for AI prompts
 */
export function formatLocationContext(preferences: UserPreferences): string {
  if (!preferences.location) return "location not specified";

  const parts: string[] = [];
  if (preferences.location.region) parts.push(preferences.location.region);
  if (preferences.location.country) parts.push(preferences.location.country);

  return parts.length > 0 ? parts.join(", ") : "location not specified";
}

/**
 * Get search filters based on preferences
 */
export function getSearchFilters(preferences: UserPreferences): string {
  const filters: string[] = [];

  if (preferences.maxPrepTime) {
    filters.push(`max prep time: ${preferences.maxPrepTime} minutes`);
  }

  if (preferences.maxCookTime) {
    filters.push(`max cook time: ${preferences.maxCookTime} minutes`);
  }

  if (preferences.difficultyPreference && preferences.difficultyPreference !== "any") {
    filters.push(`difficulty: ${preferences.difficultyPreference}`);
  }

  if (preferences.preferredCuisines?.length) {
    filters.push(`preferred cuisines: ${preferences.preferredCuisines.join(", ")}`);
  }

  return filters.length > 0 ? filters.join("; ") : "";
}
