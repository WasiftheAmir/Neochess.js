import React, { useCallback, useRef, useState } from 'react';
import styles from './Chessboard.module.css';

// Cburnett SVG piece set from Lichess
function pieceUrl(color: 'w' | 'b', type: string): string {
  const c = color === 'w' ? 'w' : 'b';
  const t = type.toUpperCase();
  return `https://lichess1.org/assets/piece/cburnett/${c}${t}.svg`;
}

interface ChessPiece {
  color: 'w' | 'b';
  type: string;
}

interface LastMove {
  from: string;
  to: string;
}

interface Props {
  getBoardSquare: (sq: string) => ChessPiece | null;
  selectedSq: string | null;
  legalTargets: string[];
  lastMove: LastMove | null;
  pendingSelfCaptureSq: string | null;
  flipped: boolean;
  canInteract: (sq: string) => boolean;
  onSquareClick: (sq: string) => void;
  onDrop: (from: string, to: string) => void;
  currentTurn: 'w' | 'b';
}

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const RANKS = [1, 2, 3, 4, 5, 6, 7, 8];

export default function Chessboard({
  getBoardSquare,
  selectedSq,
  legalTargets,
  lastMove,
  pendingSelfCaptureSq,
  flipped,
  canInteract,
  onSquareClick,
  onDrop,
  currentTurn,
}: Props) {
  const dragFromRef = useRef<string | null>(null);
  const [dragOverSq, setDragOverSq] = useState<string | null>(null);

  const ranks = flipped ? [...RANKS] : [...RANKS].reverse();
  const files = flipped ? [...FILES].reverse() : [...FILES];

  const handleDragStart = useCallback(
    (e: React.DragEvent, sq: string) => {
      dragFromRef.current = sq;
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', sq);
    },
    []
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent, sq: string) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      setDragOverSq(sq);
    },
    []
  );

  const handleDragLeave = useCallback(() => {
    setDragOverSq(null);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, toSq: string) => {
      e.preventDefault();
      setDragOverSq(null);
      const fromSq = e.dataTransfer.getData('text/plain') || dragFromRef.current;
      if (fromSq && fromSq !== toSq) {
        onDrop(fromSq, toSq);
      }
      dragFromRef.current = null;
    },
    [onDrop]
  );

  const handleDragEnd = useCallback(() => {
    setDragOverSq(null);
    dragFromRef.current = null;
  }, []);

  return (
    <div className={styles.boardWrapper}>
      {/* Rank labels */}
      <div className={styles.rankLabels}>
        {ranks.map((rank) => (
          <span key={rank} className={styles.coordLabel}>
            {rank}
          </span>
        ))}
      </div>

      <div className={styles.boardCol}>
        {/* Board grid */}
        <div className={styles.board}>
          {ranks.map((rank) =>
            files.map((file) => {
              const sq = `${file}${rank}`;
              const isLight = (rank + file.charCodeAt(0) - 97) % 2 !== 0;
              const piece = getBoardSquare(sq);
              const isSelected = sq === selectedSq;
              const isLastMove = !!(lastMove && (sq === lastMove.from || sq === lastMove.to));
              const isLegal = legalTargets.includes(sq);
              const isPending = sq === pendingSelfCaptureSq;
              const isDragOver = sq === dragOverSq;
              const hasPiece = !!piece;

              const allowDrag = piece
                ? piece.color === currentTurn && canInteract(sq)
                : false;

              const squareClass = [
                styles.square,
                isLight ? styles.light : styles.dark,
                isLastMove ? styles.lastMove : '',
                isSelected ? styles.selected : '',
                isPending ? styles.selfCapturePending : '',
                isDragOver ? styles.dragOver : '',
              ]
                .filter(Boolean)
                .join(' ');

              return (
                <div
                  key={sq}
                  className={squareClass}
                  data-sq={sq}
                  onClick={() => onSquareClick(sq)}
                  onDragOver={(e) => handleDragOver(e, sq)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, sq)}
                  onContextMenu={(e) => e.preventDefault()}
                >
                  {/* Legal move indicator */}
                  {isLegal && (
                    <div
                      className={`${styles.legalDot} ${hasPiece ? styles.legalRing : ''}`}
                    />
                  )}

                  {/* Piece */}
                  {piece && (
                    <img
                      className={`${styles.piece} ${allowDrag ? styles.draggable : ''}`}
                      src={pieceUrl(piece.color, piece.type)}
                      alt={`${piece.color === 'w' ? 'White' : 'Black'} ${piece.type}`}
                      draggable={allowDrag}
                      onDragStart={allowDrag ? (e) => handleDragStart(e, sq) : undefined}
                      onDragEnd={allowDrag ? handleDragEnd : undefined}
                    />
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* File labels */}
        <div className={styles.fileLabels}>
          {files.map((file) => (
            <span key={file} className={styles.coordLabel}>
              {file}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
