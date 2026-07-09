import { useState, useEffect, useRef, useCallback } from 'react';
import { GameState } from '../types';

interface ClockHookResult {
  whiteDisplay: string;
  blackDisplay: string;
  whiteActive: boolean;
  blackActive: boolean;
  checkForfeit: () => { forfeited: boolean; loser: 'w' | 'b' | null };
}

function formatTimeMs(ms: number | null | undefined): string {
  if (ms === null || ms === undefined || isNaN(ms)) return '0:00';
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export function useClock(
  gameState: GameState,
  currentTurn: 'w' | 'b',
  isGameOver: boolean
): ClockHookResult {
  const [tick, setTick] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isMultiplayer = gameState.mode === 'multiplayer';
  const hasClock = gameState.clockWhiteMs !== null && gameState.clockBlackMs !== null;

  useEffect(() => {
    if (!isMultiplayer || !hasClock || isGameOver) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
      return;
    }
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => setTick((t) => t + 1), 500);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isMultiplayer, hasClock, isGameOver]);

  // Suppress tick in return value — just used for re-render
  void tick;

  const getComputed = useCallback(
    (color: 'w' | 'b'): number | null => {
      if (gameState.clockWhiteMs === null || gameState.clockBlackMs === null) return null;
      const base = color === 'w' ? gameState.clockWhiteMs : gameState.clockBlackMs;
      if (!isMultiplayer || isGameOver || currentTurn !== color || !gameState.turnStartedAt) {
        return base;
      }
      const elapsed = Date.now() - new Date(gameState.turnStartedAt).getTime();
      return Math.max(0, base - elapsed);
    },
    [gameState, isMultiplayer, isGameOver, currentTurn]
  );

  const wMs = getComputed('w');
  const bMs = getComputed('b');

  const checkForfeit = useCallback((): { forfeited: boolean; loser: 'w' | 'b' | null } => {
    if (!isMultiplayer || isGameOver) return { forfeited: false, loser: null };
    const rem = getComputed(currentTurn);
    if (rem !== null && rem <= 0) {
      return { forfeited: true, loser: currentTurn };
    }
    return { forfeited: false, loser: null };
  }, [isMultiplayer, isGameOver, currentTurn, getComputed]);

  return {
    whiteDisplay: formatTimeMs(wMs),
    blackDisplay: formatTimeMs(bMs),
    whiteActive: !isGameOver && currentTurn === 'w',
    blackActive: !isGameOver && currentTurn === 'b',
    checkForfeit,
  };
}
