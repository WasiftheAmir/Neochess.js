import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './ResignConfirmModal.module.css';

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export default function ResignConfirmModal({ open, onClose, onConfirm }: Props) {
  // Close on Escape key
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
          transition={{ duration: 0.2 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.div
            className={`liquid-glass ${styles.card}`}
            initial={{ scale: 0.9, opacity: 0, y: 15 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          >
            <h2 className={styles.title}>Confirm Resignation</h2>
            <p className={styles.message}>
              Are you sure you want to resign? This will end the game and cannot be undone.
            </p>

            <div className={styles.actions}>
              <button className={styles.cancelBtn} onClick={onClose}>
                Keep Playing
              </button>
              <button
                className={styles.confirmBtn}
                onClick={() => {
                  onConfirm();
                  onClose();
                }}
              >
                Yes, Resign
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
