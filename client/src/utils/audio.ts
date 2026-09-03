// Web Audio API Sound Generator
// Generates rich, snappy, zero-latency procedural sound effects without any external files!

class SoundEffectsManager {
  private ctx: AudioContext | null = null;
  private muted: boolean = false;

  constructor() {
    // Check local storage for mute preference
    const saved = localStorage.getItem('game_sound_muted');
    this.muted = saved === 'true';
  }

  private getContext(): AudioContext | null {
    if (this.muted) return null;
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public toggleMute(): boolean {
    this.muted = !this.muted;
    localStorage.setItem('game_sound_muted', String(this.muted));
    return this.muted;
  }

  // 1. Tactile UI Click
  public click() {
    const ctx = this.getContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.04);

    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.04);
  }

  // 2. Card Snap / Play Card
  public playCard() {
    const ctx = this.getContext();
    if (!ctx) return;

    // Woosh noise + snap
    const bufferSize = ctx.sampleRate * 0.06;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1800, ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.06);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.06);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    noise.start();
  }

  // 3. Heavy Attack Impact / Explosion
  public attack() {
    const ctx = this.getContext();
    if (!ctx) return;

    // Deep punchy bass drop + noise burst
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(160, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 0.22);

    gain.gain.setValueAtTime(0.4, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.22);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.22);
  }

  // 4. Metallic Shield Block / Clang
  public shield() {
    const ctx = this.getContext();
    if (!ctx) return;

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'triangle';
    osc2.type = 'sine';

    osc1.frequency.setValueAtTime(820, ctx.currentTime);
    osc1.frequency.exponentialRampToValueAtTime(240, ctx.currentTime + 0.18);

    osc2.frequency.setValueAtTime(1240, ctx.currentTime);
    osc2.frequency.exponentialRampToValueAtTime(480, ctx.currentTime + 0.15);

    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.18);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start();
    osc2.start();
    osc1.stop(ctx.currentTime + 0.18);
    osc2.stop(ctx.currentTime + 0.18);
  }

  // 5. Magical Healing Chime
  public heal() {
    const ctx = this.getContext();
    if (!ctx) return;

    const notes = [440, 554, 659, 880]; // A major chord
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.04);

      gain.gain.setValueAtTime(0.15, ctx.currentTime + idx * 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.04 + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + idx * 0.04);
      osc.stop(ctx.currentTime + idx * 0.04 + 0.25);
    });
  }

  // 6. Dice Roll Rattle
  public dice() {
    const ctx = this.getContext();
    if (!ctx) return;

    const count = 5;
    for (let i = 0; i < count; i++) {
      const time = ctx.currentTime + i * 0.045;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(180 + Math.random() * 120, time);

      gain.gain.setValueAtTime(0.12, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.035);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(time);
      osc.stop(time + 0.035);
    }
  }

  // 7. Victory Fanfare
  public victory() {
    const ctx = this.getContext();
    if (!ctx) return;

    const chords = [
      { freq: 523.25, time: 0 },    // C5
      { freq: 659.25, time: 0.12 }, // E5
      { freq: 783.99, time: 0.24 }, // G5
      { freq: 1046.5, time: 0.38 }, // C6
    ];

    chords.forEach(({ freq, time }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + time);

      gain.gain.setValueAtTime(0.25, ctx.currentTime + time);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + time + 0.5);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + time);
      osc.stop(ctx.currentTime + time + 0.5);
    });
  }
}

export const soundFx = new SoundEffectsManager();
