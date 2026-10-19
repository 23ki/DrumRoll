/**
 * DrumRoll - 簡易ドラム打ち込みソフト All-in-One エンジン
 */

// 1拍あたりの内部解像度（Ticks）: 24 (16分音符=6, 8分3連符=8, 32分音符=3, 16分3連符=4 を割り切れる最小公倍数)
const TICKS_PER_BEAT = 24;

const DRUM_TRACKS = [
  { id: 'crash',   name: 'Crash',       shortName: 'CR', note: 'C#2', midi: 49, color: 'var(--pad-crash)',  key: ';' },
  { id: 'hitom',   name: 'High Tom',    shortName: 'HT', note: 'D2',  midi: 50, color: 'var(--pad-hitom)',  key: 'l' },
  { id: 'lowtom',  name: 'Low Tom',     shortName: 'LT', note: 'A1',  midi: 45, color: 'var(--pad-lowtom)', key: 'k' },
  { id: 'ophat',   name: 'Open Hat',    shortName: 'OH', note: 'A#1', midi: 46, color: 'var(--pad-ophat)',  key: 'j' },
  { id: 'clhat',   name: 'Closed Hat',  shortName: 'CH', note: 'F#1', midi: 42, color: 'var(--pad-clhat)',  key: 'f' },
  { id: 'clap',    name: 'Clap',        shortName: 'CP', note: 'D#1', midi: 39, color: 'var(--pad-clap)',   key: 'd' },
  { id: 'snare',   name: 'Snare',       shortName: 'SD', note: 'D1',  midi: 38, color: 'var(--pad-snare)',  key: 's' },
  { id: 'kick',    name: 'Kick',        shortName: 'BD', note: 'C1',  midi: 36, color: 'var(--pad-kick)',   key: 'a' },
];

/* ========================================================
   ★ プリセット編集ガイド ★
   --------------------------------------------------------
   内部タイムラインは 1拍 = 24 ticks です。
   【4/4拍子 (2小節 = 合計192 ticks) の位置の目安】
   ・1小節目
     1拍目 頭: 0  (裏: 12)
     2拍目 頭: 24 (裏: 36)
     3拍目 頭: 48 (裏: 60)
     4拍目 頭: 72 (裏: 84)
   ・2小節目
     1拍目 頭: 96  (裏: 108)
     2拍目 頭: 120 (裏: 132)
     3拍目 頭: 144 (裏: 156)
     4拍目 頭: 168 (裏: 180)
   ※16分音符は 6 ticks刻み (0, 6, 12, 18, 24...)
   ※8分3連符は 8 ticks刻み (0, 8, 16, 24...)
   ======================================================== */
const PRESETS = {
  basic8: {
    name: '王道8ビート',
    bpm: 120,
    gridResolution: 16,
    pattern: {
      crash: [0],
      kick: [0, 60, 96, 156],
      snare: [24, 72, 120, 168],
      clhat: [0, 12, 24, 36, 48, 60, 72, 84, 96, 108, 120, 132, 144, 156, 168, 180]
    }
  },
  dance: {
    name: 'ダンス風',
    bpm: 128,
    gridResolution: 16,
    pattern: {
      crash: [0],
      kick: [0, 24, 48, 72, 96, 120, 144, 168],
      clap: [24, 72, 120, 168],
      ophat: [12, 36, 60, 84, 108, 132, 156, 180]
    }
  },
  citypop: {
    name: 'シティポップ',
    bpm: 105,
    gridResolution: 16,
    pattern: {
      crash: [0],
      kick: [0, 42, 48, 96, 138, 144],
      snare: [24, 72, 120, 168],
      clhat: [0, 6, 12, 18, 24, 30, 36, 48, 54, 60, 66, 72, 78, 84, 90, 96, 102, 108, 114, 120, 126, 132, 144, 150, 156, 162, 168, 174, 180],
      ophat: [42, 138, 186]
    }
  },
  hiphop: {
    name: 'ヒップホップ',
    bpm: 140,
    gridResolution: 16,
    pattern: {
      kick: [0, 18, 72, 96, 150],
      snare: [48, 144],
      ophat: [24, 120],
      clhat: [0, 6, 12, 18, 24, 30, 36, 42, 48, 54, 60, 66, 72, 78, 84, 88, 92, 96, 102, 108, 114, 120, 126, 132, 138, 144, 150, 156, 162, 168, 174, 180, 184, 188]
    }
  },
  rock: {
    name: 'ロック',
    bpm: 175,
    gridResolution: 16,
    pattern: {
      crash: [0, 96],
      kick: [0, 24, 48, 72, 96, 120, 144, 168],
      snare: [12, 36, 60, 84, 108, 132, 156, 180],
      clhat: [0, 12, 24, 36, 48, 60, 72, 84, 96, 108, 120, 132, 144, 156, 168, 180]
    }
  },
  shuffle: {
    name: 'シャッフル',
    bpm: 95,
    gridResolution: 12,
    pattern: {
      kick: [0, 48, 96, 144],
      snare: [24, 72, 120, 168],
      clhat: [0, 16, 24, 40, 48, 64, 72, 88, 96, 112, 120, 136, 144, 160, 168, 184]
    }
  },
  latin: {
    name: 'ラテン風',
    bpm: 96,
    gridResolution: 16,
    pattern: {
      crash: [0],
      kick: [0, 24, 48, 72, 96, 120, 144, 168],
      snare: [18, 36, 66, 84, 114, 132, 162, 180],
      clhat: [0, 12, 24, 36, 48, 60, 72, 84, 96, 108, 120, 132, 144, 156, 168, 180]
    }
  },
  drumroll: {
    name: 'ドラムロール',
    bpm: 125,
    gridResolution: 16,
    pattern: {
      snare: [0, 12, 24, 36, 48, 54, 60, 66, 72, 75, 78, 81, 84, 87, 90, 93, 144, 150, 156, 162],
      hitom: [96, 102, 108, 114],
      lowtom: [120, 126, 132, 138],
      kick: [168],
      crash: [168]
    }
  }
};

/* ========================================================
   1. DrumSynth: Web Audio API アナログシンセ音源
   ======================================================== */
class DrumSynth {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.noiseBuffer = null;
  }

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

  createNoiseBuffer(context) {
    const bufferSize = context.sampleRate * 2;
    const buffer = context.createBuffer(1, bufferSize, context.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

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

  playKick(ctx, dest, t, vel) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.setValueAtTime(150, t);
    osc.frequency.exponentialRampToValueAtTime(38, t + 0.12);
    gain.gain.setValueAtTime(vel * 1.1, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

    osc.connect(gain);
    gain.connect(dest);
    osc.start(t);
    osc.stop(t + 0.42);

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

  playSnare(ctx, dest, t, vel) {
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

  playClap(ctx, dest, t, vel) {
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

  playMetronome(time, isAccent = false) {
    if (!this.ctx) return;
    const t = time !== null ? time : this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(isAccent ? 1600 : 1000, t);
    gain.gain.setValueAtTime(0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.035);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.04);
  }
}

/* ========================================================
   2. Sequencer: Ticks制 高精度スケジューラー
   ======================================================== */
class Sequencer {
  constructor(synth) {
    this.synth = synth;
    this.notes = new Map(); // trackId => Array<{ tick: number, velocity: number }>

    this.isPlaying = false;
    this.isRecording = false;
    this.isCountingIn = false;
    this.countInBars = 1; // 0 or 1
    this.metronomeEnabled = false;

    this.bpm = 120;
    this.beatsPerBar = 4;
    this.bars = 2;

    // 現在の再生位置 (Tick単位)
    this.currentTick = 0;
    this.nextTickTime = 0.0;
    this.playbackStartTime = null;
    this.timerId = null;

    this.lookaheadMs = 20.0;
    this.scheduleAheadTime = 0.08;

    // 現在選択中のグリッド解像度（8, 16, 32, 12, 24）
    this.gridResolution = 16;

    // 直近に入力されたヒットのキャッシュ（二重発音防止用）
    this.recentHits = new Map();

    this.onTickChange = null;
    this.onNotesChange = null; // (recordHistory = true) => {}
    this.onPlaybackStateChange = null;
    this.onStatusMessage = null;
    this.onCountInChange = null;

    this.clearPattern(false);
  }

  get totalTicks() {
    return this.bars * this.beatsPerBar * TICKS_PER_BEAT;
  }

  get tickDuration() {
    const secondsPerBeat = 60.0 / this.bpm;
    return secondsPerBeat / TICKS_PER_BEAT;
  }

  get ticksPerGrid() {
    switch (this.gridResolution) {
      case 8: return 12;
      case 16: return 6;
      case 32: return 3;
      case 12: return 8;
      case 24: return 4;
      default: return 6;
    }
  }

  clearPattern(recordHistory = true) {
    this.notes.clear();
    DRUM_TRACKS.forEach(t => this.notes.set(t.id, []));
    if (this.onNotesChange) this.onNotesChange(recordHistory);
  }

  hasNoteAt(trackId, targetTick) {
    const list = this.notes.get(trackId);
    if (!list) return false;
    return list.some(n => n.tick === targetTick);
  }

  addNote(trackId, tick, velocity = 0.9, recordHistory = true) {
    if (!this.notes.has(trackId)) {
      this.notes.set(trackId, []);
    }
    const list = this.notes.get(trackId);
    const existingIdx = list.findIndex(n => n.tick === tick);
    if (existingIdx === -1) {
      list.push({ tick, velocity });
      list.sort((a, b) => a.tick - b.tick);
      if (this.onNotesChange) this.onNotesChange(recordHistory);
    }
  }

  removeNoteAt(trackId, tick, recordHistory = true) {
    const list = this.notes.get(trackId);
    if (list) {
      const idx = list.findIndex(n => n.tick === tick);
      if (idx !== -1) {
        list.splice(idx, 1);
        if (this.onNotesChange) this.onNotesChange(recordHistory);
      }
    }
  }

  toggleNoteAtTick(trackId, tick, velocity = 0.9) {
    if (this.hasNoteAt(trackId, tick)) {
      this.removeNoteAt(trackId, tick, true);
    } else {
      this.addNote(trackId, tick, velocity, true);
      this.synth.play(trackId, null, velocity);
    }
  }

  /**
   * クオンタイズ：全トラックのノートを現在のグリッド目に吸着
   */
  quantize() {
    const step = this.ticksPerGrid;
    for (const [trackId, list] of this.notes.entries()) {
      const quantized = [];
      const seen = new Set();
      list.forEach(item => {
        let snapped = Math.round(item.tick / step) * step;
        if (snapped >= this.totalTicks) snapped = 0;
        if (!seen.has(snapped)) {
          seen.add(snapped);
          quantized.push({ tick: snapped, velocity: item.velocity });
        }
      });
      quantized.sort((a, b) => a.tick - b.tick);
      this.notes.set(trackId, quantized);
    }
    if (this.onNotesChange) this.onNotesChange(true);
    if (this.onStatusMessage) this.onStatusMessage(`クオンタイズを適用しました (1/${this.gridResolution})`);
  }

  /**
   * リアルタイム演奏・録音
   */
  recordHit(trackId, velocity = 0.9) {
    // 叩いた瞬間の発音
    this.synth.play(trackId, null, velocity);

    if (this.isPlaying && this.isRecording) {
      const audioCtx = this.synth.ctx;
      if (!audioCtx) return;

      // カウントイン中：本番第1拍(tick 0)の直前（半拍以内）に叩かれたフライング打鍵を救済
      if (this.isCountingIn) {
        if (this.playbackStartTime) {
          const beatSec = 60.0 / this.bpm;
          const timeUntilMain = this.playbackStartTime - audioCtx.currentTime;
          // カウントイン終了前 0.5拍以内なら本番 tick 0 のノートとして記録
          if (timeUntilMain <= beatSec * 0.5 && timeUntilMain > -0.05) {
            const targetTick = 0;
            const key = `${trackId}_${targetTick}`;
            this.recentHits.set(key, Date.now());
            this.addNote(trackId, targetTick, velocity);
          }
        }
        return;
      }

      // 基準開始時刻が未設定の場合は安全策として現在時刻から逆算
      if (this.playbackStartTime === null) {
        this.playbackStartTime = audioCtx.currentTime - (this.currentTick * this.tickDuration);
      }

      // レイテンシ補正（Web Audioの出力バッファ遅延と入力遅延を考慮、過補正を防ぐため上限40ms）
      const latencyCompensation = Math.min(0.04, (audioCtx.outputLatency || audioCtx.baseLatency || 0.02));
      const adjustedTime = audioCtx.currentTime - latencyCompensation;

      // 楽曲タイムライン上の経過秒数
      const elapsedSec = adjustedTime - this.playbackStartTime;
      const loopDuration = this.totalTicks * this.tickDuration;

      let songTime = elapsedSec % loopDuration;
      if (songTime < 0) songTime += loopDuration;

      // 正確なTick位置とグリッド吸着
      const rawTick = songTime / this.tickDuration;
      const grid = this.ticksPerGrid;
      let targetTick = Math.round(rawTick / grid) * grid;
      if (targetTick >= this.totalTicks) targetTick = 0;

      // 二重発音防止
      const key = `${trackId}_${targetTick}`;
      this.recentHits.set(key, Date.now());

      this.addNote(trackId, targetTick, velocity);
    }
  }

  start() {
    this.synth.init();
    if (this.isPlaying) return;

    this.isPlaying = true;
    if (this.currentTick >= this.totalTicks) {
      this.currentTick = 0;
    }
    const startAudioTime = this.synth.ctx.currentTime + 0.03;
    this.nextTickTime = startAudioTime;
    // tick 0 の絶対オーディオ時刻を同期
    this.playbackStartTime = startAudioTime - (this.currentTick * this.tickDuration);

    this.timerId = setInterval(() => this.scheduler(), this.lookaheadMs);

    if (this.onPlaybackStateChange) {
      this.onPlaybackStateChange(this.isPlaying, this.isRecording);
    }
    if (this.onStatusMessage) {
      this.onStatusMessage(this.isRecording ? '録音中...' : '再生中');
    }
  }

  stop(resetToStart = false) {
    const wasPlaying = this.isPlaying;
    this.isPlaying = false;
    this.isRecording = false;
    this.isCountingIn = false;
    this.playbackStartTime = null;

    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }

    if (resetToStart || !wasPlaying) {
      this.currentTick = 0;
    }

    if (this.onTickChange) {
      this.onTickChange(this.currentTick, this.totalTicks);
    }
    if (this.onPlaybackStateChange) {
      this.onPlaybackStateChange(this.isPlaying, this.isRecording);
    }
    if (this.onStatusMessage) {
      this.onStatusMessage(this.currentTick === 0 ? '停止 (先頭)' : '一時停止');
    }
  }

  togglePlay() {
    if (this.isPlaying) {
      this.stop(false);
    } else {
      this.start();
    }
  }

  /**
   * 録音ボタンのトグル（カウントイン対応）
   */
  toggleRecord() {
    if (this.isPlaying) {
      if (this.isRecording) {
        this.isRecording = false;
      } else {
        this.isRecording = true;
      }
      if (this.onPlaybackStateChange) {
        this.onPlaybackStateChange(this.isPlaying, this.isRecording);
      }
      return;
    }

    // 停止中からの録音開始
    this.synth.init();
    if (this.countInBars > 0) {
      this.startCountIn();
    } else {
      this.isRecording = true;
      this.start();
    }
  }

  startCountIn() {
    this.isPlaying = true;
    this.isRecording = true;
    this.isCountingIn = true;
    this.currentTick = 0;
    if (this.onPlaybackStateChange) {
      this.onPlaybackStateChange(this.isPlaying, this.isRecording);
    }

    const totalCountBeats = this.countInBars * this.beatsPerBar;
    let currentBeat = 0;
    const beatIntervalSec = 60.0 / this.bpm;
    const startTime = this.synth.ctx.currentTime + 0.05;

    for (let i = 0; i < totalCountBeats; i++) {
      const time = startTime + (i * beatIntervalSec);
      const isAccent = (i % this.beatsPerBar === 0);
      this.synth.playMetronome(time, isAccent);

      // UI表示タイマー
      const delay = Math.max(0, (time - this.synth.ctx.currentTime) * 1000);
      setTimeout(() => {
        if (!this.isPlaying || !this.isCountingIn) return;
        const countDisplay = (i % this.beatsPerBar) + 1;
        if (this.onCountInChange) this.onCountInChange(countDisplay);
        if (this.onStatusMessage) this.onStatusMessage(`カウントイン: ${countDisplay}`);
      }, delay);
    }

    // 本番第1拍(tick 0)が鳴る正確なオーディオ時刻に同期
    const mainStartTime = startTime + (totalCountBeats * beatIntervalSec);
    this.playbackStartTime = mainStartTime;

    // カウントイン完了タイマー
    const delayToMainStart = Math.max(0, (mainStartTime - this.synth.ctx.currentTime) * 1000);
    setTimeout(() => {
      if (!this.isPlaying || !this.isCountingIn) return;
      this.isCountingIn = false;
      if (this.onCountInChange) this.onCountInChange(null);
      this.nextTickTime = mainStartTime;
      this.timerId = setInterval(() => this.scheduler(), this.lookaheadMs);
      if (this.onStatusMessage) this.onStatusMessage('● 録音中...');
    }, delayToMainStart);
  }

  scheduler() {
    if (this.isCountingIn) return;

    while (this.nextTickTime < this.synth.ctx.currentTime + this.scheduleAheadTime) {
      this.scheduleTick(this.currentTick, this.nextTickTime);
      this.advanceTick();
    }
  }

  scheduleTick(tick, time) {
    const now = Date.now();

    // 1. 各トラックのノートを発音予約
    for (const [trackId, list] of this.notes.entries()) {
      const note = list.find(n => n.tick === tick);
      if (note) {
        // ★ 改善点1: 直近300ms以内に手動ヒットされたノートはシーケンサー側で重複発音しない！
        const key = `${trackId}_${tick}`;
        const lastHit = this.recentHits.get(key);
        if (!lastHit || (now - lastHit > 300)) {
          this.synth.play(trackId, time, note.velocity);
        }
      }
    }

    // 2. メトロノーム（拍頭: 24 ticksごと）
    if (this.metronomeEnabled && (tick % TICKS_PER_BEAT === 0)) {
      const beatNum = Math.floor(tick / TICKS_PER_BEAT);
      const isAccent = (beatNum % this.beatsPerBar === 0);
      this.synth.playMetronome(time, isAccent);
    }

    // 3. UIのプログレス更新
    const delayMs = Math.max(0, (time - this.synth.ctx.currentTime) * 1000);
    setTimeout(() => {
      if (this.isPlaying && this.onTickChange) {
        this.onTickChange(tick, this.totalTicks);
      }
    }, delayMs);
  }

  advanceTick() {
    // グリッド最小分解能単位（1 tickずつ進行）
    this.nextTickTime += this.tickDuration;
    this.currentTick = (this.currentTick + 1) % this.totalTicks;
  }

  setBpm(val) {
    this.bpm = Math.min(260, Math.max(40, Number(val) || 120));
  }

  setBars(val) {
    this.bars = Number(val) || 2;
    if (this.currentTick >= this.totalTicks) this.currentTick = 0;
    if (this.onNotesChange) this.onNotesChange();
  }

  setBeatsPerBar(val) {
    this.beatsPerBar = Number(val) || 4;
    if (this.currentTick >= this.totalTicks) this.currentTick = 0;
    if (this.onNotesChange) this.onNotesChange();
  }

  toggleMetronome() {
    this.metronomeEnabled = !this.metronomeEnabled;
    return this.metronomeEnabled;
  }
}

/* ========================================================
   3. PianoRoll: タイムライン＆グリッド描画
   ======================================================== */
class PianoRoll {
  constructor(containerEl, sequencer, synth) {
    this.container = containerEl;
    this.sequencer = sequencer;
    this.synth = synth;

    this.wrapperEl = document.getElementById('timeline-grid-wrapper');
    this.rulerTicksEl = document.getElementById('ruler-ticks');
    this.canvas = document.getElementById('grid-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.playheadEl = document.getElementById('playhead');

    // ★ 改善点4: ズーム倍率 (0.4倍 〜 3.0倍)
    this.baseBeatWidth = 112; 
    this.zoomScale = 1.0;
    this.trackHeight = 48;
    this.updateTrackHeight();

    this.isDragging = false;
    this.dragMode = null;
    this.hoverPos = null; // { trackId, tick }

    // ピンチズーム用変数
    this.pinchStartDistance = 0;
    this.pinchStartScale = 1.0;

    this.setupStaticTrackHeaders();
    this.setupEvents();
    this.setupZoomAndScroll();

    window.addEventListener('resize', () => {
      this.resize();
    });
  }

  get beatWidth() {
    return Math.round(this.baseBeatWidth * this.zoomScale);
  }

  get tickWidth() {
    return this.beatWidth / TICKS_PER_BEAT;
  }

  setZoom(scale) {
    const prevScale = this.zoomScale;
    this.zoomScale = Math.min(3.0, Math.max(0.4, scale));
    
    // スクロール位置を中心維持
    if (this.wrapperEl) {
      const scrollRatio = (this.wrapperEl.scrollLeft + (this.wrapperEl.clientWidth / 2)) / (this.sequencer.totalTicks * (this.baseBeatWidth * prevScale / TICKS_PER_BEAT));
      this.resize();
      const newTotalWidth = this.sequencer.totalTicks * this.tickWidth;
      this.wrapperEl.scrollLeft = (scrollRatio * newTotalWidth) - (this.wrapperEl.clientWidth / 2);
    } else {
      this.resize();
    }

    const textEl = document.getElementById('zoom-level-text');
    if (textEl) {
      textEl.textContent = `${Math.round(this.zoomScale * 100)}%`;
    }
  }

  zoomIn() {
    this.setZoom(this.zoomScale * 1.25);
  }

  zoomOut() {
    this.setZoom(this.zoomScale / 1.25);
  }

  setupZoomAndScroll() {
    // ズームボタン
    const btnIn = document.getElementById('btn-zoom-in');
    const btnOut = document.getElementById('btn-zoom-out');
    if (btnIn) btnIn.addEventListener('click', () => this.zoomIn());
    if (btnOut) btnOut.addEventListener('click', () => this.zoomOut());

    // ★ 改善点4: マウスホイール操作
    // 通常ホイール -> 左右スクロール
    // Shift + ホイール -> ズームイン / ズームアウト
    if (this.wrapperEl) {
      this.wrapperEl.addEventListener('wheel', (e) => {
        if (e.shiftKey) {
          e.preventDefault();
          if (e.deltaY < 0) {
            this.zoomIn();
          } else {
            this.zoomOut();
          }
        } else {
          // 通常ホイールで横スクロール
          if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
            e.preventDefault();
            this.wrapperEl.scrollLeft += e.deltaY;
          }
        }
      }, { passive: false });
    }
  }

  setupStaticTrackHeaders() {
    // HTML内の静的トラックヘッダーにクリック試聴イベントを確実にバインド
    const rows = document.querySelectorAll('.track-row-header');
    rows.forEach(row => {
      const trackId = row.dataset.track;
      row.addEventListener('click', () => {
        this.synth.init();
        this.synth.play(trackId, null, 1.0);
        row.style.background = 'var(--bg-elevated)';
        setTimeout(() => row.style.background = '', 120);
      });
    });
  }

  updateTrackHeight() {
    const computed = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--cell-height'));
    if (computed && !isNaN(computed)) {
      this.trackHeight = computed;
    }
  }

  resize() {
    this.updateTrackHeight();
    const totalTicks = this.sequencer.totalTicks;
    const totalWidth = totalTicks * this.tickWidth;
    const totalHeight = DRUM_TRACKS.length * this.trackHeight;

    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = totalWidth * dpr;
    this.canvas.height = totalHeight * dpr;
    this.canvas.style.width = `${totalWidth}px`;
    this.canvas.style.height = `${totalHeight}px`;

    this.ctx.resetTransform();
    this.ctx.scale(dpr, dpr);

    const ruler = document.getElementById('ruler');
    if (ruler) ruler.style.width = `${totalWidth}px`;
    const loopMarker = document.getElementById('loop-marker');
    if (loopMarker) loopMarker.style.width = `${totalWidth}px`;

    this.renderRuler();
    this.render();
  }

  renderRuler() {
    this.rulerTicksEl.innerHTML = '';
    const totalTicks = this.sequencer.totalTicks;
    const beatsPerBar = this.sequencer.beatsPerBar;

    for (let tick = 0; tick < totalTicks; tick += TICKS_PER_BEAT) {
      const beatNum = Math.floor(tick / TICKS_PER_BEAT);
      const barNum = Math.floor(beatNum / beatsPerBar) + 1;
      const beatInBar = (beatNum % beatsPerBar) + 1;

      const tickEl = document.createElement('div');
      tickEl.style.position = 'absolute';
      tickEl.style.left = `${tick * this.tickWidth}px`;
      tickEl.style.top = '0';
      tickEl.style.height = '100%';
      tickEl.style.display = 'flex';
      tickEl.style.alignItems = 'center';
      tickEl.style.paddingLeft = '4px';
      tickEl.style.fontSize = '10px';
      tickEl.style.fontWeight = beatInBar === 1 ? '700' : '400';
      tickEl.style.color = beatInBar === 1 ? 'var(--text-main)' : 'var(--text-dim)';
      tickEl.style.borderLeft = beatInBar === 1 ? '1px solid var(--border-light)' : '1px dashed var(--border-color)';
      tickEl.textContent = beatInBar === 1 ? `${barNum}` : `.${beatInBar}`;

      this.rulerTicksEl.appendChild(tickEl);
    }
  }

  render() {
    const totalTicks = this.sequencer.totalTicks;
    const totalWidth = totalTicks * this.tickWidth;
    const totalHeight = DRUM_TRACKS.length * this.trackHeight;

    this.ctx.clearRect(0, 0, totalWidth, totalHeight);

    // 1. 各トラックの背景行と横線
    DRUM_TRACKS.forEach((track, rowIndex) => {
      const y = rowIndex * this.trackHeight;
      this.ctx.fillStyle = rowIndex % 2 === 0 ? '#161922' : '#12141a';
      this.ctx.fillRect(0, y, totalWidth, this.trackHeight);

      this.ctx.strokeStyle = '#282f40';
      this.ctx.lineWidth = 1;
      this.ctx.beginPath();
      this.ctx.moveTo(0, y + this.trackHeight);
      this.ctx.lineTo(totalWidth, y + this.trackHeight);
      this.ctx.stroke();
    });

    // 2. ★ 改善点4: 選択中のグリッド幅に応じた縦グリッド線の描画
    const ticksPerGrid = this.sequencer.ticksPerGrid;
    const ticksPerBeat = TICKS_PER_BEAT;
    const ticksPerBar = ticksPerBeat * this.sequencer.beatsPerBar;

    for (let tick = 0; tick <= totalTicks; tick += ticksPerGrid) {
      const x = tick * this.tickWidth;
      this.ctx.beginPath();

      if (tick % ticksPerBar === 0) {
        // 小節線
        this.ctx.strokeStyle = '#556585';
        this.ctx.lineWidth = 2;
      } else if (tick % ticksPerBeat === 0) {
        // 拍線
        this.ctx.strokeStyle = '#374158';
        this.ctx.lineWidth = 1.2;
      } else {
        // サブグリッド線 (16分, 3連符, 32分など)
        this.ctx.strokeStyle = '#1e2433';
        this.ctx.lineWidth = 1;
      }

      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, totalHeight);
      this.ctx.stroke();
    }

    // 3. 配置ノートの描画
    const noteWidth = Math.max(16, ticksPerGrid * this.tickWidth);

    DRUM_TRACKS.forEach((track, rowIndex) => {
      const list = this.sequencer.notes.get(track.id) || [];
      const y = rowIndex * this.trackHeight;

      list.forEach(note => {
        if (note.tick < totalTicks) {
          const x = note.tick * this.tickWidth;
          this.drawNote(x, y, noteWidth, this.trackHeight, track.id);
        }
      });
    });

    // 4. ★ 改善点2: マウスホバー中のマス目（箱）のプレビューハイライト
    if (this.hoverPos && !this.isDragging) {
      const trackIdx = DRUM_TRACKS.findIndex(t => t.id === this.hoverPos.trackId);
      if (trackIdx !== -1) {
        const hx = this.hoverPos.tick * this.tickWidth;
        const hy = trackIdx * this.trackHeight;
        this.ctx.save();
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
        this.ctx.lineWidth = 1.5;
        this.ctx.fillRect(hx + 2, hy + 2, noteWidth - 4, this.trackHeight - 4);
        this.ctx.strokeRect(hx + 2, hy + 2, noteWidth - 4, this.trackHeight - 4);
        this.ctx.restore();
      }
    }
  }

  drawNote(x, y, width, height, trackId) {
    const pad = 3;
    const radius = 5;
    const nx = x + pad;
    const ny = y + pad;
    const nw = width - (pad * 2);
    const nh = height - (pad * 2);

    const colorMap = {
      kick:   ['#ef4444', '#b91c1c'],
      snare:  ['#3b82f6', '#1d4ed8'],
      clap:   ['#ec4899', '#be185d'],
      clhat:  ['#10b981', '#047857'],
      ophat:  ['#14b8a6', '#0f766e'],
      lowtom: ['#f59e0b', '#b45309'],
      hitom:  ['#fbbf24', '#d97706'],
      crash:  ['#a855f7', '#7e22ce']
    };

    const colors = colorMap[trackId] || ['#06b6d4', '#0891b2'];
    const grad = this.ctx.createLinearGradient(nx, ny, nx, ny + nh);
    grad.addColorStop(0, colors[0]);
    grad.addColorStop(1, colors[1]);

    this.ctx.save();
    this.ctx.shadowColor = colors[0];
    this.ctx.shadowBlur = 8;
    this.ctx.fillStyle = grad;

    this.ctx.beginPath();
    this.ctx.roundRect(nx, ny, nw, nh, radius);
    this.ctx.fill();

    this.ctx.shadowBlur = 0;
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    this.ctx.lineWidth = 1;
    this.ctx.stroke();

    this.ctx.restore();
  }

  updatePlayhead(tick) {
    if (this.playheadEl) {
      const x = tick * this.tickWidth;
      this.playheadEl.style.transform = `translateX(${x}px)`;
    }
  }

  setupEvents() {
    const getExistingNoteAtPos = (clientX, clientY) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      const trackIndex = Math.floor(y / this.trackHeight);

      if (trackIndex < 0 || trackIndex >= DRUM_TRACKS.length) return null;
      const track = DRUM_TRACKS[trackIndex];
      const list = this.sequencer.notes.get(track.id) || [];
      const noteWidth = Math.max(16, this.sequencer.ticksPerGrid * this.tickWidth);

      // 画面上に描画されている既存ノートの矩形とヒットテスト
      for (let i = list.length - 1; i >= 0; i--) {
        const note = list[i];
        const nx = note.tick * this.tickWidth;
        // ノートの表示枠内（＋少しのタップ余裕マージン）をクリックしたか判定
        if (x >= nx - 2 && x <= nx + noteWidth + 2) {
          return { track, note };
        }
      }
      return null;
    };

    const getGridPos = (clientX, clientY) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;

      const rawTick = x / this.tickWidth;
      const grid = this.sequencer.ticksPerGrid;
      const tick = Math.floor(rawTick / grid) * grid;
      const trackIndex = Math.floor(y / this.trackHeight);

      if (trackIndex >= 0 && trackIndex < DRUM_TRACKS.length && tick >= 0 && tick < this.sequencer.totalTicks) {
        return { track: DRUM_TRACKS[trackIndex], tick };
      }
      return null;
    };

    // ========================================================
    // PCマウス操作: 左クリック=単発配置/消去、右クリック=消しゴムドラッグ
    // ========================================================
    const handleMouseDown = (e) => {
      this.synth.init();
      const isRightClick = (e.button === 2);
      const isLeftClick = (e.button === 0);

      if (!isLeftClick && !isRightClick) return;

      const hitExisting = getExistingNoteAtPos(e.clientX, e.clientY);

      if (window.app && window.app.history) {
        window.app.history.pushState();
      }

      if (isRightClick) {
        // 右クリック: 消しゴムドラッグ開始
        this.isDragging = true;
        this.dragMode = 'remove';
        if (hitExisting) {
          this.sequencer.removeNoteAt(hitExisting.track.id, hitExisting.note.tick, false);
        } else {
          const pos = getGridPos(e.clientX, e.clientY);
          if (pos) this.sequencer.removeNoteAt(pos.track.id, pos.tick, false);
        }
      } else if (isLeftClick) {
        // 左クリック: 単発トグルのみ（ドラッグ連続配置は行わない）
        this.isDragging = false;
        this.dragMode = null;
        if (hitExisting) {
          this.sequencer.removeNoteAt(hitExisting.track.id, hitExisting.note.tick, false);
        } else {
          const pos = getGridPos(e.clientX, e.clientY);
          if (pos) {
            this.sequencer.addNote(pos.track.id, pos.tick, 0.9, false);
            this.synth.play(pos.track.id);
          }
        }
      }
      this.render();
    };

    const handleMouseMove = (e) => {
      const hitExisting = getExistingNoteAtPos(e.clientX, e.clientY);
      const pos = getGridPos(e.clientX, e.clientY);

      // マウスカーソル形状
      if (!this.isDragging) {
        if (hitExisting) {
          this.canvas.style.cursor = 'pointer';
        } else {
          this.canvas.style.cursor = 'crosshair';
        }
      }

      // ホバーハイライト
      if (pos && !hitExisting) {
        if (!this.hoverPos || this.hoverPos.trackId !== pos.track.id || this.hoverPos.tick !== pos.tick) {
          this.hoverPos = { trackId: pos.track.id, tick: pos.tick };
          this.render();
        }
      } else {
        if (this.hoverPos) {
          this.hoverPos = null;
          this.render();
        }
      }

      // 右クリックドラッグ消しゴムのみ連続処理
      if (this.isDragging && this.dragMode === 'remove') {
        if (hitExisting) {
          this.sequencer.removeNoteAt(hitExisting.track.id, hitExisting.note.tick, false);
          this.render();
        } else if (pos && this.sequencer.hasNoteAt(pos.track.id, pos.tick)) {
          this.sequencer.removeNoteAt(pos.track.id, pos.tick, false);
          this.render();
        }
      }
    };

    const handleMouseUp = () => {
      this.isDragging = false;
      this.dragMode = null;
    };

    this.canvas.addEventListener('mousedown', handleMouseDown);
    this.canvas.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    this.canvas.addEventListener('mouseleave', () => {
      if (this.hoverPos) {
        this.hoverPos = null;
        this.render();
      }
    });

    // ========================================================
    // スマホタッチ操作:
    // 1本指タップ = 配置/消去 (1回のみ確実に入力、青い選択や二重発火なし)
    // 1本指スワイプ = タイムライン左右移動 (ノーツは置かれない)
    // 2本指ピンチ = ズームイン/ズームアウト (ノーツは置かれない)
    // ========================================================
    let touchStartX = 0;
    let touchStartY = 0;
    let touchStartScrollLeft = 0;
    let isTouchSwiping = false;
    let isPinching = false;
    let pinchStartDistance = 0;
    let pinchStartScale = 1.0;

    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.synth.init();

      if (e.touches.length >= 2) {
        // 2本指ピンチ開始
        isPinching = true;
        isTouchSwiping = false;
        pinchStartDistance = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        pinchStartScale = this.zoomScale;
        return;
      }

      // 1本指タッチ開始
      isPinching = false;
      isTouchSwiping = false;
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
      touchStartScrollLeft = this.wrapperEl ? this.wrapperEl.scrollLeft : 0;
    }, { passive: false });

    window.addEventListener('touchmove', (e) => {
      if (isPinching && e.touches.length >= 2 && pinchStartDistance > 0) {
        e.preventDefault();
        const dist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        const ratio = dist / pinchStartDistance;
        this.setZoom(pinchStartScale * ratio);
        return;
      }

      if (e.touches.length === 1 && !isPinching) {
        const dx = e.touches[0].clientX - touchStartX;
        const dy = e.touches[0].clientY - touchStartY;

        // 6px超動いたらスワイプ移動と判定
        if (!isTouchSwiping && (Math.abs(dx) > 6 || Math.abs(dy) > 6)) {
          isTouchSwiping = true;
        }

        if (isTouchSwiping && this.wrapperEl) {
          e.preventDefault();
          this.wrapperEl.scrollLeft = touchStartScrollLeft - dx;
        }
      }
    }, { passive: false });

    window.addEventListener('touchend', (e) => {
      if (isPinching) {
        if (e.touches.length < 2) {
          isPinching = false;
          pinchStartDistance = 0;
        }
        return;
      }

      // スワイプ移動を行わずに指を離した ＝「タップ」！
      if (!isTouchSwiping && e.changedTouches.length > 0) {
        e.preventDefault();
        const touch = e.changedTouches[0];
        const hitExisting = getExistingNoteAtPos(touch.clientX, touch.clientY);

        if (window.app && window.app.history) {
          window.app.history.pushState();
        }

        if (hitExisting) {
          // 既存ノートの上をタップ → 削除
          this.sequencer.removeNoteAt(hitExisting.track.id, hitExisting.note.tick, false);
        } else {
          // 空き地をタップ → 配置
          const pos = getGridPos(touch.clientX, touch.clientY);
          if (pos) {
            this.sequencer.addNote(pos.track.id, pos.tick, 0.9, false);
            this.synth.play(pos.track.id);
          }
        }
        this.render();
      }

      isTouchSwiping = false;
    });

    window.addEventListener('touchcancel', () => {
      isTouchSwiping = false;
      isPinching = false;
      pinchStartDistance = 0;
    });

    // ★ 改善点2: ルーラークリックで位置変更＆その位置から再生できるように設定
    const ruler = document.getElementById('ruler');
    ruler.addEventListener('click', (e) => {
      const rect = ruler.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const rawTick = x / this.tickWidth;
      const grid = this.sequencer.ticksPerGrid;
      let tick = Math.round(rawTick / grid) * grid;
      tick = Math.max(0, Math.min(this.sequencer.totalTicks - 1, tick));

      this.sequencer.currentTick = tick;
      this.updatePlayhead(tick);
      if (this.sequencer.isPlaying) {
        // 再生中なら即座にその位置からスケジュール再同期
        const nextTime = this.synth.ctx.currentTime + 0.02;
        this.sequencer.nextTickTime = nextTime;
        this.sequencer.playbackStartTime = nextTime - (tick * this.sequencer.tickDuration);
      }
    });
  }
}

/* ========================================================
   4. DrumPads: リアルタイム演奏パッド
   ======================================================== */
class DrumPads {
  constructor(containerEl, sequencer, synth) {
    this.container = containerEl;
    this.sequencer = sequencer;
    this.synth = synth;
    this.padElements = new Map();

    this.initPads();
    this.setupKeyboard();
  }

  initPads() {
    this.container.innerHTML = '';
    // パッド配置:
    // 上段: open hat, low tom, high tom, crash
    // 下段: kick, snare, clap, closed hat
    const padLayout = [
      'ophat', 'lowtom', 'hitom', 'crash',
      'kick',  'snare',  'clap',  'clhat'
    ];

    padLayout.forEach(id => {
      const track = DRUM_TRACKS.find(t => t.id === id);
      if (!track) return;

      const pad = document.createElement('div');
      pad.className = 'pad-card';
      pad.style.setProperty('--pad-color', track.color);
      pad.dataset.trackId = track.id;

      pad.innerHTML = `
        <div class="pad-name">${track.name}</div>
        <div class="pad-note">${track.note}</div>
        <div class="pad-key">[ ${track.key.toUpperCase()} ]</div>
      `;

      const triggerPad = (e) => {
        e.preventDefault();
        this.synth.init();
        this.hitPad(track.id);
      };

      pad.addEventListener('mousedown', triggerPad);
      pad.addEventListener('touchstart', triggerPad, { passive: false });

      this.container.appendChild(pad);
      this.padElements.set(track.id, pad);
    });
  }

  hitPad(trackId) {
    this.sequencer.recordHit(trackId);
    const el = this.padElements.get(trackId);
    if (el) {
      el.classList.add('hit');
      setTimeout(() => el.classList.remove('hit'), 100);
    }
  }

  setupKeyboard() {
    const keyMap = {};
    DRUM_TRACKS.forEach(t => {
      keyMap[t.key.toLowerCase()] = t.id;
    });

    window.addEventListener('keydown', (e) => {
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
        return;
      }

      // Rキーで録音/録音停止（Ctrl/Meta/Altキーの組み合わせ時はブラウザ等のデフォルト操作を妨げない）
      if ((e.key === 'r' || e.key === 'R' || e.code === 'KeyR') && !e.ctrlKey && !e.metaKey && !e.altKey && !e.repeat) {
        e.preventDefault();
        if (this.onToggleRecord) {
          this.onToggleRecord();
        } else {
          this.synth.init();
          this.sequencer.toggleRecord();
        }
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        this.sequencer.togglePlay();
        return;
      }

      const key = e.key.toLowerCase();
      if (keyMap[key] && !e.repeat) {
        e.preventDefault();
        this.synth.init();
        this.hitPad(keyMap[key]);
      }
    });
  }
}

/* ========================================================
   5. Exporter: MIDI / WAV / JSON
   ======================================================== */
class Exporter {
  constructor(sequencer, synth) {
    this.sequencer = sequencer;
    this.synth = synth;
  }

  exportMidi() {
    const midiDivision = 480;
    // 1 tick = 24 ticks per beat なので、480 / 24 = 20 MIDI ticks
    const multiplier = midiDivision / TICKS_PER_BEAT;

    const midiEvents = [];
    for (const [trackId, list] of this.sequencer.notes.entries()) {
      const track = DRUM_TRACKS.find(t => t.id === trackId);
      if (!track) continue;

      list.forEach(item => {
        const startTick = item.tick * multiplier;
        const dur = Math.max(20, Math.floor(multiplier * (this.sequencer.ticksPerGrid * 0.75)));
        const endTick = startTick + dur;
        const vel = Math.round((item.velocity || 0.9) * 127);

        midiEvents.push({ tick: startTick, type: 'noteOn', note: track.midi, vel });
        midiEvents.push({ tick: endTick, type: 'noteOff', note: track.midi, vel: 0 });
      });
    }

    midiEvents.sort((a, b) => {
      if (a.tick !== b.tick) return a.tick - b.tick;
      if (a.type === 'noteOff' && b.type === 'noteOn') return -1;
      return 1;
    });

    const trackBytes = [];
    const mpqn = Math.round(60000000 / this.sequencer.bpm);
    trackBytes.push(0x00, 0xFF, 0x51, 0x03);
    trackBytes.push((mpqn >> 16) & 0xFF, (mpqn >> 8) & 0xFF, mpqn & 0xFF);

    trackBytes.push(0x00, 0xFF, 0x58, 0x04);
    trackBytes.push(this.sequencer.beatsPerBar, 0x02, 0x18, 0x08);

    let lastTick = 0;
    midiEvents.forEach(e => {
      const delta = e.tick - lastTick;
      lastTick = e.tick;
      trackBytes.push(...this.toVariableLength(delta));
      if (e.type === 'noteOn') {
        trackBytes.push(0x99, e.note, e.vel);
      } else {
        trackBytes.push(0x89, e.note, 0);
      }
    });

    trackBytes.push(0x00, 0xFF, 0x2F, 0x00);

    const headerChunk = [
      0x4D, 0x54, 0x68, 0x64,
      0x00, 0x00, 0x00, 0x06,
      0x00, 0x00,
      0x00, 0x01,
      (midiDivision >> 8) & 0xFF, midiDivision & 0xFF
    ];

    const tLen = trackBytes.length;
    const trackChunk = [
      0x4D, 0x54, 0x72, 0x6B,
      (tLen >> 24) & 0xFF, (tLen >> 16) & 0xFF, (tLen >> 8) & 0xFF, tLen & 0xFF,
      ...trackBytes
    ];

    const blob = new Blob([new Uint8Array([...headerChunk, ...trackChunk])], { type: 'audio/midi' });
    this.downloadFile(blob, `DrumRoll_${this.sequencer.bpm}bpm.mid`);
  }

  toVariableLength(val) {
    let buf = val & 0x7F;
    const bytes = [];
    while ((val >>= 7) > 0) {
      buf <<= 8;
      buf |= (val & 0x7F) | 0x80;
    }
    while (true) {
      bytes.push(buf & 0xFF);
      if (buf & 0x80) buf >>= 8;
      else break;
    }
    return bytes;
  }

  async exportWav() {
    const totalDuration = (this.sequencer.totalTicks * this.sequencer.tickDuration) + 1.5;
    const sampleRate = 44100;
    const offlineCtx = new OfflineAudioContext(2, Math.ceil(totalDuration * sampleRate), sampleRate);

    for (const [trackId, list] of this.sequencer.notes.entries()) {
      list.forEach(note => {
        const time = note.tick * this.sequencer.tickDuration;
        this.synth.play(trackId, time, note.velocity, offlineCtx);
      });
    }

    const rendered = await offlineCtx.startRendering();
    const wavBlob = this.audioBufferToWav(rendered);
    this.downloadFile(wavBlob, `DrumRoll_${this.sequencer.bpm}bpm.wav`);
  }

  audioBufferToWav(buffer) {
    const numChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const length = buffer.length * numChannels * 2;
    const ab = new ArrayBuffer(44 + length);
    const view = new DataView(ab);

    const writeStr = (offset, s) => {
      for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i));
    };

    writeStr(0, 'RIFF');
    view.setUint32(4, 36 + length, true);
    writeStr(8, 'WAVE');
    writeStr(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numChannels * 2, true);
    view.setUint16(32, numChannels * 2, true);
    view.setUint16(34, 16, true); // 16-bit
    writeStr(36, 'data');
    view.setUint32(40, length, true);

    const left = buffer.getChannelData(0);
    const right = numChannels > 1 ? buffer.getChannelData(1) : left;

    let offset = 44;
    for (let i = 0; i < buffer.length; i++) {
      let l = Math.max(-1, Math.min(1, left[i]));
      let r = Math.max(-1, Math.min(1, right[i]));
      view.setInt16(offset, l < 0 ? l * 0x8000 : l * 0x7FFF, true);
      offset += 2;
      view.setInt16(offset, r < 0 ? r * 0x8000 : r * 0x7FFF, true);
      offset += 2;
    }
    return new Blob([view], { type: 'audio/wav' });
  }

  exportJson() {
    const project = {
      version: '2.0',
      bpm: this.sequencer.bpm,
      bars: this.sequencer.bars,
      beatsPerBar: this.sequencer.beatsPerBar,
      pattern: Object.fromEntries(this.sequencer.notes)
    };
    const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' });
    this.downloadFile(blob, `DrumRoll_Project.json`);
  }

  downloadFile(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  }
}

/* ========================================================
   6. HistoryManager: アンドゥ (Undo) / リドゥ (Redo) 管理
   ======================================================== */
class HistoryManager {
  constructor(sequencer, maxHistory = 20) {
    this.sequencer = sequencer;
    this.maxHistory = maxHistory;
    this.undoStack = [];
    this.redoStack = [];

    this.btnUndo = document.getElementById('btn-undo');
    this.btnRedo = document.getElementById('btn-redo');

    this.setupListeners();
    this.updateButtons();
  }

  clonePattern() {
    const map = new Map();
    for (const [k, v] of this.sequencer.notes.entries()) {
      map.set(k, v.map(n => ({ ...n })));
    }
    return map;
  }

  pushState() {
    this.undoStack.push(this.clonePattern());
    if (this.undoStack.length > this.maxHistory) {
      this.undoStack.shift();
    }
    this.redoStack = []; // 新しい操作が入ったらリドゥはクリア
    this.updateButtons();
  }

  undo() {
    if (this.undoStack.length === 0) return;
    this.redoStack.push(this.clonePattern());

    const prevState = this.undoStack.pop();
    this.sequencer.notes = prevState;
    if (this.sequencer.onNotesChange) {
      this.sequencer.onNotesChange(false); // 履歴には再度プッシュしない
    }
    if (this.sequencer.onStatusMessage) {
      this.sequencer.onStatusMessage('元に戻しました (Undo)');
    }
    this.updateButtons();
  }

  redo() {
    if (this.redoStack.length === 0) return;
    this.undoStack.push(this.clonePattern());

    const nextState = this.redoStack.pop();
    this.sequencer.notes = nextState;
    if (this.sequencer.onNotesChange) {
      this.sequencer.onNotesChange(false);
    }
    if (this.sequencer.onStatusMessage) {
      this.sequencer.onStatusMessage('やり直しました (Redo)');
    }
    this.updateButtons();
  }

  updateButtons() {
    if (this.btnUndo) this.btnUndo.disabled = (this.undoStack.length === 0);
    if (this.btnRedo) this.btnRedo.disabled = (this.redoStack.length === 0);
  }

  setupListeners() {
    if (this.btnUndo) this.btnUndo.addEventListener('click', () => this.undo());
    if (this.btnRedo) this.btnRedo.addEventListener('click', () => this.redo());

    window.addEventListener('keydown', (e) => {
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const mod = isMac ? e.metaKey : e.ctrlKey;

      if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          this.redo();
        } else {
          this.undo();
        }
      } else if (mod && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        this.redo();
      }
    });
  }
}

/* ========================================================
   7. Storage & URL Share
   ======================================================== */
class StorageManager {
  constructor(sequencer) {
    this.sequencer = sequencer;
    this.storageKey = 'drumroll_project_v2';
  }

  serialize() {
    return {
      bpm: this.sequencer.bpm,
      bars: this.sequencer.bars,
      beatsPerBar: this.sequencer.beatsPerBar,
      pattern: Object.fromEntries(this.sequencer.notes)
    };
  }

  deserialize(data) {
    if (!data) return false;
    if (data.bpm) this.sequencer.setBpm(data.bpm);
    if (data.bars) this.sequencer.setBars(data.bars);
    if (data.beatsPerBar) this.sequencer.setBeatsPerBar(data.beatsPerBar);

    this.sequencer.notes.clear();
    DRUM_TRACKS.forEach(t => this.sequencer.notes.set(t.id, []));

    if (data.pattern) {
      for (const [k, v] of Object.entries(data.pattern)) {
        // v1 (stepベース) から v2 (tickベース) への自動移行互換
        const converted = v.map(item => {
          if (item.tick !== undefined) return item;
          return { tick: item.step * 6, velocity: item.velocity }; // 16分音符 step -> tick
        });
        this.sequencer.notes.set(k, converted);
      }
    }
    if (this.sequencer.onNotesChange) this.sequencer.onNotesChange();
    return true;
  }

  saveToLocalStorage() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.serialize()));
    } catch (e) {
      console.warn(e);
    }
  }

  loadFromLocalStorage() {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (raw) return this.deserialize(JSON.parse(raw));
    } catch (e) {
      console.warn(e);
    }
    return false;
  }

  loadFromUrlHash() {
    try {
      const hash = window.location.hash;
      if (hash && hash.startsWith('#beat=')) {
        const base64 = hash.replace('#beat=', '');
        const jsonStr = decodeURIComponent(escape(atob(base64)));
        return this.deserialize(JSON.parse(jsonStr));
      }
    } catch (e) {
      console.warn(e);
    }
    return false;
  }

  generateShareUrl() {
    const jsonStr = JSON.stringify(this.serialize());
    const base64 = btoa(unescape(encodeURIComponent(jsonStr)));
    const url = new URL(window.location.href);
    url.hash = `beat=${base64}`;
    return url.toString();
  }
}

/* ========================================================
   7. GuideManager: 動的トラッキング・ガイドシステム
   ======================================================== */
class GuideManager {
  constructor() {
    this.overlay = document.getElementById('guide-overlay');
    this.svg = document.getElementById('guide-svg');
    this.labelsContainer = document.getElementById('guide-labels-container');
    this.btnClose = document.getElementById('btn-close-guide');

    this.navBar = document.getElementById('guide-nav-bar');
    this.btnPrev = document.getElementById('guide-prev-step');
    this.btnNext = document.getElementById('guide-next-step');
    this.stepIndicator = document.getElementById('guide-step-indicator');

    this.isOpen = false;
    this.currentStep = 0;

    // ========================================================
    // ★ 使い方ガイドの解説文言（ここを自由に書き換えられます） ★
    // ========================================================
    this.targets = [
      {
        id: 'playback',
        selector: '.playback-controls',
        title: '▶️ 再生・録音',
        text: 'スペースキーで再生/停止。[R]キーまたは ● 録音ボタンを押せば、パッドやキーボードの演奏がそのままリアルタイムに記録されます。'
      },
      {
        id: 'transport',
        selector: '.transport-settings',
        title: '⏱️ テンポ・メトロノーム',
        text: 'BPM（テンポ）や拍子、小節数の変更ができます。メトロノームのON/OFFもここから。'
      },
      {
        id: 'headers',
        selector: '#track-headers',
        title: '🥁 ドラム試聴トラック',
        text: 'パーツ名をクリックするといつでも音色を試聴できます。'
      },
      {
        id: 'grid',
        selector: '#grid-container',
        title: '🎹 ピアノロール（打ち込み）',
        text: 'マスをクリック/タップしてノートを配置。右クリック/タップで消去。Shift+ホイールやピンチ操作でズームも可能です。'
      },
      {
        id: 'pads',
        selector: '#floating-pads',
        title: '⚡ リアルタイム演奏パッド',
        text: 'スマホはタップ、PCはキーボード [A, S, D, F / J, K, L, ;] で演奏。右上の [−] ボタンで折りたためます。'
      },
      {
        id: 'presets_export',
        selector: '#btn-presets-menu',
        title: '🎵 プリセット',
        text: 'よくあるドラムパターン（8ビートやロック等）を呼び出します。'
      }
    ];

    this.setupListeners();
  }

  setupListeners() {
    if (this.btnClose) {
      this.btnClose.addEventListener('click', (e) => {
        e.stopPropagation();
        this.close();
      });
    }

    if (this.overlay) {
      this.overlay.addEventListener('click', (e) => {
        if (e.target === this.overlay || e.target === this.svg) {
          this.close();
        }
      });
    }

    window.addEventListener('keydown', (e) => {
      if (!this.isOpen) return;
      if (e.key === 'Escape') {
        this.close();
      } else if (e.key === 'ArrowRight') {
        this.nextStep();
      } else if (e.key === 'ArrowLeft') {
        this.prevStep();
      }
    });

    if (this.btnPrev) {
      this.btnPrev.addEventListener('click', (e) => {
        e.stopPropagation();
        this.prevStep();
      });
    }
    if (this.btnNext) {
      this.btnNext.addEventListener('click', (e) => {
        e.stopPropagation();
        this.nextStep();
      });
    }

    window.addEventListener('resize', () => {
      if (this.isOpen) {
        this.render();
      }
    });
  }

  open() {
    this.isOpen = true;
    this.overlay.classList.remove('hide');
    this.currentStep = 0;
    this.render();
  }

  close() {
    this.isOpen = false;
    this.overlay.classList.add('hide');
  }

  nextStep() {
    if (this.currentStep < this.targets.length - 1) {
      this.currentStep++;
      this.render();
    } else {
      this.close();
    }
  }

  prevStep() {
    if (this.currentStep > 0) {
      this.currentStep--;
      this.render();
    }
  }

  /**
   * ★ 改善3: PCでもスマホでも常に1ステップずつフォーカスする洗練されたツアー形式
   */
  render() {
    if (!this.isOpen) return;

    this.svg.innerHTML = '';
    this.labelsContainer.innerHTML = '';

    if (this.stepIndicator) {
      this.stepIndicator.textContent = `${this.currentStep + 1} / ${this.targets.length}`;
    }
    if (this.btnPrev) {
      this.btnPrev.disabled = (this.currentStep === 0);
    }
    if (this.btnNext) {
      this.btnNext.textContent = this.currentStep === this.targets.length - 1 ? '完了 ✓' : '次へ ▶';
    }

    const item = this.targets[this.currentStep];
    const el = document.querySelector(item.selector);
    if (!el) return;

    const rect = el.getBoundingClientRect();

    // 1. 白色ハイライトボックス
    const hl = document.createElement('div');
    hl.className = 'guide-highlight-box';
    hl.style.left = `${rect.left - 4}px`;
    hl.style.top = `${rect.top - 4}px`;
    hl.style.width = `${rect.width + 8}px`;
    hl.style.height = `${rect.height + 8}px`;
    this.labelsContainer.appendChild(hl);

    // 2. 解説カード
    const card = document.createElement('div');
    card.className = 'guide-card';
    card.innerHTML = `
      <div class="guide-card-title">${item.title}</div>
      <div class="guide-card-text">${item.text}</div>
    `;
    this.labelsContainer.appendChild(card);

    // カードの配置位置計算
    const isNarrow = window.innerWidth <= 640;
    let cardX, cardY, anchorX, anchorY;

    if (isNarrow) {
      cardX = window.innerWidth * 0.05;
      card.style.width = '90vw';
      card.style.maxWidth = '90vw';

      // 画面上部なら下に、下部なら上に配置
      if (rect.bottom + 140 < window.innerHeight - 80) {
        cardY = rect.bottom + 14;
      } else {
        cardY = Math.max(65, rect.top - 140);
      }
    } else {
      card.style.maxWidth = '340px';

      // ★ ピアノロール（grid）の場合は画面中央あたりにきれいに配置！
      if (item.id === 'grid') {
        cardX = Math.round((window.innerWidth - 340) / 2);
        cardY = Math.round((window.innerHeight - 140) / 2);
        anchorX = cardX + 170;
        anchorY = rect.top + 30;
        this.drawWhiteLeaderLine(anchorX, anchorY, cardX, cardY);
      } else if (rect.bottom + 160 < window.innerHeight - 80) {
        // 下に空きがある
        cardY = rect.bottom + 24;
        cardX = Math.max(20, Math.min(window.innerWidth - 360, rect.left));
        anchorX = rect.left + (rect.width / 2);
        anchorY = rect.bottom + 4;
        this.drawWhiteLeaderLine(anchorX, anchorY, cardX, cardY);
      } else if (rect.top > 160) {
        // 上に空きがある
        cardY = rect.top - 140;
        cardX = Math.max(20, Math.min(window.innerWidth - 360, rect.left));
        anchorX = rect.left + (rect.width / 2);
        anchorY = rect.top - 4;
        this.drawWhiteLeaderLine(anchorX, anchorY, cardX, cardY);
      } else {
        // 横に配置
        cardY = Math.max(70, Math.min(window.innerHeight - 180, rect.top + 20));
        cardX = (rect.right + 360 < window.innerWidth) ? (rect.right + 20) : (rect.left + 20);
        anchorX = rect.right < window.innerWidth - 360 ? rect.right + 4 : rect.left + 4;
        anchorY = cardY + 20;
        this.drawWhiteLeaderLine(anchorX, anchorY, cardX, cardY);
      }

      // 画面外はみ出し防止の安全クリップ
      cardX = Math.max(20, Math.min(window.innerWidth - 360, cardX));
      cardY = Math.max(60, Math.min(window.innerHeight - 180, cardY));
    }

    card.style.left = `${cardX}px`;
    card.style.top = `${cardY}px`;
  }

  drawWhiteLeaderLine(x1, y1, cardX, cardY) {
    const targetX = cardX + 24;
    const targetY = cardY > y1 ? cardY : cardY + 70;
    const svgNs = 'http://www.w3.org/2000/svg';

    const midY = (y1 + targetY) / 2;
    const pathData = `M ${x1} ${y1} L ${x1} ${midY} L ${targetX} ${targetY}`;

    // 白色の実線・洗練されたライン
    const path = document.createElementNS(svgNs, 'path');
    path.setAttribute('d', pathData);
    path.setAttribute('stroke', '#ffffff');
    path.setAttribute('stroke-width', '1.5');
    path.setAttribute('fill', 'none');
    this.svg.appendChild(path);

    // 接続点の白丸
    const circle = document.createElementNS(svgNs, 'circle');
    circle.setAttribute('cx', x1);
    circle.setAttribute('cy', y1);
    circle.setAttribute('r', '3.5');
    circle.setAttribute('fill', '#ffffff');
    this.svg.appendChild(circle);
  }
}

/* ========================================================
   8. Application Core
   ======================================================== */
class App {
  constructor() {
    this.synth = new DrumSynth();
    this.sequencer = new Sequencer(this.synth);
    this.storage = new StorageManager(this.sequencer);
    this.exporter = new Exporter(this.sequencer, this.synth);

    this.initUI();
    this.history = new HistoryManager(this.sequencer, 20);
    this.initModules();
    this.setupListeners();
    this.loadInitialData();
  }

  initUI() {
    this.btnPlay = document.getElementById('btn-play');
    this.btnStop = document.getElementById('btn-stop');
    this.btnRecord = document.getElementById('btn-record');
    this.btnMetronome = document.getElementById('btn-metronome');
    this.btnQuantize = document.getElementById('btn-quantize');
    this.btnClear = document.getElementById('btn-clear');

    this.inputBpm = document.getElementById('input-bpm');
    this.selectBeats = document.getElementById('select-beats');
    this.selectBars = document.getElementById('select-bars');
    this.selectCountIn = document.getElementById('select-countin');

    this.iconPlay = document.getElementById('icon-play');
    this.iconPause = document.getElementById('icon-pause');

    this.floatingPads = document.getElementById('floating-pads');
    this.btnTogglePads = document.getElementById('btn-toggle-pads');
    this.btnMinimizePads = document.getElementById('btn-minimize-pads');

    this.statusMessage = document.getElementById('status-message');
    this.currentPosition = document.getElementById('current-position');
    this.recordStatus = document.getElementById('record-status');
    this.recIndicator = document.getElementById('rec-status-indicator');

    this.btnExportMenu = document.getElementById('btn-export-menu');
    this.exportDropdown = document.getElementById('export-dropdown');
    this.btnPresetsMenu = document.getElementById('btn-presets-menu');
    this.presetsDropdown = document.getElementById('presets-dropdown');
    this.btnGuide = document.getElementById('btn-guide');
  }

  initModules() {
    this.pianoRoll = new PianoRoll(
      document.getElementById('pianoroll-container'),
      this.sequencer,
      this.synth
    );

    this.pads = new DrumPads(
      document.getElementById('drum-pads'),
      this.sequencer,
      this.synth
    );
    this.pads.onToggleRecord = () => {
      this.synth.init();
      if (!this.sequencer.isRecording) {
        this.history.pushState();
      }
      this.sequencer.toggleRecord();
    };

    this.guide = new GuideManager();

    // シーケンサーコールバック
    this.sequencer.onTickChange = (tick, total) => {
      this.pianoRoll.updatePlayhead(tick);

      const ticksPerBeat = TICKS_PER_BEAT;
      const beatsPerBar = this.sequencer.beatsPerBar;
      const bar = Math.floor(tick / (ticksPerBeat * beatsPerBar)) + 1;
      const beat = (Math.floor(tick / ticksPerBeat) % beatsPerBar) + 1;
      const subTick = (tick % ticksPerBeat);
      this.currentPosition.textContent = `${bar}.${beat}.${subTick < 10 ? '0' : ''}${subTick}`;
    };

    this.sequencer.onCountInChange = (count) => {
      if (count !== null) {
        this.recordStatus.textContent = `⏱️ カウントイン: [ ${count} ]`;
        this.recordStatus.style.color = 'var(--accent-amber)';
      }
    };

    this.sequencer.onNotesChange = (recordHistory = true) => {
      this.pianoRoll.render();
      this.storage.saveToLocalStorage();
    };

    this.sequencer.onPlaybackStateChange = (isPlaying, isRecording) => {
      if (isPlaying) {
        this.btnPlay.classList.add('playing');
        this.iconPlay.style.display = 'none';
        this.iconPause.style.display = 'block';
      } else {
        this.btnPlay.classList.remove('playing');
        this.iconPlay.style.display = 'block';
        this.iconPause.style.display = 'none';
      }

      if (isRecording) {
        this.btnRecord.classList.add('recording');
        this.recIndicator.classList.add('active');
        this.recordStatus.textContent = '● 録音中：パッドまたはキーボードを叩くと記録されます';
        this.recordStatus.style.color = 'var(--accent-red)';
      } else {
        this.btnRecord.classList.remove('recording');
        this.recIndicator.classList.remove('active');
        this.recordStatus.textContent = 'リアルタイム演奏パッド (PCキー: A, S, D, F / J, K, L, ;)';
        this.recordStatus.style.color = 'var(--text-muted)';
      }
    };

    this.sequencer.onStatusMessage = (msg) => {
      if (this.statusMessage) this.statusMessage.textContent = msg;
    };
  }

  setupListeners() {
    this.btnPlay.addEventListener('click', () => {
      this.synth.init();
      this.sequencer.togglePlay();
    });

    // ★ 改善点2: 停止ボタン。1回押すと一時停止、もう1回押すまたは停止中なら先頭(0)に戻る！
    this.btnStop.addEventListener('click', () => {
      if (this.sequencer.isPlaying) {
        this.sequencer.stop(false);
      } else {
        this.sequencer.stop(true); // 先頭に戻る
      }
    });

    this.btnRecord.addEventListener('click', () => {
      this.synth.init();
      if (!this.sequencer.isRecording) {
        this.history.pushState(); // 録音前の状態を保存
      }
      this.sequencer.toggleRecord();
    });

    this.inputBpm.addEventListener('change', (e) => {
      this.sequencer.setBpm(e.target.value);
      this.storage.saveToLocalStorage();
    });

    this.selectBeats.addEventListener('change', (e) => {
      this.sequencer.setBeatsPerBar(e.target.value);
      this.pianoRoll.resize();
      this.storage.saveToLocalStorage();
    });

    this.selectBars.addEventListener('change', (e) => {
      this.sequencer.setBars(e.target.value);
      this.pianoRoll.resize();
      this.storage.saveToLocalStorage();
    });

    if (this.selectCountIn) {
      this.selectCountIn.addEventListener('change', (e) => {
        this.sequencer.countInBars = Number(e.target.value);
      });
    }

    this.btnMetronome.addEventListener('click', () => {
      this.synth.init();
      const active = this.sequencer.toggleMetronome();
      this.btnMetronome.classList.toggle('active', active);
    });

    // ★ 改善点4: グリッドボタン切り替え（8, 16, 32, 12(3連), 24(6連)）
    document.querySelectorAll('.grid-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.grid-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        const res = Number(e.target.dataset.grid);
        this.sequencer.gridResolution = res;
        this.pianoRoll.render();
        this.showStatus(`グリッド幅を 1/${res} に変更しました`);
      });
    });

    this.btnQuantize.addEventListener('click', () => {
      this.history.pushState();
      this.sequencer.quantize();
    });

    this.btnClear.addEventListener('click', () => {
      if (confirm('すべてのノートを消去しますか？')) {
        this.history.pushState();
        this.sequencer.clearPattern();
      }
    });

    // ★ 改善点3: 半透明パッドのトグル＆折りたたみ
    this.btnTogglePads.addEventListener('click', () => {
      const isHidden = this.floatingPads.classList.contains('hide');
      if (isHidden) {
        this.floatingPads.classList.remove('hide');
        this.floatingPads.classList.remove('minimized');
        this.btnTogglePads.classList.add('active');
      } else {
        this.floatingPads.classList.add('hide');
        this.btnTogglePads.classList.remove('active');
      }
    });

    this.btnMinimizePads.addEventListener('click', () => {
      const isMin = this.floatingPads.classList.toggle('minimized');
      this.btnMinimizePads.textContent = isMin ? '＋' : '−';
    });

    // プリセットメニュー
    if (this.btnPresetsMenu) {
      this.btnPresetsMenu.addEventListener('click', (e) => {
        e.stopPropagation();
        this.presetsDropdown.classList.toggle('show');
        if (this.exportDropdown) this.exportDropdown.classList.remove('show');
      });
    }

    // ガイド表示ボタン
    if (this.btnGuide) {
      this.btnGuide.addEventListener('click', () => {
        this.guide.open();
      });
    }

    document.querySelectorAll('.preset-item').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const key = e.currentTarget.dataset.preset;
        this.loadPreset(key);
        if (this.presetsDropdown) this.presetsDropdown.classList.remove('show');
      });
    });

    // エクスポートメニュー
    this.btnExportMenu.addEventListener('click', (e) => {
      e.stopPropagation();
      this.exportDropdown.classList.toggle('show');
      if (this.presetsDropdown) this.presetsDropdown.classList.remove('show');
    });

    window.addEventListener('click', () => {
      if (this.exportDropdown) this.exportDropdown.classList.remove('show');
      if (this.presetsDropdown) this.presetsDropdown.classList.remove('show');
    });

    document.getElementById('export-midi').addEventListener('click', () => {
      this.exporter.exportMidi();
      this.showStatus('MIDIファイルを書き出しました');
    });

    document.getElementById('export-wav').addEventListener('click', async () => {
      this.showStatus('WAVオーディオを生成中...');
      await this.exporter.exportWav();
      this.showStatus('WAVファイルを書き出しました');
    });

    document.getElementById('export-json').addEventListener('click', () => {
      this.exporter.exportJson();
      this.showStatus('プロジェクトJSONを保存しました');
    });

    document.getElementById('export-share-url').addEventListener('click', () => {
      const shareUrl = this.storage.generateShareUrl();
      navigator.clipboard.writeText(shareUrl).then(() => {
        this.showStatus('共有URLをクリップボードにコピーしました！');
        alert('共有URLをクリップボードにコピーしました！\nこのURLを開くとスマホやPCで同じパターンを復元できます。');
      }).catch(() => {
        prompt('以下のURLをコピーしてください:', shareUrl);
      });
    });

    const importInput = document.getElementById('import-json');
    importInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target.result);
          this.storage.deserialize(data);
          this.updateUiFromSequencer();
          this.showStatus('プロジェクトを読み込みました');
        } catch (err) {
          alert('ファイルの読み込みに失敗しました');
        }
      };
      reader.readAsText(file);
    });

    const unlockAudio = () => {
      this.synth.init();
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
    };
    window.addEventListener('click', unlockAudio);
    window.addEventListener('keydown', unlockAudio);
    window.addEventListener('touchstart', unlockAudio);

    window.addEventListener('resize', () => {
      this.pianoRoll.resize();
    });
  }

  loadPreset(key) {
    const preset = PRESETS[key];
    if (!preset) return;

    // 現在ノートが1つ以上ある場合は上書き警告を出す
    let hasAnyNotes = false;
    for (const list of this.sequencer.notes.values()) {
      if (list && list.length > 0) {
        hasAnyNotes = true;
        break;
      }
    }

    if (hasAnyNotes) {
      const ok = confirm(`プリセット『${preset.name}』を読み込みますか？\n現在配置されているノートは上書きされます。\n（※読み込み後も「↶ 戻す」や Ctrl+Z で元に戻せます）`);
      if (!ok) return;
    }

    // Undo履歴に保存
    this.history.pushState();

    // テンポと小節設定
    this.sequencer.setBpm(preset.bpm);
    this.sequencer.setBars(2);
    this.sequencer.setBeatsPerBar(4);
    if (preset.gridResolution) {
      this.sequencer.gridResolution = preset.gridResolution;
      // グリッドボタンの見た目を更新
      document.querySelectorAll('.grid-btn').forEach(btn => {
        btn.classList.toggle('active', Number(btn.dataset.grid) === preset.gridResolution);
      });
    }

    // パターンの展開
    this.sequencer.clearPattern(false);
    for (const [trackId, ticks] of Object.entries(preset.pattern)) {
      ticks.forEach(t => {
        this.sequencer.addNote(trackId, t, 0.9, false);
      });
    }

    this.updateUiFromSequencer();
    this.showStatus(`プリセット『${preset.name} (BPM ${preset.bpm})』を適用しました`);
  }

  loadInitialData() {
    const fromUrl = this.storage.loadFromUrlHash();
    if (!fromUrl) {
      const fromStorage = this.storage.loadFromLocalStorage();
      if (!fromStorage) {
        this.setDefaultBeat();
      }
    }
    this.updateUiFromSequencer();
    this.pianoRoll.resize();
  }

  setDefaultBeat() {
    // 2小節 = 48 ticks (1拍 = 24 ticks, 16分音符 = 6 ticks)
    // Kick: 1拍目(0), 3拍目裏(60)など
    const kicks = [0, 60, 96, 156];
    // Snare: 2拍目(24), 4拍目(72), 2小節目2拍目(120), 4拍目(168)
    const snares = [24, 72, 120, 168];
    // Closed Hat: 8分刻み (12 ticks ごと: 0, 12, 24, 36...)
    const clhats = [];
    for (let t = 0; t < 192; t += 12) {
      clhats.push(t);
    }
    const crashes = [0];

    kicks.forEach(t => this.sequencer.addNote('kick', t, 0.95));
    snares.forEach(t => this.sequencer.addNote('snare', t, 0.9));
    clhats.forEach(t => this.sequencer.addNote('clhat', t, 0.7));
    crashes.forEach(t => this.sequencer.addNote('crash', t, 0.8));
  }

  updateUiFromSequencer() {
    this.inputBpm.value = this.sequencer.bpm;
    this.selectBeats.value = this.sequencer.beatsPerBar;
    this.selectBars.value = this.sequencer.bars;
    this.pianoRoll.resize();
    this.pianoRoll.render();
  }

  showStatus(msg) {
    if (this.statusMessage) this.statusMessage.textContent = msg;
  }
}

// 起動
window.addEventListener('DOMContentLoaded', () => {
  window.app = new App();
});
