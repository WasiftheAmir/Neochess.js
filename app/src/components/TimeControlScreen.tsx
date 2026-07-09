import { useState } from 'react';
import { supabase } from '../supabase';
import type { PlayerColor, TimeControl } from '../types';
import styles from './LobbyScreen.module.css';
import tcStyles from './TimeControlScreen.module.css';

interface Props {
  playerName: string;
  onBack: () => void;
  onCreateChallenge: (
    roomCode: string,
    gameId: string,
    playerColor: PlayerColor,
    tc: TimeControl
  ) => void;
}

function generateRoomCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

const PRESETS = [
  { label: '1 min', value: '1+0' },
  { label: '3 min', value: '3+0' },
  { label: '3+2', value: '3+2' },
  { label: '10 min', value: '10+0' },
  { label: '15+10', value: '15+10' },
];

export default function TimeControlScreen({ playerName, onBack, onCreateChallenge }: Props) {
  const [preset, setPreset] = useState('3+0');
  const [color, setColor] = useState<'random' | 'white' | 'black'>('random');
  const [useCustom, setUseCustom] = useState(false);
  const [customMinutes, setCustomMinutes] = useState(10);
  const [customIncrement, setCustomIncrement] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const getTimeControl = (): TimeControl => {
    if (useCustom) {
      return { minutes: customMinutes || 10, increment: customIncrement || 0 };
    }
    const parts = preset.split('+');
    return { minutes: parseInt(parts[0], 10), increment: parts[1] ? parseInt(parts[1], 10) : 0 };
  };

  const handleCreate = async () => {
    setLoading(true);
    setError('');

    const tc = getTimeControl();
    const code = generateRoomCode();
    let hostColor: 'white' | 'black' = color === 'random'
      ? (Math.random() < 0.5 ? 'white' : 'black')
      : color;

    const tcMs = tc.minutes * 60000;
    const nowIso = new Date().toISOString();
    const insertData: Record<string, unknown> = {
      room_code: code,
      host_color: hostColor,
      time_control_minutes: tc.minutes,
      time_control_increment: tc.increment,
      clock_white_ms: tcMs,
      clock_black_ms: tcMs,
      turn_started_at: nowIso,
      status: 'waiting',
    };

    if (hostColor === 'white') {
      insertData.white_username = playerName;
    } else {
      insertData.black_username = playerName;
    }

    const { data, error: err } = await supabase
      .from('games')
      .insert(insertData)
      .select('id')
      .single();

    setLoading(false);

    if (err || !data) {
      setError('Failed to create game: ' + (err?.message ?? 'unknown error'));
      return;
    }

    const playerColor: PlayerColor = hostColor === 'white' ? 'w' : 'b';
    onCreateChallenge(code, data.id, playerColor, tc);
  };

  return (
    <div>
      {/* Brand */}
      <div className={styles.brand}>
        <h1 className={styles.title}>NeoChess</h1>
        <p className={styles.subtitle}>Play a Friend</p>
      </div>

      {/* Time preset */}
      <div className={tcStyles.formGroup}>
        <label className={tcStyles.label}>Time Control</label>
        <div className={tcStyles.presetRow}>
          {PRESETS.map((p) => (
            <button
              key={p.value}
              className={`${tcStyles.presetBtn} ${!useCustom && preset === p.value ? tcStyles.presetBtnActive : ''}`}
              onClick={() => { setPreset(p.value); setUseCustom(false); }}
              type="button"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Color selection */}
      <div className={tcStyles.formGroup}>
        <label className={tcStyles.label}>Your Color</label>
        <div className={tcStyles.colorRow}>
          {(['random', 'white', 'black'] as const).map((c) => (
            <button
              key={c}
              className={`${tcStyles.colorBtn} ${color === c ? tcStyles.colorBtnActive : ''}`}
              onClick={() => setColor(c)}
              type="button"
            >
              {c === 'random' ? '🎲 Random' : c === 'white' ? '♔ White' : '♚ Black'}
            </button>
          ))}
        </div>
      </div>

      {/* Custom time toggle */}
      <div className={tcStyles.formGroup}>
        <label className={tcStyles.checkboxRow}>
          <input
            type="checkbox"
            checked={useCustom}
            onChange={(e) => setUseCustom(e.target.checked)}
            className={tcStyles.checkbox}
          />
          <span>Custom Time Control</span>
        </label>
      </div>

      {useCustom && (
        <div className={tcStyles.customRow}>
          <div className={tcStyles.customField}>
            <label className={tcStyles.label}>Minutes</label>
            <input
              type="number"
              className={tcStyles.numberInput}
              value={customMinutes}
              min={1}
              max={180}
              onChange={(e) => setCustomMinutes(parseInt(e.target.value, 10) || 10)}
            />
          </div>
          <div className={tcStyles.customField}>
            <label className={tcStyles.label}>Increment (sec)</label>
            <input
              type="number"
              className={tcStyles.numberInput}
              value={customIncrement}
              min={0}
              max={60}
              onChange={(e) => setCustomIncrement(parseInt(e.target.value, 10) || 0)}
            />
          </div>
        </div>
      )}

      {error && <span className={styles.error}>{error}</span>}

      <div className={tcStyles.actionRow}>
        <button
          className={`${styles.btn} ${styles.btnPrimary}`}
          style={{ flex: 1 }}
          onClick={handleCreate}
          disabled={loading}
        >
          {loading ? 'Creating…' : 'Create Challenge Link'}
        </button>
        <button
          className={`${styles.btn} ${styles.btnSecondary}`}
          style={{ flex: 1 }}
          onClick={onBack}
          disabled={loading}
        >
          Back
        </button>
      </div>
    </div>
  );
}
