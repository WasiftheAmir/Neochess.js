// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  gameActive: boolean;
}

export default function BackgroundLayer({ gameActive }: Props) {
  return (
    <>
      {/* Dark overlay always present */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'transparent',
          zIndex: 0,
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
              position: 'fixed',
              inset: 0,
              backgroundImage: "url('/Website_Back_Drop.png')",
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
              zIndex: -1,
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
              position: 'fixed',
              inset: 0,
              backgroundImage: "url('/Website_Back_Drop_1.png')",
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
              zIndex: -1,
            }}
          />
        )}
      </AnimatePresence>
    </>
  );
}
