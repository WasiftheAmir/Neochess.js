import React from 'react';
import styles from './GameSidebar.module.css';
import { GameMode, PlayerColor } from '../types';

interface ClockSide {
  label: string;
  time: string;
  active: boolean;
}

interface Props {
  playerLabel: string;
  turnIsWhite: boolean;
  turnText: string;
  statusText: string;
  isAlert: boolean;
  isThinking: boolean;
  moveHistory: string[];
  clockData?: {
    white: ClockSide;
    black: ClockSide;
  };
  mode: GameMode;
  playerColor: PlayerColor;
  drawOfferedBy: string | null;
  drawAgreement: boolean;
  resignedBy: PlayerColor | null;
  endReason: string | null;
  gameOver: boolean;
  passDisabled: boolean;
  onPass: () => void;
  onResign: () => void;
  onOfferDraw: () => void;
  onAcceptDraw: () => void;
  onDeclineDraw: () => void;
  onRules: () => void;
}

export default function GameSidebar({
  playerLabel,
  turnIsWhite,
  turnText,
  statusText,
  isAlert,
  isThinking,
  moveHistory,
  clockData,
  mode,
  playerColor,
  drawOfferedBy,
  drawAgreement,
  resignedBy,
  endReason,
  gameOver,
  passDisabled,
  onPass,
  onResign,
  onOfferDraw,
  onAcceptDraw,
  onDeclineDraw,
  onRules,
}: Props) {
  const fullColor = playerColor === 'w' ? 'white' : 'black';
  const opponentColor = playerColor === 'w' ? 'black' : 'white';
  const opponentOfferedDraw = drawOfferedBy === opponentColor;
  const iOfferedDraw = drawOfferedBy === fullColor;

  const isMultiplayer = mode === 'multiplayer';
  const resignDisabled = gameOver || !isMultiplayer;
  const drawBtnsDisabled = gameOver || drawAgreement || !!resignedBy || !!endReason;
  const offerDrawDisabled = drawBtnsDisabled || iOfferedDraw;

  return (
    <div className={styles.sidebar}>
      {/* Player label */}
      <div className={styles.playerLabel}>{playerLabel}</div>

      {/* Clocks */}
      {clockData && (
        <div className={styles.clockContainer}>
          <div className={`${styles.clockSide} ${clockData.white.active ? styles.clockActive : styles.clockInactive}`}>
            <span className={styles.clockName}>{clockData.white.label}</span>
            <span className={styles.clockTime}>{clockData.white.time}</span>
          </div>
          <div className={`${styles.clockSide} ${clockData.black.active ? styles.clockActive : styles.clockInactive}`}>
            <span className={styles.clockName}>{clockData.black.label}</span>
            <span className={styles.clockTime}>{clockData.black.time}</span>
          </div>
        </div>
      )}

      {/* Turn indicator */}
      <div className={styles.turnRow}>
        <span className={`${styles.turnDot} ${!turnIsWhite ? styles.turnDotBlack : ''}`} />
        <span className={styles.turnText}>{turnText}</span>
      </div>

      {/* Status */}
      <div className={`${styles.status} ${isAlert ? styles.statusAlert : ''} ${isThinking ? styles.statusThinking : ''}`}>
        {statusText}
      </div>

      {/* Move history */}
      <span className={styles.historyLabel}>Move History</span>
      <div className={styles.history} id="move-history">
        {moveHistory.length === 0 ? (
          <span className={styles.historyEmpty}>No moves yet.</span>
        ) : (
          (() => {
            const rows: React.ReactNode[] = [];
            for (let i = 0; i < moveHistory.length; i += 2) {
              rows.push(
                <div key={i} className={`${styles.historyRow} ${i >= moveHistory.length - 2 ? styles.historyRowLatest : ''}`}>
                  <span className={styles.historyNum}>{Math.floor(i / 2) + 1}.</span>
                  <span className={styles.historyWhite}>{moveHistory[i]}</span>
                  {moveHistory[i + 1] !== undefined && (
                    <span className={styles.historyBlack}>{moveHistory[i + 1]}</span>
                  )}
                </div>
              );
            }
            return rows;
          })()
        )}
      </div>

      {/* Action buttons */}
      <button className={styles.btn} onClick={onPass} disabled={passDisabled}>
        ➤ Pass Turn
      </button>

      {/* Draw offer buttons */}
      {isMultiplayer && (
        opponentOfferedDraw && !drawBtnsDisabled ? (
          <>
            <button className={`${styles.btn} ${styles.btnAccept}`} onClick={onAcceptDraw}>
              ✓ Accept Draw
            </button>
            <button className={`${styles.btn} ${styles.btnDecline}`} onClick={onDeclineDraw}>
              ✕ Decline Draw
            </button>
          </>
        ) : (
          <button className={styles.btn} onClick={onOfferDraw} disabled={offerDrawDisabled}>
            ⚑ {iOfferedDraw ? 'Draw Offered…' : 'Offer Draw'}
          </button>
        )
      )}

      {/* Resign */}
      {isMultiplayer && (
        <button
          className={`${styles.btn} ${styles.btnResign}`}
          onClick={onResign}
          disabled={resignDisabled}
        >
          ⚐ Resign
        </button>
      )}

      {/* Rules */}
      <button className={`${styles.btn} ${styles.btnRules}`} onClick={onRules}>
        ⓘ Rules
      </button>
    </div>
  );
}
