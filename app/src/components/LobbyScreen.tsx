import React, { useState, useRef } from 'react';
import GlassCard from './GlassCard';
import styles from './LobbyScreen.module.css';

interface Props {
  playerName: string;
  isJoinMode: boolean;
  roomCode: string | null;
  onNameChange: (name: string) => void;
  onPlayAI: (name: string) => void;
  onPlayFriend: (name: string) => void;
  onJoinGame: (name: string) => void;
  onRules: () => void;
}

export default function LobbyScreen({
  playerName,
  isJoinMode,
  roomCode,
  onNameChange,
  onPlayAI,
  onPlayFriend,
  onJoinGame,
  onRules,
}: Props) {
  const [name, setName] = useState(playerName);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const validate = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Please enter a username.');
      inputRef.current?.focus();
      return null;
    }
    setError('');
    onNameChange(trimmed);
    return trimmed;
  };

  const handlePlayAI = async () => {
    const trimmed = validate();
    if (!trimmed) return;
    setLoading(true);
    onPlayAI(trimmed);
  };

  const handlePlayFriend = () => {
    const trimmed = validate();
    if (!trimmed) return;
    onPlayFriend(trimmed);
  };

  const handleJoin = async () => {
    const trimmed = validate();
    if (!trimmed) return;
    setLoading(true);
    onJoinGame(trimmed);
  };

  return (
    <GlassCard>
      {/* Brand */}
      <div className={styles.brand}>
        <h1 className={styles.title}>NeoChess</h1>
        <p className={styles.subtitle}>
          {isJoinMode ? `Join Room: ${roomCode}` : 'A new kind of chess'}
        </p>
        {!isJoinMode && (
          <button className={styles.rulesLink} onClick={onRules}>
            How to play →
          </button>
        )}
      </div>

      {/* Username input */}
      <div className={styles.formGroup}>
        <input
          ref={inputRef}
          className={styles.input}
          type="text"
          placeholder="Enter a username"
          autoComplete="off"
          spellCheck={false}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              isJoinMode ? handleJoin() : handlePlayAI();
            }
          }}
        />
        {error && <span className={styles.error}>{error}</span>}
      </div>

      {/* Action buttons */}
      {isJoinMode ? (
        <div className={styles.buttonGroup}>
          <button
            className={`${styles.btn} ${styles.btnPrimary}`}
            style={{ width: '100%' }}
            onClick={handleJoin}
            disabled={loading}
          >
            {loading ? 'Joining…' : 'Join Game'}
          </button>
        </div>
      ) : (
        <div className={styles.buttonGroup}>
          <button
            className={`${styles.btn} ${styles.btnPrimary}`}
            onClick={handlePlayAI}
            disabled={loading}
          >
            {loading ? 'Loading…' : 'Play vs AI'}
          </button>
          <button
            className={`${styles.btn} ${styles.btnSecondary}`}
            onClick={handlePlayFriend}
            disabled={loading}
          >
            Play a Friend
          </button>
        </div>
      )}
    </GlassCard>
  );
}
