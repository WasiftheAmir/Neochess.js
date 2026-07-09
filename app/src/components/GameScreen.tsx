import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
// @ts-ignore
import { Chess } from '../../../dist/esm/chess.js';
import Chessboard from './Chessboard';
import GameSidebar from './GameSidebar';
import EndGameOverlay from './EndGameOverlay';
import ColorAssignmentOverlay from './ColorAssignmentOverlay';
import { supabase } from '../supabase';
import { useStockfish } from '../hooks/useStockfish';
import { useClock } from '../hooks/useClock';
import { GameState, PlayerColor } from '../types';
import styles from './GameScreen.module.css';

const REQUIRE_DOUBLE_CLICK_SELF_CAPTURE = true;

interface Props {
  initialGameState: GameState;
  onReturnToLobby: () => void;
  onRules: () => void;
}

// ─── helper: parse UCI string → chess.move() args ──────────────────────────
function parseUciMove(uci: string): { from: string; to: string; promotion?: string } | null {
  if (!uci || uci.length < 4) return null;
  return {
    from: uci.substring(0, 2),
    to: uci.substring(2, 4),
    promotion: uci.length > 4 ? uci[4] : undefined,
  };
}

export default function GameScreen({ initialGameState, onReturnToLobby, onRules }: Props) {
  // ── Chess engine instance ──────────────────────────────────────────────────
  const chessRef = useRef(new Chess());
  const chess = chessRef.current;

  // ── Game state (local mutations are safe; we re-render via setPosition) ───
  const [gameState, setGameState] = useState<GameState>(initialGameState);
  const [position, setPosition] = useState<string>(chess.fen());

  // Board interaction state
  const [selectedSq, setSelectedSq] = useState<string | null>(null);
  const [legalTargets, setLegalTargets] = useState<string[]>([]);
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);
  const [pendingSelfCaptureSq, setPendingSelfCaptureSq] = useState<string | null>(null);

  // AI state
  const [aiThinking, setAiThinking] = useState(false);
  const stockfish = useStockfish();
  const stockfishInitialized = useRef(false);

  // Overlay state
  const [showColorAssignment, setShowColorAssignment] = useState(false);
  const colorAssignmentMsg = useRef('');

  // Mounted guard
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // ─── Re-render trigger ────────────────────────────────────────────────────
  const refresh = useCallback(() => {
    if (mountedRef.current) setPosition(chess.fen());
  }, [chess]);

  // ─── Clocks ───────────────────────────────────────────────────────────────
  const isGameOver = useCallback((): boolean => {
    return !!(
      gameState.endReason ||
      gameState.winner ||
      gameState.resignedBy ||
      gameState.drawAgreement ||
      chess.isGameOver()
    );
  }, [gameState, chess]);

  const clockData = useClock(
    gameState,
    chess.turn(),
    isGameOver()
  );

  // ─── Initialize AI mode ───────────────────────────────────────────────────
  useEffect(() => {
    if (initialGameState.mode !== 'ai') return;

    let cancelled = false;
    async function initAI() {
      try {
        await stockfish.init();
        if (!cancelled) stockfishInitialized.current = true;
      } catch (e) {
        console.warn('Stockfish unavailable, using random moves:', e);
      }
    }
    initAI();

    return () => { cancelled = true; };
  }, []);

  // ─── Join game (from URL param) ───────────────────────────────────────────
  useEffect(() => {
    if (initialGameState.mode !== 'multiplayer' || !initialGameState.roomCode || initialGameState.gameId) return;
    // gameId is not set → we entered via a room URL with no gameId yet; the join happens in LobbyScreen
    // If gameId is set, game already started or was loaded
    handleJoinGame();
  }, []);

  async function handleJoinGame() {
    const { roomCode, playerName } = gameState;
    if (!roomCode || !playerName) return;

    const { data: game, error } = await supabase
      .from('games')
      .select('id, status, white_username, black_username, host_color, time_control_minutes, time_control_increment, clock_white_ms, clock_black_ms, turn_started_at')
      .eq('room_code', roomCode)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !game) return;

    if (game.status === 'active') {
      // Already active — reconnect
      const pcFullColor = game.white_username === playerName ? 'w' : 'b';
      setGameState((prev) => ({
        ...prev,
        gameId: game.id,
        playerColor: pcFullColor as PlayerColor,
        whiteUsername: game.white_username,
        blackUsername: game.black_username,
        clockWhiteMs: game.clock_white_ms,
        clockBlackMs: game.clock_black_ms,
        turnStartedAt: game.turn_started_at,
        timeControlIncrement: game.time_control_increment ?? 0,
        persistedMoveCount: 0,
      }));
      await reconnectGame(game.id, pcFullColor as PlayerColor);
      return;
    }

    if (game.status !== 'waiting') return;

    const joinerColor = game.host_color === 'white' ? 'black' : 'white';
    const nowIso = new Date().toISOString();
    const wMs = game.clock_white_ms ?? game.time_control_minutes * 60000;
    const bMs = game.clock_black_ms ?? game.time_control_minutes * 60000;

    const updateData: Record<string, unknown> = {
      status: 'active',
      started_at: nowIso,
      turn_started_at: nowIso,
      clock_white_ms: wMs,
      clock_black_ms: bMs,
    };
    if (joinerColor === 'black') updateData.black_username = playerName;
    else updateData.white_username = playerName;

    const { error: updateErr } = await supabase
      .from('games')
      .update(updateData)
      .eq('id', game.id);
    if (updateErr) return;

    const playerColor: PlayerColor = joinerColor === 'black' ? 'b' : 'w';
    const whiteUser = joinerColor === 'white' ? playerName : game.white_username;
    const blackUser = joinerColor === 'black' ? playerName : game.black_username;

    setGameState((prev) => ({
      ...prev,
      gameId: game.id,
      playerColor,
      whiteUsername: whiteUser,
      blackUsername: blackUser,
      clockWhiteMs: wMs,
      clockBlackMs: bMs,
      turnStartedAt: nowIso,
      timeControlIncrement: game.time_control_increment ?? 0,
    }));

    showColorAssignmentBriefly(playerColor);
    startMultiplayerSubscription(game.id);
    refresh();
  }

  // ─── Reconnection: reload move history from DB ────────────────────────────
  async function reconnectGame(gameId: string, pc: PlayerColor) {
    const { data: moves } = await supabase
      .from('moves')
      .select('san, fen_after, flags, move_number')
      .eq('game_id', gameId)
      .order('move_number', { ascending: true });

    if (moves && moves.length > 0) {
      const lastRow = moves[moves.length - 1];
      chess.load(lastRow.fen_after);
      const hist = chess.history({ verbose: true }) as Array<{ from: string; to: string }>;
      if (hist.length > 0) {
        const last = hist[hist.length - 1];
        setLastMove({ from: last.from, to: last.to });
      }
      setGameState((prev) => ({ ...prev, persistedMoveCount: lastRow.move_number }));
    }

    showColorAssignmentBriefly(pc);
    startMultiplayerSubscription(gameId);
    refresh();
  }

  function showColorAssignmentBriefly(pc: PlayerColor) {
    colorAssignmentMsg.current = pc === 'w' ? 'You are playing as White' : 'You are playing as Black';
    setShowColorAssignment(true);
    setTimeout(() => {
      if (mountedRef.current) setShowColorAssignment(false);
    }, 2000);
  }

  // ─── Supabase realtime subscription ──────────────────────────────────────
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  function startMultiplayerSubscription(gameId: string) {
    if (channelRef.current) supabase.removeChannel(channelRef.current);

    channelRef.current = supabase
      .channel(`moves:${gameId}_${Date.now()}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'moves', filter: `game_id=eq.${gameId}` },
        (payload) => {
          if (!mountedRef.current) return;
          const row = payload.new as {
            move_number: number;
            san: string;
            fen_after: string;
            flags: string | null;
          };

          setGameState((prev) => {
            if (row.move_number <= prev.persistedMoveCount) return prev;
            if (row.flags === 'pass') {
              chess.pass();
            } else {
              chess.load(row.fen_after);
              const hist = chess.history({ verbose: true }) as Array<{ from: string; to: string }>;
              if (hist.length > 0) {
                const last = hist[hist.length - 1];
                setLastMove({ from: last.from, to: last.to });
              }
            }
            setSelectedSq(null);
            setLegalTargets([]);
            setPendingSelfCaptureSq(null);
            refresh();
            return { ...prev, persistedMoveCount: row.move_number };
          });
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'games', filter: `id=eq.${gameId}` },
        (payload) => {
          if (!mountedRef.current) return;
          const row = payload.new as Record<string, unknown>;
          setGameState((prev) => {
            const next: GameState = {
              ...prev,
              drawOfferedBy: (row.draw_offered_by as GameState['drawOfferedBy']) ?? null,
              rematchRequestedBy: (row.rematch_requested_by as GameState['rematchRequestedBy']) ?? null,
              clockWhiteMs: (row.clock_white_ms as number) ?? prev.clockWhiteMs,
              clockBlackMs: (row.clock_black_ms as number) ?? prev.clockBlackMs,
              turnStartedAt: (row.turn_started_at as string) ?? prev.turnStartedAt,
            };
            if (row.status === 'finished') {
              next.endReason = (row.end_reason as string) ?? null;
              next.winner = (row.winner as GameState['winner']) ?? null;
              if (row.end_reason === 'resignation') {
                next.resignedBy = row.winner === 'white' ? 'b' : 'w';
              } else if (row.end_reason === 'draw_agreement') {
                next.drawAgreement = true;
              }
            }
            return next;
          });
          refresh();
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'games' },
        (payload) => {
          if (!mountedRef.current) return;
          const row = payload.new as Record<string, unknown>;
          setGameState((prev) => {
            if (
              prev.roomCode &&
              row.room_code === prev.roomCode &&
              row.status === 'active' &&
              row.id !== prev.gameId
            ) {
              const pc: PlayerColor = row.white_username === prev.playerName ? 'w' : 'b';
              chess.reset();
              setLastMove(null);
              setSelectedSq(null);
              setLegalTargets([]);
              setPendingSelfCaptureSq(null);
              const tcMs = (row.time_control_minutes as number) * 60000;
              const newState: GameState = {
                ...prev,
                gameId: row.id as string,
                playerColor: pc,
                whiteUsername: row.white_username as string,
                blackUsername: row.black_username as string,
                clockWhiteMs: (row.clock_white_ms as number) ?? tcMs,
                clockBlackMs: (row.clock_black_ms as number) ?? tcMs,
                turnStartedAt: (row.turn_started_at as string) ?? new Date().toISOString(),
                timeControlIncrement: (row.time_control_increment as number) ?? 0,
                persistedMoveCount: 0,
                resignedBy: null,
                drawOfferedBy: null,
                drawAgreement: false,
                endReason: null,
                winner: null,
                rematchRequestedBy: null,
              };
              startMultiplayerSubscription(row.id as string);
              showColorAssignmentBriefly(pc);
              refresh();
              return newState;
            }
            return prev;
          });
        }
      )
      .subscribe();
  }

  useEffect(() => {
    if (gameState.mode === 'multiplayer' && gameState.gameId) {
      startMultiplayerSubscription(gameState.gameId);
    }
    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, [gameState.gameId]);

  // ─── Execute a move (shared by click and drag) ────────────────────────────
  const executeMove = useCallback(async (from: string, to: string) => {
    const piece = chess.get(from) as { type: string; color: 'w' | 'b' } | null;
    const opts: { from: string; to: string; promotion?: string } = { from, to };
    if (
      piece?.type === 'p' &&
      ((piece.color === 'w' && to[1] === '8') || (piece.color === 'b' && to[1] === '1'))
    ) {
      opts.promotion = 'q';
    }

    let result: { from: string; to: string; san: string; flags: string } | null = null;
    try {
      result = chess.move(opts);
      if (result) setLastMove({ from: result.from, to: result.to });
    } catch {
      return;
    }

    setSelectedSq(null);
    setLegalTargets([]);
    setPendingSelfCaptureSq(null);
    refresh();

    // ── Persist in multiplayer ─────────────────────────────────────────────
    setGameState((prev) => {
      if (prev.mode === 'multiplayer' && prev.gameId && result) {
        const moverColor = result.flags.includes('w') ? 'w' : (chess.turn() === 'w' ? 'b' : 'w');
        const elapsed = prev.turnStartedAt
          ? Math.max(0, Date.now() - new Date(prev.turnStartedAt).getTime())
          : 0;
        const incMs = (prev.timeControlIncrement ?? 0) * 1000;
        const nowIso = new Date().toISOString();

        let newWhiteMs = prev.clockWhiteMs;
        let newBlackMs = prev.clockBlackMs;
        // Determine who actually moved using the pre-move turn
        const whoMoved: 'w' | 'b' = chess.turn() === 'w' ? 'b' : 'w';
        if (whoMoved === 'w') {
          newWhiteMs = Math.max(0, (prev.clockWhiteMs ?? 0) - elapsed) + incMs;
        } else {
          newBlackMs = Math.max(0, (prev.clockBlackMs ?? 0) - elapsed) + incMs;
        }

        const newMoveCount = prev.persistedMoveCount + 1;
        const flags: string[] = [];
        if (result.flags?.includes('c')) flags.push('self_capture');

        // Fire and forget async calls
        (async () => {
          await supabase.from('moves').insert({
            game_id: prev.gameId,
            move_number: newMoveCount,
            san: result!.san,
            fen_after: chess.fen(),
            flags: flags.join(',') || null,
          });

          const updateData: Record<string, unknown> = {
            draw_offered_by: null,
            clock_white_ms: newWhiteMs,
            clock_black_ms: newBlackMs,
            turn_started_at: nowIso,
          };
          if (chess.isGameOver()) {
            updateData.status = 'finished';
            const kingResult = chess.isKingCaptured() as { captured: boolean; winner: 'w' | 'b' | null };
            if (kingResult.captured) {
              if (kingResult.winner === null) {
                updateData.winner = 'draw';
                updateData.end_reason = 'both_kings_captured';
              } else {
                updateData.winner = kingResult.winner === 'w' ? 'white' : 'black';
                updateData.end_reason = 'king_capture';
              }
            } else if (chess.isStalemate()) {
              updateData.winner = 'draw';
              updateData.end_reason = 'stalemate';
            } else if (chess.isDraw()) {
              updateData.winner = 'draw';
              updateData.end_reason = 'draw';
            }
          }
          await supabase.from('games').update(updateData).eq('id', prev.gameId);
        })();

        return {
          ...prev,
          persistedMoveCount: newMoveCount,
          clockWhiteMs: newWhiteMs,
          clockBlackMs: newBlackMs,
          turnStartedAt: nowIso,
        };
      }
      return prev;
    });

    // ── AI mode: trigger Stockfish ─────────────────────────────────────────
    if (gameState.mode === 'ai' && !chess.isGameOver() && chess.turn() === 'b') {
      setTimeout(() => doAiMove(), 150);
    }
  }, [chess, gameState.mode, refresh]);

  // ─── AI move ──────────────────────────────────────────────────────────────
  const doAiMove = useCallback(async () => {
    if (chess.isGameOver() || chess.turn() !== 'b') return;
    setAiThinking(true);

    const fen = chess.fen();
    const uciMove = await stockfish.getMove(fen);

    let moved = false;
    if (uciMove && uciMove !== '(none)') {
      const args = parseUciMove(uciMove);
      if (args) {
        try {
          const r = chess.move(args) as { from: string; to: string } | null;
          if (r) { setLastMove({ from: r.from, to: r.to }); moved = true; }
        } catch { /* illegal under NeoChess rules */ }
      }
    }

    if (!moved) {
      const legalMoves = chess.moves({ verbose: true }) as Array<{ from: string; to: string; promotion?: string }>;
      if (legalMoves.length > 0) {
        const pick = legalMoves[Math.floor(Math.random() * legalMoves.length)];
        try {
          const r = chess.move({ from: pick.from, to: pick.to, promotion: pick.promotion }) as { from: string; to: string } | null;
          if (r) { setLastMove({ from: r.from, to: r.to }); }
        } catch { /* skip */ }
      }
    }

    if (mountedRef.current) {
      setAiThinking(false);
      setSelectedSq(null);
      setLegalTargets([]);
      refresh();
    }
  }, [chess, stockfish, refresh]);

  // ─── Click-to-move handler ────────────────────────────────────────────────
  const handleSquareClick = useCallback((sq: string) => {
    if (isGameOver()) return;
    if (gameState.mode === 'ai') {
      if (aiThinking || chess.turn() === 'b') return;
    }
    if (gameState.mode === 'multiplayer' && chess.turn() !== gameState.playerColor) return;

    const targetPiece = chess.get(sq) as { color: 'w' | 'b'; type: string } | null;
    const currentTurn = chess.turn() as 'w' | 'b';
    const isFriendly = targetPiece && targetPiece.color === currentTurn;

    if (selectedSq && legalTargets.includes(sq)) {
      if (REQUIRE_DOUBLE_CLICK_SELF_CAPTURE && isFriendly) {
        if (pendingSelfCaptureSq === sq) {
          executeMove(selectedSq, sq);
        } else {
          setPendingSelfCaptureSq(sq);
        }
        return;
      }
      setPendingSelfCaptureSq(null);
      executeMove(selectedSq, sq);
      return;
    }

    if (isFriendly) {
      setSelectedSq(sq);
      setLegalTargets(
        (chess.moves({ square: sq, verbose: true }) as Array<{ to: string }>).map((m) => m.to)
      );
      setPendingSelfCaptureSq(null);
      return;
    }

    setSelectedSq(null);
    setLegalTargets([]);
    setPendingSelfCaptureSq(null);
  }, [chess, isGameOver, gameState, aiThinking, selectedSq, legalTargets, pendingSelfCaptureSq, executeMove]);

  const handleCancelSelection = useCallback(() => {
    setSelectedSq(null);
    setLegalTargets([]);
    setPendingSelfCaptureSq(null);
  }, []);

  // ─── Drag handler ─────────────────────────────────────────────────────────
  const handleDrop = useCallback((from: string, to: string) => {
    if (isGameOver()) return;
    if (gameState.mode === 'multiplayer' && chess.turn() !== gameState.playerColor) return;
    if (gameState.mode === 'ai' && (aiThinking || chess.turn() !== 'w')) return;
    const piece = chess.get(from) as { color: 'w' | 'b' } | null;
    if (!piece || piece.color !== chess.turn()) return;
    const targets = (chess.moves({ square: from, verbose: true }) as Array<{ to: string }>).map((m) => m.to);
    if (targets.includes(to)) executeMove(from, to);
  }, [chess, isGameOver, gameState, aiThinking, executeMove]);

  // ─── canInteract helper ───────────────────────────────────────────────────
  const canInteract = useCallback((_sq: string): boolean => {
    if (isGameOver()) return false;
    if (gameState.mode === 'ai') return !aiThinking && chess.turn() === 'w';
    return chess.turn() === gameState.playerColor;
  }, [chess, isGameOver, gameState, aiThinking]);

  // ─── Pass turn ────────────────────────────────────────────────────────────
  const handlePass = useCallback(async () => {
    if (gameState.mode === 'ai' && (aiThinking || chess.turn() === 'b')) return;
    if (gameState.mode === 'multiplayer' && chess.turn() !== gameState.playerColor) return;

    const passingColor = chess.turn() as 'w' | 'b';
    if (chess.pass()) {
      setSelectedSq(null);
      setLegalTargets([]);
      setPendingSelfCaptureSq(null);
      refresh();

      if (gameState.mode === 'multiplayer' && gameState.gameId) {
        const nowIso = new Date().toISOString();
        const elapsed = gameState.turnStartedAt
          ? Math.max(0, Date.now() - new Date(gameState.turnStartedAt).getTime())
          : 0;
        const incMs = (gameState.timeControlIncrement ?? 0) * 1000;
        let newWhiteMs = gameState.clockWhiteMs;
        let newBlackMs = gameState.clockBlackMs;
        if (passingColor === 'w') newWhiteMs = Math.max(0, (newWhiteMs ?? 0) - elapsed) + incMs;
        else newBlackMs = Math.max(0, (newBlackMs ?? 0) - elapsed) + incMs;

        const newMoveCount = gameState.persistedMoveCount + 1;
        await supabase.from('moves').insert({
          game_id: gameState.gameId,
          move_number: newMoveCount,
          san: '--',
          fen_after: chess.fen(),
          flags: 'pass',
        });

        const updateData: Record<string, unknown> = {
          draw_offered_by: null,
          clock_white_ms: newWhiteMs,
          clock_black_ms: newBlackMs,
          turn_started_at: nowIso,
        };
        if (chess.isGameOver() && chess.isPassDraw()) {
          updateData.status = 'finished';
          updateData.winner = 'draw';
          updateData.end_reason = 'pass_draw';
        }
        await supabase.from('games').update(updateData).eq('id', gameState.gameId);
        setGameState((prev) => ({
          ...prev,
          persistedMoveCount: newMoveCount,
          clockWhiteMs: newWhiteMs,
          clockBlackMs: newBlackMs,
          turnStartedAt: nowIso,
        }));
        return;
      }

      if (gameState.mode === 'ai' && !chess.isGameOver() && chess.turn() === 'b') {
        setTimeout(() => doAiMove(), 150);
      }
    }
  }, [chess, gameState, aiThinking, doAiMove, refresh]);

  // ─── Resign ───────────────────────────────────────────────────────────────
  const handleResign = useCallback(async () => {
    if (!window.confirm('Are you sure you want to resign? This cannot be undone.')) return;
    const winnerColor = gameState.playerColor === 'w' ? 'black' : 'white';
    await supabase.from('games').update({
      status: 'finished',
      winner: winnerColor,
      end_reason: 'resignation',
    }).eq('id', gameState.gameId);
  }, [gameState]);

  // ─── Draw actions ─────────────────────────────────────────────────────────
  const handleOfferDraw = useCallback(async () => {
    const fullColor = gameState.playerColor === 'w' ? 'white' : 'black';
    await supabase.from('games').update({ draw_offered_by: fullColor }).eq('id', gameState.gameId);
  }, [gameState]);

  const handleAcceptDraw = useCallback(async () => {
    await supabase.from('games').update({
      status: 'finished',
      winner: null,
      end_reason: 'draw_agreement',
      draw_offered_by: null,
    }).eq('id', gameState.gameId);
  }, [gameState]);

  const handleDeclineDraw = useCallback(async () => {
    await supabase.from('games').update({ draw_offered_by: null }).eq('id', gameState.gameId);
  }, [gameState]);

  // ─── Rematch ──────────────────────────────────────────────────────────────
  const handleRequestRematch = useCallback(async () => {
    const fullColor = gameState.playerColor === 'w' ? 'white' : 'black';
    await supabase.from('games').update({ rematch_requested_by: fullColor }).eq('id', gameState.gameId);
  }, [gameState]);

  const handleAcceptRematch = useCallback(async () => {
    const { data: oldGame } = await supabase
      .from('games').select('*').eq('id', gameState.gameId).single();
    if (!oldGame) return;

    const newWhite = oldGame.black_username;
    const newBlack = oldGame.white_username;
    const tcMs = oldGame.time_control_minutes * 60000;
    const nowIso = new Date().toISOString();

    const { data: newGame } = await supabase
      .from('games')
      .insert({
        room_code: oldGame.room_code || gameState.roomCode,
        host_color: oldGame.host_color,
        white_username: newWhite,
        black_username: newBlack,
        time_control_minutes: oldGame.time_control_minutes,
        time_control_increment: oldGame.time_control_increment,
        clock_white_ms: tcMs,
        clock_black_ms: tcMs,
        turn_started_at: nowIso,
        status: 'active',
        started_at: nowIso,
      })
      .select('id')
      .single();

    if (!newGame) return;

    const newPc: PlayerColor = newWhite === gameState.playerName ? 'w' : 'b';
    chess.reset();
    setLastMove(null);
    setSelectedSq(null);
    setLegalTargets([]);
    setPendingSelfCaptureSq(null);

    setGameState((prev) => ({
      ...prev,
      gameId: newGame.id,
      playerColor: newPc,
      whiteUsername: newWhite,
      blackUsername: newBlack,
      clockWhiteMs: tcMs,
      clockBlackMs: tcMs,
      turnStartedAt: nowIso,
      timeControlIncrement: oldGame.time_control_increment ?? 0,
      persistedMoveCount: 0,
      resignedBy: null,
      drawOfferedBy: null,
      drawAgreement: false,
      endReason: null,
      winner: null,
      rematchRequestedBy: null,
    }));
    showColorAssignmentBriefly(newPc);
    startMultiplayerSubscription(newGame.id);
    refresh();
  }, [chess, gameState, refresh]);

  const handleDeclineRematch = useCallback(async () => {
    await supabase.from('games').update({ rematch_requested_by: null }).eq('id', gameState.gameId);
  }, [gameState]);

  // ─── Fetch session score tally ────────────────────────────────────────────
  const [sessionScore, setSessionScore] = useState<{ white: number; black: number; count: number } | null>(null);

  useEffect(() => {
    if (gameState.mode !== 'multiplayer' || !gameState.roomCode || !isGameOver()) return;
    (async () => {
      const { data } = await supabase
        .from('games')
        .select('winner, status')
        .eq('room_code', gameState.roomCode!)
        .eq('status', 'finished');
      if (!data) return;
      let w = 0, b = 0;
      data.forEach((g) => {
        if (g.winner === 'white') w += 1;
        else if (g.winner === 'black') b += 1;
        else { w += 0.5; b += 0.5; }
      });
      setSessionScore({ white: w, black: b, count: data.length });
    })();
  }, [gameState.mode, gameState.roomCode, isGameOver()]);

  // ─── Compute end-game data ────────────────────────────────────────────────
  function getEndGameData() {
    const over = isGameOver();
    if (!over) return null;

    let result = 'Draw';
    let reason = 'by agreement';

    if (gameState.mode === 'multiplayer') {
      if (gameState.winner === 'white') result = `${gameState.whiteUsername || 'White'} wins!`;
      else if (gameState.winner === 'black') result = `${gameState.blackUsername || 'Black'} wins!`;
      else result = 'Draw';

      if (gameState.endReason === 'resignation') reason = 'by resignation';
      else if (gameState.endReason === 'time_forfeit') reason = 'by time forfeit';
      else if (gameState.endReason === 'king_capture') reason = 'by king capture';
      else if (gameState.endReason === 'both_kings_captured') reason = 'by retaliation';
      else if (gameState.endReason === 'draw_agreement') reason = 'by agreement';
      else if (gameState.endReason === 'pass_draw') reason = 'by pass rule';
      else if (gameState.endReason === 'stalemate') reason = 'by stalemate';
      else if (gameState.endReason === 'draw') reason = 'by draw rule';
      else if (gameState.endReason) reason = `by ${gameState.endReason}`;
    } else {
      // AI mode
      if (chess.isGameOver()) {
        const kr = chess.isKingCaptured() as { captured: boolean; winner: 'w' | 'b' | null };
        if (kr.captured) {
          if (kr.winner === 'w') result = `${gameState.playerName || 'White'} wins!`;
          else if (kr.winner === 'b') result = 'Stockfish wins!';
          else result = 'Draw';
          reason = kr.winner === null ? 'by retaliation' : 'by king capture';
        } else if (chess.isPassDraw()) { result = 'Draw'; reason = 'by pass rule'; }
        else if (chess.isStalemate()) { result = 'Draw'; reason = 'by stalemate'; }
        else { result = 'Draw'; reason = 'by draw rule'; }
      } else if (gameState.resignedBy) {
        result = gameState.resignedBy === 'w' ? 'Stockfish wins!' : `${gameState.playerName} wins!`;
        reason = 'by resignation';
      }
    }

    return { result, reason };
  }

  const endGameData = getEndGameData();
  const flipped = gameState.mode === 'multiplayer' && gameState.playerColor === 'b';

  // ─── Status text ──────────────────────────────────────────────────────────
  function getStatusText(): string {
    if (gameState.mode === 'ai' && aiThinking && !chess.isGameOver()) return 'Stockfish is thinking…';
    const kr = chess.isKingCaptured() as { captured: boolean; winner: 'w' | 'b' | null };
    if (kr.captured) {
      if (kr.winner === null) return 'Draw — both kings captured!';
      const winner = kr.winner === 'w'
        ? (gameState.mode === 'ai' ? gameState.playerName : gameState.whiteUsername || 'White')
        : (gameState.mode === 'ai' ? 'Stockfish' : gameState.blackUsername || 'Black');
      return `${winner} wins!`;
    }
    if (chess.isPassDraw()) return 'Draw — both players passed';
    if (chess.isRetaliationPending()) {
      return gameState.mode === 'ai' ? 'Retaliation — Black to move' : `Retaliation — ${gameState.blackUsername || 'Black'} to move`;
    }
    if (chess.isStalemate()) return 'Stalemate — Draw';
    if (chess.isDraw()) return 'Draw';
    if (gameState.endReason === 'resignation') return `${gameState.resignedBy === 'w' ? gameState.whiteUsername || 'White' : gameState.blackUsername || 'Black'} resigned`;
    if (gameState.drawAgreement) return 'Draw by agreement';
    if (gameState.drawOfferedBy) return `Draw offered by ${gameState.drawOfferedBy}`;
    return 'In progress';
  }

  const turnIsWhite = chess.turn() === 'w';
  const turnText = gameState.mode === 'ai'
    ? (turnIsWhite ? `${gameState.playerName}'s turn` : aiThinking ? 'Stockfish thinking…' : 'Stockfish to move')
    : (turnIsWhite ? `${gameState.whiteUsername || 'White'}'s turn` : `${gameState.blackUsername || 'Black'}'s turn`);

  const moveHistory = chess.history() as string[];
  const isRetaliating = chess.isRetaliationPending() as boolean;

  const passDisabled = isGameOver() || isRetaliating ||
    (gameState.mode === 'ai' ? (aiThinking || chess.turn() === 'b') : chess.turn() !== gameState.playerColor);

  return (
    <div className={styles.container}>
      {/* ── Board Card ── */}
      <div className={`liquid-glass ${styles.boardCard}`}>
        {/* Cloned backdrop image layer for organic glass refraction */}
        <div className="liquid-glass-bg liquid-glass-bg-game" />

        {/* ── Board + overlays ── */}
        <div className={styles.boardArea} style={{ position: 'relative' }}>
          <Chessboard
            getBoardSquare={(sq) => chess.get(sq) as { color: 'w' | 'b'; type: string } | null}
            selectedSq={selectedSq}
            legalTargets={legalTargets}
            lastMove={lastMove}
            pendingSelfCaptureSq={pendingSelfCaptureSq}
            flipped={flipped}
            canInteract={canInteract}
            onSquareClick={handleSquareClick}
            onDrop={handleDrop}
            onCancelDrag={handleCancelSelection}
            currentTurn={chess.turn() as 'w' | 'b'}
          />

          {/* Color assignment brief overlay */}
          <AnimatePresence>
            {showColorAssignment && (
              <ColorAssignmentOverlay message={colorAssignmentMsg.current} />
            )}
          </AnimatePresence>

          {/* End game overlay */}
          <AnimatePresence>
            {endGameData && (
              <EndGameOverlay
                result={endGameData.result}
                reason={endGameData.reason}
                sessionScore={sessionScore}
                whiteUsername={gameState.whiteUsername}
                blackUsername={gameState.blackUsername}
                mode={gameState.mode}
                playerColor={gameState.playerColor}
                rematchRequestedBy={gameState.rematchRequestedBy}
                onRequestRematch={handleRequestRematch}
                onAcceptRematch={handleAcceptRematch}
                onDeclineRematch={handleDeclineRematch}
                onLobby={onReturnToLobby}
              />
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Sidebar Card ── */}
      <div className={`liquid-glass ${styles.sidebarCard}`}>
        {/* Cloned backdrop image layer for organic glass refraction */}
        <div className="liquid-glass-bg liquid-glass-bg-game" />

        {/* ── Sidebar ── */}
        <GameSidebar
          playerLabel={
            gameState.mode === 'ai'
              ? `${gameState.playerName} (White) vs Stockfish (Black)`
              : `${gameState.whiteUsername || 'White'} vs ${gameState.blackUsername || 'Black'}`
          }
          turnIsWhite={turnIsWhite}
          turnText={turnText}
          statusText={getStatusText()}
          isAlert={!!(
            (chess.isKingCaptured() as { captured: boolean }).captured ||
            chess.isRetaliationPending() ||
            gameState.resignedBy ||
            (gameState.endReason && ['king_capture', 'both_kings_captured', 'resignation', 'time_forfeit'].includes(gameState.endReason))
          )}
          isThinking={gameState.mode === 'ai' && aiThinking}
          moveHistory={moveHistory}
          clockData={gameState.mode === 'multiplayer' ? {
            white: { label: gameState.whiteUsername || 'White', time: clockData.whiteDisplay, active: clockData.whiteActive },
            black: { label: gameState.blackUsername || 'Black', time: clockData.blackDisplay, active: clockData.blackActive },
          } : undefined}
          mode={gameState.mode}
          playerColor={gameState.playerColor}
          drawOfferedBy={gameState.drawOfferedBy}
          drawAgreement={gameState.drawAgreement}
          resignedBy={gameState.resignedBy}
          endReason={gameState.endReason}
          gameOver={isGameOver()}
          passDisabled={passDisabled}
          onPass={handlePass}
          onResign={handleResign}
          onOfferDraw={handleOfferDraw}
          onAcceptDraw={handleAcceptDraw}
          onDeclineDraw={handleDeclineDraw}
          onRules={onRules}
        />
      </div>
    </div>
  );
}
