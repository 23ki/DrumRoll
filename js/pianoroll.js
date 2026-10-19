/**
 * DrumRoll - ピアノロール描画 ＆ インタラクションコントローラー
 */
import { DRUM_TRACKS } from './audio.js';

export class PianoRoll {
  constructor(containerEl, sequencer, synth) {
    this.container = containerEl;
    this.sequencer = sequencer;
    this.synth = synth;

    this.trackHeadersEl = document.getElementById('track-headers');
    this.rulerTicksEl = document.getElementById('ruler-ticks');
    this.canvas = document.getElementById('grid-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.playheadEl = document.getElementById('playhead');

    // グリッド寸法設定
    this.stepWidth = 28; // 1ステップあたりの横幅 (px)
    this.trackHeight = 48; // 1トラックの高さ (px)

    this.isDragging = false;
    this.dragMode = null; // 'add' or 'remove'

    this.initTrackHeaders();
    this.setupEvents();
    this.render();
  }

  initTrackHeaders() {
    this.trackHeadersEl.innerHTML = '';
    DRUM_TRACKS.forEach(track => {
      const row = document.createElement('div');
      row.className = 'track-row-header';
      row.style.borderLeft = `4px solid ${track.color}`;
      row.innerHTML = `
        <div class="track-name-group">
          <span class="track-name">${track.name}</span>
        </div>
        <span class="track-pitch-note">${track.note}</span>
      `;

      // クリックで試聴
      row.addEventListener('click', () => {
        this.synth.init();
        this.synth.play(track.id, null, 1.0);
        row.style.background = 'var(--bg-elevated)';
        setTimeout(() => row.style.background = '', 120);
      });

      this.trackHeadersEl.appendChild(row);
    });
  }

  resize() {
    const totalSteps = this.sequencer.totalSteps;
    const totalWidth = totalSteps * this.stepWidth;
    const totalHeight = DRUM_TRACKS.length * this.trackHeight;

    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = totalWidth * dpr;
    this.canvas.height = totalHeight * dpr;
    this.canvas.style.width = `${totalWidth}px`;
    this.canvas.style.height = `${totalHeight}px`;

    this.ctx.resetTransform();
    this.ctx.scale(dpr, dpr);

    // ルーラー幅の調整
    const ruler = document.getElementById('ruler');
    if (ruler) {
      ruler.style.width = `${totalWidth}px`;
    }
    const loopMarker = document.getElementById('loop-marker');
    if (loopMarker) {
      loopMarker.style.width = `${totalWidth}px`;
    }

    this.renderRuler();
    this.render();
  }

  renderRuler() {
    this.rulerTicksEl.innerHTML = '';
    const totalSteps = this.sequencer.totalSteps;
    const stepsPerBeat = this.sequencer.stepsPerBeat;
    const beatsPerBar = this.sequencer.beatsPerBar;
    const stepsPerBar = stepsPerBeat * beatsPerBar;

    for (let step = 0; step < totalSteps; step += stepsPerBeat) {
      const beatNum = Math.floor(step / stepsPerBeat);
      const barNum = Math.floor(beatNum / beatsPerBar) + 1;
      const beatInBar = (beatNum % beatsPerBar) + 1;

      const tick = document.createElement('div');
      tick.style.position = 'absolute';
      tick.style.left = `${step * this.stepWidth}px`;
      tick.style.top = '0';
      tick.style.height = '100%';
      tick.style.display = 'flex';
      tick.style.alignItems = 'center';
      tick.style.paddingLeft = '4px';
      tick.style.fontSize = '10px';
      tick.style.fontWeight = beatInBar === 1 ? '700' : '400';
      tick.style.color = beatInBar === 1 ? 'var(--text-main)' : 'var(--text-dim)';
      tick.style.borderLeft = beatInBar === 1 ? '1px solid var(--border-light)' : '1px dashed var(--border-color)';

      if (beatInBar === 1) {
        tick.textContent = `${barNum}`;
      } else {
        tick.textContent = `.${beatInBar}`;
      }

      this.rulerTicksEl.appendChild(tick);
    }
  }

  render() {
    const totalSteps = this.sequencer.totalSteps;
    const totalWidth = totalSteps * this.stepWidth;
    const totalHeight = DRUM_TRACKS.length * this.trackHeight;

    this.ctx.clearRect(0, 0, totalWidth, totalHeight);

    // 1. 各トラックの背景行と横罫線
    DRUM_TRACKS.forEach((track, rowIndex) => {
      const y = rowIndex * this.trackHeight;
      // 交互に微かな背景色
      this.ctx.fillStyle = rowIndex % 2 === 0 ? '#161922' : '#12141a';
      this.ctx.fillRect(0, y, totalWidth, this.trackHeight);

      // 横罫線
      this.ctx.strokeStyle = '#282f40';
      this.ctx.lineWidth = 1;
      this.ctx.beginPath();
      this.ctx.moveTo(0, y + this.trackHeight);
      this.ctx.lineTo(totalWidth, y + this.trackHeight);
      this.ctx.stroke();
    });

    // 2. 縦罫線（拍・小節・16分グリッド）
    const stepsPerBeat = this.sequencer.stepsPerBeat;
    const stepsPerBar = stepsPerBeat * this.sequencer.beatsPerBar;

    for (let step = 0; step <= totalSteps; step++) {
      const x = step * this.stepWidth;
      this.ctx.beginPath();

      if (step % stepsPerBar === 0) {
        // 小節の区切り線
        this.ctx.strokeStyle = '#556585';
        this.ctx.lineWidth = 2;
      } else if (step % stepsPerBeat === 0) {
        // 拍の区切り線
        this.ctx.strokeStyle = '#374158';
        this.ctx.lineWidth = 1.2;
      } else {
        // 16分音符グリッド
        this.ctx.strokeStyle = '#1e2433';
        this.ctx.lineWidth = 1;
      }

      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, totalHeight);
      this.ctx.stroke();
    }

    // 3. 配置されているノートの描画
    DRUM_TRACKS.forEach((track, rowIndex) => {
      const notes = this.sequencer.notes.get(track.id) || [];
      const y = rowIndex * this.trackHeight;

      notes.forEach(note => {
        if (note.step < totalSteps) {
          const x = note.step * this.stepWidth;
          this.drawNote(x, y, this.stepWidth, this.trackHeight, track.id);
        }
      });
    });
  }

  drawNote(x, y, width, height, trackId) {
    const pad = 3;
    const radius = 5;
    const nx = x + pad;
    const ny = y + pad;
    const nw = width - (pad * 2);
    const nh = height - (pad * 2);

    // ドラムパーツに応じた発光グラデーションカラー
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

    // シャドウ（発光エフェクト）
    this.ctx.save();
    this.ctx.shadowColor = colors[0];
    this.ctx.shadowBlur = 8;
    this.ctx.fillStyle = grad;

    // 角丸矩形パス
    this.ctx.beginPath();
    this.ctx.roundRect(nx, ny, nw, nh, radius);
    this.ctx.fill();

    // 内側のハイライト枠線
    this.ctx.shadowBlur = 0;
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    this.ctx.lineWidth = 1;
    this.ctx.stroke();

    this.ctx.restore();
  }

  updatePlayhead(step) {
    if (this.playheadEl) {
      const x = step * this.stepWidth;
      this.playheadEl.style.transform = `translateX(${x}px)`;
    }
  }

  setupEvents() {
    // マウス / タッチ操作でノート配置
    const getGridPos = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;

      const x = clientX - rect.left;
      const y = clientY - rect.top;

      const step = Math.floor(x / this.stepWidth);
      const trackIndex = Math.floor(y / this.trackHeight);

      if (trackIndex >= 0 && trackIndex < DRUM_TRACKS.length && step >= 0 && step < this.sequencer.totalSteps) {
        return { track: DRUM_TRACKS[trackIndex], step };
      }
      return null;
    };

    const handlePointerDown = (e) => {
      this.synth.init();
      const pos = getGridPos(e);
      if (!pos) return;

      this.isDragging = true;
      const has = this.sequencer.hasNote(pos.track.id, pos.step);
      this.dragMode = has ? 'remove' : 'add';

      if (this.dragMode === 'add') {
        this.sequencer.addNote(pos.track.id, pos.step);
        this.synth.play(pos.track.id);
      } else {
        this.sequencer.removeNote(pos.track.id, pos.step);
      }
      this.render();
    };

    const handlePointerMove = (e) => {
      if (!this.isDragging) return;
      const pos = getGridPos(e);
      if (!pos) return;

      if (this.dragMode === 'add') {
        if (!this.sequencer.hasNote(pos.track.id, pos.step)) {
          this.sequencer.addNote(pos.track.id, pos.step);
          this.synth.play(pos.track.id);
          this.render();
        }
      } else if (this.dragMode === 'remove') {
        if (this.sequencer.hasNote(pos.track.id, pos.step)) {
          this.sequencer.removeNote(pos.track.id, pos.step);
          this.render();
        }
      }
    };

    const handlePointerUp = () => {
      this.isDragging = false;
      this.dragMode = null;
    };

    this.canvas.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('mouseup', handlePointerUp);

    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      handlePointerDown(e);
    }, { passive: false });

    window.addEventListener('touchmove', (e) => {
      if (this.isDragging) {
        e.preventDefault();
        handlePointerMove(e);
      }
    }, { passive: false });

    window.addEventListener('touchend', handlePointerUp);

    // ルーラーをクリックで再生位置ジャンプ
    const ruler = document.getElementById('ruler');
    ruler.addEventListener('click', (e) => {
      const rect = ruler.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const step = Math.max(0, Math.min(this.sequencer.totalSteps - 1, Math.floor(x / this.stepWidth)));
      this.sequencer.currentStep = step;
      this.updatePlayhead(step);
    });
  }
}
