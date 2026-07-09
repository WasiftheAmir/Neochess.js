// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  gameActive: boolean;
}

export default function BackgroundLayer({ gameActive }: Props) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
      {/* Dark overlay always present */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0,0,0,0.70)',
          zIndex: 1,
        }}
      />

      {/* Lobby background */}
      <AnimatePresence>
        {!gameActive && (
          <motion.div
            key="lobby-bg"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            style={{
              position: 'absolute',
              inset: 0,
              backgroundImage: "url('/Website_Back_Drop.png')",
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
              zIndex: 0,
            }}
          />
        )}
      </AnimatePresence>

      {/* Game background */}
      <AnimatePresence>
        {gameActive && (
          <motion.div
            key="game-bg"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            style={{
              position: 'absolute',
              inset: 0,
              backgroundImage: "url('/Website_Back_Drop_1.png')",
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
              zIndex: 0,
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
