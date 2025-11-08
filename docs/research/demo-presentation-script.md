# I'm Cooked: System Demonstration - Safety & Responsible AI

## Presentation Overview

**Duration**: 10-15 minutes  
**Focus**: Safety features, responsible AI implementation, and user autonomy  
**Target Audience**: Technical stakeholders, AI ethics reviewers, product team  
**Demo Persona**: Aisha (home cook with peanut allergy)

---

## Part 1: Introduction (2 minutes)

### Opening Statement

> "I'm Cooked is an AI-powered cooking assistant that helps users adapt recipes, get cooking guidance, and manage their kitchen experience. But what makes it special isn't just what it does—it's how it keeps users safe while doing it."

### Key Statistics
- **3 layers** of safety filtering
- **Triple validation** for dietary restrictions
- **Zero tracking** - all data stays on user's device
- **100% transparent** AI decision-making

---

## Part 2: Meet Aisha - Our Demo Persona (1 minute)

### Aisha's Profile
- **Background**: Home cook, moderate experience
- **Safety Concern**: Severe peanut allergy (life-threatening)
- **Additional Preferences**: Vegetarian, dislikes cilantro
- **Use Case**: Wants to make Thai curry but needs to ensure it's safe

### Why This Matters
Aisha represents real users who need AI assistance but can't afford mistakes. One wrong substitution could be dangerous.

---

## Part 3: Safety Feature #1 - Allergen Protection System (3 minutes)

### Demo Flow: Setting Up Preferences

#### Screen 1: Preferences Dialog
**Show**: `/dashboard` → Click "Preferences" button

**Key UI Elements to Highlight**:
```
Visual Hierarchy:
🔴 Red badges = Allergies (safety-critical)
🟢 Green badges = Dietary restrictions  
🟠 Orange badges = Dislikes
```

**Demo Actions**:
1. Click "Peanuts" in Allergies section
2. Click "Tree nuts" to be extra safe
3. Add custom allergen: "Peanut oil"
4. Select "Vegetarian" in dietary restrictions
5. Add "Cilantro" to dislikes
6. Save preferences

**Talking Point**:
> "Notice how allergies are visually distinct with red badges. This isn't just design—it's a safety signal that flows through our entire system."

---

### Demo Flow: Triple Validation in Action

#### Layer 1: UI Prevention
**Show**: Substitution dialog code snippet

```typescript
// preferences-dialog.tsx lines 89-103
// Allergies are stored separately and treated as safety-critical
const updatedPreferences = {
  allergens: newAllergies,  // ← Separate storage
  dietaryRestrictions: newRestrictions,
  // ... other preferences
}
```

**Talking Point**:
> "At the UI level, allergies are stored in a dedicated field. They're not mixed with general preferences—they're safety constraints."

---

#### Layer 2: API Route Validation
**Show**: Substitution API route

```typescript
// /api/recipes/substitute/route.ts lines 15-23
const preferences = preferencesManager.getPreferences();
const allergens = Array.from(
  new Set([
    ...(preferences?.allergens || []),
    ...(requestBody.allergens || []),
  ])
);
```

**Talking Point**:
> "Before any AI interaction, the API merges allergies from two sources: saved preferences AND explicit request parameters. We never assume the UI is the only source of truth."

---

#### Layer 3: AI Prompt Enforcement
**Show**: Substitution prompt template

```typescript
// substitution.ts lines 30-39
IMPORTANT PRIORITIES:
- Taste preservation is the highest priority
- Dietary restrictions MUST be respected
- Allergen avoidance is CRITICAL for safety

User has the following dietary restrictions:
${formatDietaryRestrictions(restrictions)}

${allergens.length > 0 ? `
CRITICAL: User is allergic to: ${allergens.join(", ")}
ABSOLUTELY DO NOT suggest these ingredients or any derivatives.
` : ""}
```

**Talking Point**:
> "The AI receives explicit CRITICAL instructions. Notice the all-caps emphasis and 'ABSOLUTELY DO NOT' directive. We're not politely asking—we're setting hard boundaries."

---

### Demo Flow: Substitution Request with Allergy Check

**Show**: Search for "Thai Peanut Curry" recipe

**Demo Actions**:
1. Find recipe containing peanuts and peanut butter
2. Click "Find Substitutes" for peanut butter
3. **Observe**: AI suggests alternatives like:
   - Sunflower seed butter (peanut-free)
   - Tahini (sesame-based)
   - Cashew butter (would be rejected due to tree nut allergy)

**Show**: Substitution card with impact explanation

```
Suggested: Sunflower Seed Butter
Impact:
✓ Taste: Slightly milder, nutty flavor preserved
✓ Texture: Similar creamy consistency
✓ Safety: Peanut-free, tree nut-free
⚠ Nutrition: Lower protein content
```

**Talking Point**:
> "The AI doesn't just suggest alternatives—it explains the tradeoffs. Aisha can make an informed decision about whether sunflower seed butter works for her needs. Transparency builds trust."

---

## Part 4: Safety Feature #2 - Anti-Sycophancy System (3 minutes)

### The Problem: AI That Says "Yes" to Everything

**Scenario Setup**:
> "AI models are trained to be helpful. Sometimes *too* helpful. They might answer questions outside their expertise or follow harmful instructions just to please the user."

**Our Solution**: Multi-layer boundary enforcement

---

### Demo Flow: Boundary Testing (Dashboard)

#### Test 1: Obviously Off-Topic (Fast Rejection)
**Show**: Dashboard search bar

**Demo Actions**:
1. Type: "What's the weather like today?"
2. **Observe**: Instant rejection (no AI call)

```
Response: "I'm here to help with recipes and cooking! 
Try asking me to find a recipe or answer cooking questions."
```

**Show Code**: Fast pre-filter logic

```typescript
// /api/recipes/detect-intent/route.ts lines 12-31
// Layer 1: Fast pre-filtering (no AI call needed)
const keywords = ['weather', 'stock', 'sports', 'news', 'politics'];
if (keywords.some(k => query.includes(k))) {
  // Check for exceptions
  if (!query.match(/(oven|cooking|baking|kitchen)/i)) {
    return NextResponse.json({
      intent: 'REJECT',
      message: randomRejection()
    });
  }
}
```

**Talking Point**:
> "Layer 1 catches obvious cases instantly. No AI call, no cost, no latency. But we have exceptions—if someone asks 'oven temperature,' that's cooking-related despite the word 'temperature.'"

---

#### Test 2: Subtle Off-Topic (LLM Detection)
**Demo Actions**:
1. Type: "Tell me about the history of the French Revolution"
2. **Observe**: ~200ms delay, then polite rejection

```
Response: "That's outside my cooking expertise! 
I can help you find recipes or answer questions about ingredients."
```

**Show Code**: LLM intent detection

```typescript
// intent-detection.ts lines 10-29
export const intentDetectionPrompt = (query: string) => `
You are a cooking assistant. Classify this query:

RECIPE_SEARCH: "find me pasta recipes", "show desserts"
GENERAL_FOOD_QUESTION: "what is blanching", "best way to store herbs"  
REJECT: Anything not related to food, cooking, or recipes

Query: "${query}"

IMPORTANT: You must REJECT off-topic queries even if you know the answer.
`;
```

**Talking Point**:
> "Layer 2 uses the LLM to understand nuanced cases. The prompt explicitly says 'even if you know the answer'—we're fighting the model's instinct to be helpful beyond its scope."

---

### Demo Flow: Boundary Testing (Cooking Session)

#### Test 3: In-Context Sycophancy Prevention
**Show**: Active cooking session with Thai curry

**Demo Actions**:
1. Ask: "Can you help me with my math homework?"
2. **Observe**: Rejection with context awareness

```
Response: "Let's keep focused on making your Thai curry! 
Do you need help with the next step?"
```

**Show Code**: Cooking session boundaries

```typescript
// cooking-assistant.ts lines 28-42
CRITICAL BOUNDARIES - What You Can Do:
✅ Answer questions about the current recipe
✅ Explain cooking techniques
✅ Suggest ingredient substitutions
✅ Provide timing guidance
✅ Help troubleshoot cooking issues

CRITICAL BOUNDARIES - What You CANNOT Do:
❌ Answer non-cooking questions (weather, news, homework, etc.)
❌ Provide medical or health advice
❌ Access external information or browse the web
❌ Make changes to the recipe without user confirmation

If asked something outside your scope, politely redirect 
to cooking and DO NOT answer even if you know the answer.
```

**Talking Point**:
> "Notice the explicit ✅/❌ list. We're using visual formatting to make boundaries unmissable. And we provide a rejection template: 'politely redirect to cooking.'"

---

## Part 5: Safety Feature #3 - Transparent Decision-Making (2 minutes)

### The Principle: No Black Box Decisions

**Show**: Substitution dialog with full transparency

#### Demo Flow: Apply Substitution

**Demo Actions**:
1. Accept sunflower seed butter substitution
2. Click "Apply" to modify recipe
3. **Show**: Processing transparency

```
Analyzing recipe context...
✓ Dish Type: Main dish (curry)
✓ Cuisine: Thai
✓ Cooking Method: Stovetop simmering
✓ Key Flavors: Spicy, savory, creamy

Updating recipe with substitution...
✓ Changed: Peanut butter → Sunflower seed butter
✓ Instructions updated: Step 3 adjusted for consistency
✓ Nutritional impact: Protein reduced ~15%
```

**Show Code**: Context analysis prompt

```typescript
// apply-substitution.ts lines 40-48
DISH CONTEXT ANALYSIS (required):
- Dish Type: ${recipe.dishTypes?.[0] || "Not specified"}
- Cuisine: ${recipe.cuisines?.[0] || "Not specified"}
- Cooking Method: Determine from instructions
- Key Flavors: Identify primary flavor profile

Explain how this substitution affects:
1. Taste (be honest about compromises)
2. Texture
3. Cooking time/temperature
4. Nutritional profile
```

**Talking Point**:
> "Before making changes, the AI analyzes context and explains every decision. Users aren't blindly trusting—they're informed partners in the cooking process."

---

### Demo Flow: Instruction Updates with Reasoning

**Show**: Modified recipe view

**Highlight Changes**:
```
Original Step 3:
"Add peanut butter and stir until fully dissolved, about 2 minutes."

Modified Step 3:
"Add sunflower seed butter and stir until fully dissolved, about 2 minutes. 
Note: Sunflower seed butter has a milder flavor, so you may want to add 
an extra tablespoon of curry paste for depth."

Reason for change: Sunflower seed butter is less oily than peanut butter, 
affecting texture. Additional curry paste compensates for flavor difference.
```

**Talking Point**:
> "The AI doesn't just swap words—it thinks through cooking implications. It knows sunflower seed butter behaves differently and proactively suggests adjustments."

---

## Part 6: Privacy & Data Governance (2 minutes)

### The Architecture: Client-Side First

**Show Diagram**:
```
┌─────────────────────┐
│   User's Browser    │
│                     │
│  ┌───────────────┐  │
│  │  localStorage │  │ ← All preferences here
│  │  - Allergies  │  │
│  │  - Diet prefs │  │
│  │  - Dislikes   │  │
│  └───────────────┘  │
│                     │
└─────────────────────┘
         │
         │ Only sends preferences
         │ with each request
         ↓
┌─────────────────────┐
│   API Routes        │
│                     │
│  ❌ No database     │
│  ❌ No user accounts│
│  ❌ No tracking     │
│  ❌ No persistence  │
└─────────────────────┘
```

**Show Code**: Preferences manager

```typescript
// preferences-manager.ts lines 20-32
export const preferencesManager = {
  savePreferences: (preferences: UserPreferences) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(
      PREFERENCES_KEY,
      JSON.stringify(preferences)
    );
  },
  
  getPreferences: (): UserPreferences | null => {
    if (typeof window === 'undefined') return null;
    const stored = localStorage.getItem(PREFERENCES_KEY);
    return stored ? JSON.parse(stored) : null;
  }
};
```

**Talking Point**:
> "All sensitive data—especially health information like allergies—stays on the user's device. We never create accounts, never track behavior, never store preferences server-side. Privacy by architecture, not by policy."

---

### What This Means for Users

**Benefits**:
- ✅ No data breaches (we don't have your data)
- ✅ No cross-device tracking
- ✅ No targeted advertising
- ✅ No terms of service violations
- ✅ Works offline (once recipes loaded)

**Tradeoffs**:
- ⚠️ Preferences don't sync across devices
- ⚠️ Clearing browser data = losing preferences

**Talking Point**:
> "We believe users should own their data. The tradeoff is less convenience (no cloud sync), but the benefit is complete privacy and control."

---

## Part 7: User Autonomy & Control (2 minutes)

### Principle: AI Suggests, User Decides

**Show**: Substitution workflow (full flow)

#### Step 1: User Initiates
```
User clicks "Find Substitutes" 
→ Not automatic, not hidden
```

#### Step 2: AI Analyzes & Suggests
```
Shows multiple options with pros/cons
→ Not a single "right answer"
```

#### Step 3: User Reviews
```
Can read full impacts before accepting
→ Informed consent
```

#### Step 4: User Approves
```
Clicks "Apply" to confirm
→ Reversible action
```

#### Step 5: Changes Tracked
```
Modified recipe shows what changed
→ Transparency & auditability
```

---

### Demo Flow: Voice Control Boundaries

**Show**: Cooking session voice mode

**Demo Actions**:
1. Say: "Set a timer for 10 minutes"
   - ✅ **Allowed**: Creates timer, confirms verbally

2. Say: "Skip to step 5"
   - ✅ **Allowed**: Navigates, confirms action

3. Say: "Add 2 cups of sugar to the recipe"
   - ❌ **Rejected**: Recipe modifications require visual confirmation

**Show Code**: Function calling restrictions

```typescript
// cooking-tools.ts lines 80-92
{
  name: "navigate_recipe_step",
  description: "Navigate to a specific recipe step (next/previous/number)",
  parameters: {
    // ...
  }
}

// IMPORTANT: Only call this function ONCE per user request
// IMPORTANT: Recipe modifications NOT available via voice
//            (require visual confirmation for safety)
```

**Talking Point**:
> "Voice control is convenient but risky—users can't verify what they said, and misheard commands could cause problems. So we limit voice functions to safe, reversible actions: timers, navigation, questions. Recipe changes require visual interaction."

---

## Part 8: What We DON'T Do (Safety by Omission) (1 minute)

### Boundaries We Won't Cross

**Medical Advice**
```
User: "Is this recipe safe for diabetics?"
AI: "I can't provide medical advice. Please consult 
     with a healthcare provider about dietary needs 
     for diabetes."
```

**Nutritional Claims**
```
User: "Is this recipe healthy?"
AI: "I can describe the nutritional content, but 'healthy' 
     depends on individual needs. This recipe contains 
     [nutrients], which may fit different dietary goals."
```

**Food Safety Beyond Basics**
```
User: "Can I leave chicken at room temp for 3 hours?"
AI: "I can share general food safety guidelines (chicken 
     should not be at room temperature for more than 2 hours), 
     but for specific situations, check USDA guidelines or 
     consult a food safety expert."
```

**Talking Point**:
> "We've identified areas where AI can cause harm by being overconfident. In these cases, our AI defers to human experts and official resources. It's better to admit limitations than give harmful advice."

---

## Part 9: Safety Gaps & Future Improvements (1 minute)

### Known Limitations (Honest Disclosure)

**Gap 1: Temperature Validation**
- **Current**: Generic food safety reminders
- **Ideal**: USDA safe cooking temperature database integration
- **Risk**: Users might undercook meat based on recipe typos

**Gap 2: Cross-Contamination Warnings**
- **Current**: Allergen avoidance in ingredients only
- **Ideal**: Warnings about shared cutting boards, utensils
- **Risk**: Trace allergen exposure in home kitchens

**Gap 3: Accessibility**
- **Current**: Basic screen reader support
- **Ideal**: Voice-first navigation for vision-impaired users
- **Risk**: Some safety features (red badges) rely on visual cues

**Talking Point**:
> "We're transparent about what we haven't built yet. These gaps don't make the system unsafe, but they represent opportunities to make it even safer. Honest disclosure is part of responsible AI."

---

## Part 10: Conclusion - Responsible AI in Practice (1 minute)

### Summary of Safety Layers

**Technical Safeguards**:
- ✅ 3-layer intent filtering (fast reject → LLM detection → prompt boundaries)
- ✅ Triple allergen validation (UI → API → AI prompt)
- ✅ Client-side data storage (zero tracking)
- ✅ Function calling restrictions (safe operations only)

**Design Safeguards**:
- ✅ Visual safety indicators (red/green/orange badges)
- ✅ Transparent decision-making (all impacts explained)
- ✅ User approval required (no automatic changes)
- ✅ Reversible actions (modified recipes can be abandoned)

**Ethical Safeguards**:
- ✅ Medical advice refusal (defer to experts)
- ✅ Honest about limitations (gap disclosure)
- ✅ User data ownership (privacy by design)
- ✅ Anti-sycophancy (reject off-topic requests)

---

### The Result: AI That Respects Users

**For Aisha**:
- Her peanut allergy is protected at every interaction point
- She understands every AI decision before it affects her recipe
- Her data never leaves her device
- She maintains full control over modifications

**For All Users**:
- Safety is built-in, not bolted-on
- Transparency is default, not optional
- Privacy is architectural, not promised
- Autonomy is preserved, not traded for convenience

---

### Closing Statement

> "I'm Cooked demonstrates that responsible AI isn't about limiting capabilities—it's about channeling them safely. By combining technical safeguards, transparent design, and ethical boundaries, we've built a system that helps users cook better while keeping them safe. The measure of success isn't just what the AI can do, but what it won't do—and how clearly it explains the difference."

---

## Appendix: Demo Checklist

### Pre-Demo Setup
- [ ] Clear browser localStorage (fresh start)
- [ ] Open DevTools Network tab (show no tracking requests)
- [ ] Have Thai Peanut Curry recipe URL ready
- [ ] Prepare fallback demo video (if live demo fails)

### Key Screenshots to Capture
- [ ] Preferences dialog with red allergy badges
- [ ] Substitution card showing impact analysis
- [ ] Modified recipe with tracked changes
- [ ] Rejection message for off-topic question
- [ ] Voice control interface (timer example)

### Code Snippets to Highlight
- [ ] `preferences-manager.ts` (localStorage only)
- [ ] `substitution.ts` (CRITICAL allergen directive)
- [ ] `cooking-assistant.ts` (✅/❌ boundaries)
- [ ] `detect-intent/route.ts` (fast pre-filter)
- [ ] `apply-substitution.ts` (impact explanation)

### Questions to Anticipate

**Q: What if a recipe site updates and breaks your scraper?**
A: We use Gemini's multimodal capabilities to extract recipes from HTML, which is resilient to layout changes. We also have allowlist-only access and validate all outputs.

**Q: How do you handle edge cases like "allergic to water"?**
A: Our system passes user-provided allergens directly to the AI with CRITICAL directives. While we can't prevent nonsensical inputs, the AI will flag physically impossible substitutions. Ultimate responsibility stays with the user.

**Q: Why localStorage instead of database with encryption?**
A: Privacy by architecture is stronger than encryption. We can't lose/breach/misuse data we never collect. The tradeoff (no cross-device sync) is acceptable for our privacy-first approach.

**Q: Could malicious recipe sites inject prompts through scraped data?**
A: Yes, which is why we have input sanitization (see `ethics.md` section on prompt injection). We strip suspicious patterns, enforce character limits, and validate AI outputs before storing.

**Q: What if the AI makes a mistake and suggests peanuts despite the allergy?**
A: Three-layer validation makes this extremely unlikely, but no system is perfect. We:
1. Visually highlight allergens (red badges) for user double-checking
2. Show full impact explanations before applying changes
3. Require explicit user approval for all modifications
4. Make changes reversible (users can abandon modified recipes)

The legal/ethical position: AI assistance, not AI replacement. Users must review suggestions.

---

## Demo Variants

### Short Version (5 minutes)
1. Aisha persona + allergy setup (1 min)
2. Substitution with triple validation (2 min)
3. Anti-sycophancy demo (1 min)
4. Privacy architecture (1 min)

### Technical Deep-Dive (20 minutes)
- Add: Code walkthrough of each safety layer
- Add: Prompt engineering techniques
- Add: Failure mode analysis
- Add: Comparison with other AI cooking assistants

### Executive Summary (3 minutes)
- Focus: Business value of safety features
- Metrics: Reduced liability, user trust, competitive advantage
- Demo: Only the allergy protection workflow

---

**Document Version**: 1.0  
**Last Updated**: November 8, 2025  
**Prepared for**: System demonstration and AI ethics review
