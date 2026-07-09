// ─── Game Types ────────────────────────────────────────────────────────────────

export type GameMode = 'ai' | 'multiplayer';
export type PlayerColor = 'w' | 'b';
export type FullColor = 'white' | 'black' | 'draw';

export interface LastMove {
  from: string;
  to: string;
}

export interface TimeControl {
  minutes: number;
  increment: number;
}

export interface GameState {
  mode: GameMode;
  playerColor: PlayerColor;
  gameId: string | null;
  roomCode: string | null;
  whiteUsername: string;
  blackUsername: string;
  playerName: string;

  // Game flags
  resignedBy: PlayerColor | null;
  drawOfferedBy: FullColor | null;
  drawAgreement: boolean;
  endReason: string | null;
  winner: FullColor | null;
  rematchRequestedBy: FullColor | null;

  // Clocks
  clockWhiteMs: number | null;
  clockBlackMs: number | null;
  turnStartedAt: string | null;
  timeControlIncrement: number;

  // Moves persisted to DB (used to skip own echoes from realtime)
  persistedMoveCount: number;
}

export type AppScreen =
  | 'lobby'
  | 'timeControl'
  | 'waitingRoom'
  | 'game';

export const INITIAL_GAME_STATE: GameState = {
  mode: 'ai',
  playerColor: 'w',
  gameId: null,
  roomCode: null,
  whiteUsername: '',
  blackUsername: '',
  playerName: '',
  resignedBy: null,
  drawOfferedBy: null,
  drawAgreement: false,
  endReason: null,
  winner: null,
  rematchRequestedBy: null,
  clockWhiteMs: null,
  clockBlackMs: null,
  turnStartedAt: null,
  timeControlIncrement: 0,
  persistedMoveCount: 0,
};
