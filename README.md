# I'm Cooked 🍳

Your AI cooking coach that provides hands-free, step-by-step voice guidance while you cook. No more constantly checking your phone with messy hands.

## What Makes I'm Cooked Different?

**I'm Cooked** transforms cooking from following static recipes to an interactive coaching session. Find any recipe from 27+ cooking websites, customize it to your needs, then let the AI guide you through every step with voice commands—completely hands-free.

### The Experience

1. **🔍 Discover** - Natural language AI search across 27+ cooking sites
2. **🎨 Customize** - Adjust for dietary needs, portions, and ingredient swaps
3. **🎙️ Cook** - Start a voice-guided session with your AI cooking coach
4. **💬 Interact** - Ask questions, get tips, track timers—all hands-free
5. **📊 Track** - Save sessions, notes, and build your recipe collection

## Key Features

- 🎙️ **Voice-First Cooking Sessions** - Completely hands-free, step-by-step guidance
- 🤖 **AI Cooking Coach** - Real-time help, not just static instructions
- ⏱️ **Smart Timer Management** - AI tracks and reminds you automatically
- 🔄 **Recipe Customization** - Dietary restrictions, portions, ingredient substitutions
- 🔍 **Intelligent Search** - Find recipes using natural language across 27+ sites
- 💬 **Ask Anything While Cooking** - "How do I julienne?" "Can I substitute butter?"
- 🎯 **Technique Guidance** - Tips, troubleshooting, and progress checkups
- 📚 **Session History** - Track what you've cooked, save favorites with notes

## Supported Recipe Sites

We support 27 popular recipe websites:

1. **AllRecipes** - allrecipes.com
2. **The Kitchn** - thekitchn.com
3. **Simply Recipes** - simplyrecipes.com
4. **Bon Appétit** - bonappetit.com
5. **Epicurious** - epicurious.com
6. **Food Network** - foodnetwork.com
7. **Taste of Home** - tasteofhome.com
8. **King Arthur Baking** - kingarthurbaking.com
9. **Sally's Baking Addiction** - sallysbakingaddiction.com
10. **Minimalist Baker** - minimalistbaker.com
11. **Pinch of Yum** - pinchofyum.com
12. **Cookie and Kate** - cookieandkate.com
13. **Budget Bytes** - budgetbytes.com
14. **The Woks of Life** - thewoksoflife.com
15. **Just One Cookbook** - justonecookbook.com
16. **Maangchi** - maangchi.com
17. **Rasa Malaysia** - rasamalaysia.com
18. **Veg Recipes of India** - vegrecipesofindia.com
19. **Immaculate Bites** - immaculatebites.com
20. **Mexico in My Kitchen** - mexicoinmykitchen.com
21. **Gimme Some Oven** - gimmesomeoven.com
22. **Love and Lemons** - loveandlemons.com
23. **Cafe Delites** - cafedelites.com
24. **Natasha's Kitchen** - natashaskitchen.com
25. **Tasty** - tasty.co
26. **Joshua Weissman** - joshuaweissman.com
27. **Sorted Food** - sortedfood.com

## Tech Stack

- **Next.js 16** - React framework with App Router
- **React 19** - Server Components
- **TypeScript** - Strict mode enabled
- **Gemini AI 2.0** - Conversational AI and recipe understanding
- **Web Speech API** - Voice interaction and synthesis
- **Tailwind CSS v4** - Styling framework
- **shadcn/ui** - Accessible UI components
- **Cheerio** - Recipe scraping from 27+ sites

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Google Gemini API key ([Get one here](https://aistudio.google.com/app/apikey))
- Modern browser with Web Speech API support (Chrome, Edge, Safari)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd im-cooked
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   
   
   Edit `.env.local` and add your Gemini API key:
   ```env
   GEMINI_API_KEY=your_api_key_here
   
   # Optional: Specify Gemini model (defaults to 'models/gemini-1.5-flash')
   GEMINI_MODEL=models/gemini-1.5-flash
   ```
   
   **Note on Gemini Models:**
   - Model names must include the `models/` prefix
   - If you get a "model not found" error, try these in order:
     1. `models/gemini-1.5-flash` (default, fastest)
     2. `models/gemini-1.5-pro` (more capable)
     3. `models/gemini-pro` (older, most compatible)
   - Run the test script below to find which model works for your API key
4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   
   Navigate to [http://localhost:3000](http://localhost:3000)

## Usage

### Start a Cooking Session

1. **Find a Recipe** - Search using natural language (e.g., "healthy chicken dinner for 4")
2. **Customize** - Adjust servings, swap ingredients, note dietary restrictions
3. **Start Session** - Click "Start Cooking" to begin voice-guided experience
4. **Cook Hands-Free** - AI guides you step-by-step with voice commands:
   - "Next step" - Move to next instruction
   - "Repeat" - Hear current step again
   - "Set timer for 10 minutes" - AI manages all timers
   - "How do I dice an onion?" - Get instant technique help
   - "Can I use olive oil instead?" - Ask about substitutions
5. **Complete** - Session saved with your notes and any modifications

### Voice Commands During Cooking

- **Navigation**: "Next step", "Previous step", "Repeat"
- **Timers**: "Set timer for X minutes", "How much time left?", "Cancel timer"
- **Questions**: "How do I [technique]?", "Can I substitute X for Y?", "What temperature?"
- **Status**: "What's next?", "How many steps left?", "Read ingredients"

### Search & Customize Recipes

1. Use natural language to search: "quick vegetarian pasta", "gluten-free dessert"
2. AI searches 27+ recipe sites and shows results with source attribution
3. Click any recipe to view details and customize
4. Adjust servings, note allergies, plan ingredient swaps
5. Save to your collection or start cooking immediately

## Tech Stack

- **Next.js 16** - React framework with App Router
- **React 19** - Server Components
- **TypeScript** - Strict mode enabled
- **Gemini AI 2.0** - Conversational AI and recipe understanding
- **Web Speech API** - Voice interaction and synthesis
- **Tailwind CSS v4** - Styling framework
- **shadcn/ui** - Accessible UI components
- **Cheerio** - Recipe scraping from 27+ sites

## Project Structure

```
im-cooked/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── sessions/
│   │   │   │   ├── [id]/route.ts          # Get/update/delete cooking session
│   │   │   │   ├── route.ts               # Create session, get all sessions
│   │   │   │   └── active/route.ts        # Get active session
│   │   │   ├── recipes/
│   │   │   │   ├── [id]/route.ts          # Get/delete single recipe
│   │   │   │   ├── route.ts               # Get all recipes
│   │   │   │   ├── scrape-and-save/route.ts  # Combined scrape + save
│   │   │   │   ├── search/route.ts        # AI-powered recipe search
│   │   │   │   └── customize/route.ts     # Customize recipe (servings, substitutions)
│   │   │   ├── chat/route.ts              # Conversational AI during cooking
│   │   │   ├── voice/route.ts             # Voice command processing
│   │   │   ├── normalize/route.ts         # AI recipe normalization
│   │   │   └── scrape/route.ts            # Web scraping
│   │   ├── session/[id]/page.tsx          # Active cooking session page
│   │   ├── recipe/[id]/page.tsx           # Recipe detail & customization
│   │   ├── globals.css                    # Global styles
│   │   ├── layout.tsx                     # Root layout
│   │   └── page.tsx                       # Home page (search & browse)
│   ├── components/
│   │   ├── ui/                            # shadcn/ui components
│   │   ├── cooking-session.tsx            # Voice-guided cooking interface
│   │   ├── voice-controls.tsx             # Voice input/output controls
│   │   ├── timer-manager.tsx              # Active timer tracking
│   │   ├── recipe-customizer.tsx          # Customize servings, ingredients
│   │   ├── chat-assistant.tsx             # In-session AI chat
│   │   ├── recipe-card.tsx                # Recipe card component
│   │   └── recipe-search.tsx              # AI-powered search interface
│   ├── lib/
│   │   ├── ai.ts                          # Gemini AI integration
│   │   ├── voice.ts                       # Web Speech API wrapper
│   │   ├── session-manager.ts             # Cooking session state
│   │   ├── recipe-search.ts               # Multi-site search engine
│   │   ├── recipe-store.ts                # Recipe storage
│   │   ├── scraper.ts                     # Web scraping logic
│   │   └── utils.ts                       # Utility functions
│   └── types/
│       ├── recipe.ts                      # Recipe interfaces
│       └── session.ts                     # Cooking session interfaces
├── .env.example                           # Environment template
└── package.json                           # Dependencies and scripts
```

## API Routes

### Cooking Sessions
```
POST /api/sessions
Body: { "recipeId": "123" }
Creates a new cooking session

GET /api/sessions
Returns all past cooking sessions

GET /api/sessions/active
Returns current active session

GET /api/sessions/[id]
Returns specific session details

PATCH /api/sessions/[id]
Body: { "currentStep": 3, "notes": "Added extra garlic" }
Updates session progress

DELETE /api/sessions/[id]
Deletes a session
```

### Voice Interaction
```
POST /api/voice
Body: { "command": "next step", "sessionId": "123" }
Processes voice command during cooking session
```

### AI Chat (During Cooking)
```
POST /api/chat
Body: { 
  "message": "How do I know when the sauce is ready?",
  "sessionId": "123",
  "conversationHistory": [...]
}
Conversational help during cooking
```

### Recipe Management
```
GET /api/recipes/search?q=healthy+dinner
AI-powered recipe search across 27+ sites

POST /api/recipes/customize
Body: { "recipeId": "123", "servings": 6, "substitutions": {...} }
Customize recipe for your needs

POST /api/scrape
Body: { "url": "https://www.allrecipes.com/..." }
Scrape recipe from supported site

POST /api/normalize
Body: { "rawRecipe": { ... } }
Normalize recipe with AI

POST /api/recipes/scrape-and-save
Body: { "url": "https://www.allrecipes.com/..." }
Scrape and save to collection

GET /api/recipes
Get all saved recipes

GET /api/recipes/[id]
Get single recipe

DELETE /api/recipes/[id]
Delete recipe
```

## Available Scripts

- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint

## Known Limitations

- **Browser Compatibility** - Web Speech API requires Chrome, Edge, or Safari
- **In-Memory Storage** - Data stored in memory, lost on server restart (database coming soon)
- **No Authentication** - Single-user experience currently
- **Voice Recognition** - Accuracy depends on browser and environment noise
- **Timer Management** - Web-based, won't work if browser/tab closed

## Future Enhancements

- [ ] Persistent database storage (PostgreSQL/MongoDB)
- [ ] User authentication and multi-user support
- [ ] Mobile app with native voice integration
- [ ] Offline cooking sessions
- [ ] Video technique demonstrations
- [ ] Meal planning and grocery lists
- [ ] Nutritional information and dietary tracking
- [ ] Social features (share recipes, cooking sessions)
- [ ] Smart home integration (control timers on devices)
- [ ] Recipe scaling and batch cooking optimization

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

See [LICENSE](LICENSE) for more information.

## Acknowledgments

- Built with [shadcn/ui](https://ui.shadcn.com/)
- Powered by [Google Gemini AI](https://ai.google.dev/)
- Recipe data sourced from publicly available recipe websites

## Ethics & Security

We take AI safety and responsible scraping seriously. Read our [Ethics & Responsible AI Usage](docs/ethics.md) documentation to learn about:

- Prompt injection prevention
- Web scraping ethics and rate limiting
- SSRF protection measures
- Data privacy and security practices
- Responsible AI principles

All recipe scraping respects source attribution and rate limits to protect both users and content creators.


## Troubleshooting

### "Model not found" Error

If you see an error like `models/gemini-xxx is not found for API version v1beta`:

**Quick Fix - Run the Model Tester:**

1. Create a file `test-models.mjs` in your project root:
   ```javascript
   import { GoogleGenerativeAI } from '@google/generative-ai';

   const apiKey = process.env.GEMINI_API_KEY;
   if (!apiKey) {
     console.log('❌ Set GEMINI_API_KEY first');
     process.exit(1);
   }

   const genAI = new GoogleGenerativeAI(apiKey);
   const modelsToTest = [
     'models/gemini-1.5-flash',
     'models/gemini-1.5-pro', 
     'models/gemini-pro',
     'gemini-1.5-flash',
     'gemini-1.5-pro',
     'gemini-pro',
   ];

   for (const modelName of modelsToTest) {
     try {
       console.log(`Testing: "${modelName}"`);
       const model = genAI.getGenerativeModel({ model: modelName });
       const result = await model.generateContent('Hello');
       await result.response;
       console.log(`  ✅ SUCCESS! Use: GEMINI_MODEL=${modelName}\n`);
       process.exit(0);
     } catch (error) {
       console.log(`  ❌ Failed\n`);
     }
   }
   console.log('❌ No models worked. Check your API key.');
   ```

2. Run it:
   ```bash
   GEMINI_API_KEY=your_key_here node test-models.mjs
   ```

3. Copy the working model name to your `.env.local`:
   ```env
   GEMINI_MODEL=models/gemini-1.5-flash  # or whatever worked
   ```

**Manual Fix:**

Try these model names in your `.env.local` (restart server after each):
```env
GEMINI_MODEL=models/gemini-1.5-flash  # Try this first
GEMINI_MODEL=models/gemini-1.5-pro    # Then this
GEMINI_MODEL=models/gemini-pro        # Last resort
```

### API Key Issues

- Get your API key from [Google AI Studio](https://aistudio.google.com/app/apikey)
- Ensure the key has access to the Gemini API
- Check that there are no extra spaces or quotes in your `.env.local` file
- The key should start with `AIza...`

### Recipe Not Scraping

- Ensure the recipe URL is from a supported site (see Supported Recipe Sites section)
- Some sites may have changed their HTML structure
- Try using the AI search feature to find alternative sources

### Voice Commands Not Working

- Check browser compatibility (Chrome, Edge, Safari recommended)
- Grant microphone permissions when prompted
- Ensure you're using HTTPS (required for Web Speech API)
- Try refreshing the page to reinitialize voice recognition
- Check for background noise that may interfere with recognition
