/**
 * DrumRoll - Web Audio API 合成シンセエンジン
 * 外部音源ファイル一切不要。808/909ライクな高品質アナログシンセドラムを生成
 */

export const DRUM_TRACKS = [
  { id: 'crash',   name: 'Crash',       shortName: 'CR', note: 'C#2', midi: 49, color: 'var(--pad-crash)',  key: ';' },
  { id: 'hitom',   name: 'High Tom',    shortName: 'HT', note: 'D2',  midi: 50, color: 'var(--pad-hitom)',  key: 'l' },
  { id: 'lowtom',  name: 'Low Tom',     shortName: 'LT', note: 'A1',  midi: 45, color: 'var(--pad-lowtom)', key: 'k' },
  { id: 'ophat',   name: 'Open Hat',    shortName: 'OH', note: 'A#1', midi: 46, color: 'var(--pad-ophat)',  key: 'j' },
  { id: 'clhat',   name: 'Closed Hat',  shortName: 'CH', note: 'F#1', midi: 42, color: 'var(--pad-clhat)',  key: 'f' },
  { id: 'clap',    name: 'Clap',        shortName: 'CP', note: 'D#1', midi: 39, color: 'var(--pad-clap)',   key: 'd' },
  { id: 'snare',   name: 'Snare',       shortName: 'SD', note: 'D1',  midi: 38, color: 'var(--pad-snare)',  key: 's' },
  { id: 'kick',    name: 'Kick',        shortName: 'BD', note: 'C1',  midi: 36, color: 'var(--pad-kick)',   key: 'a' },
];

export class DrumSynth {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.noiseBuffer = null;
  }

  /**
   * オーディオコンテキストの初期化（ユーザー操作時に呼ぶ）
   */
  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      return;
    }
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AudioCtx();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(0.85, this.ctx.currentTime);
    this.masterGain.connect(this.ctx.destination);
    this.noiseBuffer = this.createNoiseBuffer(this.ctx);
  }

  /**
   * ノイズバッファの生成（スネア・ハット・クラッシュ・クラップ用）
   */
  createNoiseBuffer(context) {
    const bufferSize = context.sampleRate * 2; // 2秒分
    const buffer = context.createBuffer(1, bufferSize, context.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  /**
   * 指定したドラムを発音
   * @param {string} trackId - kick, snare, clap, etc.
   * @param {number} time - 発音時間（ctx.currentTimeベース。省略時は直ちに）
   * @param {number} velocity - 音量 0.0〜1.0
   * @param {BaseAudioContext} customCtx - WAV書き出し用のOfflineAudioContextなど
   */
  play(trackId, time = null, velocity = 0.9, customCtx = null) {
    const ctx = customCtx || this.ctx;
    if (!ctx) {
      this.init();
      return;
    }
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    const t = time !== null ? time : ctx.currentTime;
    const dest = customCtx ? customCtx.destination : this.masterGain;

    switch (trackId) {
      case 'kick':
        this.playKick(ctx, dest, t, velocity);
        break;
      case 'snare':
        this.playSnare(ctx, dest, t, velocity);
        break;
      case 'clap':
        this.playClap(ctx, dest, t, velocity);
        break;
      case 'clhat':
        this.playClosedHat(ctx, dest, t, velocity);
        break;
      case 'ophat':
        this.playOpenHat(ctx, dest, t, velocity);
        break;
      case 'lowtom':
        this.playTom(ctx, dest, t, velocity, 120, 65, 0.35);
        break;
      case 'hitom':
        this.playTom(ctx, dest, t, velocity, 200, 110, 0.28);
        break;
      case 'crash':
        this.playCrash(ctx, dest, t, velocity);
        break;
    }
  }

  // --- キック (バスドラム) ---
  playKick(ctx, dest, t, vel) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    // 急激なピッチエンベロープ (150Hz -> 38Hz)
    osc.frequency.setValueAtTime(150, t);
    osc.frequency.exponentialRampToValueAtTime(38, t + 0.12);

    // アンプエンベロープ
    gain.gain.setValueAtTime(vel * 1.1, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

    osc.connect(gain);
    gain.connect(dest);

    osc.start(t);
    osc.stop(t + 0.42);

    // クリックアタック音（輪郭強調）
    const clickOsc = ctx.createOscillator();
    const clickGain = ctx.createGain();
    clickOsc.type = 'triangle';
    clickOsc.frequency.setValueAtTime(400, t);
    clickOsc.frequency.exponentialRampToValueAtTime(80, t + 0.02);

    clickGain.gain.setValueAtTime(vel * 0.4, t);
    clickGain.gain.exponentialRampToValueAtTime(0.001, t + 0.02);

    clickOsc.connect(clickGain);
    clickGain.connect(dest);
    clickOsc.start(t);
    clickOsc.stop(t + 0.025);
  }

  // --- スネアドラム ---
  playSnare(ctx, dest, t, vel) {
    // 1. ノイズ成分 (スネアの響き線)
    const noise = ctx.createBufferSource();
    noise.buffer = this.noiseBuffer || this.createNoiseBuffer(ctx);

    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'highpass';
    noiseFilter.frequency.setValueAtTime(800, t);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(vel * 0.75, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, t + 0.22);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(dest);

    noise.start(t);
    noise.stop(t + 0.23);

    // 2. トーン成分 (胴鳴り)
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(190, t);
    osc.frequency.exponentialRampToValueAtTime(85, t + 0.09);

    oscGain.gain.setValueAtTime(vel * 0.7, t);
    oscGain.gain.exponentialRampToValueAtTime(0.01, t + 0.12);

    osc.connect(oscGain);
    oscGain.connect(dest);

    osc.start(t);
    osc.stop(t + 0.13);
  }

  // --- ハンドクラップ ---
  playClap(ctx, dest, t, vel) {
    // 3回の手のひら衝突パルス + 残響テール
    const pulseDelays = [0, 0.012, 0.024];
    pulseDelays.forEach((delay, idx) => {
      const isTail = idx === pulseDelays.length - 1;
      const noise = ctx.createBufferSource();
      noise.buffer = this.noiseBuffer || this.createNoiseBuffer(ctx);

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1200, t + delay);
      filter.Q.setValueAtTime(2.5, t + delay);

      const gain = ctx.createGain();
      const startT = t + delay;
      const dur = isTail ? 0.22 : 0.015;

      gain.gain.setValueAtTime(vel * (isTail ? 0.9 : 0.6), startT);
      gain.gain.exponentialRampToValueAtTime(0.005, startT + dur);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(dest);

      noise.start(startT);
      noise.stop(startT + dur + 0.01);
    });
  }

  // --- クローズハイハット ---
  playClosedHat(ctx, dest, t, vel) {
    const noise = ctx.createBufferSource();
    noise.buffer = this.noiseBuffer || this.createNoiseBuffer(ctx);

    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(8000, t);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vel * 0.7, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(dest);

    noise.start(t);
    noise.stop(t + 0.07);
  }

  // --- オープンハイハット ---
  playOpenHat(ctx, dest, t, vel) {
    const noise = ctx.createBufferSource();
    noise.buffer = this.noiseBuffer || this.createNoiseBuffer(ctx);

    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(7000, t);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vel * 0.75, t);
    gain.gain.exponentialRampToValueAtTime(0.005, t + 0.42);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(dest);

    noise.start(t);
    noise.stop(t + 0.45);
  }

  // --- タム (Low Tom / High Tom) ---
  playTom(ctx, dest, t, vel, startFreq, endFreq, decay) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(startFreq, t);
    osc.frequency.exponentialRampToValueAtTime(endFreq, t + decay);

    gain.gain.setValueAtTime(vel * 0.9, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + decay);

    osc.connect(gain);
    gain.connect(dest);

    osc.start(t);
    osc.stop(t + decay + 0.02);
  }

  // --- クラッシュシンバル ---
  playCrash(ctx, dest, t, vel) {
    const noise = ctx.createBufferSource();
    noise.buffer = this.noiseBuffer || this.createNoiseBuffer(ctx);

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(4500, t);
    filter.Q.setValueAtTime(1.2, t);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vel * 0.8, t);
    gain.gain.exponentialRampToValueAtTime(0.002, t + 1.4);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(dest);

    noise.start(t);
    noise.stop(t + 1.45);
  }

  // --- メトロノームクリック ---
  playMetronome(time, isAccent = false) {
    if (!this.ctx) return;
    const t = time !== null ? time : this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.ctx ? this.ctx.createGain() : this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(isAccent ? 1600 : 1000, t);

    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.035);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.04);
  }
}
