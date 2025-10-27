# Quick Start Guide - Recipe Search Feature

## Setup (2 minutes)

1. **Add your Gemini API Key**
   ```bash
   # Edit .env.local and replace 'your_api_key_here' with your actual key
   # Get key from: https://aistudio.google.com/app/apikey
   GEMINI_API_KEY=your_actual_api_key_here
   GEMINI_MODEL=gemini-2.0-flash-lite
   ```

2. **Install dependencies** (if not already done)
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```

4. **Open the app**
   - Navigate to http://localhost:3000/dashboard

## Testing the Feature

### Try These Searches:
1. **"chocolate chip cookies"** - Should show recipe cards
2. **"pasta carbonara"** - Should show Italian recipes
3. **"easy desserts"** - Should show simple dessert recipes
4. **"healthy dinner ideas"** - Should show healthy dinner options

### What to Expect:
1. Type your search in the input box
2. Click Send or press Enter
3. See loading state (3 skeleton cards)
4. View recipe cards with images, times, and difficulty
5. Click a card to see full recipe details
6. Use pagination if more than 3 results
7. Click "Back" to return to dashboard

## Troubleshooting

### No recipes found?
- Web scraping may be blocked by anti-bot protection
- Try a different, more specific query
- Check console for errors

### API errors?
- Verify Gemini API key is valid
- Check you have API credits
- Ensure .env.local is in the root directory

### Build errors?
```bash
# Clean and rebuild
rm -rf .next
npm run build
```

## Architecture Overview

```
User Input → Intent Detection (Gemini) → Recipe Search
                                              ↓
                                    Web Scraping (Cheerio)
                                              ↓
                                    AI Structuring (Gemini)
                                              ↓
                                    Display Results → Click Card → Detail Page
```

## File Structure
```
src/
├── app/
│   ├── api/
│   │   ├── intent/route.ts          # Intent detection API
│   │   └── recipes/
│   │       ├── search/route.ts      # Recipe search API
│   │       └── [id]/route.ts        # Recipe detail API
│   ├── dashboard/page.tsx            # Main chat UI (updated)
│   └── recipe/[id]/
│       ├── page.tsx                  # Recipe detail page
│       └── client.tsx                # Recipe detail client
├── components/
│   ├── recipe-card.tsx               # Recipe card component
│   ├── recipe-results.tsx            # Results grid with pagination
│   └── ui/
│       └── pagination.tsx            # Pagination component (added)
├── lib/
│   └── gemini.ts                     # Gemini AI service
└── types/
    └── recipe.ts                     # TypeScript types
```

## Next Steps

### Recommended Improvements:
1. **Replace web scraping with Recipe API**
   - Spoonacular: https://spoonacular.com/food-api
   - Edamam: https://www.edamam.com/
   - TheMealDB: https://www.themealdb.com/api.php

2. **Add features:**
   - Save favorite recipes
   - Create shopping lists
   - Add recipe ratings
   - Filter by dietary restrictions

3. **Performance:**
   - Add caching (Redis or localStorage)
   - Optimize images with Next.js Image
   - Add server-side caching

## Support

Check RECIPE_IMPLEMENTATION.md for:
- Complete implementation details
- API documentation
- Known limitations
- Troubleshooting guide
