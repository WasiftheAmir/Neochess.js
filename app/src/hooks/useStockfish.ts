import { useRef, useCallback } from 'react';

interface StockfishHook {
  init: () => Promise<void>;
  getMove: (fen: string) => Promise<string | null>;
  terminate: () => void;
}

export function useStockfish(): StockfishHook {
  const workerRef = useRef<Worker | null>(null);
  const readyRef = useRef(false);
  const resolveRef = useRef<((move: string | null) => void) | null>(null);

  const init = useCallback((): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (readyRef.current) { resolve(); return; }
      try {
        workerRef.current = new Worker('/lib/stockfish.js');
      } catch (e: unknown) {
        reject(new Error('Failed to create Stockfish worker: ' + (e as Error).message));
        return;
      }

      let gotUciOk = false;

      workerRef.current.onmessage = (e) => {
        const line = typeof e.data === 'string' ? e.data : '';
        if (!gotUciOk && line === 'uciok') {
          gotUciOk = true;
          workerRef.current?.postMessage('isready');
          return;
        }
        if (!readyRef.current && line === 'readyok') {
          readyRef.current = true;
          resolve();
          return;
        }
        if (resolveRef.current && line.startsWith('bestmove')) {
          const parts = line.split(/\s+/);
          const move = parts[1] || null;
          const cb = resolveRef.current;
          resolveRef.current = null;
          cb(move);
        }
      };

      workerRef.current.onerror = () => {
        if (!readyRef.current) reject(new Error('Stockfish worker error'));
      };

      workerRef.current.postMessage('uci');
    });
  }, []);

  const getMove = useCallback((fen: string): Promise<string | null> => {
    return new Promise((resolve) => {
      if (!workerRef.current || !readyRef.current) {
        resolve(null);
        return;
      }
      resolveRef.current = resolve;
      workerRef.current.postMessage('position fen ' + fen);
      workerRef.current.postMessage('go depth 8');

      // 10-second safety timeout
      setTimeout(() => {
        if (resolveRef.current === resolve) {
          resolveRef.current = null;
          resolve(null);
        }
      }, 10000);
    });
  }, []);

  const terminate = useCallback(() => {
    workerRef.current?.terminate();
    workerRef.current = null;
    readyRef.current = false;
    resolveRef.current = null;
  }, []);

  return { init, getMove, terminate };
}
