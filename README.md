# NeoChess

NeoChess is a competitive chess variant built on top of the battle-tested [chess.js](https://github.com/jhlywa/chess.js) library by Jeff Hlywa, whose foundational work made this project possible. The goal of NeoChess is to challenge the assumptions that have defined chess for centuries by introducing four rules that add unpredictability, reward tactical creativity, and create entirely new strategic dimensions. The result is a game that is immediately familiar to any chess player yet fundamentally different in character.

This repository contains the modified chess.js engine (`src/chess.ts`) with all four NeoChess rules implemented, as well as a full-stack web application (`ui/app.html`) supporting human vs. AI (Stockfish) and real-time player vs. player multiplayer via Supabase.

---

### Rule 1 — King Capture

There is no checkmate in NeoChess. The game ends only when a king is physically captured by an opposing piece. This adds a layer of uncertainty to every position — a king left on an attacked square will be taken, and the game ends on the spot. The practical effect is subtle but significant: games cannot end by force a move early the way checkmate allows, extending the margin for error and making defense slightly harder to execute perfectly.

#### Engine changes
The pseudo-legal move filter in `_moves()` that strips moves leaving the king in check was removed entirely — all pseudo-legal moves are legal in NeoChess. King capture detection was added to `_makeMove()` via a direct board scan over `_board[]` after every move, since the existing `_kings[]` array is not reliably updated during captures through `_movePiece()`. If a king is missing after a move, `_kingCaptured` is set with the winning color. `isKingCaptured()`, `getWinner()`, and `isGameOver()` expose this state. Both flags are snapshotted in `_push()` and restored in `_undoMove()` so move generation probes do not permanently trigger them.

---

### Rule 2 — Retaliation Draw

If White captures Black's king, Black is given one final move — but only if a Black piece can actually reach White's king. If Black takes White's king on that move, the game is a draw. If no Black piece can reach the White king, White wins immediately. This rule exists to balance the first-mover disadvantage: Black always goes second, so if both kings fall on the same exchange (White captures Black's king on move N, Black captures White's king on move N+1), the game is a draw rather than a White win. The asymmetry is intentional — if Black captures White's king first, the game ends as a Black win with no retaliation for White.

#### Engine changes
A `_retaliationPending` flag was added. When the king scan in `_makeMove()` detects Black's king was captured on White's turn, the engine calls `_attacked(BLACK, whiteKingIdx)` before ending the game. If a Black piece can reach the White king, `_retaliationPending` is set and the game continues for exactly one more move. If Black then captures White's king, `_kingCaptured` is set with `winner: null` (draw). Any other move sets it with `winner: WHITE`. `pass()` returns `false` during retaliation — Black cannot pass. Both flags are snapshotted and restored across `_push()` / `_undoMove()`.

---

### Rule 3 — Self-Capture

Any piece can capture any friendly piece on any square it can legally reach, except its own king. Pieces blocking an attack line can be cleared. Pawns can open files by capturing each other. Trapped pieces can create escape routes. Every friendly piece becomes both a potential obstacle and a potential resource.

#### Engine changes
The condition in `_moves()` that skips destination squares occupied by friendly pieces was changed to allow such moves unless the target piece is the player's own king. For sliding and stepping pieces, the ray continues to generate the capture but still breaks afterward. Pawn diagonal captures were extended with the same exception. A `capturedColor` field was added to `InternalMove` and `Move` so `_undoMove()` restores self-captured pieces with the correct color rather than assuming all captures belong to the opponent.

---

### Rule 4 — Pass Turn

A player may pass their turn instead of moving. If both players pass 6 consecutive times — 3 each — the game ends as a draw. The threshold is intentionally high so that passing is a genuine strategic tool rather than an automatic draw button. It rewards patience, psychological pressure, and clock management rather than giving players a cheap exit from difficult positions.

#### Engine changes
A `pass()` public method was added, constructing a null move via the existing `BITS.NULL_MOVE` flag. A `_consecutivePasses` counter increments on each null move and resets to 0 on any normal move. At 6, `isPassDraw()` returns `true` and `isGameOver()` / `isDraw()` follow. `pass()` returns `false` during a retaliation window or after game over. `_consecutivePasses` is snapshotted in `_push()` and restored in `_undoMove()`.

---

## Closing Remarks

NeoChess is an ongoing experiment in what chess can be when its most fundamental constraints are reconsidered. The four rules described above were designed together as a system — each one interacts with the others in ways that continue to produce surprising gameplay.

If you made it this far, thank you for taking the time to read about NeoChess. Whether you are here to play, to fork the engine, or simply out of curiosity about what chess looks like when you pull on its threads — you are exactly the kind of person this project was built for.
