# Recipe Search System Documentation

## Overview

The recipe search system uses **Gemini AI with Google Search Grounding** to find recipes from trusted cooking websites, then scrapes recipe data using **cheerio** (no AI calls for scraping to avoid rate limits).

## Architecture

```
User Query
    ↓
Intent Detection (Gemini AI)
    ↓
Google Search Grounding (Gemini AI)
    ↓
URL Resolution & Filtering
    ↓
Recipe Scraping (Cheerio only)
    ↓
Recipe Results
```

## API Endpoints

### 1. Intent Detection
**Endpoint**: `/api/intent`  
**Method**: `POST`  
**Purpose**: Determine if user message is a recipe search

**Request**:
```json
{
  "message": "chocolate chip cookies"
}
```

**Response**:
```json
{
  "isRecipeSearch": true,
  "searchQuery": "chocolate chip cookies"
}
```

**Implementation**: Uses Gemini AI to analyze user intent

---

### 2. Recipe Search
**Endpoint**: `/api/recipes/search`  
**Method**: `POST`  
**Purpose**: Search for recipes using Google Search Grounding

**Request**:
```json
{
  "query": "pasta"
}
```

**Response**:
```json
{
  "recipes": [
    {
      "id": "base64_encoded_url",
      "title": "Creamy Pasta",
      "description": "A delicious pasta dish...",
      "imageUrl": "https://...",
      "prepTime": "15 mins",
      "cookTime": "20 mins",
      "servings": "4 servings",
      "difficulty": "Easy",
      "sourceUrl": "https://...",
      "sourceName": "Delish"
    }
  ]
}
```

---

### 3. Recipe Details
**Endpoint**: `/api/recipes/[id]`  
**Method**: `GET`  
**Purpose**: Get full recipe details (ingredients, instructions, nutrition)

**Response**:
```json
{
  "id": "...",
  "title": "...",
  "ingredients": [
    "5 to 6 ears of corn, shucked",
    "Kosher salt",
    "..."
  ],
  "instructions": [
    "Step 1: Cut kernels off corn cobs...",
    "Step 2: Cook pasta until al dente...",
    "..."
  ],
  "nutrition": {
    "calories": "811 Calories",
    "protein": "28 g",
    "carbs": "120 g",
    "fat": "23 g"
  }
}
```

## Search Flow (Detailed)

### Step 1: Intent Detection
- User sends message to `/api/intent`
- Gemini AI analyzes if it's a recipe search
- Returns `isRecipeSearch` boolean and `searchQuery` string
- **API Calls**: 1 Gemini request

### Step 2: Google Search Grounding
- Query sent to Gemini with `googleSearch` tool enabled
- Gemini searches whitelisted recipe sites:
  - allrecipes.com
  - foodnetwork.com
  - simplyrecipes.com
  - delish.com
  - bonappetit.com
  - epicurious.com
  - seriouseats.com
  - tasteofhome.com
- Returns grounding metadata with redirect URLs
- **API Calls**: 1 Gemini request

### Step 3: URL Resolution
- Extract URLs from `groundingMetadata.groundingChunks`
- Resolve redirect URLs using `HEAD` requests
- Filter URLs to:
  - Only whitelisted domains
  - Exclude collection/category pages (e.g., `/best-*`, `/gallery/`)
- Limit to top 10 URLs
- **API Calls**: 0 Gemini requests

### Step 4: Recipe Scraping
- Fetch HTML for each recipe URL
- Parse with cheerio (CSS selectors)
- Extract metadata:
  - Title: `h1`, `og:title`, `title` tag
  - Image: `og:image`, recipe images
  - Description: `meta[name="description"]`
  - Times: Schema.org `itemprop`, common classes
  - Difficulty: Auto-calculated from cook time
- **API Calls**: 0 Gemini requests (cheerio only!)

### Step 5: Recipe Details (On-Demand)
When user clicks a recipe, extract full details:

**Priority 1: JSON-LD Extraction**
- Look for `<script type="application/ld+json">`
- Parse Recipe schema objects
- Extract `recipeIngredient`, `recipeInstructions`, `nutrition`
- Handles `HowToStep` objects for instructions

**Priority 2: Schema.org HTML**
- Fall back to `itemprop="recipeIngredient"`
- Extract from `itemprop="recipeInstructions"`

**Priority 3: CSS Selectors**
- Last resort: `.ingredients li`, `.instructions li`

**API Calls**: 0 Gemini requests (cheerio only!)

## API Usage Per Search

| Phase | Gemini API Calls |
|-------|------------------|
| Intent Detection | 1 |
| Google Search Grounding | 1 |
| URL Resolution | 0 |
| Recipe Scraping (×10) | 0 |
| Recipe Details | 0 |
| **TOTAL** | **2 calls** |

**Rate Limit**: 10 requests/minute (free tier)  
**Searches Allowed**: 5 per minute

## URL Filtering

### Whitelisted Domains
Only recipes from these 8 trusted sites:
- allrecipes.com (~65K recipes)
- foodnetwork.com (~50K recipes)
- simplyrecipes.com (~15K recipes)
- delish.com (~20K recipes)
- bonappetit.com (~15K recipes)
- epicurious.com (~10K recipes)
- seriouseats.com (~5K recipes)
- tasteofhome.com (~5K recipes)

**Total Coverage**: ~185,000 recipes

### Excluded URL Patterns
Collection and category pages are filtered out:
- `/best-*` (e.g., `/best-pasta-recipes-8737255`)
- `/gallery/`
- `/recipes/` (category landing pages)
- `/collection/`
- `/category/`
- `/guide/`
- URLs ending in 7+ digit IDs (often collections)

## Data Extraction Methods

### JSON-LD (Priority 1)
Most modern recipe sites use structured data:
```html
<script type="application/ld+json">
{
  "@type": "Recipe",
  "recipeIngredient": ["...", "..."],
  "recipeInstructions": [
    { "@type": "HowToStep", "text": "..." }
  ],
  "nutrition": { "calories": "500", ... }
}
</script>
```

**Extraction**:
- Parse JSON from script tag
- Find Recipe objects (handles arrays)
- Extract ingredients, instructions, nutrition
- Handles both string and HowToStep formats

### Schema.org HTML (Priority 2)
Semantic HTML markup:
```html
<span itemprop="recipeIngredient">2 cups flour</span>
<li itemprop="step">Mix ingredients...</li>
```

**Extraction**: CSS selectors for `itemprop` attributes

### CSS Selectors (Priority 3)
Common class/element patterns:
```html
<ul class="ingredients">
  <li>2 cups flour</li>
</ul>
```

**Extraction**: CSS selectors for common class names

## Error Handling

### Rate Limiting
- If Gemini returns 429 error: "Too many searches, please wait"
- Client should retry after 1 minute

### No Results
- If grounding returns no URLs: "No recipes found"
- If all scrapes fail: Return empty array
- If recipe detail fails: Show basic info only

### Scraping Failures
- Each recipe has 10s timeout
- Failed scrapes return `null` and are filtered out
- At least 1 valid recipe required for results

## Performance Optimizations

### 1. No AI for Scraping
- **Before**: 9-12 API calls per search (hit rate limit)
- **After**: 2 API calls per search (5x more searches)

### 2. JSON-LD Priority
- Fastest extraction method
- Most reliable (structured data)
- Works on 90%+ of recipe sites

### 3. Parallel Processing
- URL resolution: Parallel with 5s timeout per URL
- Recipe scraping: Parallel with 10s timeout per recipe
- Typical search: 3-5 seconds total

### 4. URL Filtering
- Eliminates collection pages (better quality results)
- Reduces failed scrapes (only individual recipes)

## Supported Recipe Sites

| Site | Data Format | Ingredients | Instructions | Nutrition |
|------|-------------|-------------|--------------|-----------|
| Delish | JSON-LD (HowToStep) | ✅ | ✅ | ✅ |
| AllRecipes | JSON-LD | ✅ | ✅ | ✅ |
| Bon Appétit | JSON-LD | ✅ | ✅ | ✅ |
| Epicurious | JSON-LD | ✅ | ✅ | ✅ |
| Food Network | Schema.org + HTML | ✅ | ✅ | ⚠️ |
| Serious Eats | HTML Selectors | ✅ | ✅ | ❌ |
| Simply Recipes | JSON-LD | ✅ | ✅ | ✅ |
| Taste of Home | JSON-LD | ✅ | ✅ | ✅ |

**Legend**: ✅ Full support | ⚠️ Partial support | ❌ Not available

## Future Improvements

1. **Caching**: Redis/localStorage for scraped recipes
2. **Rate limiting middleware**: Queue with delays
3. **Retry logic**: Exponential backoff for failed scrapes
4. **User preferences**: Filter by diet, cuisine, difficulty
5. **Advanced filters**: Cook time, ingredient count, rating
6. **Recipe saving**: Bookmark favorite recipes
7. **Shopping lists**: Generate from recipe ingredients
