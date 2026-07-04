import React from 'react';
import { motion } from 'framer-motion';

interface Props {
  message: string;
}

export default function ColorAssignmentOverlay({ message }: Props) {
  return (
    <motion.div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: 'calc(8 * var(--sq))',
        background: 'rgba(0, 0, 0, 0.88)',
        zIndex: 120,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '4px',
        pointerEvents: 'none',
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
    >
      <motion.span
        style={{
          fontSize: '20px',
          fontWeight: 700,
          color: '#ffffff',
          fontFamily: 'Inter, sans-serif',
          letterSpacing: '-0.02em',
        }}
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.85, opacity: 0 }}
        transition={{ duration: 0.35 }}
      >
        {message}
      </motion.span>
    </motion.div>
  );
}
