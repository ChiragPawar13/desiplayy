## Remaining work

RMCS + ChatBox + hooks + helpers + migration are already in place. To make the app playable end-to-end, I'll add:

### 1. Game components (logic copied verbatim from your `desiplayF` file)
- `src/components/games/SnakesGame.tsx` — dice roll, snakes/ladders map, turn order, winner detection
- `src/components/games/TicTacToeGame.tsx` — 3×3 board, win-line detection, draw handling
- `src/components/games/HousieGame.tsx` — auto-generated 5×5 boards, number caller, manual marking, line/full-house win
- `src/components/games/UnoGame.tsx` — deck, hands, discard pile, wild/+2/+4/skip/reverse, color picker, direction

Each component reads `room.game_state`, writes via `patchGameState` / `replaceGameState`.

### 2. Auth
- `src/routes/auth.tsx` — email/password signup + login (no email confirmation; sets display name in user_metadata)
- `src/routes/_authenticated.tsx` — pathless layout guard, redirects to `/auth` if no session
- Wire `attachSupabaseAuth` in `src/start.ts`

### 3. App routes
- `src/routes/_authenticated/dashboard.tsx` — game picker grid (uses `GAMES`), create-room button per game, join-by-code input
- `src/routes/_authenticated/room.$code.tsx` — lobby (player list, add-bot, start) when `status='waiting'`, switches to the right game component when `status='playing'`, embeds `ChatBox`
- Update `src/routes/index.tsx` — keep current landing, add "Sign in to play" CTA pointing to `/auth`

### 4. Misc
- Update `routeTree.gen.ts` will regenerate automatically from new route files

## Out of scope (confirmed earlier)
- Lagori, Chhupan Chhupai etc. stay "SOON" — your file has no logic for them
- Google sign-in — using email/password as previously agreed

After this, you'll sign up → pick game → share 6-char code → friends join → all 5 games playable in realtime with chat.

Confirm and I'll build it.