# Voice Interaction Guide

## Overview

The cooking assistant now supports voice interaction using the Gemini Live API. Users can have hands-free conversations with the AI while cooking.

## How It Works

### Context Provision

Cooking context is provided to the AI through the `systemInstruction` parameter when connecting to Gemini Live:

```typescript
const systemInstruction = buildVoiceCookingContext({
  recipeTitle: recipe.title,
  currentStep,
  currentStepNumber,
  allSteps: recipe.steps || [],
  ingredients: recipe.ingredients,
  totalSteps,
});

const { connect } = useGeminiLive({
  apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY!,
  systemInstruction, // Full context sent once at connection
});
```

### What's Included in the Context

1. **Recipe Title** - What dish they're making
2. **Current Step** - Where they are in the recipe
3. **All Steps** - Complete recipe flow for context-aware answers
4. **Ingredients List** - For substitution questions
5. **Voice-specific Guidelines** - Instructions for concise, audio-friendly responses

### Step Navigation Updates

When users navigate between steps, the system:
1. Detects the step change via `useEffect`
2. Builds a context update message using `buildStepChangeUpdate()`
3. Logs the update (future: can send to AI if needed)
4. The AI maintains context of the new step for subsequent questions

## User Interface

### Voice Mode Toggle
- **"Voice Off" button** - Click to connect and enable voice mode
- **"Voice On" button** - Click to disconnect and return to text mode

### When Voice Mode is Active
- **Microphone button** - Click to start/stop recording your voice
- **Volume meters** - Visual feedback for both user speech and AI responses
- **Status badges** - "AI Speaking" and "You're Speaking" indicators
- **Voice transcripts** - AI responses appear as chat messages

### Features

1. **Hands-free cooking** - Ask questions while your hands are busy
2. **Audio responses** - Hear the AI speak answers back to you
3. **Visual transcripts** - See what was said in the chat history
4. **Volume visualization** - Know when you're being heard and when AI is responding
5. **Seamless switching** - Toggle between voice and text modes anytime

## Technical Implementation

### Files Modified

1. **src/lib/prompts/cooking-assistant.ts**
   - Added `buildVoiceCookingContext()` - Creates voice-optimized system instructions
   - Added `buildStepChangeUpdate()` - Formats step navigation updates

2. **src/components/features/cooking-session/cooking-assistant-chat.tsx**
   - Integrated `useGeminiLive` hook
   - Added voice mode toggle and recording controls
   - Added volume meters and status indicators
   - Handles AI transcript → message conversion
   - Manages step change notifications

### Key Components

```typescript
// Voice mode state
const [voiceMode, setVoiceMode] = useState(false);

// Gemini Live hook
const {
  isConnected,
  isRecording,
  isSpeaking,      // User is speaking
  isAISpeaking,    // AI is speaking
  inputVolume,     // Mic volume level
  outputVolume,    // Speaker volume level
  aiTranscript,    // AI's text response
  connect,
  disconnect,
  startRecording,
  stopRecording,
} = useGeminiLive({ apiKey, systemInstruction });
```

### Context Update Flow

```
User changes step (Next/Previous button)
    ↓
useEffect detects step change
    ↓
buildStepChangeUpdate() creates update message
    ↓
Log to console (future: send to AI)
    ↓
AI maintains context for next question
```

## API Key Configuration

Make sure you have your Gemini API key set in the environment:

```bash
NEXT_PUBLIC_GEMINI_API_KEY=your_api_key_here
```

## Usage Tips

1. **Enable voice mode first** - Click "Voice Off" to connect
2. **Click microphone** - Start talking when ready
3. **Wait for response** - AI will speak back and text appears in chat
4. **Navigate freely** - Use Next/Previous buttons between steps
5. **Ask anything** - Questions about current step, ingredients, techniques, etc.

## Example Questions Users Can Ask

- "How do I know when this is done?"
- "What if I don't have olive oil?"
- "Can you explain how to dice an onion?"
- "What comes next?"
- "How long should I sauté this?"
- "What temperature should the oven be?"

## Future Enhancements

- [ ] Send step change updates to AI via silent message
- [ ] Add wake word detection for true hands-free
- [ ] Support for recipe-specific function calls (timers, conversions)
- [ ] Audio-only mode (hide text input when voice is active)
- [ ] Voice activity detection to auto-start recording
