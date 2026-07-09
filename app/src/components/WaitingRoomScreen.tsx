import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import type { GameState } from '../types';
import styles from './LobbyScreen.module.css';
import wrStyles from './WaitingRoomScreen.module.css';

interface Props {
  gameState: GameState;
  onGameStart: (
    whiteUsername: string,
    blackUsername: string,
    updatedState: Partial<GameState>
  ) => void;
  onCancel: () => void;
}

export default function WaitingRoomScreen({ gameState, onGameStart, onCancel }: Props) {
  const [copied, setCopied] = useState(false);
  const link = gameState.roomCode
    ? `${window.location.origin}${window.location.pathname}?room=${gameState.roomCode}`
    : '';

  useEffect(() => {
    if (!gameState.gameId) return;

    const channel = supabase
      .channel(`waiting:${gameState.gameId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'games',
          filter: `id=eq.${gameState.gameId}`,
        },
        (payload) => {
          const row = payload.new as Record<string, unknown>;
          if (
            row.status === 'active' &&
            row.white_username &&
            row.black_username
          ) {
            onGameStart(
              row.white_username as string,
              row.black_username as string,
              {
                gameId: gameState.gameId,
                clockWhiteMs: (row.clock_white_ms as number) ?? gameState.clockWhiteMs,
                clockBlackMs: (row.clock_black_ms as number) ?? gameState.clockBlackMs,
                turnStartedAt: (row.turn_started_at as string) ?? gameState.turnStartedAt,
                timeControlIncrement: (row.time_control_increment as number) ?? gameState.timeControlIncrement,
              }
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [gameState.gameId]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <div>
      <div className={styles.brand}>
        <h1 className={styles.title}>NeoChess</h1>
        <p className={styles.subtitle}>Play a Friend</p>
      </div>

      <div className={wrStyles.waitingStatus}>
        <span className={wrStyles.waitingText}>Waiting for opponent</span>
        <span className={wrStyles.pulseDot} />
      </div>

      <p className={wrStyles.hint}>
        Share the challenge link below with your friend to start the game.
      </p>

      <div className={wrStyles.linkRow}>
        <div className={styles.formGroup}>
          <label className={wrStyles.linkLabel}>Challenge Link</label>
          <div className={wrStyles.linkInputRow}>
            <input
              type="text"
              className={`${styles.input} ${wrStyles.linkInput}`}
              value={link}
              readOnly
            />
            <button
              className={`${styles.btn} ${styles.btnPrimary} ${wrStyles.copyBtn}`}
              onClick={handleCopy}
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>
      </div>

      <button
        className={`${styles.btn} ${styles.btnSecondary}`}
        style={{ width: '100%' }}
        onClick={onCancel}
      >
        Cancel
      </button>
    </div>
  );
}
