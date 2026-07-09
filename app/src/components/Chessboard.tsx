import React, { useCallback, useEffect, useRef, useState } from 'react';
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
  onCancelDrag?: () => void;
  currentTurn: 'w' | 'b';
  premove?: { from: string; to: string } | null;
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
  onCancelDrag,
  currentTurn,
  premove = null,
}: Props) {
  const [dragOverSq, setDragOverSq] = useState<string | null>(null);
  const [draggingPiece, setDraggingPiece] = useState<{
    sq: string;
    piece: ChessPiece;
    x: number;
    y: number;
  } | null>(null);

  const pointerDownRef = useRef<{
    sq: string;
    piece: ChessPiece;
    startX: number;
    startY: number;
    isDragging: boolean;
  } | null>(null);

  const justDraggedRef = useRef<boolean>(false);

  const ranks = flipped ? [...RANKS] : [...RANKS].reverse();
  const files = flipped ? [...FILES].reverse() : [...FILES];

  const cancelDrag = useCallback(() => {
    setDraggingPiece(null);
    setDragOverSq(null);
    pointerDownRef.current = null;
    onCancelDrag?.();
  }, [onCancelDrag]);

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      const data = pointerDownRef.current;
      if (!data) return;

      const dx = e.clientX - data.startX;
      const dy = e.clientY - data.startY;

      if (!data.isDragging) {
        if (Math.hypot(dx, dy) > 4) {
          data.isDragging = true;
          onSquareClick(data.sq);
          setDraggingPiece({
            sq: data.sq,
            piece: data.piece,
            x: e.clientX,
            y: e.clientY,
          });
        }
      } else {
        setDraggingPiece((prev) =>
          prev ? { ...prev, x: e.clientX, y: e.clientY } : null
        );

        const el = document.elementFromPoint(e.clientX, e.clientY);
        const sqEl = el?.closest('[data-sq]');
        const overSq = sqEl?.getAttribute('data-sq') || null;
        setDragOverSq(overSq);
      }
    };

    const handlePointerUp = (e: PointerEvent) => {
      const data = pointerDownRef.current;
      if (!data) return;

      if (e.button === 2) {
        cancelDrag();
        return;
      }

      pointerDownRef.current = null;

      if (data.isDragging) {
        justDraggedRef.current = true;
        setTimeout(() => {
          justDraggedRef.current = false;
        }, 50);

        const el = document.elementFromPoint(e.clientX, e.clientY);
        const sqEl = el?.closest('[data-sq]');
        const overSq = sqEl?.getAttribute('data-sq') || null;

        setDraggingPiece(null);
        setDragOverSq(null);

        if (overSq && overSq !== data.sq) {
          onDrop(data.sq, overSq);
        }
      } else {
        setDraggingPiece(null);
        setDragOverSq(null);
      }
    };

    const handleRightClickDown = (e: MouseEvent | PointerEvent) => {
      if (e.button === 2) {
        cancelDrag();
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      cancelDrag();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        cancelDrag();
      }
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', cancelDrag);
    window.addEventListener('pointerdown', handleRightClickDown, true);
    window.addEventListener('mousedown', handleRightClickDown, true);
    window.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', cancelDrag);
      window.removeEventListener('pointerdown', handleRightClickDown, true);
      window.removeEventListener('mousedown', handleRightClickDown, true);
      window.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [cancelDrag, onDrop, onSquareClick]);

  const handlePiecePointerDown = useCallback(
    (e: React.PointerEvent, sq: string, piece: ChessPiece, allowDrag: boolean) => {
      if (e.button === 2) {
        e.preventDefault();
        cancelDrag();
        return;
      }
      if (e.button !== 0 || !allowDrag) return;
      e.preventDefault();
      pointerDownRef.current = {
        sq,
        piece,
        startX: e.clientX,
        startY: e.clientY,
        isDragging: false,
      };
    },
    [cancelDrag]
  );

  return (
    <div
      className={styles.boardWrapper}
      onContextMenu={(e) => {
        e.preventDefault();
        cancelDrag();
      }}
    >
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
              const isPremove = !!(premove && (sq === premove.from || sq === premove.to));
              const hasPiece = !!piece;

              const allowDrag = piece ? canInteract(sq) : false;

              const squareClass = [
                styles.square,
                isLight ? styles.light : styles.dark,
                isLastMove ? styles.lastMove : '',
                isPremove ? styles.premoveSquare : '',
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
                  onClick={() => {
                    if (!justDraggedRef.current) {
                      onSquareClick(sq);
                    }
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    cancelDrag();
                  }}
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
                      draggable={false}
                      onPointerDown={(e) =>
                        handlePiecePointerDown(e, sq, piece, allowDrag)
                      }
                      style={{
                        opacity: draggingPiece?.sq === sq ? 0 : 1,
                      }}
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

      {/* Floating piece while dragging */}
      {draggingPiece && (
        <img
          src={pieceUrl(draggingPiece.piece.color, draggingPiece.piece.type)}
          alt="Dragging piece"
          className={styles.floatingPiece}
          style={{
            left: draggingPiece.x,
            top: draggingPiece.y,
          }}
        />
      )}
    </div>
  );
}

