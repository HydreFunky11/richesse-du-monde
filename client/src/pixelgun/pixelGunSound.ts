// Procedural Web Audio synthesizer for Pixel Gun 3D
class PixelGunAudio {
  private ctx: AudioContext | null = null;
  private muted: boolean = false;

  constructor() {
    const saved = localStorage.getItem('pixelgun_muted');
    this.muted = saved === 'true';
  }

  private getCtx(): AudioContext | null {
    if (this.muted) return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  public toggleMute(): boolean {
    this.muted = !this.muted;
    localStorage.setItem('pixelgun_muted', String(this.muted));
    return this.muted;
  }

  public isMuted(): boolean {
    return this.muted;
  }

  // --- WEAPON SOUNDS ---

  public shoot() {
    const ctx = this.getCtx();
    if (!ctx) return;
    const t = ctx.currentTime;

    // 1. Noise burst (Gunpowder crack)
    const bufferSize = ctx.sampleRate * 0.08;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.02));
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(2400, t);
    noiseFilter.frequency.exponentialRampToValueAtTime(600, t + 0.07);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.35, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    noise.start(t);

    // 2. Punch / Low thump
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.exponentialRampToValueAtTime(45, t + 0.09);

    oscGain.gain.setValueAtTime(0.4, t);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);

    osc.connect(oscGain);
    oscGain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.09);
  }

  public hitmarker() {
    const ctx = this.getCtx();
    if (!ctx) return;
    const t = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1800, t);
    osc.frequency.setValueAtTime(2200, t + 0.03);

    gain.gain.setValueAtTime(0.18, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.07);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.07);
  }

  public headshot() {
    const ctx = this.getCtx();
    if (!ctx) return;
    const t = ctx.currentTime;

    // High pitch crisp bell ding
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(2600, t);
    osc1.frequency.exponentialRampToValueAtTime(3200, t + 0.12);

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(1300, t);
    osc2.frequency.exponentialRampToValueAtTime(1600, t + 0.12);

    gain.gain.setValueAtTime(0.28, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(t);
    osc2.start(t);
    osc1.stop(t + 0.18);
    osc2.stop(t + 0.18);
  }

  public targetDestroyed() {
    const ctx = this.getCtx();
    if (!ctx) return;
    const t = ctx.currentTime;

    // Voxel crumble burst
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(120, t);
    osc.frequency.exponentialRampToValueAtTime(30, t + 0.25);

    gain.gain.setValueAtTime(0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.25);
  }

  public reload() {
    const ctx = this.getCtx();
    if (!ctx) return;
    const t = ctx.currentTime;

    // Mechanical click 1
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'square';
    osc1.frequency.setValueAtTime(450, t);
    osc1.frequency.setValueAtTime(320, t + 0.04);
    gain1.gain.setValueAtTime(0.15, t);
    gain1.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(t);
    osc1.stop(t + 0.08);

    // Mechanical click 2 (slide release)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(800, t + 0.35);
    osc2.frequency.setValueAtTime(1100, t + 0.4);
    gain2.gain.setValueAtTime(0.18, t + 0.35);
    gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(t + 0.35);
    osc2.stop(t + 0.45);
  }

  public empty() {
    const ctx = this.getCtx();
    if (!ctx) return;
    const t = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(800, t);
    osc.frequency.exponentialRampToValueAtTime(300, t + 0.04);
    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.05);
  }

  public jump() {
    const ctx = this.getCtx();
    if (!ctx) return;
    const t = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(280, t + 0.12);
    gain.gain.setValueAtTime(0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.12);
  }

  public jumpPad() {
    const ctx = this.getCtx();
    if (!ctx) return;
    const t = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(220, t);
    osc.frequency.exponentialRampToValueAtTime(750, t + 0.2);
    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.25);
  }
}

export const pixelGunSound = new PixelGunAudio();
