import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './RulesModal.module.css';

interface Props {
  open: boolean;
  onClose: () => void;
}

const RULES = [
  {
    title: '1. King Capture',
    desc: 'There is no checkmate. The game ends when a king is physically captured by an opposing piece.',
  },
  {
    title: '2. Retaliation Draw',
    desc: "If White captures Black's king, Black gets one final move. If Black can and does capture White's king in response, the game is a draw. If Black cannot reach White's king, White wins immediately.",
  },
  {
    title: '3. Self-Capture',
    desc: 'A piece may capture any friendly piece on a square it can legally reach. You cannot capture your own king.',
  },
  {
    title: '4. Pass Turn',
    desc: 'A player may pass their turn instead of moving. If both players pass 6 consecutive times (3 each), the game ends as a draw.',
  },
];

export default function RulesModal({ open, onClose }: Props) {
  // Close on Escape
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className={styles.overlay}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
          <motion.div
            className={styles.card}
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
          >
            <button className={styles.closeBtn} onClick={onClose} aria-label="Close rules">
              ×
            </button>

            <h2 className={styles.title}>NeoChess Rules</h2>

            <div className={styles.rulesList}>
              {RULES.map((rule) => (
                <div key={rule.title} className={styles.ruleItem}>
                  <span className={styles.ruleTitle}>{rule.title}</span>
                  <span className={styles.ruleDesc}>{rule.desc}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
