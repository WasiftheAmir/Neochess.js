import { useState, useEffect, lazy, Suspense } from 'react';
import { AnimatePresence, motion, LayoutGroup } from 'framer-motion';
import type { Variants } from 'framer-motion';
import type { AppScreen, GameState } from './types';
import { INITIAL_GAME_STATE } from './types';
import LobbyScreen from './components/LobbyScreen';
import TimeControlScreen from './components/TimeControlScreen';
import WaitingRoomScreen from './components/WaitingRoomScreen';
import RulesModal from './components/RulesModal';
import BackgroundLayer from './components/BackgroundLayer';
import LiquidFilter from './components/LiquidFilter';
import styles from './App.module.css';

const GameScreen = lazy(() => import('./components/GameScreen'));

// ── URL param detection ─────────────────────────────────────────────────────
function getUrlRoomCode(): string | null {
  return new URLSearchParams(window.location.search).get('room');
}

// Screens rendered inside the single morphing liquid-glass panel
const PANEL_SCREENS: AppScreen[] = ['lobby', 'timeControl', 'waitingRoom'];

// ── Content motion variants (blur-fade-slide) ─────────────────────────────
const contentVariants: Variants = {
  hidden: { opacity: 0, filter: 'blur(8px)', y: 12 },
  visible: { opacity: 1, filter: 'blur(0px)', y: 0 },
  exit:   { opacity: 0, filter: 'blur(8px)', y: -10 },
};

// ── Game view variants ─────────────────────────────────────────────────────
const gameVariants: Variants = {
  hidden: { opacity: 0, scale: 0.96, filter: 'blur(12px)' },
  visible: { opacity: 1, scale: 1, filter: 'blur(0px)' },
  exit:   { opacity: 0, scale: 0.94, filter: 'blur(12px)' },
};

export default function App() {
  const [screen, setScreen]         = useState<AppScreen>('lobby');
  const [gameState, setGameState]   = useState<GameState>({
    ...INITIAL_GAME_STATE,
    playerName: localStorage.getItem('neochess_username') ?? '',
  });
  const [roomCode]                  = useState<string | null>(getUrlRoomCode);
  const [rulesOpen, setRulesOpen]   = useState(false);
  const [gameActive, setGameActive] = useState(false);

  // Persist username
  useEffect(() => {
    if (gameState.playerName) {
      localStorage.setItem('neochess_username', gameState.playerName);
    }
  }, [gameState.playerName]);

  const isJoinMode = !!roomCode;

  // ── Navigation ─────────────────────────────────────────────────────────
  const navigate = (next: AppScreen) => {
    setScreen(next);
  };

  const goToGame = (newState: Partial<GameState>) => {
    setGameState((prev) => ({ ...prev, ...newState }));
    setScreen('game');
    setGameActive(true);
  };

  const goToLobby = () => {
    setScreen('lobby');
    setGameActive(false);
    setGameState((prev) => ({
      ...INITIAL_GAME_STATE,
      playerName: prev.playerName,
    }));
    window.history.replaceState({}, document.title, window.location.pathname);
  };

  const showPanel = PANEL_SCREENS.includes(screen);

  return (
    <>
      {/* SVG filter definitions */}
      <LiquidFilter />

      {/* Parallax chess-piece background */}
      <BackgroundLayer gameActive={gameActive} />

      {/* Rules modal */}
      <RulesModal open={rulesOpen} onClose={() => setRulesOpen(false)} />

      {/* ── Root flex centring ─────────────────────────────────────── */}
      <div className={`${styles.root} ${screen === 'game' ? styles.rootGame : ''}`}>

        {/* ════════════════════════════════════════════════════════════
            LOBBY PANEL — single persistent element that morphs between
            lobby / timeControl / waitingRoom.

            Architecture:
              lg-filter-shell  → gets the SVG filter (outer wrapper)
              ↳ motion.div (layout, liquid-glass) → springs to new size
                ↳ AnimatePresence (popLayout) → blurs content in/out
        ════════════════════════════════════════════════════════════ */}
        <AnimatePresence>
          {showPanel && (
            /* The glass panel — auto-sizes via `layout`, springs on change */
            <motion.div
              className={`liquid-glass ${styles.panel}`}
              layout
              layoutRoot
              initial={{ opacity: 0, scale: 0.88 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{    opacity: 0, scale: 0.88 }}
              transition={{
                layout:  {
                  type: 'spring',
                  stiffness: 220,
                  damping: 30,
                  mass: 1,
                },
                opacity: { duration: 0.35 },
                scale:   { type: 'spring', stiffness: 280, damping: 28 },
              }}
            >
              {/* Cloned backdrop image layer for organic glass refraction */}
              <div className="liquid-glass-bg liquid-glass-bg-lobby" />

              {/* Content — blurs out then in on each screen change */}
              <LayoutGroup>
                  <AnimatePresence mode="popLayout" initial={false}>
                    {screen === 'lobby' && (
                      <motion.div
                        key="lobby"
                        variants={contentVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        className={styles.panelContent}
                      >
                        <LobbyScreen
                          playerName={gameState.playerName}
                          isJoinMode={isJoinMode}
                          roomCode={roomCode}
                          onNameChange={(n) =>
                            setGameState((p) => ({ ...p, playerName: n }))
                          }
                          onPlayAI={(name) =>
                            goToGame({
                              playerName: name,
                              mode: 'ai',
                              playerColor: 'w',
                              whiteUsername: name,
                              blackUsername: 'Stockfish',
                            })
                          }
                          onPlayFriend={(name) => {
                            setGameState((p) => ({ ...p, playerName: name }));
                            navigate('timeControl');
                          }}
                          onJoinGame={(name) =>
                            goToGame({
                              playerName: name,
                              mode: 'multiplayer',
                              roomCode,
                            })
                          }
                          onRules={() => setRulesOpen(true)}
                        />
                      </motion.div>
                    )}

                    {screen === 'timeControl' && (
                      <motion.div
                        key="timeControl"
                        variants={contentVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        className={styles.panelContent}
                      >
                        <TimeControlScreen
                          playerName={gameState.playerName}
                          onBack={() => navigate('lobby')}
                          onCreateChallenge={(rc, gameId, playerColor, tc) => {
                            setGameState((p) => ({
                              ...p,
                              mode: 'multiplayer',
                              roomCode: rc,
                              gameId,
                              playerColor,
                              timeControlIncrement: tc.increment,
                              clockWhiteMs: tc.minutes * 60000,
                              clockBlackMs: tc.minutes * 60000,
                              turnStartedAt: new Date().toISOString(),
                              whiteUsername: playerColor === 'w' ? p.playerName : '',
                              blackUsername: playerColor === 'b' ? p.playerName : '',
                            }));
                            navigate('waitingRoom');
                          }}
                        />
                      </motion.div>
                    )}

                    {screen === 'waitingRoom' && (
                      <motion.div
                        key="waitingRoom"
                        variants={contentVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        className={styles.panelContent}
                      >
                        <WaitingRoomScreen
                          gameState={gameState}
                          onGameStart={(wu, bu, updated) =>
                            goToGame({ ...updated, whiteUsername: wu, blackUsername: bu })
                          }
                          onCancel={goToLobby}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </LayoutGroup>
              </motion.div>
          )}
        </AnimatePresence>

        {/* ════════════════════════════════════════════════════════════
            GAME VIEW — separate full-layout view, blurs in/out
        ════════════════════════════════════════════════════════════ */}
        <AnimatePresence>
          {screen === 'game' && (
            <motion.div
              key="game"
              variants={gameVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className={styles.gameWrapper}
            >
              <Suspense
                fallback={
                  <div className={styles.suspenseFallback}>Loading…</div>
                }
              >
                <GameScreen
                  initialGameState={gameState}
                  onReturnToLobby={goToLobby}
                  onRules={() => setRulesOpen(true)}
                />
              </Suspense>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </>
  );
}
