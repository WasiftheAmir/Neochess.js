import { useState, useEffect, lazy, Suspense } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { AppScreen, GameState } from './types';
import { INITIAL_GAME_STATE } from './types';
import LobbyScreen from './components/LobbyScreen';
import TimeControlScreen from './components/TimeControlScreen';
import WaitingRoomScreen from './components/WaitingRoomScreen';
import RulesModal from './components/RulesModal';
import BackgroundLayer from './components/BackgroundLayer';

const GameScreen = lazy(() => import('./components/GameScreen'));

// ── URL param detection for join flow ──────────────────────────────────────────
function getUrlRoomCode(): string | null {
  const params = new URLSearchParams(window.location.search);
  return params.get('room');
}

export default function App() {
  const [screen, setScreen] = useState<AppScreen>('lobby');
  const [gameState, setGameState] = useState<GameState>({
    ...INITIAL_GAME_STATE,
    playerName: localStorage.getItem('neochess_username') ?? '',
  });
  const [roomCode] = useState<string | null>(getUrlRoomCode);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [gameActive, setGameActive] = useState(false);

  // Persist username across sessions
  useEffect(() => {
    if (gameState.playerName) {
      localStorage.setItem('neochess_username', gameState.playerName);
    }
  }, [gameState.playerName]);

  // If URL has ?room=XXX, show lobby in join mode immediately
  const isJoinMode = !!roomCode;

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
    // Strip URL query params
    window.history.replaceState({}, document.title, window.location.pathname);
  };

  const pageVariants = {
    initial: { opacity: 0, y: 16, scale: 0.97 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit:    { opacity: 0, y: -16, scale: 0.97 },
  };
  const pageTransition = { duration: 0.35 };

  return (
    <>
      <BackgroundLayer gameActive={gameActive} />

      <RulesModal open={rulesOpen} onClose={() => setRulesOpen(false)} />

      <div
        style={{
          position: 'relative',
          zIndex: 1,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
        }}
      >
        <AnimatePresence mode="wait">
          {screen === 'lobby' && (
            <motion.div
              key="lobby"
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={pageTransition}
            >
              <LobbyScreen
                playerName={gameState.playerName}
                isJoinMode={isJoinMode}
                roomCode={roomCode}
                onNameChange={(name) =>
                  setGameState((prev) => ({ ...prev, playerName: name }))
                }
                onPlayAI={(name) => {
                  setGameState((prev) => ({
                    ...prev,
                    playerName: name,
                    mode: 'ai',
                    playerColor: 'w',
                    whiteUsername: name,
                    blackUsername: 'Stockfish',
                  }));
                  setScreen('game');
                  setGameActive(true);
                }}
                onPlayFriend={(name) => {
                  setGameState((prev) => ({ ...prev, playerName: name }));
                  setScreen('timeControl');
                }}
                onJoinGame={(name) => {
                  setGameState((prev) => ({
                    ...prev,
                    playerName: name,
                    roomCode: roomCode,
                  }));
                  // GameScreen handles the join flow via Supabase
                  goToGame({
                    playerName: name,
                    mode: 'multiplayer',
                    roomCode: roomCode,
                  });
                }}
                onRules={() => setRulesOpen(true)}
              />
            </motion.div>
          )}

          {screen === 'timeControl' && (
            <motion.div
              key="timeControl"
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={pageTransition}
            >
              <TimeControlScreen
                playerName={gameState.playerName}
                onBack={() => setScreen('lobby')}
                onCreateChallenge={(roomCode, gameId, playerColor, tc) => {
                  setGameState((prev) => ({
                    ...prev,
                    mode: 'multiplayer',
                    roomCode,
                    gameId,
                    playerColor,
                    timeControlIncrement: tc.increment,
                    clockWhiteMs: tc.minutes * 60000,
                    clockBlackMs: tc.minutes * 60000,
                    turnStartedAt: new Date().toISOString(),
                    whiteUsername: playerColor === 'w' ? prev.playerName : '',
                    blackUsername: playerColor === 'b' ? prev.playerName : '',
                  }));
                  setScreen('waitingRoom');
                }}
              />
            </motion.div>
          )}

          {screen === 'waitingRoom' && (
            <motion.div
              key="waitingRoom"
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={pageTransition}
            >
              <WaitingRoomScreen
                gameState={gameState}
                onGameStart={(whiteUsername, blackUsername, updatedState) => {
                  goToGame({
                    ...updatedState,
                    whiteUsername,
                    blackUsername,
                  });
                }}
                onCancel={goToLobby}
              />
            </motion.div>
          )}

          {screen === 'game' && (
            <motion.div
              key="game"
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={pageTransition}
              style={{ width: '100%', display: 'flex', justifyContent: 'center' }}
            >
              <Suspense
                fallback={
                  <div style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
                    Loading…
                  </div>
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
