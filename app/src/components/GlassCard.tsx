import React from 'react';
import styles from './GlassCard.module.css';

interface Props {
  children: React.ReactNode;
  maxWidth?: number | string;
  style?: React.CSSProperties;
  className?: string;
}

export default function GlassCard({ children, maxWidth = 400, style, className }: Props) {
  return (
    <div
      className={`${styles.card} ${className ?? ''}`}
      style={{ maxWidth, ...style }}
    >
      {children}
    </div>
  );
}
