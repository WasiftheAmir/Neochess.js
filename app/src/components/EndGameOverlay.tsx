import React from 'react';
import { motion } from 'framer-motion';
import { GameMode, PlayerColor } from '../types';
import styles from './EndGameOverlay.module.css';

interface SessionScore {
  white: number;
  black: number;
  count: number;
}

interface Props {
  result: string;
  reason: string;
  sessionScore: SessionScore | null;
  whiteUsername: string;
  blackUsername: string;
  mode: GameMode;
  playerColor: PlayerColor;
  rematchRequestedBy: string | null;
  onRequestRematch: () => void;
  onAcceptRematch: () => void;
  onDeclineRematch: () => void;
  onLobby: () => void;
}

export default function EndGameOverlay({
  result,
  reason,
  sessionScore,
  whiteUsername,
  blackUsername,
  mode,
  playerColor,
  rematchRequestedBy,
  onRequestRematch,
  onAcceptRematch,
  onDeclineRematch,
  onLobby,
}: Props) {
  const fullColor = playerColor === 'w' ? 'white' : 'black';
  const opponentColor = playerColor === 'w' ? 'black' : 'white';
  const iRequested = rematchRequestedBy === fullColor;
  const opponentRequested = rematchRequestedBy === opponentColor;
  const showRematch = mode === 'multiplayer';

  return (
    <motion.div
      className={styles.overlay}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <motion.div
        className={`liquid-glass ${styles.card}`}
        initial={{ scale: 0.88, opacity: 0, y: 16 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.88, opacity: 0, y: 16 }}
        transition={{ duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
      >
        <h2 className={styles.resultText}>{result}</h2>
        <p className={styles.reasonText}>{reason}</p>

        {/* Session score tally (multiplayer only) */}
        {mode === 'multiplayer' && sessionScore && (
          <div className={styles.tally}>
            <div className={styles.tallyRow}>
              <span className={styles.tallyName} title={whiteUsername || 'White'}>
                {whiteUsername || 'White'}
              </span>
              <span className={styles.tallyScore}>
                {sessionScore.white} — {sessionScore.black}
              </span>
              <span className={styles.tallyName} title={blackUsername || 'Black'}>
                {blackUsername || 'Black'}
              </span>
            </div>
            <div className={styles.tallyGames}>
              {sessionScore.count} {sessionScore.count === 1 ? 'game' : 'games'}
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className={styles.actions}>
          {showRematch && (
            opponentRequested ? (
              <>
                <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={onAcceptRematch}>
                  ✓ Accept Rematch
                </button>
                <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={onDeclineRematch}>
                  ✕ Decline Rematch
                </button>
              </>
            ) : (
              <button
                className={`${styles.btn} ${styles.btnPrimary}`}
                onClick={onRequestRematch}
                disabled={iRequested}
              >
                {iRequested ? 'Waiting for Opponent…' : '↺ Request Rematch'}
              </button>
            )
          )}
          <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={onLobby}>
            Return to Lobby
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
