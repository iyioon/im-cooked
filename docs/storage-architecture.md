# Storage Architecture

## Overview

The I'm Cooked app uses **browser localStorage** for all data persistence. There is **no backend database** - everything is stored client-side.

---

## 1. Cooking Context Storage

### Location
**Browser localStorage** under the key: `"im-cooked-cooking-sessions"`

### What's Stored
Each cooking session contains:
- Recipe metadata (ID, title)
- Current step position
- Completed steps tracking
- User notes per step
- UI state (ingredients panel collapsed/expanded)
- **All chat messages** (user + AI conversation)
- Timestamps (started, last active)

### Data Structure
```typescript
interface CookingSession {
  id: string;                          // "session-{timestamp}-{random}"
  recipeId: string;                    // Reference to recipe
  recipeTitle: string;                 // For display
  currentStep: number;                 // Where user is (1-based)
  completedSteps: number[];            // [1, 2, 3, ...]
  startedAt: Date;                     // When session created
  lastActiveAt: Date;                  // Last interaction time
  notes: Record<number, string>;       // { 2: "Added extra garlic", ... }
  ingredientsCollapsed: boolean;       // UI state
  messages: CookingSessionMessage[];   // 👈 CHAT HISTORY STORED HERE
}
```

### Chat Messages Structure
```typescript
interface CookingSessionMessage {
  id: string;                          // "msg-{timestamp}"
  role: "user" | "assistant";          // Who said it
  content: string;                     // The message text
  timestamp: Date;                     // When it was sent
}
```

### Storage Limits
- Maximum **10 sessions** kept (oldest deleted automatically)
- Maximum **100 messages** per session (in chat-storage.ts, but not enforced in cooking sessions)
- Sessions older than **24 hours** marked as inactive (but still stored)

### Files Involved
- **src/lib/cooking-session-manager.ts** - All CRUD operations
- **src/hooks/useCookingSession.ts** - React hook wrapper
- **src/types/recipe.ts** - Type definitions

---

## 2. User Conversation Storage

### Storage Flow

```
User sends message
    ↓
CookingAssistantChat component creates CookingSessionMessage
    ↓
onSendMessage() callback called
    ↓
useCookingSession.addChatMessage() called
    ↓
cooking-session-manager.addChatMessage() called
    ↓
Session loaded from localStorage
    ↓
Message pushed to session.messages array
    ↓
Session saved back to localStorage
    ↓
Component state updated with new session
```

### Voice vs Text Messages

**Text Mode:**
- User types → Message stored
- AI responds via API → Response stored

**Voice Mode:**
- User speaks → Recording happens (audio NOT stored)
- AI transcript received → Stored as message
- Messages appear identical in storage (no distinction between voice/text origin)

### Implementation Details

```typescript
// In CookingAssistantChat component:

// Text message
const userMessage: CookingSessionMessage = {
  id: `msg-${Date.now()}`,
  role: "user",
  content: input,                    // The typed text
  timestamp: new Date(),
};
onSendMessage(userMessage);          // Saves to localStorage

// Voice message (from AI transcript)
const assistantMessage: CookingSessionMessage = {
  id: `msg-voice-${Date.now()}`,
  role: "assistant",
  content: aiTranscript,              // The spoken response
  timestamp: new Date(),
};
onSendMessage(assistantMessage);     // Saves to localStorage
```

### Message Persistence Locations

| Component | Where Data Goes | When |
|-----------|----------------|------|
| `CookingAssistantChat` | Creates messages | User interaction |
| `useCookingSession` | Manages state | Hook layer |
| `cooking-session-manager` | Reads/writes localStorage | Every change |
| localStorage | Final storage | Immediately |

---

## 3. Recipe Data Storage

**NOT stored in localStorage!** Recipes are:
1. Fetched from API: `/api/recipes/[id]`
2. Kept in component state during session
3. Only the **recipe ID and title** are stored in `CookingSession`
4. Full recipe data re-fetched when session loads

### Why Not Store Recipes?
- Recipes can be large (steps, images, ingredients)
- Would exceed localStorage limits quickly
- Can be re-fetched from source URLs
- Keeps session storage lean

---

## 4. Legacy Chat Storage

### Location
**Browser localStorage** under the key: `"im-cooked-chat-history"`

### Status
**Deprecated** - Legacy system for backward compatibility

### Migration
Old chat history can be migrated to new session-based system via:
```typescript
import { migrateLegacyChatHistory } from "@/lib/chat-storage";
const legacy = migrateLegacyChatHistory();
```

---

## 5. Voice Interaction Context

### NOT Stored in localStorage

Voice context is **runtime-only**:

```typescript
// Built when connecting to Gemini Live API
const systemInstruction = buildVoiceCookingContext({
  recipeTitle: recipe.title,          // From component state
  currentStep,                         // From session (localStorage)
  currentStepNumber,                   // From session (localStorage)
  allSteps: recipe.steps,             // From API fetch
  ingredients: recipe.ingredients,    // From API fetch
  totalSteps,                         // Calculated
});

// Sent once to Gemini Live API
useGeminiLive({ systemInstruction });
```

**Why not stored?**
- System instruction is sent to Gemini's servers
- Rebuilt fresh for each voice session
- No need to persist (recipe data is source of truth)

---

## 6. Data Flow Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    Browser localStorage                  │
│                                                          │
│  Key: "im-cooked-cooking-sessions"                      │
│  Value: [                                               │
│    {                                                    │
│      id: "session-123",                                │
│      recipeId: "recipe-456",                           │
│      messages: [                                       │
│        { role: "user", content: "How long..." },      │
│        { role: "assistant", content: "About..." }     │
│      ],                                                │
│      currentStep: 3,                                   │
│      ...                                               │
│    }                                                   │
│  ]                                                     │
└─────────────────────────────────────────────────────────┘
                          ↑ ↓
           ┌──────────────────────────────┐
           │  cooking-session-manager.ts  │
           │  - Load/Save operations      │
           │  - Add messages              │
           │  - Update steps              │
           └──────────────────────────────┘
                          ↑ ↓
           ┌──────────────────────────────┐
           │   useCookingSession hook     │
           │   - React state management   │
           │   - Callbacks                │
           └──────────────────────────────┘
                          ↑ ↓
           ┌──────────────────────────────┐
           │  CookingAssistantChat        │
           │  - User interactions         │
           │  - Voice/text messages       │
           └──────────────────────────────┘
```

---

## 7. Storage Limitations & Considerations

### Browser localStorage Limits
- **5-10 MB** per domain (varies by browser)
- **Synchronous** operations (blocks main thread)
- **Not encrypted** (don't store sensitive data)
- **Cleared** if user clears browser data

### Current Safeguards
✅ Maximum 10 sessions kept  
✅ Oldest sessions auto-deleted  
✅ Only essential data stored  
✅ Recipe data NOT duplicated  

### Future Considerations
- [ ] IndexedDB for larger storage capacity
- [ ] Session export/import for backup
- [ ] Cloud sync (requires backend)
- [ ] Compression for larger sessions

---

## 8. Key Takeaways

1. **All conversation history** is stored in localStorage under cooking sessions
2. **Each session** has its own isolated message history
3. **Voice conversations** are stored identically to text (no audio saved, just transcripts)
4. **Recipe data** is NOT stored (only fetched and cached in memory)
5. **System instructions** for voice are built dynamically (not persisted)
6. **Storage is automatic** - every message/step change saves immediately
