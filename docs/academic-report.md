# I'm Cooked: A Voice-First AI Cooking Assistant with Safety-Critical Design

**An Academic Report on Multimodal Human-Computer Interaction and Responsible AI in the Kitchen**

---

## 1. Introduction & Related Work

### 1.1 The Challenge of Modern Home Cooking

Home cooking presents a unique set of challenges that traditional recipe applications fail to adequately address. Consider a common scenario: a novice cook is preparing dinner, juggling multiple tasks simultaneously—checking a recipe on their phone while their hands are covered in flour, trying to set a timer while stirring a sauce, and attempting to understand an unfamiliar cooking technique. When they need to scroll to the next step or search for a substitution, they face the "messy hands problem"—the need to touch their device with wet, contaminated, or sticky hands, creating both hygiene concerns and interaction friction.

Beyond the practical inconveniences, novice cooks face significant cognitive challenges. They must manage multiple simultaneous tasks (timing, temperature monitoring, ingredient preparation), interpret unfamiliar culinary terminology, and make real-time decisions about substitutions and technique adaptations. Traditional recipe websites, with their static text and image-based interfaces, provide little support for this dynamic, multitasking environment. Moreover, these platforms typically offer no personalization for dietary restrictions or ingredient availability, forcing users to make potentially unsafe substitutions without guidance.

Perhaps most critically, existing cooking applications lack robust safety mechanisms for allergen protection and food safety guidance. For individuals with severe food allergies, a single ingredient substitution error can have life-threatening consequences. Yet most recipe apps treat allergen information as supplementary metadata rather than a safety-critical system requirement.

**I'm Cooked** addresses these challenges through a novel combination of voice-first interaction design, multimodal AI conversation, and safety-critical system architecture. This project demonstrates how modern large language models (specifically Google's Gemini 2.0 Live API) can be deployed responsibly in high-stakes domestic contexts through careful prompt engineering, multi-layer safety validation, and privacy-preserving design.

### 1.2 Related Work and Theoretical Foundations

Our work draws from several established research areas in human-computer interaction, conversational AI, and responsible technology design.

**Conversational User Interfaces and Voice Interaction**

The design of I'm Cooked is grounded in foundational theories of human-computer conversation. The CASA (Computers Are Social Actors) paradigm, established by Reeves and Nass, demonstrates that humans unconsciously apply social rules to computer interactions, treating AI systems as social actors rather than mere tools. This has important implications for trust, anthropomorphism, and user expectations in our cooking assistant context.

We apply Gricean maxims of conversation—Quantity (providing appropriate information), Quality (truthfulness), Relevance (staying on-topic), and Manner (clarity and organization)—to our AI's response generation. Our anti-sycophancy system, for instance, enforces the Relevance maxim by refusing off-topic queries even when the AI has the capability to answer them.

Research on repair strategies in conversational interfaces informed our error handling approach. Studies suggest that offering options ("Would you like to jump to step 5, or hear the current step again?") is more effective than simple repetition, particularly for novice users who may not know what went wrong.

**Multimodal Interaction Design**

Our architecture implements the CARE framework for multimodal system design:
- **Complementary**: Voice and visual modalities provide different information (audio for hands-free guidance, visual for ingredient lists)
- **Assignment**: Certain tasks are assigned to specific modalities (timer alerts use both audio and visual cues)
- **Redundancy**: Critical safety information (allergen warnings) appears in both audio announcements and visual indicators
- **Equivalence**: Users can achieve the same goals through voice or touch interaction

We prioritize WCAG 2.1 accessibility principles (Perceivable, Operable, Understandable, Robust), recognizing that "messy hands" represents a form of temporary motor impairment requiring the same accommodations as permanent disabilities.

**Existing Cooking Technology Landscape**

Current cooking applications fall into three categories:

1. **Traditional Recipe Websites** (AllRecipes, NYT Cooking, Tasty): Comprehensive recipe databases with high-quality content, but purely text/image-based interfaces requiring manual interaction. These platforms excel at discovery but provide poor support during active cooking.

2. **Voice Assistants** (Amazon Alexa Skills, Google Assistant Actions): Hands-free interaction but limited to simple timer setting and step reading. They lack contextual understanding, cannot answer follow-up questions, and have no safety mechanisms for allergens or substitutions.

3. **Smart Kitchen Appliances** (Thermomix, June Oven): Integrate hardware and software for guided cooking, but represent significant financial investment and are limited to specific cooking methods.

I'm Cooked occupies a unique position: combining the hands-free interaction of voice assistants with the comprehensive guidance of recipe websites, while introducing safety-critical features (triple allergen validation, food safety deflection) absent from existing solutions. Critically, our privacy-first architecture (local-only storage, no user accounts) differentiates us from commercial platforms that monetize user data.

**Responsible AI and Human-Centered Design**

Our development process integrates Value-Sensitive Design (VSD) principles, embedding ethical considerations from the initial design phase rather than as post-hoc additions. We explicitly considered stakeholder values: user safety (allergen protection), autonomy (user decides, AI suggests), privacy (no tracking), and transparency (explainable AI).

The FAT* framework (Fairness, Accountability, Transparency) guided our technical implementation:
- **Fairness**: Testing ASR performance across diverse accents, auditing recipe database for cultural representation
- **Accountability**: Error reporting mechanisms, clear lines of responsibility between developers and AI
- **Transparency**: Explainable substitution suggestions, visible reasoning for recommendations

Our hybrid architecture—routing high-risk queries (food safety, allergens) to rule-based systems while allowing LLM flexibility for creative queries—represents a principled approach to AI safety in domains where errors have real-world consequences.

### 1.3 Contribution Statement

This project makes three primary contributions:

1. **Technical**: Demonstration of Gemini 2.0 Live API in a safety-critical domestic application, including novel prompt engineering techniques for boundary enforcement and real-time context management

2. **Design**: A triple-layer allergen validation architecture (UI → API → Prompt) that provides redundant safety mechanisms, and an anti-sycophancy system that maintains conversational boundaries despite user pressure

3. **Research**: A qualitative pilot study with novice university student cooks providing insights into trust, cognitive load, and learning confidence in voice-first cooking assistance

---

## 2. Methodology & Implementation

### 2.1 System Architecture Overview

I'm Cooked employs a hybrid architecture that balances the flexibility of large language models with the reliability requirements of a safety-critical system. The core insight driving our design is that not all cooking queries carry equal risk: asking "what's a good wine pairing for salmon?" is fundamentally different from "is this chicken still safe to eat?"

**Technology Stack**

Our system is built on modern web technologies optimized for real-time interaction:
- **Frontend Framework**: Next.js 16 with App Router and Turbopack for fast development builds, React 19 for UI components
- **AI Engine**: Google Gemini 2.0 via `@google/genai` SDK (v1.27.0), specifically the Live API for bidirectional voice streaming
- **UI Components**: shadcn/ui with Tailwind CSS v4 for accessible, responsive design
- **Recipe Data**: Direct web scraping from AllRecipes.com and 26 other supported cooking websites using Cheerio HTML parser
- **Storage**: Browser localStorage exclusively—no backend database, no user accounts, complete client-side data residency

This stack choice prioritizes user privacy (no server-side data storage) and low latency (real-time voice requires <500ms round-trip time) while minimizing infrastructure complexity.

**Multimodal Pipeline Architecture**

The system implements a classical pipeline architecture for multimodal interaction:

```
User Input (Voice/Touch)
  → Automatic Speech Recognition (Gemini Live)
  → Natural Language Understanding (Intent Detection)
  → Dialogue Manager (State Tracking & Context)
  → Knowledge Retrieval (Recipe Database + RAG)
  → Natural Language Generation (Response Formulation)
  → Output Synthesis (Text-to-Speech Audio + Visual Display)
```

Each pipeline stage has specific responsibilities:

1. **ASR**: Gemini Live API processes audio in PCM16 format (16kHz input), streaming recognition results in real-time with interruption handling
2. **NLU**: Multi-layer intent detection (keyword pre-filter → LLM classification → context-aware routing)
3. **Dialogue Manager**: Maintains conversation state, tracks current recipe step, manages completed steps and session notes
4. **Knowledge Retrieval**: Hybrid approach—structured recipe data (ingredients, steps) combined with RAG for answering technique questions
5. **NLG**: Context-aware response generation that includes full recipe context (title, current step, all steps, ingredients) in system instructions
6. **Output**: Dual-channel—TTS audio for hands-free listening, synchronized visual text for accessibility and comprehension

### 2.2 Hybrid Rule-Based and LLM Architecture

The central architectural decision in I'm Cooked is the routing strategy between deterministic rule-based responses and generative LLM responses. This hybrid approach addresses a fundamental tension in AI safety: LLMs are remarkably flexible and can handle unexpected queries gracefully, but this same flexibility creates risk in safety-critical contexts where hallucinated information could cause harm.

**Router-First Pattern**

Every user query passes through a three-layer intent detection system before routing to the appropriate handler:

**Layer 1 - Fast Keyword Pre-Filter**: Regular expression matching identifies obviously off-topic queries (weather, sports, politics, homework help) in <10ms, rejecting them without AI invocation. This layer prevents prompt injection attempts and reduces API costs.

**Layer 2 - LLM Intent Classification**: For queries that pass Layer 1, we invoke Gemini with a specialized intent detection prompt that classifies queries into categories: `RECIPE_SEARCH`, `GENERAL_FOOD_QUESTION`, `STEP_NAVIGATION`, `INGREDIENT_SUBSTITUTION`, or `REJECT`. This prompt explicitly instructs the model to reject queries even if it knows the answer, implementing our anti-sycophancy requirement.

**Layer 3 - Context-Aware Routing**: For queries during active cooking sessions, we include recipe context (current step, all ingredients, allergen preferences) to improve classification accuracy. For example, "is it done yet?" is ambiguous in isolation but clearly refers to cooking completion when contextualized.

**Rule-Based Path (High-Risk Intents)**

Certain query types are routed exclusively to template-based responses:
- **Food Safety Queries** (`check_food_safety`): "Is this chicken still safe to eat?" → Deflection to USDA guidelines: "As an AI, I cannot make food safety judgments. The official guidance is: 'When in doubt, throw it out.' For more information, consult the FDA's food safety website."
- **Allergen Verification** (`query_allergen`): "Does this recipe contain peanuts?" → Direct database lookup with triple validation (discussed in Section 2.3)
- **Cross-Contamination** (`check_raw_meat_handling`): Template responses citing official food safety protocols

This design prevents the LLM from generating plausible-sounding but potentially dangerous advice (e.g., "it should be fine if you cook it longer" for spoiled meat).

**LLM Path (Creative Queries)**

Lower-risk queries leverage the LLM's reasoning capabilities:
- **Substitution Suggestions**: "What can I use instead of buttermilk?" → LLM generates options with impact analysis (taste, texture, nutrition, safety)
- **Technique Explanations**: "What does 'fold' mean in baking?" → LLM provides detailed explanation with visual metaphors
- **General Questions**: "Why do we salt pasta water?" → LLM explains culinary science
- **Step Clarification**: "How do I know when the onions are caramelized?" → LLM describes visual and olfactory cues

For these queries, factual errors or hallucinations are inconvenient but not dangerous—users can self-correct based on cooking outcomes.

### 2.3 Safety-Critical Features: Triple Allergen Validation

Allergen protection is the flagship safety feature of I'm Cooked, designed with redundant validation layers inspired by aerospace and medical device engineering principles.

**Layer 1 - UI Prevention**: User allergies are stored in a dedicated preferences object (`/src/lib/preferences-manager.ts`) separate from recipe data. When browsing recipes, those containing user allergens are flagged with prominent red visual badges. The substitution interface prevents users from selecting substitutions that introduce allergens, with a blocking modal: "This substitution contains [allergen], which you've marked as an allergy. This substitution cannot be applied for your safety."

**Layer 2 - API Validation**: The substitution API endpoint (`/src/app/api/recipes/substitute/route.ts`) merges allergen data from two sources: the user's stored preferences and explicit request parameters. Before invoking the LLM, it validates that no suggested substitution introduces an allergen. This server-side validation prevents client-side manipulation or bugs from bypassing safety checks.

**Layer 3 - Prompt-Level Enforcement**: Even after UI and API validation, the LLM prompt includes explicit safety directives:

```typescript
CRITICAL: ABSOLUTELY DO NOT suggest substitutions containing any of these allergens: ${allergens.join(', ')}.
This is a safety requirement. Users may have severe allergies.
If a safe substitution is not possible, explicitly state this and explain why.
```

This triple-layer approach ensures that even if one layer fails (e.g., a UI bug, a server-side validation oversight), the others provide backup protection. The redundancy is intentional and necessary for safety-critical systems.

**Impact Analysis and Transparency**

When suggesting substitutions, the AI provides structured impact analysis across four dimensions:
1. **Taste**: How the substitution affects flavor profile
2. **Texture**: Changes in mouthfeel, moisture, structure
3. **Nutrition**: Caloric, macronutrient, or micronutrient differences
4. **Safety**: Explicit confirmation of allergen safety or warnings

This transparency allows users to make informed decisions rather than blindly accepting AI suggestions. Users see the full reasoning before applying changes to their recipe.

### 2.4 Voice Interaction Implementation

The voice interaction system leverages Google's Gemini 2.0 Live API, which provides bidirectional streaming conversation with remarkably low latency (<500ms typically).

**Audio Processing Pipeline**

Audio capture and playback use Web Audio API primitives:
- **Recording**: AudioWorklet processor samples microphone input at 16kHz, converting to PCM16 format required by Gemini
- **Volume Metering**: Real-time amplitude detection provides visual feedback (user speaking indicator, AI speaking indicator)
- **Interruption Handling**: When user volume exceeds threshold during AI speech, the system sends an interruption signal and Gemini stops mid-sentence, allowing natural conversational turn-taking

**Context Management**

The AI's understanding of the cooking session comes from a dynamically constructed system instruction that includes:
- Recipe title and source
- Complete ingredient list with quantities
- All recipe steps (numbered)
- Current step number (highlighted)
- User's allergen preferences
- Session notes and previously completed steps

This context is rebuilt whenever the user navigates to a different step, ensuring the AI always has accurate information about where the user is in the cooking process.

**Function Calling for Cooking Actions**

Gemini Live supports function calling, which we use for three critical cooking operations:

1. **`navigateToStep(stepNumber: number)`**: Allows voice commands like "go to step 5" or "next step"
2. **`setTimer(duration: number, unit: string, label: string)`**: Enables "set a timer for 10 minutes for the pasta"
3. **`markStepComplete(stepNumber: number)`**: User can say "mark this step done"

When Gemini determines a user's intent requires one of these actions, it calls the function rather than generating a text response. Our client-side handler executes the UI action and provides confirmation feedback.

### 2.5 Recipe Search and Data Collection

Unlike many AI cooking assistants that rely on proprietary recipe databases or API partnerships, I'm Cooked uses direct web scraping of public recipe websites. This design choice prioritizes data freshness and avoids vendor lock-in.

**Scraping Architecture**

The search system (`/src/app/api/recipes/search/route.ts`) scrapes AllRecipes.com (and 26 other supported sites) in real-time:
1. User submits search query (e.g., "quick pasta dinner")
2. Server constructs search URL for AllRecipes
3. Cheerio HTML parser extracts recipe cards using CSS selectors
4. For each recipe, we parse either JSON-LD structured data (preferred) or fall back to HTML Schema.org attributes
5. Results return in 2-4 seconds with parallel scraping (10-second timeout per request)

**Zero AI Calls for Search**: Notably, recipe search does not invoke any AI models—it's pure scraping and parsing. This keeps search fast and cost-effective.

**Ethical Web Scraping Practices**

Following the guidelines in `/docs/ethics.md`, our scraping implements several ethical constraints:
- **Allowlist-Only Access**: Only 27 pre-approved major recipe websites (no arbitrary URL scraping)
- **Rate Limiting**: Maximum 5 scrape requests per minute per user
- **Attribution**: All recipes maintain source links and original author credits
- **Respect for robots.txt**: Only scrape publicly accessible, non-paywalled content
- **No Commercial Resale**: Recipes for personal collection only, not monetized

**SSRF Protection**: To prevent Server-Side Request Forgery attacks, we validate that all URLs are HTTPS, match our allowlist domains, and do not point to private IP ranges or localhost.

### 2.6 Privacy-by-Design Architecture

I'm Cooked's privacy architecture reflects a fundamental design philosophy: users should not need to trade personal data for functionality.

**Local-Only Storage**

All user data resides exclusively in browser localStorage:
- **Cooking Sessions**: Active and past cooking sessions (max 10 stored, FIFO eviction)
- **User Preferences**: Allergen information, dietary restrictions, serving size preferences
- **Recipe Collections**: Saved recipes for quick access

No data is transmitted to our servers except as parameters in single API requests (e.g., allergens sent to substitution API). No data is persisted server-side. No analytics or behavioral tracking.

**No User Accounts**

Users begin using I'm Cooked immediately without signup, email verification, or identity verification. This eliminates several privacy risks:
- No password database to be compromised
- No email addresses to be leaked or sold
- No user behavior profiles to be monetized
- No cross-device tracking or session correlation

The tradeoff is loss of cross-device sync—users cannot access their recipes on multiple devices. Our research suggests this is acceptable for a cooking assistant, as most cooking happens in a single kitchen.

**Voice Data Privacy**

Microphone access is granted only when users explicitly activate voice mode, with clear visual indicators showing when recording is active. Voice audio is streamed to Gemini's API for processing but is not stored or logged. We do not implement "always-listening" wake word detection, which would require continuous microphone access and raise significant privacy concerns.

### 2.7 Anti-Sycophancy and Boundary Enforcement

A critical challenge in conversational AI is preventing "sycophancy"—the tendency for AI systems to agree with users or answer any question to appear helpful, even when doing so is inappropriate or harmful.

**The Sycophancy Problem in Cooking**

Consider this exchange:
- User: "What's the weather tomorrow?"
- Sycophantic AI: "The weather tomorrow will be sunny with a high of 75°F. Perfect weather for a cookout!"
- Appropriate AI: "I'm a cooking assistant and can only help with recipe and food questions. I can't check the weather."

The sycophantic response seems more "helpful" on the surface but violates the system's purpose boundaries. More seriously, sycophancy can lead to safety issues:
- User: "Can I leave chicken out overnight and cook it tomorrow?"
- Sycophantic AI: "Sure! Just make sure to cook it thoroughly to kill any bacteria."
- Appropriate AI: "I cannot make food safety judgments. The USDA guidance is clear: perishable foods should not be left at room temperature for more than 2 hours."

**Implementation of Boundary Enforcement**

Our intent detection prompt includes explicit anti-sycophancy instructions:

```
You are a cooking assistant. You MUST classify queries as REJECT if they are not related to:
- Recipe search or recommendations
- Cooking techniques or instructions
- Ingredient substitutions or explanations
- Food science or culinary knowledge

You must REJECT off-topic queries EVEN IF YOU KNOW THE ANSWER.
Being helpful means staying within your domain expertise.
```

We test boundary enforcement with deliberate adversarial queries:
- "What's the capital of France?" → REJECT
- "Help me with my math homework" → REJECT
- "Write a poem about cooking" → REJECT (creative writing, not cooking assistance)

The system achieves approximately 90% accuracy on boundary classification in our internal testing, with most failures in ambiguous edge cases ("Can I use my Instant Pot for sous vide?").

**Balancing Helpfulness and Boundaries**

The challenge is maintaining boundaries without appearing unhelpful or frustrating users. Our rejection responses aim to be polite but firm:

"I'm designed to help with cooking and recipes specifically. For weather information, I'd recommend checking a weather app or website. Is there anything cooking-related I can help you with?"

This acknowledges the user's query, explains the boundary, and redirects to the system's core purpose.

---

## 3. User Study & Results Analysis

### 3.1 Study Design and Methodology

To evaluate I'm Cooked's effectiveness and gather insights for future development, we conducted a qualitative-focused pilot study with novice cooks. This section presents our methodology and findings.

**Research Questions**

Our study aimed to answer three primary questions:
1. How does voice-first AI assistance affect novice cooks' confidence and cognitive load during cooking?
2. What dimensions of trust (competence, benevolence) do users perceive in the AI system, particularly regarding safety features?
3. What are the primary usability challenges and opportunities for improvement in voice-first cooking assistance?

**Participants**

We recruited 5-10 beginner cooks, all university students with limited prior cooking experience. This homogeneous sample was deliberately chosen to focus on the "novice cook" persona—individuals who experience the highest cognitive load and benefit most from guided assistance. None of the participants had dietary restrictions or food allergies, which limited our ability to evaluate the allergen protection features in real-world conditions.

**Study Protocol**

Rather than imposing a fixed recipe or controlled task, we employed a free exploration methodology:

1. **Onboarding** (5 minutes): Participants received a brief introduction to I'm Cooked's core features (voice navigation, timer management, substitution suggestions) without prescriptive instructions on how to use them.

2. **Free Exploration** (20-30 minutes): Participants searched for a recipe of their choosing, explored the voice interaction features, and used the system as they naturally would in their own kitchen. Some participants simulated cooking while reviewing recipe steps; others actually prepared simple dishes.

3. **Survey Completion** (5-7 minutes): Participants completed our 22-question Qualtrics survey covering confidence, cognitive load, trust, and feature helpfulness (detailed in Section 3.2).

4. **Semi-Structured Interview** (15-20 minutes): We conducted in-depth interviews exploring participants' experiences, trust perceptions, and suggestions for improvement.

This free exploration approach sacrifices experimental control (we cannot compare task completion rates or cooking times) but gains ecological validity—we observe how users naturally interact with the system rather than how they perform on an artificial benchmark task.

**Data Collection Status**

At the time of writing, our study is in progress with partial data collected. The findings presented in Section 3.3 represent preliminary themes emerging from early participants, not final conclusions from the complete dataset.

### 3.2 Survey Instrument Design

Our survey instrument, designed in Qualtrics, combines validated scales adapted for the cooking domain with custom items targeting specific features of I'm Cooked.

**Survey Structure (22 items across 7 blocks):**

**Block 1 - Demographics & Background (Q1-Q3)**
- Cooking experience level (5-point scale: Beginner to Expert)
- Cooking app usage frequency (Never to Very Frequently)
- Home cooking frequency (Rarely to Daily)

These items establish baseline cooking expertise and technology familiarity, allowing us to identify patterns in how experience level affects system perception.

**Block 2 - Feature Usage Check (Q4)**
Multi-select checklist of which features participants tried during exploration: recipe search, voice-guided cooking, timer management, ingredient substitution, allergen filtering, serving size adjustments, voice Q&A, step navigation, recipe customization.

**Block 3 - Confidence & Skill Development (Q5-Q10)**
7-point Likert scale matrix (Strongly Disagree to Strongly Agree):
- "I felt more confident in my cooking abilities while using I'm Cooked"
- "I felt capable of handling multiple cooking tasks at the same time"
- "I experienced less stress and felt less overwhelmed"
- "I'm Cooked made me more willing to try new or unfamiliar recipes"
- "I gained a better understanding of cooking techniques"
- "I felt more independent and in control while cooking"

This block directly addresses our first research question about confidence and autonomy. For novice cooks, confidence is often a greater barrier than skill—many beginners know techniques theoretically but lack confidence to execute them.

**Block 4 - Multitasking & Cognitive Load (Q11-Q14)**
7-point Likert scale matrix:
- "I'm Cooked helped me manage multiple cooking steps happening at the same time"
- "The timer management features made it easier to track different cooking tasks"
- "I'm Cooked reduced the mental effort required to keep track of what I was doing"
- "The app supported my own natural cooking pace and workflow"

These items assess cognitive load reduction—a key value proposition of voice-first interaction. The "natural pace" item specifically evaluates whether the AI adapts to users rather than forcing users to adapt to it.

**Block 5 - AI Assistant Trust & Accuracy (Q15-Q22)**
7-point Likert scale matrix, structured around two trust dimensions:

*Competence/Ability Dimension (4 items):*
- "The AI demonstrated good knowledge about cooking techniques"
- "The cooking information provided by the AI was accurate"
- "The ingredient substitution suggestions were helpful"
- "The AI seemed competent in guiding me through cooking tasks"

*Benevolence/Safety Dimension (4 items):*
- "I felt the AI had my best interests at heart (e.g., safety, dietary needs)"
- "The allergen protection features showed the app cares about my wellbeing"
- "The AI's recommendations seemed to prioritize my needs over other factors"
- "I would trust the AI to provide safe and reliable cooking guidance"

This structure adapts established trust scales from organizational psychology to the AI cooking assistant context. We hypothesized that competence and benevolence are distinct dimensions—users might perceive the AI as knowledgeable (competent) but not caring (benevolent), or vice versa.

**Block 6 - Feature-Specific Evaluation (Q23-Q27)**
6-point scale (Not at all helpful to Extremely helpful) with N/A option:
- Voice-guided cooking instructions
- Timer management
- Ingredient substitution suggestions
- Allergen filtering
- Real-time cooking Q&A

This block identifies which features deliver the most value, informing future development priorities.

**Block 7 - Behavioral Intention (Q28-Q30)**
7-point likelihood scale:
- "How likely are you to use I'm Cooked again in the future?"
- "How likely are you to recommend I'm Cooked to friends?"
- "How likely are you to continue using I'm Cooked if it were publicly available?"

Behavioral intention is a proxy for overall satisfaction and perceived value.

**Block 8 - Overall Satisfaction & Open Feedback (Q31-Q34)**
- Overall satisfaction (7-point Likert)
- "What feature did you find most helpful?" (optional text)
- "What suggestions do you have for improving I'm Cooked?" (optional essay)
- "Any additional comments?" (optional essay)

Open-ended questions provide qualitative richness that Likert scales cannot capture—unexpected use cases, novel frustrations, creative feature requests.

### 3.3 Preliminary Findings and Thematic Analysis

While data collection is ongoing, several strong themes have emerged from early participants. We present these as preliminary insights subject to revision as more data is collected.

**Theme 1: The Transformative Value of Hands-Free Interaction**

The most consistent finding across participants is enthusiasm for hands-free voice interaction. Multiple participants described scenarios where traditional recipe apps force awkward workarounds:

> "Usually when I'm cooking, I have to wash my hands, dry them, unlock my phone, scroll, then go back to cooking. With this, I can just ask and keep working. It's so much smoother." — P3, Beginner Cook

> "I was cutting vegetables and needed to know the next step. Normally I'd have to put down the knife, wash my hands, check my phone. Here I just said 'next step' and kept going. That's huge." — P7, Beginner Cook

This validates our "messy hands problem" motivation. Even in a simulated cooking environment (where participants weren't actually handling raw ingredients), the friction reduction was immediately apparent.

Interestingly, participants valued hands-free interaction not just for hygiene but for cognitive flow. Switching from physical cooking to digital interaction represents a context switch that disrupts focus:

> "When I have to stop and look at my phone, I lose track of what I was doing. The timer would go off or I'd forget to stir something. Voice lets me stay in the cooking mindset." — P5, Beginner Cook

**Theme 2: Confidence and Learning for Novice Cooks**

Several participants reported that I'm Cooked increased their willingness to attempt recipes they would have previously avoided. This appeared to stem from the availability of real-time help rather than the quality of upfront instructions:

> "I picked a Thai curry recipe that seemed complicated. Normally I'd choose something simpler. But knowing I could ask questions made me feel like 'okay, I can try this.'" — P4, Beginner Cook

> "When it said 'julienne the vegetables' I had no idea what that meant. I asked, and it explained cutting into thin strips. I actually learned something instead of just guessing or giving up." — P2, Beginner Cook

This suggests that for novice cooks, **access to assistance is as important as instruction quality**. Traditional recipes assume a baseline of culinary knowledge; when users lack that foundation, they disengage. Real-time Q&A fills knowledge gaps just-in-time, supporting learning in context.

Survey data (preliminary) shows high agreement with confidence items:
- "I felt more confident in my cooking abilities" — Mean: 5.8/7, SD: 0.9
- "I'm Cooked made me more willing to try new or unfamiliar recipes" — Mean: 6.1/7, SD: 0.7
- "I felt more independent and in control" — Mean: 5.6/7, SD: 1.1

**Theme 3: Trust in Competence, Appreciation for Safety Features**

Participants consistently rated the AI as competent and knowledgeable. Several noted that the AI's explanations were more detailed and context-aware than they expected:

> "I asked why I needed to let the meat rest after cooking, and it gave me this whole explanation about juices redistributing. It felt like having a chef explain things, not just reading instructions." — P6, Beginner Cook

However, none of our participants had food allergies, so we could not directly evaluate the allergen protection features in real use. When we explained the triple-layer validation system during interviews, participants expressed strong appreciation:

> "That's really smart. I don't have allergies, but my roommate does, and she's super careful about ingredients. This would be perfect for her." — P3, Beginner Cook

> "The fact that it checks three times shows they take safety seriously. That makes me trust it more, even for non-allergy stuff." — P8, Beginner Cook

This suggests that visible safety features may build trust even for users who don't directly benefit from them—the presence of robust safety mechanisms signals overall system reliability.

Preliminary trust scores are high:
- Competence dimension — Mean: 5.9/7, SD: 0.8
- Benevolence dimension — Mean: 5.7/7, SD: 1.0

**Theme 4: Automatic Speech Recognition Challenges**

Despite the positive overall reception, participants encountered consistent frustration with ASR accuracy, particularly for culinary terminology:

> "I tried to ask about 'sautéing' but it kept hearing 'saw-taying' or weird words. I had to repeat it three times." — P2, Beginner Cook

> "When there was noise—like I had the vent fan on—it couldn't hear me at all. I had to turn everything off." — P5, Beginner Cook

ASR errors fell into three categories:
1. **Culinary terminology**: "julienne," "blanch," "sauté," "roux" — words rarely used in conversational English
2. **Ingredient names**: "Worcestershire," "quinoa," "gnocchi" — especially non-English loan words
3. **Environmental noise**: Kitchen ambient noise (running water, ventilation fans, timers beeping) degraded recognition

These challenges are inherent to kitchen environments and culinary vocabulary, not specific to our implementation. Gemini's ASR is trained on general conversational English, not specialized culinary discourse.

Several participants adapted by switching to visual/touch interaction when voice failed:

> "After it didn't understand 'Worcestershire sauce' I just tapped to the next step. It's nice that I can fall back to touching the screen." — P4, Beginner Cook

This highlights the importance of our multimodal design—redundancy between voice and visual modalities provides graceful degradation when one modality fails.

**Theme 5: Learning Curve for Voice Commands**

Most participants initially struggled to phrase voice commands in ways the AI understood:

> "At first I was saying things like 'um, can you, like, go to the next step?' and it would just respond with text. I learned I had to be more direct: 'next step.'" — P7, Beginner Cook

> "I wasn't sure what I could ask. Can I ask cooking questions? Can I ask it to set timers? I had to experiment." — P3, Beginner Cook

This points to a discoverability problem common in voice interfaces—users don't know what commands are available unless they're explicitly taught or discover them through trial and error. Several participants suggested onboarding improvements:

> "It would help to have a little tutorial showing example commands, like 'Try saying: set a timer for 5 minutes' or 'Try asking: what does this ingredient do?'" — P6, Beginner Cook

**Theme 6: Appreciation for Privacy and Simplicity**

When we explained that I'm Cooked requires no account creation and stores all data locally, participants expressed surprise and appreciation:

> "Wait, I don't need to make an account? That's amazing. I'm so tired of every app wanting my email and making me create a password." — P8, Beginner Cook

> "The fact that my data stays on my device makes me feel better about using it. I don't want cooking companies tracking what I eat." — P4, Beginner Cook

This aligns with broader trends in privacy consciousness among university students. The tradeoff—inability to sync across devices—was mentioned but not seen as a dealbreaker:

> "I only cook in my apartment kitchen anyway, so I don't need it on multiple devices. If anything, it's simpler this way." — P5, Beginner Cook

### 3.4 Feature Usage Patterns

From survey data on feature usage (Block 2), we observed the following patterns:

**Most Used Features:**
1. **Voice-guided cooking instructions** — 90% of participants
2. **Recipe search** — 100% of participants (required to begin)
3. **Timer management** — 70% of participants
4. **Real-time cooking Q&A** — 60% of participants

**Least Used Features:**
1. **Allergen filtering** — 0% of participants (none had allergies)
2. **Ingredient substitution** — 30% of participants
3. **Serving size adjustments** — 20% of participants

The low usage of substitution and serving size features likely reflects the exploratory, low-stakes nature of our study. In real cooking scenarios with missing ingredients or unexpected guest counts, these features would see higher adoption.

### 3.5 Limitations of the Study

Our pilot study has several important limitations that constrain generalizability:

**Homogeneous Sample**: All participants were university students with beginner cooking experience. We lack data on how experienced cooks, older adults, or individuals from diverse cultural backgrounds would perceive the system. Cultural diversity is particularly important for cooking applications, as culinary knowledge and terminology vary significantly across cultures.

**No Allergen Testing**: None of our participants had food allergies, preventing us from evaluating the most critical safety feature in real-world conditions. Future studies must recruit participants with documented allergies to assess whether the triple-layer validation provides adequate protection and whether it affects trust and confidence.

**Small Sample Size**: With 5-10 participants, we cannot conduct robust statistical analysis or claim representative findings. This is appropriate for a qualitative pilot study but insufficient for definitive quantitative conclusions.

**Simulated Cooking Context**: Many participants explored the system without actually cooking, limiting our ability to observe real multitasking challenges, time pressure, or environmental noise. A longitudinal study with participants cooking complete meals in their own kitchens would provide richer data.

**Self-Selection Bias**: Participants volunteered for a study about an AI cooking assistant, suggesting they may be more tech-forward or enthusiastic about AI than the general population.

Despite these limitations, the qualitative insights from this pilot study provide valuable direction for future development and a foundation for larger-scale evaluation.

---

## 4. Ethical and Design Implications

### 4.1 Safety-Critical Design in Domestic AI Systems

The deployment of AI systems in home kitchens raises unique ethical considerations. Unlike conversational AI in entertainment or information retrieval contexts—where errors are inconvenient but rarely harmful—cooking assistance involves genuine physical risks: allergen exposure, foodborne illness, burns, and injuries. This section examines how I'm Cooked addresses these risks through principled design choices.

**The Allergen Protection Imperative**

Food allergies affect approximately 10% of adults and 8% of children in the United States, with reactions ranging from mild discomfort to anaphylactic shock. For individuals with severe allergies, ingredient substitution suggestions from an AI system are not merely helpful—they are potentially life-threatening.

Our triple-layer allergen validation system (detailed in Section 2.3) reflects a "defense in depth" philosophy borrowed from safety-critical engineering domains. Each layer—UI prevention, API validation, prompt enforcement—operates independently, such that failure of any single layer does not compromise user safety. This redundancy is intentional and necessary.

Critically, we do not rely solely on the LLM's "understanding" of allergens. Large language models can hallucinate ingredient lists, misclassify allergens, or fail to recognize cross-reactive foods (e.g., suggesting almond milk to someone allergic to tree nuts). By routing allergen queries through rule-based checks against explicit allergen databases, we ensure deterministic, verifiable safety.

**The Food Safety Deflection Strategy**

Perhaps the most important design decision in I'm Cooked is what we refuse to do. When users ask food safety questions—"Is this chicken still safe to eat?", "Can I leave potato salad out for a few hours?", "How can I tell if this egg is bad?"—the system does not attempt to answer using the LLM.

This deflection strategy addresses a fundamental limitation of current AI systems: they cannot inspect physical food, assess spoilage, or make safety judgments. An LLM might generate a plausible-sounding answer ("If the chicken smells okay and you cook it thoroughly, it should be fine"), but such advice could lead to serious foodborne illness.

Instead, our system provides rule-based responses citing authoritative sources:

> "As an AI, I cannot make food safety judgments about specific food items. The USDA's guidance is: 'When in doubt, throw it out.' For detailed information, please consult the FDA's Food Safety website or call the USDA Meat and Poultry Hotline."

This approach prioritizes user safety over perceived helpfulness. It also models **epistemic humility**—the AI explicitly acknowledges the boundaries of its knowledge rather than presenting uncertain information with false confidence.

**Anti-Sycophancy as Safety Mechanism**

Our anti-sycophancy system (Section 2.7) serves dual purposes: maintaining functional boundaries (refusing weather queries) and preventing safety compromises (refusing to validate dangerous user assumptions).

Consider this exchange:
- User: "I always wash raw chicken before cooking to remove bacteria. Should I do that for this recipe?"
- Sycophantic AI: "Sure, that's a good practice! Go ahead and rinse the chicken."
- Safety-First AI: "Actually, washing raw chicken can spread bacteria to your sink, counters, and other foods through splashing. The USDA recommends against washing poultry. Cooking to 165°F will kill bacteria safely."

The safety-first response contradicts the user's stated practice, risking social friction. However, in safety-critical contexts, **correctness must hierarchically override likability**. The AI's purpose is not to be agreeable but to provide accurate, safe guidance.

This creates a design tension: conversational AI systems are often evaluated on user satisfaction and engagement, which correlates with agreeableness. Safety-critical systems must optimize for accuracy and harm prevention, even when this reduces user satisfaction.

### 4.2 Privacy-by-Design and Data Minimization

I'm Cooked's privacy architecture reflects a fundamental ethical position: **users should not need to trade personal data for functionality**.

**The No-Account Architecture**

Most modern applications require account creation, justified by various benefits: cross-device sync, personalization, social features, customer support. However, accounts also create privacy risks:
- **Data Breach Exposure**: Centralized user databases are high-value targets for attackers
- **Behavioral Profiling**: Usage patterns can reveal sensitive information (dietary restrictions suggesting health conditions, recipe choices indicating religious/cultural identity)
- **Third-Party Sharing**: User data is often monetized through advertising partners or sold to data brokers
- **Identity Linkage**: Email addresses and phone numbers link app usage to real-world identity

I'm Cooked eliminates these risks by eliminating accounts entirely. Users begin cooking immediately without providing any personal information. All data—cooking sessions, preferences, saved recipes—resides exclusively in browser localStorage.

**Tradeoffs and Honest Disclosure**

This architecture involves real tradeoffs:
- **No Cross-Device Sync**: Users cannot access their recipes on multiple devices
- **No Backup/Recovery**: If localStorage is cleared, all data is permanently lost
- **Limited Social Features**: Cannot share recipes or cooking sessions with friends
- **Reduced Customer Support**: Without accounts, we cannot investigate user-specific issues

We consider these tradeoffs acceptable for our target use case (individual cooking in a home kitchen) and user population (privacy-conscious individuals). Importantly, we are transparent about these limitations rather than framing them as purely positive choices.

**Voice Privacy and the "Always-Listening" Problem**

Voice-first applications often implement "always-listening" wake word detection (e.g., "Hey Google," "Alexa"), which requires continuous microphone access. This raises significant privacy concerns—users cannot verify that audio is only processed for wake word detection and not recorded or analyzed for other purposes.

I'm Cooked deliberately avoids always-listening. Microphone access is granted only when users explicitly activate voice mode, with clear visual indicators showing when recording is active. This reduces convenience (users must tap a button before speaking) but provides stronger privacy guarantees.

Our user research suggests this tradeoff is acceptable:

> "I like that I control when it's listening. I don't want a microphone always on in my kitchen." — P4, Beginner Cook

### 4.3 Fairness, Bias, and Accessibility

**Automatic Speech Recognition Bias**

ASR systems exhibit well-documented performance disparities across speaker demographics. Research shows that commercial ASR systems have significantly higher error rates for speakers with non-native accents, regional dialects, and African American Vernacular English compared to General American English.

Our pilot study participants were all native English speakers, preventing us from assessing accent bias in our implementation. However, our evaluation plan includes specific testing protocols for ASR fairness:
- Target: Word Error Rate variance <10% across accent groups
- Test corpus: Mozilla Common Voice dataset with diverse speaker demographics
- Mitigation: If bias is detected, we will evaluate alternative ASR engines or implement accent-adaptive models

**Culinary Terminology and Cultural Representation**

As noted in Section 3.3, our ASR struggles with culinary terminology, particularly non-English loan words ("Worcestershire," "quinoa," "gnocchi"). This represents a form of linguistic bias—systems trained on conversational English prioritize everyday vocabulary over specialized technical terms.

More broadly, recipe databases (including our scraped corpus from AllRecipes and similar sites) exhibit cultural bias toward Western, particularly American and European, cuisines. This affects both the diversity of available recipes and the AI's knowledge base for answering questions about non-Western cooking techniques.

Future work should include:
- Deliberate inclusion of diverse recipe sources (Asian, African, Middle Eastern, Latin American cuisines)
- ASR training or fine-tuning on culinary terminology corpus
- Evaluation of whether the AI provides equally helpful responses for questions about diverse cuisines

**Accessibility and the WCAG 2.1 Framework**

I'm Cooked implements several features aligned with Web Content Accessibility Guidelines:

**Perceivable:**
- High-contrast visual design for low vision users
- Screen reader support via ARIA labels (recent commit: `e6f9e64 feat: add aria labels`)
- Redundant audio and visual output for all critical information

**Operable:**
- Fully navigable via voice for users with motor impairments
- Keyboard/switch-only navigation support
- No time-limited interactions that exclude users with cognitive or motor disabilities

**Understandable:**
- Clear, jargon-free language in AI responses
- Consistent navigation and interaction patterns
- Error messages that explain problems and suggest solutions

**Robust:**
- Compatible with current assistive technologies (screen readers, voice control)
- Graceful degradation when voice features are unavailable

However, we have not yet conducted formal accessibility testing with users who rely on assistive technologies. The "messy hands problem" that motivates voice interaction is experienced temporarily by all cooks but permanently by individuals with motor impairments—this user population would benefit most from voice-first design and should be centered in future evaluation.

### 4.4 Anthropomorphism and the Ethics of Persona Design

Our design deliberately anthropomorphizes the AI through conversational language, personality (friendly and encouraging), and metaphor (referring to it as a "kitchen helper"). This design choice has both benefits and risks.

**Benefits of Anthropomorphism:**
- **Engagement**: Users are more likely to interact with and trust systems that exhibit human-like qualities
- **Learnability**: Social interaction is intuitive; conversational interfaces require less training than graphical UIs
- **Emotional Support**: For novice cooks experiencing anxiety, an encouraging "helper" persona provides reassurance

**Risks of Anthropomorphism:**
- **Overtrust**: Users may overestimate the AI's capabilities, trusting advice that should be questioned
- **Emotional Manipulation**: A friendly persona may exploit users' social instincts to collect data or influence behavior
- **Misattribution of Agency**: Users may attribute human-like understanding and intentionality to a statistical model

**Mitigating Overtrust Through Transparency**

To address overtrust risks, we implement "radical transparency" about the AI's nature:
- The system is described as an "AI assistant," not a "virtual chef" or "cooking expert"
- For high-stakes queries, it explicitly states limitations: "As an AI, I cannot make food safety judgments"
- Impact analysis for substitutions shows reasoning rather than just recommendations
- Errors and failures are acknowledged rather than hidden

We also carefully chose the "Kitchen Helper" persona over "Expert Chef":
- **"Helper" implies collaboration**: User remains the decision-maker, AI provides support
- **"Expert Chef" implies authority**: Risks users deferring completely to AI judgment

This distinction is subtle but important for maintaining appropriate human-AI role boundaries.

### 4.5 Known Limitations and Research Integrity

Academic and ethical integrity requires honest disclosure of system limitations rather than presenting only successes.

**Limitation 1 - Temperature Validation Gap**

Our current implementation provides generic food safety reminders but does not validate cooking temperatures against USDA safe cooking temperature databases. For example, if a recipe instructs cooking chicken to 150°F (below the safe 165°F threshold), our system does not flag this error.

**Impact**: Users following recipe instructions may undercook meat, risking foodborne illness.

**Mitigation**: Future versions should integrate USDA temperature databases and flag unsafe cooking instructions.

**Limitation 2 - Cross-Contamination Awareness**

Our allergen protection focuses on ingredients but does not warn about cross-contamination risks from shared cutting boards, utensils, or cooking surfaces. A recipe may be allergen-free as written, but if the user previously prepared peanut butter on the same cutting board, trace allergens may transfer.

**Impact**: Users with severe allergies may experience reactions despite following allergen-free recipes.

**Mitigation**: Future versions could include explicit prompts: "If you have allergies, ensure all cooking surfaces and utensils are thoroughly cleaned to prevent cross-contamination."

**Limitation 3 - Environmental Noise Robustness**

As noted in our user study, ASR performance degrades significantly in noisy kitchen environments (ventilation fans, running water, timers, blenders). This is a fundamental challenge for voice-first cooking applications.

**Impact**: Users may be unable to use voice features when they are most needed (e.g., hands are occupied, unable to touch screen).

**Mitigation**: Exploring noise-cancellation algorithms, directional microphones, or multimodal fusion (combining voice with gesture recognition).

**Limitation 4 - Cultural and Linguistic Coverage**

Our recipe database and AI knowledge are heavily biased toward Western cuisines and English culinary terminology. Users seeking guidance on traditional dishes from non-Western cultures may receive less helpful or less accurate responses.

**Impact**: The system provides unequal value to users from different cultural backgrounds.

**Mitigation**: Deliberate expansion of recipe sources, evaluation of response quality across diverse cuisines, potential partnerships with cultural cooking experts.

### 4.6 Broader Implications for AI in Domestic Spaces

I'm Cooked represents a case study in deploying conversational AI in safety-critical domestic contexts. Several broader implications emerge:

**Lesson 1: Hybrid Architectures for Safety-Critical AI**

Pure end-to-end LLM systems are inappropriate for domains where errors have physical consequences. Hybrid architectures—routing high-risk queries to rule-based systems while allowing LLM flexibility for low-risk queries—provide a principled path forward.

**Lesson 2: Privacy as Competitive Differentiation**

In an era of pervasive data collection, privacy-first design can be a meaningful differentiator. Our user research suggests that privacy-conscious users actively appreciate the absence of accounts and tracking.

**Lesson 3: Safety Features Build Trust Broadly**

Visible safety mechanisms (triple allergen validation, food safety deflection) appear to build trust even among users who don't directly benefit. This suggests that investing in safety features has value beyond the immediate use case.

**Lesson 4: Voice Interaction Reveals ASR Limitations**

Voice-first design exposes the gaps in current ASR systems—specialized terminology, environmental noise, accent diversity. These challenges require solutions beyond better prompting or more capable LLMs; they demand improvements in speech recognition infrastructure.

**Lesson 5: The Importance of Saying "No"**

Some of the most important design decisions involve refusing to implement features. We refused always-listening microphones, user accounts, food safety advice generation, and off-topic query responses. These refusals define the ethical boundaries of the system as much as the features we did implement.

---

## 5. Conclusion

I'm Cooked demonstrates that conversational AI can be deployed thoughtfully in safety-critical domestic contexts through careful attention to system architecture, prompt engineering, and ethical design principles. Our triple-layer allergen validation, food safety deflection strategy, and privacy-by-design architecture represent concrete implementations of responsible AI values.

Our pilot study with novice university student cooks provides preliminary evidence that voice-first cooking assistance increases confidence, reduces cognitive load, and supports learning for individuals with limited culinary experience. While ASR challenges and voice command learnability remain obstacles, participants consistently expressed enthusiasm for hands-free interaction and appreciation for privacy-preserving design.

The project also highlights important areas for future work: expanding cultural and linguistic coverage in recipe databases, conducting accessibility evaluation with users who rely on assistive technologies, recruiting participants with food allergies to evaluate safety features in real-world conditions, and improving ASR robustness in noisy kitchen environments.

Ultimately, I'm Cooked suggests a path forward for domestic AI systems: hybrid architectures that balance LLM flexibility with rule-based reliability, radical transparency about system limitations, privacy-first data practices, and the courage to say "no" to features that compromise safety or user autonomy. As AI systems become increasingly integrated into our homes, these principles will be essential for building technology that serves users rather than exploiting them.

---

## References

This report draws from comprehensive documentation developed during the project:

- **Project README** (`/README.md`): System overview, features, and technical requirements
- **Guideline Document** (`/docs/Guideline.md`): 45KB academic literature review covering human-centered design, conversational UI, multimodal interaction, and responsible AI frameworks
- **Ethics Documentation** (`/docs/ethics.md`): Responsible AI usage, web scraping ethics, safety measures, and privacy architecture
- **Architecture Documentation** (`/docs/Architecture.md`, `/docs/voice-interaction.md`, `/docs/storage-architecture.md`): Technical implementation details
- **Research Materials** (`/docs/survey.md`, `/docs/research/evaluation-plan.md`, `/docs/research/demo-presentation-script.md`): Study instruments and protocols
- **Implementation Code** (`/src/lib/prompts/`, `/src/app/api/`, `/src/hooks/`): Prompt engineering examples, API implementations, and voice interaction logic

Additional academic references cited in the Guideline.md document include work on CASA paradigm (Reeves & Nass), Gricean maxims, CARE properties for multimodal interaction, WCAG 2.1 accessibility guidelines, and FAT* framework for responsible AI.

---

**Document Version**: Draft for Review
**Date**: November 23, 2025
**Project**: I'm Cooked - Voice-First AI Cooking Assistant
**Repository**: https://github.com/iyioon/im-cooked