# Gemini Live API Implementation Plan

## Overview

This document outlines the implementation plan for integrating **Gemini Live API** into the I'm Cooked cooking assistant application. The Gemini Live API will replace the current browser-based Speech Recognition API to enable true bidirectional voice conversations with low latency and enhanced capabilities.

**Document Version:** 1.0  
**Last Updated:** November 4, 2025  
**Target Audience:** Development Team

---

## Table of Contents

1. [What is Gemini Live API?](#what-is-gemini-live-api)
2. [Key Differences from Current Implementation](#key-differences-from-current-implementation)
3. [Architecture Overview](#architecture-overview)
4. [Implementation Steps](#implementation-steps)
5. [Key Implementation Details](#key-implementation-details)
6. [Benefits Over Current Implementation](#benefits-over-current-implementation)
7. [Use Cases for Cooking App](#use-cases-for-cooking-app)
8. [Package Dependencies](#package-dependencies)
9. [Configuration Required](#configuration-required)
10. [Estimated Implementation Time](#estimated-implementation-time)

---

## What is Gemini Live API?

The Gemini Live API is Google's **bidirectional streaming API** that enables:

- **Real-time voice conversations** with low latency
- **Bidirectional audio streaming** (input and output simultaneously)
- **Multimodal interactions** (audio + video + text)
- **Function calling** during conversations
- **Interruption handling** - can stop mid-sentence when user speaks
- **Turn-based conversation** management

---

## Key Differences from Current Implementation

| Feature | Current (Web Speech API) | Gemini Live API |
|---------|-------------------------|-----------------|
| **Audio Input** | Browser speech-to-text only | Raw PCM audio streaming |
| **Audio Output** | None | AI voice responses (PCM audio) |
| **Conversation** | One-way (user → text) | Two-way (user ↔ AI with voice) |
| **Latency** | ~1-2s (network dependent) | <500ms (optimized) |
| **Interruption** | No | Yes (AI stops when you speak) |
| **Context** | None | Full conversation history |
| **Cross-browser** | Chrome/Safari only | Works everywhere (WebSocket) |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│  Frontend (React Component)                                 │
│  ┌──────────────┐      ┌─────────────────┐                │
│  │  Microphone  │─────▶│ Audio Processor │                │
│  │   (getUserMedia)    │  (PCM conversion)│                │
│  └──────────────┘      └────────┬────────┘                │
│                                  │                          │
│                                  ▼                          │
│              ┌──────────────────────────────┐              │
│              │  GenAI Live Client           │              │
│              │  (WebSocket Connection)      │              │
│              └────────┬─────────────────┬───┘              │
│                       │                 │                   │
│                  ┌────▼───┐        ┌───▼────┐             │
│                  │ Audio  │        │  Text  │             │
│                  │Speaker │        │Display │             │
│                  └────────┘        └────────┘             │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
              ┌──────────────────────────────┐
              │  Gemini Live API WebSocket   │
              │  wss://generativelanguage... │
              └──────────────────────────────┘
```

---

## Implementation Steps

### 1. Create Core Library Files

#### a) `src/lib/multimodal-live/types.ts`
- Type definitions for Gemini Live API messages
- Configuration interfaces
- Event types

#### b) `src/lib/multimodal-live/client.ts`
- GenAI Live Client class (EventEmitter-based)
- WebSocket connection management
- Message handling (audio, text, tool calls)
- Event emission for React hooks

#### c) `src/lib/multimodal-live/audio-streamer.ts`
- Audio playback using Web Audio API
- PCM16 decoding and playback
- Volume meter integration
- Audio worklet processors

#### d) `src/lib/multimodal-live/audio-recorder.ts`
- Microphone capture
- PCM16 encoding from getUserMedia
- Audio worklet for recording
- Real-time audio chunking

#### e) `src/lib/multimodal-live/utils.ts`
- Base64 ↔ ArrayBuffer conversion
- Audio context initialization
- Message type guards
- Helper functions

### 2. Create React Hook

**`src/hooks/useGeminiLive.ts`**

```typescript
export function useGeminiLive() {
  // Manages:
  // - Connection state
  // - Audio recording/playback
  // - Event handlers
  // - Volume meters
  // Returns: { connect, disconnect, send, transcript, isConnected }
}
```

### 3. Update Speech Transcript Component

**`src/components/features/speech/speech-transcript.tsx`**
- Replace Web Speech API with `useGeminiLive` hook
- Add audio playback UI
- Add speaker visualization
- Handle both audio and text responses
- Implement interruption handling

### 4. Optional: Create API Route (if needed for token management)

**`src/app/api/gemini-live/token/route.ts`**
- Generate ephemeral tokens (optional, for security)
- Keep API key server-side
- Return short-lived access tokens

---

## Key Implementation Details

### WebSocket Connection

```typescript
const url = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${apiKey}`;
```

### Audio Format

- **Input**: PCM16, 16kHz, mono
- **Output**: PCM16, 24kHz, mono
- **Encoding**: Base64 strings over WebSocket

### Message Flow

1. **Setup**: Send configuration (model, tools, system instructions)
2. **Bidirectional streaming**: 
   - Send: `realtimeInput` (audio chunks)
   - Receive: `serverContent` (audio + text responses)
3. **Turn management**: `turnComplete` signals

### Key Features to Implement

#### 1. Interruption Handling
- Detect when AI is speaking
- Allow user to interrupt
- Stop AI audio playback immediately

#### 2. Volume Meters
- Show user's microphone volume
- Show AI's speaking volume
- Visual feedback for both

#### 3. Dual Output
- Display transcript text
- Play audio responses
- Show which is active

#### 4. Error Handling
- Network disconnections
- Microphone permissions
- API quota limits
- WebSocket errors

---

## Benefits Over Current Implementation

1. ✅ **True voice conversation** - Not just transcription
2. ✅ **Works in all browsers** - WebSocket-based, not browser API
3. ✅ **Lower latency** - Optimized for real-time
4. ✅ **Contextual AI responses** - Full Gemini capabilities
5. ✅ **Interruption support** - Natural conversations
6. ✅ **No external STT needed** - Gemini handles it
7. ✅ **Function calling** - Can trigger app actions via voice

---

## Use Cases for Cooking App

### 1. Hands-free cooking assistance
- "What's the next step?"
- "How much flour do I need?"
- "What temperature should the oven be?"

### 2. Ingredient substitutions
- "Can I use olive oil instead of butter?"
- Voice-based substitution suggestions

### 3. Recipe explanations
- "What does 'fold' mean?"
- "How do I know when it's done?"

### 4. Timer management
- "Set a timer for 10 minutes"
- "How much time is left?"

---

## Package Dependencies

### Already installed:
- ✅ `@google/genai@^1.27.0`

### May need to add:
- `eventemitter3` (for event handling)
- `lodash` or `lodash-es` (for utility functions)

---

## Configuration Required

**.env.local**
```env
GEMINI_API_KEY=your_api_key_here
```

Already configured in the project! ✅

---

## Estimated Implementation Time

- **Core library setup**: 2-3 hours
- **React hook**: 1 hour
- **Component update**: 2 hours
- **Testing & refinement**: 2-3 hours
- **Total**: ~7-9 hours

---

## Implementation Checklist

### Phase 1: Core Library Setup
- [ ] Create `src/lib/multimodal-live/types.ts`
- [ ] Create `src/lib/multimodal-live/utils.ts`
- [ ] Create `src/lib/multimodal-live/client.ts`
- [ ] Create `src/lib/multimodal-live/audio-streamer.ts`
- [ ] Create `src/lib/multimodal-live/audio-recorder.ts`

### Phase 2: React Integration
- [ ] Create `src/hooks/useGeminiLive.ts`
- [ ] Install additional dependencies (eventemitter3, lodash-es)
- [ ] Test hook in isolation

### Phase 3: Component Update
- [ ] Update `src/components/features/speech/speech-transcript.tsx`
- [ ] Add audio playback UI
- [ ] Add volume visualization
- [ ] Implement interruption handling

### Phase 4: Testing & Refinement
- [ ] Test microphone permissions flow
- [ ] Test WebSocket connection/disconnection
- [ ] Test audio input/output quality
- [ ] Test interruption handling
- [ ] Test error scenarios (network loss, API errors)
- [ ] Cross-browser testing

### Phase 5: Optional Enhancements
- [ ] Create API route for token management
- [ ] Add function calling for cooking actions
- [ ] Add visual indicators for AI speaking state
- [ ] Add conversation history display

---

## Next Steps

To begin implementation:

1. **Install dependencies**:
   ```bash
   npm install eventemitter3 lodash-es
   npm install -D @types/lodash-es
   ```

2. **Create library files** in the order listed in Phase 1

3. **Build the React hook** to manage connection state and audio

4. **Update the component** to use the new hook

5. **Test thoroughly** across different scenarios and browsers

---

## References

- [Google GenAI SDK Documentation](https://github.com/googleapis/js-genai)
- [Gemini Live API Examples](https://github.com/google-gemini/live-api-web-console)
- [Web Audio API Documentation](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
- [EventEmitter3 Documentation](https://github.com/primus/eventemitter3)
