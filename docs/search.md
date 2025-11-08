# Recipe Search System Documentation

## Overview

The recipe search system scrapes recipes directly from **AllRecipes.com** using **cheerio** (no AI calls for search or scraping to avoid rate limits).

## Architecture

```
User Query
    ↓
AllRecipes.com Search Page Scraping (Cheerio)
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
**Purpose**: Search for recipes by scraping AllRecipes.com search results

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

### Step 1: AllRecipes.com Search
- Fetch search results from `https://www.allrecipes.com/search?q={query}&offset={page_offset}`
- Parse HTML with cheerio
- Extract recipe URLs using CSS selector: `a.mntl-card-list-card--extendable`
- Pagination support: 24 results per page
- **API Calls**: 0 Gemini requests

### Step 2: Recipe Scraping
- Fetch HTML for each recipe URL
- Parse with cheerio (CSS selectors)
- Extract metadata:
  - Title: `h1`, `og:title`, `title` tag
  - Image: `og:image`, recipe images
  - Description: `meta[name="description"]`
  - Times: Schema.org `itemprop`, common classes
  - Difficulty: Auto-calculated from cook time
- **API Calls**: 0 Gemini requests (cheerio only!)

### Step 3: Recipe Details (On-Demand)
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
| AllRecipes Search | 0 |
| Recipe Scraping (×24) | 0 |
| Recipe Details | 0 |
| **TOTAL** | **0 calls** |

**No rate limits** - Direct web scraping only

## URL Filtering

### Supported Domain
Only recipes from:
- allrecipes.com (~65K recipes)

**Total Coverage**: ~65,000 recipes

### URL Extraction
Recipe URLs are extracted directly from AllRecipes.com search results using the CSS selector `a.mntl-card-list-card--extendable`.

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

### No Results
- If AllRecipes search returns no URLs: "No recipes found"
- If all scrapes fail: Return empty array
- If recipe detail fails: Show basic info only

### Scraping Failures
- Each recipe has 10s timeout
- Failed scrapes return `null` and are filtered out
- At least 1 valid recipe required for results

## Performance Optimizations

### 1. No AI for Search or Scraping
- **Before**: 2 API calls per search (Google Search Grounding + Intent)
- **After**: 0 API calls per search (direct AllRecipes scraping)

### 2. JSON-LD Priority
- Fastest extraction method
- Most reliable (structured data)
- Works on 90%+ of recipe sites

### 3. Parallel Processing
- Recipe scraping: Parallel with 10s timeout per recipe
- Typical search: 2-4 seconds total

## Supported Recipe Site

| Site | Data Format | Ingredients | Instructions | Nutrition |
|------|-------------|-------------|--------------|-----------|
| AllRecipes | JSON-LD | ✅ | ✅ | ✅ |

**Legend**: ✅ Full support

## Future Improvements

1. **Caching**: Redis/localStorage for scraped recipes
2. **Rate limiting middleware**: Queue with delays
3. **Retry logic**: Exponential backoff for failed scrapes
4. **User preferences**: Filter by diet, cuisine, difficulty
5. **Advanced filters**: Cook time, ingredient count, rating
6. **Recipe saving**: Bookmark favorite recipes
7. **Shopping lists**: Generate from recipe ingredients
