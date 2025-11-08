---
created: 2025-11-08
modified: 2025-11-08
title: System Testing & Mixed-Methods Evaluation Plan
status: draft
team_size: 4 people
---

# System Testing & Mixed-Methods Evaluation Plan
## I'm Cooked - AI Cooking Assistant

> **Project Context**: This evaluation plan is designed for a **4-person team** conducting comprehensive testing and evaluation of the I'm Cooked cooking assistant, following the methodologies outlined in the Guideline.md (Sections 6 and 7).

---

## Table of Contents

1. [Overview & Objectives](#1-overview--objectives)
2. [System-Level Functional Testing](#2-system-level-functional-testing-technical)
3. [System-Level Non-Functional Testing](#3-system-level-non-functional-testing-technical)
4. [Mixed-Methods Evaluation (Human-Centric)](#4-mixed-methods-evaluation-human-centric)
5. [Team Roles & Responsibilities](#5-team-roles--responsibilities)
6. [Timeline & Milestones](#6-timeline--milestones)
7. [Success Criteria & Metrics](#7-success-criteria--metrics)
8. [Appendices](#appendices)

---

## 1. Overview & Objectives

### 1.1 Project Summary

**I'm Cooked** is a multimodal AI cooking assistant that provides:
- Voice-first interaction via Gemini Live API (hands-free operation)
- Recipe search and step-by-step cooking guidance
- Real-time cooking assistance with step navigation and timers
- Ingredient substitution suggestions with dietary constraint handling
- Intent detection to maintain cooking-focused boundaries

### 1.2 Evaluation Objectives

Following the Guideline.md framework (Section 7), this plan provides:

1. **Functional Testing** (Section 7.2): Verify _what_ the system does
   - NLU intent classification accuracy
   - Recipe retrieval and context handling
   - Voice interaction and function calling (step navigation, timers)
   - Safety boundaries and off-topic rejection
   
2. **Non-Functional Testing** (Section 7.3): Verify _how well_ it performs
   - ASR robustness in kitchen noise environments
   - Response latency and perceived trustworthiness
   - System reliability and error recovery
   
3. **Mixed-Methods User Study** (Sections 7.4-7.6): Human-centric evaluation
   - Quantitative: Task completion, efficiency, error rates
   - Qualitative: User experience, trust, satisfaction
   - Integrated analysis: Explain quantitative findings with qualitative insights

### 1.3 Ethical Considerations (Section 6)

All testing will be guided by the **FAT* framework** (Fairness, Accountability, Transparency):

- **Fairness**: Test with diverse participant demographics (accents, dietary needs)
- **Accountability**: Clear documentation of test failures and responsible parties
- **Transparency**: Participants informed about AI capabilities and limitations
- **Safety**: Verify high-risk intent handling (food safety, allergies)
- **Privacy**: No PII collection; voice data deleted after analysis

---

## 2. System-Level Functional Testing (Technical)

> **Team Lead**: Person 1 (Technical Testing Lead)  
> **Support**: Person 2 (Test Automation)

### 2.1 NLU Intent Detection Testing

Following Guideline.md Section 7.2, we test the system's ability to classify user intents correctly.

#### 2.1.1 Recipe Search Intent Detection

**System Under Test**: `/api/recipes/detect-intent` endpoint

**Test Cases**: Diverse natural language queries

| Test ID | User Message | Expected Intent | Expected Confidence |
|---------|--------------|-----------------|---------------------|
| FT-INT-01 | "How do I make pad thai?" | RECIPE_SEARCH | high |
| FT-INT-02 | "Show me a cozy winter soup" | RECIPE_SEARCH | high |
| FT-INT-03 | "What is the capital of France?" | REJECT | high |
| FT-INT-04 | "Tell me a joke" | REJECT | high |
| FT-INT-05 | "Can I substitute butter with olive oil?" | GENERAL_FOOD_QUESTION | medium/high |
| FT-INT-06 | "I want something with chicken and broccoli" | RECIPE_SEARCH | high |
| FT-INT-07 | "What's the weather like today?" | REJECT | high |

**Automated Test Script**:
```typescript
// tests/functional/intent-detection.test.ts
describe('Intent Detection - Recipe Search', () => {
  it('should detect RECIPE_SEARCH intent for recipe queries', async () => {
    const response = await fetch('/api/recipes/detect-intent', {
      method: 'POST',
      body: JSON.stringify({ message: "How do I make pad thai?" })
    });
    
    const data = await response.json();
    expect(data.intent).toBe('RECIPE_SEARCH');
    expect(data.confidence).toBe('high');
  });
  
  it('should REJECT off-topic queries', async () => {
    const response = await fetch('/api/recipes/detect-intent', {
      method: 'POST',
      body: JSON.stringify({ message: "What's the weather today?" })
    });
    
    const data = await response.json();
    expect(data.intent).toBe('REJECT');
    expect(data.confidence).toBe('high');
  });
});
```

**Success Criteria**:
- Intent classification accuracy ≥ 90% across test cases
- Off-topic rejection rate ≥ 95% (high confidence)
- Response time < 2 seconds per query

#### 2.1.2 Cooking Session Intent Detection

**System Under Test**: `/api/cooking-session/detect-intent` endpoint

**Test Cases**: Context-aware intent classification during cooking

| Test ID | User Message | Recipe Context | Expected Intent | Notes |
|---------|--------------|----------------|-----------------|-------|
| FT-INT-10 | "What's next?" | Lasagna, Step 3/10 | COOKING_QUESTION | Navigation query |
| FT-INT-11 | "Can I use yogurt instead of sour cream?" | Lasagna, Step 5/10 | SUBSTITUTION_REQUEST | Context: ingredient in step |
| FT-INT-12 | "What does 'fold' mean?" | Lasagna, Step 6/10 | GENERAL_COOKING | Technique clarification |
| FT-INT-13 | "What's the score of the game?" | Lasagna, Step 2/10 | REJECT | Off-topic during cooking |
| FT-INT-14 | "Set a timer for 10 minutes" | Lasagna, Step 4/10 | COOKING_QUESTION | Timer request |

**Automated Test Script**:
```typescript
// tests/functional/cooking-session-intent.test.ts
describe('Intent Detection - Cooking Session', () => {
  it('should detect SUBSTITUTION_REQUEST during cooking', async () => {
    const response = await fetch('/api/cooking-session/detect-intent', {
      method: 'POST',
      body: JSON.stringify({
        userMessage: "Can I use yogurt instead of sour cream?",
        recipeTitle: "Classic Lasagna",
        currentStep: 5,
        totalSteps: 10
      })
    });
    
    const data = await response.json();
    expect(data.intent).toBe('SUBSTITUTION_REQUEST');
  });
  
  it('should REJECT off-topic during cooking session', async () => {
    const response = await fetch('/api/cooking-session/detect-intent', {
      method: 'POST',
      body: JSON.stringify({
        userMessage: "What's the score of the game?",
        recipeTitle: "Classic Lasagna",
        currentStep: 2,
        totalSteps: 10
      })
    });
    
    const data = await response.json();
    expect(data.intent).toBe('REJECT');
    expect(data.confidence).toBe('high');
  });
});
```

**Success Criteria**:
- Context-aware classification accuracy ≥ 85%
- Rejection of off-topic queries during cooking ≥ 90%

### 2.2 End-to-End Conversation Flow Testing

Following Guideline.md Section 7.2, we test complete user journeys with assertions.

#### 2.2.1 Recipe Search to Cooking Session Flow

**Test Case FT-E2E-01**: Complete cooking session journey

**Script**:
```typescript
describe('E2E: Recipe Search to Cooking', () => {
  it('should complete full cooking session flow', async () => {
    // Step 1: Search for recipe
    const searchResponse = await searchRecipe("pad thai");
    expect(searchResponse.recipes).toHaveLength(greaterThan(0));
    
    const recipe = searchResponse.recipes[0];
    
    // Step 2: Start cooking session
    const sessionResponse = await startCookingSession(recipe.id);
    expect(sessionResponse.currentStep).toBe(1);
    
    // Step 3: Navigate steps
    const nextStepResponse = await sendChatMessage(
      sessionResponse.id,
      "What's next?"
    );
    expect(nextStepResponse.stepNumber).toBe(2);
    
    // Step 4: Ask cooking question
    const questionResponse = await sendChatMessage(
      sessionResponse.id,
      "What does 'julienne' mean?"
    );
    expect(questionResponse.intent).toBe('COOKING_QUESTION');
    expect(questionResponse.isRejection).toBe(false);
    
    // Step 5: Request substitution
    const subResponse = await sendChatMessage(
      sessionResponse.id,
      "Can I use zucchini noodles instead?"
    );
    expect(subResponse.intent).toBe('SUBSTITUTION_REQUEST');
  });
});
```

#### 2.2.2 Allergy Safety Critical Path (Guideline.md Section 6.5)

**Test Case FT-E2E-02**: Allergen filtering and safety warnings

**Scenario**: User with peanut allergy searches for pad thai

**Script**:
```typescript
describe('E2E: Allergy Safety Critical Path', () => {
  it('should warn about allergens in traditional recipes', async () => {
    // Context: User preferences stored with peanut allergy
    const userPreferences = {
      allergies: ['peanuts', 'tree nuts']
    };
    
    // Step 1: Search for pad thai (traditionally contains peanuts)
    const searchResponse = await searchRecipe("pad thai", userPreferences);
    
    // Step 2: Select first recipe
    const recipe = searchResponse.recipes[0];
    
    // Step 3: System should detect allergen
    const recipeDetail = await getRecipeDetail(recipe.id);
    
    // ASSERTION: If recipe contains peanuts, must be flagged
    if (recipeContainsAllergen(recipeDetail, 'peanuts')) {
      expect(recipeDetail.allergenWarnings).toContain('peanuts');
    }
    
    // Step 4: Request substitution
    const subResponse = await requestSubstitution(
      recipe.id,
      "peanuts",
      userPreferences
    );
    
    // ASSERTION: Substitutions must not contain allergens
    subResponse.suggestions.forEach(sub => {
      expect(sub.containsAllergens).not.toContain('peanuts');
      expect(sub.containsAllergens).not.toContain('tree nuts');
    });
  });
  
  it('should reject unsafe food safety questions', async () => {
    const response = await sendChatMessage(
      sessionId,
      "Is this chicken safe to eat? It smells weird."
    );
    
    // ASSERTION: System must deflect, not advise
    expect(response.message).toContain("cannot make food safety judgments");
    expect(response.message).toContain("When in doubt, throw it out");
  });
});
```

**Success Criteria** (Critical - Section 6.5):
- 100% of allergen-containing recipes must be flagged
- 100% of substitution suggestions must exclude user allergens
- 100% of high-risk safety queries must deflect to authorities

### 2.3 Voice Function Calling Testing

**System Under Test**: Gemini Live API integration with function tools

#### 2.3.1 Step Navigation Functions

**Test Cases**: Voice commands trigger correct function calls

| Test ID | Voice Command | Expected Function | Expected Parameters |
|---------|---------------|-------------------|---------------------|
| FT-FUNC-01 | "Next step" | navigateToStep | action: "next" |
| FT-FUNC-02 | "Go back" | navigateToStep | action: "previous" |
| FT-FUNC-03 | "Go to step 5" | navigateToStep | action: "goto", stepNumber: 5 |
| FT-FUNC-04 | "I'm done with this step" | markStepComplete | (current step) |

**Manual Test Protocol**:
1. Connect to Gemini Live API
2. Send voice command via audio input
3. Monitor function call events via `onFunctionCall` handler
4. Verify correct function name and parameters
5. Send mock tool response
6. Verify system state update (step number changed)

**Success Criteria**:
- Function call detection rate ≥ 85% for clear commands
- Correct parameter extraction ≥ 90%

#### 2.3.2 Timer Functions

**Test Cases**: Timer requests with descriptive labels

| Test ID | Voice Command | Expected Function | Expected Parameters |
|---------|---------------|-------------------|---------------------|
| FT-FUNC-10 | "Set a timer for 10 minutes" | setTimer | minutes: 10, seconds: 0, label: [context-based] |
| FT-FUNC-11 | "Timer for 30 seconds" | setTimer | minutes: 0, seconds: 30, label: [context-based] |
| FT-FUNC-12 | "Set a 5 minute timer for the pasta" | setTimer | minutes: 5, seconds: 0, label: "pasta" |

**Success Criteria**:
- Timer function calls correctly parsed ≥ 90%
- Descriptive labels generated ≥ 80%

### 2.4 Entity-Level NER Evaluation (Guideline.md Section 7.2)

**Critical**: Use **entity-level** evaluation, not token-level

**Test Case FT-NER-01**: Ingredient quantity parsing

| Input | Expected Entity | Pass/Fail |
|-------|-----------------|-----------|
| "1 cup flour" | {amount: "1", unit: "cup", ingredient: "flour"} | PASS |
| "1 tsp flour" | {amount: "1", unit: "tsp", ingredient: "flour"} | PASS (different from above) |
| "1 cu flour" | {amount: "1", unit: "cup", ingredient: "flour"} | FAIL (unit mismatch) |

**Rationale** (Guideline.md): "1 cup flour" vs "1 tsp flour" is a catastrophic difference despite high token overlap.

---

## 3. System-Level Non-Functional Testing (Technical)

> **Team Lead**: Person 2 (Performance & Reliability)  
> **Support**: Person 1 (Technical Testing Lead)

### 3.1 ASR Robustness in Kitchen Noise (Critical - Section 7.3)

**Context** (Guideline.md Section 1.3): Kitchen is a hostile audio environment with blenders, fans, running water.

**Objective**: Measure Word Error Rate (WER) in realistic noise conditions

#### 3.1.1 Controlled Noise Testing

**Equipment Needed**:
- Test smartphone/device with microphone
- Bluetooth speaker for background noise playback
- Decibel meter app
- Kitchen noise audio samples (see Appendix A)

**Test Protocol**:

1. **Baseline (Clean Audio)**:
   - Record 20 cooking commands in quiet environment
   - Commands: "Next step", "Set timer for 5 minutes", "What's next?", etc.
   - Measure WER with Gemini Live ASR

2. **Kitchen Noise Levels**:
   - **Low Noise (40-50 dB)**: Refrigerator hum, light cooking
   - **Medium Noise (60-70 dB)**: Running water, conversation
   - **High Noise (75-85 dB)**: Blender, exhaust fan at full speed

3. **Testing**:
   - Play background noise at target decibel level
   - User speaks commands from 1 meter away (typical cooking distance)
   - Record transcriptions from Gemini Live
   - Calculate WER: `(Substitutions + Deletions + Insertions) / Total Words`

**Test Cases**:

| Test ID | Command | Noise Level | Expected WER |
|---------|---------|-------------|--------------|
| NFT-ASR-01 | "Next step" | Baseline (quiet) | < 5% |
| NFT-ASR-02 | "Next step" | Medium (65 dB) | < 15% |
| NFT-ASR-03 | "Next step" | High (80 dB) | < 30% |
| NFT-ASR-04 | "Set a timer for 10 minutes" | Medium | < 20% |
| NFT-ASR-05 | "Can I use olive oil instead of butter?" | Medium | < 25% |

**Diversity Testing** (Guideline.md Section 6.2 - Bias Mitigation):
- Test with speakers of different accents (non-native English, regional dialects)
- Use Mozilla Common Voice dataset samples for diversity

**Success Criteria**:
- WER < 15% in medium noise conditions (60-70 dB)
- WER < 35% in high noise conditions (75-85 dB)
- WER variance < 10% across different accent groups (fairness)

**Failure Analysis**:
- Document which commands fail most frequently
- Identify if specific phonemes are problematic in noise
- Recommend UI/UX mitigations (e.g., visual confirmation)

#### 3.1.2 Real Kitchen Field Testing

**Protocol**:
- Team member 2 cooks a real recipe using the app
- Record session in actual kitchen environment
- No artificial noise control (authentic conditions)
- Document all ASR failures and user frustrations
- Calculate WER on full session transcript

**Data Collection**:
- Audio recording of session (with consent)
- Screen recording of app interactions
- Observer notes on cooking context during failures
- Post-session interview about ASR experience

### 3.2 Response Latency & Perceived Trust (Section 7.3)

**Context** (Guideline.md): Response timing affects user trust - too fast feels untrustworthy, too slow feels incompetent.

**Objective**: Measure and optimize response latency for different query types

#### 3.2.1 Latency Benchmarks

**Test Cases**:

| Query Type | Example | Target Latency | Max Acceptable |
|------------|---------|----------------|----------------|
| Simple navigation | "Next step" | < 1 second | 2 seconds |
| Recipe search | "Find pad thai recipe" | 3-5 seconds | 8 seconds |
| Cooking question | "What does fold mean?" | 2-3 seconds | 5 seconds |
| Substitution request | "Substitute butter with..." | 3-4 seconds | 6 seconds |
| Off-topic rejection | "What's the weather?" | < 2 seconds | 3 seconds |

**Testing Protocol**:
1. Send 50 queries of each type
2. Measure time from API request to first byte of response
3. Measure time to complete response
4. Calculate P50, P95, P99 latencies
5. Identify outliers and investigate causes

**Success Criteria**:
- 95% of queries meet target latency
- No queries exceed max acceptable latency
- Consistent latency (low variance)

#### 3.2.2 Dynamic Delay Implementation (Guideline.md Recommendation)

**Test**: Verify system implements appropriate "thinking" delays

**Hypothesis**: Simple queries with artificial delay feel more trustworthy

**A/B Test Design** (for user study):
- **Group A**: Instant responses (< 500ms) for all queries
- **Group B**: Dynamic delays (simple: 1s, complex: 3-5s)
- Measure perceived trustworthiness (Likert scale 1-5)

### 3.3 System Reliability & Error Recovery

#### 3.3.1 Network Interruption Handling

**Test Cases**:

| Test ID | Scenario | Expected Behavior |
|---------|----------|-------------------|
| NFT-REL-01 | Network drops during voice recording | Graceful error message, allow retry |
| NFT-REL-02 | API timeout (> 10s) | Timeout error, return to previous state |
| NFT-REL-03 | Gemini Live connection lost mid-session | Detect disconnect, offer reconnect button |

**Success Criteria**:
- 0 crashes/unhandled exceptions
- User never loses cooking progress (session state preserved)
- Clear error messages (no technical jargon)

#### 3.3.2 Conversation Repair Strategy Effectiveness (Section 2.4)

**Test**: Verify "Options" repair strategy implementation

**Scenario**: ASR fails to transcribe ingredient name due to noise

**Expected Behavior** (Guideline.md Section 2.4):
- ❌ BAD (Repeat): "I don't understand. Please rephrase."
- ✅ GOOD (Options): "Sorry, I didn't catch that. Did you say 'add salt' or 'add stock'?"

**Manual Testing**:
1. Deliberately trigger low-confidence ASR (e.g., whisper command)
2. Observe system response
3. Verify it offers options or clarifications (not just "repeat")

**Success Criteria**:
- System uses "Options" strategy ≥ 70% of low-confidence scenarios
- "Repeat" strategy used < 10%

---

## 4. Mixed-Methods Evaluation (Human-Centric)

> **Team Lead**: Person 3 (User Research Lead)  
> **Support**: Person 4 (Qualitative Analysis)

Following Guideline.md **Explanatory Sequential Design** (Section 7.6):
1. Phase 1: Quantitative experiment
2. Phase 2: Qualitative interviews
3. Integration: Explain quantitative findings with qualitative insights

### 4.1 Study Design Overview

#### 4.1.1 Research Questions

**RQ1**: Does the voice-first cooking assistant improve task completion rates compared to traditional recipe websites?

**RQ2**: Does the AI assistant reduce cooking errors and completion time?

**RQ3**: What are users' perceptions of trust, safety, and helpfulness of the AI cooking assistant?

**RQ4**: How do users experience the voice interaction in a realistic kitchen environment?

#### 4.1.2 Experimental Design (Between-Subjects)

**Design**: Between-subjects experimental study (Guideline.md Section 7.4)

**Participants**: 
- **Sample Size**: 8-12 participants (4-6 per group)
- **Recruitment**: Convenience sampling from local community
- **Diversity Requirements** (Fairness - Section 6.1):
  - Mix of cooking skill levels (novice, intermediate)
  - Mix of ages (20s-60s)
  - Mix of accents/language backgrounds
  - Include participants with dietary restrictions

**Groups**:
- **Group A (Treatment)**: Uses I'm Cooked voice assistant to cook recipe
- **Group B (Control)**: Uses traditional recipe website (e.g., AllRecipes) to cook same recipe

**Recipe Selection**:
- **Recipe**: Classic Lasagna (12 steps, ~60 minutes, medium complexity)
- **Rationale**: Long enough to test sustained interaction, common enough that ingredients are accessible

**Setting**:
- **Location**: Participant's own kitchen (ecological validity)
- **Materials**: All ingredients pre-measured and provided
- **Equipment**: Participant's own kitchen tools + smartphone/tablet for app

### 4.2 Phase 1: Quantitative Evaluation

> **Lead**: Person 3 (User Research Lead)

#### 4.2.1 Data Collection Instruments

**Pre-Study Questionnaire**:
- Demographics (age, gender, ethnicity - optional)
- Cooking experience (Likert 1-5: 1=Novice, 5=Expert)
- Technology comfort (Likert 1-5)
- Dietary restrictions/allergies (for future testing)
- Voice assistant experience (yes/no, which ones)

**During-Study Observations** (Researcher records):
- Start time and end time (measure efficiency)
- Cooking errors observed (tallied by type, see below)
- Interaction breakdowns (ASR failures, confusion, frustration)
- Assistance requests to researcher (indicates difficulty)
- Observation notes on user behavior

**Post-Study Questionnaire**:
1. **Task Completion** (Yes/No): "Did you successfully complete the lasagna?"

2. **Usability Metrics** (Likert 1-5):
   - Ease of use: "The [assistant/website] was easy to use"
   - Clarity: "The instructions were clear"
   - Helpfulness: "The [assistant/website] was helpful"
   
3. **Trust & Safety** (Likert 1-5):
   - Trust: "I trusted the [assistant/website]'s cooking advice"
   - Safety: "I felt confident the instructions were safe to follow"
   - Control: "I felt in control during the cooking process"

4. **Satisfaction** (Likert 1-5):
   - Overall satisfaction: "I am satisfied with my cooking experience"
   - Recommendation: "I would recommend this [assistant/website] to a friend"

5. **Voice-Specific** (Group A only, Likert 1-5):
   - ASR accuracy: "The assistant understood my voice commands"
   - Hands-free value: "Being able to use voice instead of touch was valuable"
   - Natural conversation: "Talking to the assistant felt natural"

#### 4.2.2 Quantitative Metrics (Guideline.md Section 7.4)

**Primary Metrics**:

1. **Effectiveness (Task Completion Rate)**:
   - Formula: `(# participants who completed recipe) / (total participants per group)`
   - Target: Group A ≥ Group B

2. **Efficiency (Task Completion Time)**:
   - Measured: Time from start to "lasagna in oven"
   - Statistical test: Independent t-test (Group A vs Group B)
   - Hypothesis: Group A < Group B (voice is faster)

3. **Error Rate (Cooking Errors)**:
   - **Error Types**:
     - Missed step (skipped an instruction)
     - Wrong ingredient (used incorrect item)
     - Wrong quantity (measurement error)
     - Wrong temperature (oven/stove setting)
     - Wrong timing (under/over-cooked)
   - Formula: `Mean errors per participant per group`
   - Statistical test: Independent t-test
   - Target: Group A < Group B

4. **Satisfaction (Likert Scale Scores)**:
   - Calculate mean satisfaction scores
   - Statistical test: Mann-Whitney U test (non-parametric for Likert)
   - Target: Group A > Group B

**Data Analysis Plan**:

```
# Example analysis in R or Python
import pandas as pd
from scipy import stats

# Load data
data = pd.read_csv('user_study_results.csv')

# Effectiveness: Task Completion Rate
completion_A = data[data['group']=='A']['completed'].mean()
completion_B = data[data['group']=='B']['completed'].mean()
print(f"Group A completion: {completion_A:.2%}")
print(f"Group B completion: {completion_B:.2%}")

# Efficiency: Task Completion Time
time_A = data[data['group']=='A']['completion_time_min']
time_B = data[data['group']=='B']['completion_time_min']
t_stat, p_value = stats.ttest_ind(time_A, time_B)
print(f"Time comparison: t={t_stat:.2f}, p={p_value:.3f}")

# Error Rate
errors_A = data[data['group']=='A']['total_errors']
errors_B = data[data['group']=='B']['total_errors']
t_stat, p_value = stats.ttest_ind(errors_A, errors_B)
print(f"Error comparison: t={t_stat:.2f}, p={p_value:.3f}")

# Satisfaction
satisfaction_A = data[data['group']=='A']['satisfaction_score']
satisfaction_B = data[data['group']=='B']['satisfaction_score']
u_stat, p_value = stats.mannwhitneyu(satisfaction_A, satisfaction_B)
print(f"Satisfaction comparison: U={u_stat}, p={p_value:.3f}")
```

**Success Criteria**:
- Group A (AI assistant) shows statistically significant improvement in ≥2 of the 4 primary metrics (p < 0.05)
- No metric shows significant negative impact for Group A

### 4.3 Phase 2: Qualitative Evaluation

> **Lead**: Person 4 (Qualitative Analysis)

#### 4.3.1 Semi-Structured Interview Protocol

**Timing**: Immediately after cooking task (while experience is fresh)

**Duration**: 15-20 minutes per participant

**Setting**: Comfortable setting (kitchen table), audio recorded with consent

**Interview Guide** (Guideline.md Section 7.5):

**1. Descriptive Questions** (understand experience):
- "Can you describe your experience using the [assistant/website] to make the lasagna?"
- "What went through your mind when you first started using it?"
- "Walk me through a moment when you felt most confident/uncertain during cooking."

**2. Structural Questions** (categorize experiences):
- "What types of information did you find easy to get from the [assistant/website]?"
- "What types of questions were hard to answer?"
- "What were the different ways you interacted with the [assistant/website]?" (Group A: voice vs touch)

**3. Contrast Questions** (compare experiences):
- "What was the difference between steps where you felt confident vs. stressed?"
- "How did using [voice/text] compare to how you normally follow recipes?"
- (Group A only): "Can you compare a moment when the voice assistant understood you vs. when it misunderstood?"

**4. Trust & Safety Questions** (Section 6 - Ethics):
- "Did you ever doubt the assistant's instructions? When and why?"
- "How did you feel about the assistant's advice on cooking times/temperatures?"
- (Group A only): "Did you feel comfortable having an 'always-listening' microphone in your kitchen?"

**5. Voice-Specific Questions** (Group A only):
- "Tell me about your experience with the voice interaction."
- "Were there moments when voice control felt natural? When did it feel frustrating?"
- "How did the assistant handle moments when you misspoke or it didn't understand?"

**6. Improvement Questions**:
- "If you could change one thing about the [assistant/website], what would it be?"
- "What features would make this more helpful for you?"

#### 4.3.2 Thematic Analysis Protocol (Guideline.md Section 7.5)

**Analysis Method**: Inductive thematic analysis (bottom-up coding)

**Process**:

1. **Transcription** (Person 4):
   - Transcribe all interview recordings verbatim
   - Anonymize participant names (use P1, P2, etc.)

2. **Familiarization** (Person 4):
   - Read all transcripts multiple times
   - Make notes on initial observations

3. **Initial Coding** (Person 4, Person 3 reviews):
   - Line-by-line coding of transcripts
   - Use descriptive codes (e.g., "frustration-with-ASR", "trust-in-timer", "confusion-about-step")
   - Code in Dedoose, NVivo, or manual (spreadsheet)

4. **Theme Development** (Team discussion):
   - Group similar codes into categories
   - Identify recurring patterns across participants
   - Develop higher-level themes

**Expected Themes** (based on Guideline.md):
- Clarity of Instructions
- Frustration with ASR Errors
- Perceived Stress/Confidence
- Trust in AI Recommendations
- Hands-Free Convenience
- Privacy Concerns (always-listening mic)
- Repair Strategy Effectiveness
- Persona Perception (helpful vs. authoritative)

5. **Inter-Rater Reliability** (Quality check):
   - Person 3 and Person 4 independently code 20% of transcripts
   - Calculate Cohen's Kappa (target: κ > 0.70)
   - Discuss disagreements until consensus

6. **Theme Refinement**:
   - Review themes against transcripts
   - Ensure each theme is supported by multiple quotes
   - Define each theme clearly

7. **Reporting**:
   - Write theme definitions
   - Select representative quotes for each theme
   - Connect themes to research questions

### 4.4 Phase 3: Mixed-Methods Integration

> **Lead**: Person 3 & Person 4 (Joint)

Following Guideline.md **Explanatory Sequential Design** (Section 7.6):

**Objective**: Use qualitative findings to **explain** quantitative results

#### 4.4.1 Integration Strategy

**Step 1: Identify Quantitative Findings Needing Explanation**

Example scenarios:

**Scenario A**: Quantitative shows Group A (AI) made 30% MORE errors than Group B (Control)
- Surprising result - needs explanation

**Scenario B**: Quantitative shows Group A completion time 20% LONGER than Group B
- Contradicts hypothesis - needs explanation

**Scenario C**: Quantitative shows Group A satisfaction significantly HIGHER despite similar completion rates
- Interesting finding - needs exploration

**Step 2: Query Qualitative Data for Explanations**

For **Scenario A** (more errors with AI):
- Search codes/themes related to: "confusion", "ASR-failure", "missed-instruction", "distraction"
- Identify participant quotes describing error-causing moments

**Example Integration** (Guideline.md Section 7.6):

> **Quantitative Finding**: The CUI group (Group A) made 30% more cooking errors (M=4.1 errors) than the Website group (Group B, M=2.8 errors), t(10)=2.31, p=.04.
>
> **Qualitative Explanation**: Thematic analysis of post-task interviews revealed a dominant theme: **"ASR-Induced Flustering"**. Participants repeatedly described moments when the voice assistant failed to understand them over the noise of the exhaust fan:
>
> *"I was trying to ask how long to boil the pasta, but it kept saying 'I didn't catch that' and then I got frustrated and just guessed. I think I overcooked it because I wasn't paying attention to the time."* (P3, Group A)
>
> *"When the blender was running, it couldn't hear me at all. I had to stop what I was doing, turn off the blender, wipe my hands, and then try again. By then I forgot what step I was on."* (P5, Group A)
>
> **Integrated Conclusion**: The quantitative finding of increased errors is explained by a non-functional failure (ASR noise robustness, as tested in Section 3.1). The problem was not the recipe content or conversation design, but the ASR's inability to function in high-noise kitchen environments. This clear, evidence-based finding directs the next iteration: prioritize ASR noise cancellation and provide visual redundancy for critical instructions (CARE principle - Redundancy, Section 5.2).

#### 4.4.2 Integration Matrix

Create a joint display to visualize integration:

| Quantitative Result | Statistical Sig | Related Qualitative Theme | Explanation | Implication |
|---------------------|-----------------|---------------------------|-------------|-------------|
| Group A: 30% more errors | p=.04 | ASR-Induced Flustering | ASR failed in noise, users missed steps | Improve ASR noise robustness |
| Group A: 20% longer time | p=.06 | Repair Strategy Frustration | Users spent time repeating commands | Optimize error recovery |
| Group A: Higher satisfaction | p=.02 | Hands-Free Convenience | Users loved not touching phone with messy hands | Validate core value prop |
| No difference in completion | p=.54 | Determination to Finish | Both groups persisted despite challenges | Recipe choice appropriate |

#### 4.4.3 Recommendations from Integration

**Priority 1 (Critical)**: ASR Noise Robustness
- Quantitative: Caused increased errors
- Qualitative: Major source of frustration
- Action: Implement noise cancellation, test in Section 3.1 conditions

**Priority 2**: Visual Redundancy (CARE Principle)
- Quantitative: Higher error rate in Group A
- Qualitative: Users looked at screen when voice failed
- Action: Ensure critical info (timers, temps) always visible on screen

**Priority 3**: Repair Strategy Improvement
- Quantitative: Increased task time
- Qualitative: "Repeat" prompts seen as unhelpful
- Action: Implement "Options" strategy (Section 2.4)

**Success**: Hands-Free Value Validated
- Quantitative: Higher satisfaction
- Qualitative: Unanimous praise for hands-free interaction
- Action: Emphasize this in marketing/onboarding

---

## 5. Team Roles & Responsibilities

### 5.1 Team Structure (4 People)

**Person 1: Technical Testing Lead**
- **Primary**: Functional testing (Section 2)
- **Secondary**: Support non-functional testing
- Skills: Software testing, API testing, test automation
- Deliverables:
  - Automated test suite (intent detection, E2E flows)
  - Functional test report with pass/fail results
  - Bug/issue tracking log

**Person 2: Performance & Reliability Engineer**
- **Primary**: Non-functional testing (Section 3)
- **Secondary**: Support functional testing
- Skills: Performance testing, audio engineering (for ASR testing)
- Deliverables:
  - ASR WER analysis report
  - Latency benchmark report
  - Reliability test results

**Person 3: User Research Lead**
- **Primary**: Quantitative study design and execution (Section 4.1-4.2)
- **Secondary**: Support qualitative interviews
- Skills: Experimental design, statistical analysis, human subjects research
- Deliverables:
  - User study protocol (IRB-ready if needed)
  - Quantitative analysis report with statistics
  - Recruitment and scheduling logistics

**Person 4: Qualitative Research Specialist**
- **Primary**: Qualitative interviews and analysis (Section 4.3)
- **Secondary**: Support quantitative data collection
- Skills: Interview techniques, thematic analysis, qualitative software (NVivo/Dedoose)
- Deliverables:
  - Interview transcripts (anonymized)
  - Thematic analysis codebook
  - Qualitative findings report

**All Team Members**:
- Phase 3 integration (Section 4.4)
- Final report co-authoring
- Presentation preparation

### 5.2 Communication & Collaboration

**Weekly Team Meetings**: 1 hour
- Progress updates
- Blocker discussion
- Data sharing

**Shared Resources**:
- GitHub repository for test code
- Shared drive for study data (IRB-compliant if needed)
- Slack/Discord for async communication

**Documentation**:
- All team members maintain daily logs
- Use shared testing plan document (this doc) for coordination

---

## 6. Timeline & Milestones

**Total Duration**: 6 weeks (can adjust based on team availability)

### Week 1: Setup & Preparation
- [ ] Team kickoff meeting
- [ ] Review Guideline.md and this evaluation plan
- [ ] **Person 1**: Set up test environment, install dependencies
- [ ] **Person 2**: Procure ASR testing equipment (mic, speaker, decibel meter)
- [ ] **Person 3**: Finalize user study protocol, begin participant recruitment
- [ ] **Person 4**: Prepare interview guide, set up transcription workflow

**Deliverable**: Test environment ready, study protocol finalized

### Week 2: Functional Testing
- [ ] **Person 1**: Execute intent detection tests (Section 2.1)
- [ ] **Person 1**: Execute E2E conversation flow tests (Section 2.2)
- [ ] **Person 1**: Allergy safety critical path testing (Section 2.2.2)
- [ ] **Person 2**: Support function calling tests (Section 2.3)
- [ ] **Person 3**: Continue participant recruitment (target: 8-12 confirmed)
- [ ] **Person 4**: Pilot interview with team member to refine questions

**Deliverable**: Functional test report (all test cases executed, results documented)

### Week 3: Non-Functional Testing
- [ ] **Person 2**: ASR noise robustness testing (Section 3.1.1)
- [ ] **Person 2**: Real kitchen field test (Section 3.1.2)
- [ ] **Person 2**: Latency benchmarks (Section 3.2)
- [ ] **Person 1**: Support ASR testing, data collection
- [ ] **Person 3**: Finalize participant schedule, confirm recipe ingredients
- [ ] **Person 4**: Finalize interview guide, conduct second pilot

**Deliverable**: Non-functional test report (WER analysis, latency benchmarks)

### Week 4: Quantitative User Study
- [ ] **Person 3**: Execute user study with 8-12 participants (4-6 per group)
- [ ] **Person 3**: Administer pre/post questionnaires
- [ ] **Person 3**: Observe and record cooking sessions
- [ ] **Person 4**: Support observation, backup note-taking
- [ ] **Person 1 & 2**: Monitor app stability during user testing, fix critical bugs

**Deliverable**: Quantitative data collected (questionnaires, observation notes)

### Week 5: Qualitative Interviews & Analysis
- [ ] **Person 4**: Conduct post-task interviews (15-20 min per participant)
- [ ] **Person 4**: Transcribe interview recordings
- [ ] **Person 4**: Begin thematic analysis (coding)
- [ ] **Person 3**: Analyze quantitative data (statistics, visualizations)
- [ ] **Person 3**: Support qualitative coding (inter-rater reliability check)
- [ ] **Person 1 & 2**: Begin drafting technical testing report sections

**Deliverable**: Quantitative analysis complete, qualitative themes identified

### Week 6: Integration & Reporting
- [ ] **Person 3 & 4**: Integrate quantitative and qualitative findings (Section 4.4)
- [ ] **All**: Team meeting to discuss integrated findings
- [ ] **All**: Co-author final evaluation report (see Section 7)
- [ ] **All**: Prepare presentation/demo
- [ ] **Person 3**: Write recommendations and future work section

**Deliverable**: Final comprehensive evaluation report

---

## 7. Success Criteria & Metrics

### 7.1 Technical Testing Success Criteria

**Functional Testing**:
- ✅ Intent classification accuracy ≥ 90% (recipe search)
- ✅ Intent classification accuracy ≥ 85% (cooking session, context-aware)
- ✅ Off-topic rejection rate ≥ 95%
- ✅ 100% of allergen-containing recipes flagged (critical)
- ✅ 100% of substitution suggestions exclude user allergens (critical)
- ✅ Function call detection ≥ 85% (voice navigation, timers)
- ✅ Entity-level NER accuracy ≥ 90% (ingredient parsing)

**Non-Functional Testing**:
- ✅ ASR WER < 15% in medium noise (60-70 dB)
- ✅ ASR WER < 35% in high noise (75-85 dB)
- ✅ ASR WER variance < 10% across accent groups (fairness)
- ✅ 95% of queries meet target latency
- ✅ 0 crashes during user study
- ✅ "Options" repair strategy used ≥ 70% of low-confidence scenarios

### 7.2 User Study Success Criteria

**Quantitative**:
- ✅ Group A (AI) shows improvement in ≥2 of 4 primary metrics (completion, time, errors, satisfaction)
- ✅ Statistical significance (p < 0.05) for at least 1 metric
- ✅ No metric shows significant negative impact for Group A

**Qualitative**:
- ✅ Conduct interviews with 100% of participants
- ✅ Identify 5-8 major themes with clear definitions
- ✅ Inter-rater reliability κ > 0.70
- ✅ Each theme supported by quotes from ≥3 participants

**Integration**:
- ✅ All surprising quantitative findings explained with qualitative data
- ✅ Clear, actionable recommendations for next iteration
- ✅ Integrated findings connect to HCD loop (Section 1.1)

### 7.3 Overall Project Success

**Minimum Success Threshold**:
- Technical testing completed for ≥80% of test cases
- User study completed with ≥8 participants
- Mixed-methods integration demonstrates value of explanatory approach
- Final report delivered with clear recommendations

**Aspirational Success**:
- All technical tests pass success criteria
- User study shows significant improvement with AI assistant
- Findings publishable as academic paper or case study
- Team demonstrates mastery of HCD methodology

---

## Appendices

### Appendix A: Kitchen Noise Audio Samples

**Source**: Record in real kitchen or use royalty-free sound effects

**Required Samples** (30 seconds each):
1. Refrigerator hum (40-50 dB baseline)
2. Running water from faucet (60-65 dB)
3. Exhaust fan on medium (65-70 dB)
4. Exhaust fan on high (75-80 dB)
5. Blender running (80-90 dB)
6. Multiple people talking + cooking (65-70 dB)

**Usage**: Play through Bluetooth speaker during ASR testing (Section 3.1)

### Appendix B: Test Recipe - Classic Lasagna

**Recipe Selection Criteria**:
- 10-15 steps (long enough to test sustained interaction)
- 45-60 minutes total time (manageable in user study)
- Common ingredients (accessible, affordable)
- Medium complexity (tests clarification, assistance needs)
- Contains allergen (optional: can substitute for dairy-free version)

**Ingredients**:
- 1 lb ground beef
- 1 jar marinara sauce (24 oz)
- 1 box lasagna noodles (9 noodles)
- 15 oz ricotta cheese
- 2 cups shredded mozzarella
- 1/2 cup grated Parmesan
- 1 egg
- 2 cloves garlic, minced
- Salt, pepper, Italian seasoning

**Steps**:
1. Preheat oven to 375°F
2. Cook lasagna noodles according to package directions
3. Brown ground beef with garlic in large skillet
4. Add marinara sauce to beef, simmer 10 minutes
5. In bowl, mix ricotta, egg, 1 cup mozzarella, Parmesan, seasonings
6. Drain noodles
7. Spread 1/2 cup sauce in bottom of 9x13 pan
8. Layer: 3 noodles, 1/3 ricotta mixture, 1/3 meat sauce
9. Repeat layers twice
10. Top with remaining 1 cup mozzarella
11. Cover with foil, bake 25 minutes
12. Remove foil, bake 15 more minutes until bubbly
13. Let rest 10 minutes before serving

### Appendix C: Informed Consent Template

**Study Title**: Evaluation of Voice-First AI Cooking Assistant

**Purpose**: You are invited to participate in a research study evaluating a new AI cooking assistant application. This study will help us understand how voice interaction affects cooking experiences.

**Procedures**:
- You will cook a lasagna recipe using either (A) an AI voice assistant app or (B) a traditional recipe website
- A researcher will observe and take notes
- After cooking, you will answer a questionnaire and participate in a 15-20 minute interview
- Total time commitment: approximately 90 minutes

**Risks**: 
- Minimal risk (same as normal cooking)
- Standard kitchen safety precautions apply

**Benefits**:
- You will learn to cook lasagna and keep the final product
- You will contribute to research on AI and human-computer interaction

**Confidentiality**:
- Your name will be replaced with a participant ID
- Audio recordings will be transcribed and then deleted
- No personally identifiable information will be published
- Data will be stored securely and deleted after study completion

**Voluntary Participation**:
- Your participation is completely voluntary
- You may withdraw at any time without penalty
- You may skip any question you do not wish to answer

**Contact Information**:
- For questions, contact: [Team Lead Name] at [email]

**Consent**:
- [ ] I have read and understood the above information
- [ ] I consent to participate in this study
- [ ] I consent to audio recording of the interview

Participant Signature: _________________ Date: _______

### Appendix D: Quantitative Data Collection Sheet

**Participant ID**: ________  
**Group**: [ ] A (AI Assistant) [ ] B (Control Website)  
**Date**: ________  
**Researcher**: ________

**Pre-Study**:
- Age: _____ Gender: _____ (optional)
- Cooking experience (1-5): _____
- Technology comfort (1-5): _____
- Voice assistant experience: [ ] Yes [ ] No

**During-Study Observations**:
- Start time: _____
- End time: _____
- Task completed: [ ] Yes [ ] No

**Cooking Errors** (tally):
- Missed step: _____
- Wrong ingredient: _____
- Wrong quantity: _____
- Wrong temperature: _____
- Wrong timing: _____
- Total errors: _____

**Interaction Breakdown Events** (Group A only):
- ASR failure count: _____
- User frustration observed: [ ] None [ ] Mild [ ] Moderate [ ] Severe
- Assistance requests to researcher: _____

**Observer Notes** (use back of sheet):

---

**Post-Study Questionnaire** (Likert 1-5):

**Usability**:
1. The [assistant/website] was easy to use: 1 2 3 4 5
2. The instructions were clear: 1 2 3 4 5
3. The [assistant/website] was helpful: 1 2 3 4 5

**Trust & Safety**:
4. I trusted the cooking advice: 1 2 3 4 5
5. I felt confident instructions were safe: 1 2 3 4 5
6. I felt in control during cooking: 1 2 3 4 5

**Satisfaction**:
7. Overall satisfaction: 1 2 3 4 5
8. I would recommend this to a friend: 1 2 3 4 5

**Voice-Specific** (Group A only):
9. The assistant understood my voice: 1 2 3 4 5
10. Hands-free interaction was valuable: 1 2 3 4 5
11. Conversation felt natural: 1 2 3 4 5

### Appendix E: Interview Transcript Template

**Participant ID**: P___  
**Group**: [ ] A [ ] B  
**Date**: ________  
**Interviewer**: ________  
**Duration**: _____ minutes

**Audio File**: [filename.mp3]

---

**TRANSCRIPT**:

[Timestamp] **Interviewer**: Can you describe your experience using the [assistant/website] to make the lasagna?

[Timestamp] **P__**: [transcription]

[Timestamp] **Interviewer**: What went through your mind when you first started using it?

[Timestamp] **P__**: [transcription]

[Continue full transcript...]

---

**Interviewer Notes** (initial impressions, non-verbal cues):

### Appendix F: Thematic Analysis Codebook Template

**Code**: [Code Name]  
**Definition**: [Clear definition of what this code represents]  
**When to use**: [Criteria for applying this code]  
**When NOT to use**: [Boundaries of this code]  
**Example quotes**:
- P1: "[quote]"
- P3: "[quote]"
- P7: "[quote]"

**Related codes**: [Other codes this connects to]  
**Theme**: [Higher-level theme this code belongs to]

---

**Example Code**:

**Code**: ASR-Frustration-Noise  
**Definition**: Participant expresses frustration specifically caused by voice assistant failing to understand them due to background noise (exhaust fan, blender, water)  
**When to use**: When participant explicitly mentions noise interfering with voice recognition, or context clearly indicates noise-related ASR failure  
**When NOT to use**: General frustration not related to ASR, or ASR failure in quiet conditions (use ASR-Frustration-General instead)  
**Example quotes**:
- P3: "When the blender was running, it couldn't hear me at all. I had to stop what I was doing, turn off the blender..."
- P5: "The exhaust fan was so loud it just kept saying 'I didn't catch that' and I got really frustrated."  
**Related codes**: ASR-Failure, Noise-Environment, Workflow-Interruption  
**Theme**: ASR-Induced Flustering

### Appendix G: Risk Mitigation & Contingency Plans

**Risk 1**: Insufficient participant recruitment for user study
- **Mitigation**: Start recruitment 3 weeks early, offer $30-50 compensation + free ingredients
- **Contingency**: If < 8 participants, reduce to 6 (3 per group) and acknowledge limitation

**Risk 2**: Technical failures during user study (app crashes, API downtime)
- **Mitigation**: Thorough pre-testing week before study, backup test device
- **Contingency**: Reschedule participant to next available slot, do not count as data point

**Risk 3**: Low inter-rater reliability in qualitative coding (κ < 0.70)
- **Mitigation**: Person 3 and 4 discuss codebook definitions thoroughly before independent coding
- **Contingency**: Conduct additional collaborative coding session to refine codes, re-code

**Risk 4**: Gemini API rate limits or costs during testing
- **Mitigation**: Monitor API usage, use free tier quotas strategically
- **Contingency**: Mock API responses for some automated tests, prioritize user study live API use

**Risk 5**: Kitchen environment too noisy for ASR testing calibration
- **Mitigation**: Test in multiple kitchens with different layouts/appliances
- **Contingency**: Report real-world WER honestly, recommend future testing in controlled lab

**Risk 6**: User study participants don't show diverse accent representation
- **Mitigation**: Specifically recruit from international student groups, ESL communities
- **Contingency**: Acknowledge sample limitation, recommend future study with targeted diversity

### Appendix H: Budget Estimate (Optional)

**For academic/funded project**:

| Item | Cost | Quantity | Total |
|------|------|----------|-------|
| Participant compensation ($40 each) | $40 | 12 | $480 |
| Recipe ingredients (per participant) | $25 | 12 | $300 |
| Decibel meter app (pro version) | $10 | 1 | $10 |
| Bluetooth speaker for noise testing | $50 | 1 | $50 |
| Transcription service (Rev.com) | $1.50/min | 240 min | $360 |
| Gemini API credits | $50 | - | $50 |
| Food storage containers (take-home) | $2 | 12 | $24 |
| **TOTAL** | | | **$1,274** |

**Note**: Budget can be reduced to near-zero for student project (no compensation, use free Gemini tier, manual transcription, own kitchen equipment).

---

## Document Control

**Version**: 1.0  
**Created**: 2025-11-08  
**Last Modified**: 2025-11-08  
**Authors**: [Team Names]  
**Status**: Draft  
**Next Review**: [After Week 1 team meeting]

---

**End of Evaluation Plan**

This comprehensive plan provides a systematic approach to testing and evaluating the I'm Cooked AI cooking assistant, following evidence-based methodologies from HCI research. The plan is designed to be executed by a 4-person team over 6 weeks, culminating in actionable recommendations for the next HCD iteration cycle.
