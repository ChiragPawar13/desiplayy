## Goal

Take the game logic exactly as it is in your uploaded `desiplayF` file (5 working multiplayer games + lobby + chat) and ship it as a working web app on this project. Game logic stays untouched — only the backend layer changes from Firebase → Lovable Cloud (since you picked option 2 earlier).

## What's in your file (kept as-is)

- **Lobby**: dashboard, create room, join by code, ready/start, leave
- **Chat**: room chat with AI message support (placeholder kept)
- **5 Games** (logic copy-pasted unchanged):
  1. Raja Mantri Chor Sipahi (RMCS) — roles, Mantri guesses Chor, scoring
  2. Snakes & Ladders — dice, snakes/ladders map, turn order
  3. Tic Tac Toe — X/O, win-line detection
  4. Housie (Tambola) — auto-generated boards, number caller, line/full-house claims
  5. UNO — deck, wild/+2/+4/skip/reverse, turn direction, color picker

## Backend mapping (Firebase → Lovable Cloud)

| Firebase | Replacement |
|---|---|
| `signInAnonymously` | Supabase email/password auth (signup + login page) |
| Firestore `rooms` doc + `onSnapshot` | `rooms` table + Supabase Realtime postgres_changes |
| Firestore `chats` subcollection | `room_chats` table + Realtime |
| `updateDoc` for game state | `update` on `rooms.game_state` jsonb |
| `appId` namespace | not needed |
| Gemini API call (`callGemini`) | Lovable AI Gateway (`google/gemini-2.5-flash`) via a server function |

Game state stays as a single JSON blob per room — same shape as the file uses — so `RMCSGame`, `SnakesGame`, `TicTacToeGame`, `HousieGame`, `UnoGame` components are copied with only the `db`/`updateDoc` calls swapped for `supabase.from('rooms').update({ game_state: ... })`.

## Database (one migration)

```text
rooms
  id (uuid pk), code (text unique, 6-char join code)
  host_id (uuid), game_id (text: rmcs|snakes|tictactoe|housie|uno)
  status (text: waiting|playing|finished)
  players (jsonb)      -- [{uid, name, ready}]
  game_state (jsonb)   -- per-game state, exact shape from file
  created_at, updated_at

room_chats
  id, room_id (fk), sender_id, sender_name, text, created_at
```

- RLS: anyone authenticated can read rooms they're a member of, host can update game_state, members can chat.
- Realtime enabled on both tables.

## File plan

- `src/routes/index.tsx` → keep current landing, add "Sign in to play" CTA
- `src/routes/auth.tsx` → email/password signup + login
- `src/routes/_authenticated.tsx` → auth guard layout
- `src/routes/_authenticated/dashboard.tsx` → game picker + create/join room (port of `view === 'dashboard'`)
- `src/routes/_authenticated/room.$code.tsx` → lobby + in-game view (ports `view === 'lobby'` and `view === 'game'`)
- `src/components/games/RMCSGame.tsx` — copied from file
- `src/components/games/SnakesGame.tsx` — copied
- `src/components/games/TicTacToeGame.tsx` — copied
- `src/components/games/HousieGame.tsx` — copied
- `src/components/games/UnoGame.tsx` — copied
- `src/components/ChatBox.tsx` — copied
- `src/lib/room.ts` — `createRoom`, `joinRoom`, `startGame`, `leaveRoom` helpers (Supabase)
- `src/lib/ai.functions.ts` — server fn calling Lovable AI for chat AI replies (replaces `callGemini`)

## Out of scope (your file doesn't have these, so I won't invent them)

- Lagori, Kabaddi, Antakshari, Dumb Charades, Gully Cricket — they stay "SOON" on the landing (your file doesn't include logic for them)
- Google sign-in — using email/password unless you ask otherwise

## Result

You'll be able to sign up → create a room with a code → share the code with friends → all 5 games playable in realtime, with chat, exactly like your file.

Confirm and I'll build it.
