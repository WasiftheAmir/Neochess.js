declare module '../../../dist/esm/chess.js' {
  export class Chess {
    constructor(fen?: string);
    load(fen: string): void;
    fen(): string;
    turn(): string;
    get(square: string): { type: string; color: string } | null;
    move(opts: { from: string; to: string; promotion?: string }): { from: string; to: string; san: string; flags: string } | null;
    moves(opts?: { square?: string; verbose?: boolean }): unknown[];
    history(opts?: { verbose?: boolean }): unknown[];
    pass(): boolean;
    reset(): void;
    isGameOver(): boolean;
    isDraw(): boolean;
    isStalemate(): boolean;
    isKingCaptured(): { captured: boolean; winner: string | null };
    isPassDraw(): boolean;
    isRetaliationPending(): boolean;
  }
}
