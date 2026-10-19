/**
 * DrumRoll - シーケンサー ＆ Web Audio Lookahead スケジューラー
 * テンポのヨレが一切生じないWeb Audioタイマー方式
 */

export class Sequencer {
  constructor(synth) {
    this.synth = synth;

    // パターンデータ: Map<string, Array<{step: number, velocity: number}>>
    // step は 1/16 音符単位（またはクオンタイズ最小分解能）
    this.notes = new Map();

    // 再生ステータス
    this.isPlaying = false;
    this.isRecording = false;
    this.metronomeEnabled = false;

    // テンポ・拍子
    this.bpm = 120;
    this.beatsPerBar = 4; // 4/4拍子
    this.bars = 2; // デフォルト2小節
    this.stepsPerBeat = 4; // 1拍 = 16分音符 4つ

    // スケジューリング管理
    this.lookaheadMs = 25.0; // チェック頻度 (ms)
    this.scheduleAheadTime = 0.1; // 先読みスケジュール時間 (秒)
    this.currentStep = 0;
    this.nextStepTime = 0.0;
    this.timerId = null;

    // 録音関連
    this.recordingStartTime = 0;
    this.countInBeats = 0; // カウントイン残り拍数

    // コールバック
    this.onStepChange = null; // (currentStep, totalSteps) => {}
    this.onNotesChange = null; // () => {}
    this.onPlaybackStateChange = null; // (isPlaying, isRecording) => {}
    this.onStatusMessage = null; // (msg) => {}

    this.clearPattern();
  }

  get totalSteps() {
    return this.bars * this.beatsPerBar * this.stepsPerBeat;
  }

  get stepDuration() {
    // 1ステップ（16分音符）の秒数
    const secondsPerBeat = 60.0 / this.bpm;
    return secondsPerBeat / this.stepsPerBeat;
  }

  clearPattern() {
    this.notes.clear();
    if (this.onNotesChange) this.onNotesChange();
  }

  /**
   * ノートの追加 / 削除切り替え
   */
  toggleNote(trackId, step, velocity = 0.9) {
    if (!this.notes.has(trackId)) {
      this.notes.set(trackId, []);
    }
    const trackNotes = this.notes.get(trackId);
    const existingIndex = trackNotes.findIndex(n => n.step === step);

    if (existingIndex >= 0) {
      // 既に存在する場合は削除
      trackNotes.splice(existingIndex, 1);
    } else {
      // 追加
      trackNotes.push({ step, velocity });
      trackNotes.sort((a, b) => a.step - b.step);
      // 試聴音を即時発音
      this.synth.play(trackId, null, velocity);
    }

    if (this.onNotesChange) this.onNotesChange();
  }

  hasNote(trackId, step) {
    const list = this.notes.get(trackId);
    return list ? list.some(n => n.step === step) : false;
  }

  addNote(trackId, step, velocity = 0.9) {
    if (!this.notes.has(trackId)) {
      this.notes.set(trackId, []);
    }
    const trackNotes = this.notes.get(trackId);
    if (!trackNotes.some(n => n.step === step)) {
      trackNotes.push({ step, velocity });
      trackNotes.sort((a, b) => a.step - b.step);
      if (this.onNotesChange) this.onNotesChange();
    }
  }

  removeNote(trackId, step) {
    const trackNotes = this.notes.get(trackId);
    if (trackNotes) {
      const idx = trackNotes.findIndex(n => n.step === step);
      if (idx >= 0) {
        trackNotes.splice(idx, 1);
        if (this.onNotesChange) this.onNotesChange();
      }
    }
  }

  /**
   * クオンタイズ処理
   * 録音などでずれたノートを直近のグリッドへ補正
   */
  quantize(gridResolution = 16) {
    const stepUnit = (16 / gridResolution);
    for (const [trackId, list] of this.notes.entries()) {
      const quantized = [];
      const seen = new Set();

      for (const item of list) {
        let snapped = Math.round(item.step / stepUnit) * stepUnit;
        if (snapped >= this.totalSteps) snapped = this.totalSteps - 1;
        if (!seen.has(snapped)) {
          seen.add(snapped);
          quantized.push({ step: snapped, velocity: item.velocity });
        }
      }
      this.notes.set(trackId, quantized);
    }
    if (this.onNotesChange) this.onNotesChange();
    if (this.onStatusMessage) this.onStatusMessage('クオンタイズを適用しました (1/' + gridResolution + ')');
  }

  /**
   * リアルタイムヒット時の処理（手動演奏または録音）
   */
  recordHit(trackId, velocity = 0.9) {
    this.synth.play(trackId, null, velocity);

    if (this.isPlaying && this.isRecording) {
      // 現在の再生時刻から最も近いステップを算出
      const audioCtx = this.synth.ctx;
      if (!audioCtx) return;

      const elapsed = audioCtx.currentTime - (this.nextStepTime - this.stepDuration);
      const fractionalStep = this.currentStep + (elapsed / this.stepDuration);
      let targetStep = Math.round(fractionalStep) % this.totalSteps;
      if (targetStep < 0) targetStep += this.totalSteps;

      this.addNote(trackId, targetStep, velocity);
    }
  }

  start() {
    this.synth.init();
    if (this.isPlaying) return;

    this.isPlaying = true;
    this.currentStep = 0;
    this.nextStepTime = this.synth.ctx.currentTime + 0.05;

    this.timerId = setInterval(() => this.scheduler(), this.lookaheadMs);

    if (this.onPlaybackStateChange) {
      this.onPlaybackStateChange(this.isPlaying, this.isRecording);
    }
    if (this.onStatusMessage) {
      this.onStatusMessage(this.isRecording ? '録音中...' : '再生中');
    }
  }

  stop() {
    this.isPlaying = false;
    this.isRecording = false;
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    this.currentStep = 0;

    if (this.onStepChange) {
      this.onStepChange(0, this.totalSteps);
    }
    if (this.onPlaybackStateChange) {
      this.onPlaybackStateChange(this.isPlaying, this.isRecording);
    }
    if (this.onStatusMessage) {
      this.onStatusMessage('停止');
    }
  }

  togglePlay() {
    if (this.isPlaying) {
      this.stop();
    } else {
      this.start();
    }
  }

  toggleRecord() {
    if (!this.isPlaying) {
      this.isRecording = true;
      this.start();
    } else {
      this.isRecording = !this.isRecording;
      if (this.onPlaybackStateChange) {
        this.onPlaybackStateChange(this.isPlaying, this.isRecording);
      }
      if (this.onStatusMessage) {
        this.onStatusMessage(this.isRecording ? '録音中...' : '再生中');
      }
    }
  }

  scheduler() {
    // スケジュール対象時間内のノートを予約発音
    while (this.nextStepTime < this.synth.ctx.currentTime + this.scheduleAheadTime) {
      this.scheduleStep(this.currentStep, this.nextStepTime);
      this.advanceStep();
    }
  }

  scheduleStep(step, time) {
    // 1. 各トラックのノートを発音予約
    for (const [trackId, list] of this.notes.entries()) {
      const note = list.find(n => n.step === step);
      if (note) {
        this.synth.play(trackId, time, note.velocity);
      }
    }

    // 2. メトロノーム発音予約 (拍の頭)
    if (this.metronomeEnabled && (step % this.stepsPerBeat === 0)) {
      const beatIndex = Math.floor(step / this.stepsPerBeat) % this.beatsPerBar;
      const isDownbeat = (beatIndex === 0);
      this.synth.playMetronome(time, isDownbeat);
    }

    // 3. UIのステップ更新通知（Web Audio時間に合わせてディスパッチ）
    const delayMs = Math.max(0, (time - this.synth.ctx.currentTime) * 1000);
    setTimeout(() => {
      if (this.isPlaying && this.onStepChange) {
        this.onStepChange(step, this.totalSteps);
      }
    }, delayMs);
  }

  advanceStep() {
    this.nextStepTime += this.stepDuration;
    this.currentStep = (this.currentStep + 1) % this.totalSteps;
  }

  setBpm(newBpm) {
    this.bpm = Math.min(260, Math.max(40, Number(newBpm) || 120));
  }

  setBars(newBars) {
    this.bars = Number(newBars) || 2;
    if (this.onNotesChange) this.onNotesChange();
  }

  setBeatsPerBar(newBeats) {
    this.beatsPerBar = Number(newBeats) || 4;
    if (this.onNotesChange) this.onNotesChange();
  }

  toggleMetronome() {
    this.metronomeEnabled = !this.metronomeEnabled;
    return this.metronomeEnabled;
  }
}
