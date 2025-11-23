/**
 * Application-wide constants
 * Centralized configuration for magic numbers and settings
 */

/**
 * Storage and session limits
 */
export const STORAGE_LIMITS = {
  /** Maximum number of chat sessions to store */
  MAX_SESSIONS: 50,
  /** Maximum number of messages per session */
  MAX_MESSAGES: 100,
} as const;

/**
 * Cache durations (in milliseconds)
 */
export const CACHE_DURATIONS = {
  /** 7 days - Open Food Facts data cache */
  OPEN_FOOD_FACTS: 7 * 24 * 60 * 60 * 1000,
} as const;

/**
 * API rate limits
 */
export const RATE_LIMITS = {
  /** Open Food Facts product queries per minute */
  OPEN_FOOD_FACTS_PRODUCTS: 100,
  /** Open Food Facts search queries per minute */
  OPEN_FOOD_FACTS_SEARCH: 10,
} as const;

/**
 * Retry and timeout settings
 */
export const RETRY_SETTINGS = {
  /** Maximum retry attempts for LLM JSON parsing */
  MAX_LLM_RETRIES: 5,
  /** Network fetch timeout for recipe scraping (10 seconds) */
  RECIPE_FETCH_TIMEOUT: 10000,
} as const;

/**
 * UI timing constants (in milliseconds)
 */
export const UI_TIMINGS = {
  /** Delay before allowing next navigation action (voice mode) */
  VOICE_NAVIGATION_DELAY: 1500,
  /** Delay before removing completed timer (voice mode) */
  VOICE_TIMER_REMOVAL_DELAY: 5000,
  /** Delay after setting timer (voice mode) */
  VOICE_TIMER_SETTING_DELAY: 1000,
  /** Duration to show success message after substitution */
  SUBSTITUTION_SUCCESS_DURATION: 2000,
  /** Voice chat context update delay */
  VOICE_CONTEXT_UPDATE_DELAY: 500,
} as const;

/**
 * Audio settings for voice mode
 */
export const AUDIO_SETTINGS = {
  /** Timer alarm beep frequency in Hz */
  ALARM_FREQUENCY: 800,
  /** Timer alarm volume (0-1) */
  ALARM_VOLUME: 0.3,
  /** Time between alarm beeps in seconds */
  ALARM_BEEP_INTERVAL: 0.3,
  /** Alarm beep attack time in seconds */
  ALARM_ATTACK_TIME: 0.01,
  /** Alarm beep decay time in seconds */
  ALARM_DECAY_TIME: 0.2,
  /** Number of beeps for timer alarm */
  ALARM_BEEP_COUNT: 3,
} as const;

/**
 * Recipe scraping settings
 */
export const RECIPE_SETTINGS = {
  /** Maximum recipe title length */
  MAX_TITLE_LENGTH: 100,
  /** Maximum HTML traversal attempts when finding elements */
  MAX_HTML_TRAVERSAL_ATTEMPTS: 5,
  /** Open Food Facts search page size */
  SEARCH_PAGE_SIZE: 5,
} as const;
