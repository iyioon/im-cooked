/**
 * HTML parsing and text manipulation utilities
 */

/**
 * Strip HTML tags (escaped or unescaped) from text
 * This handles cases where <img> or other HTML appears as literal text
 */
export function stripHtmlTags(text: string): string {
  if (!text) return "";

  // Remove escaped HTML tags (e.g., &lt;img ... /&gt;)
  text = text.replace(/&lt;[^&]*&gt;/g, "");

  // Remove any remaining raw HTML tags (e.g., <img ... />)
  text = text.replace(/<[^>]*>/g, "");

  // Clean up multiple spaces
  return text.replace(/\s+/g, " ").trim();
}

/**
 * Extract time string from text (e.g., "30 minutes", "1 hour 15 mins")
 */
export function extractTime(text: string): string | null {
  if (!text) return null;

  // Look for patterns like "30 minutes", "1 hour", "1h 30m", etc.
  const timeMatch = text.match(/(\d+)\s*(hour|hr|h|minute|min|m)/i);
  if (timeMatch) {
    return text.trim();
  }

  return null;
}

/**
 * Extract servings from text (e.g., "4 servings", "Serves 6")
 */
export function extractServings(text: string): string | null {
  if (!text) return null;

  const servingsMatch = text.match(/(\d+)\s*(serving|serve)/i);
  if (servingsMatch) {
    return `${servingsMatch[1]} servings`;
  }

  return null;
}
