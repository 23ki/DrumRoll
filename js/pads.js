/**
 * DrumRoll - リアルタイム演奏パッド ＆ キーボードコントローラー
 */
import { DRUM_TRACKS } from './audio.js';

export class DrumPads {
  constructor(containerEl, sequencer, synth) {
    this.container = containerEl;
    this.sequencer = sequencer;
    this.synth = synth;
    this.padElements = new Map(); // trackId => element

    this.initPads();
    this.setupKeyboard();
  }

  initPads() {
    this.container.innerHTML = '';

    // パッドの並び順（演奏しやすいように整列：上段にハット・シンバル・タム、下段にキック・スネア・クラップ）
    const padLayout = [
      'clhat', 'ophat', 'hitom', 'crash',
      'kick',  'snare', 'clap',  'lowtom'
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

      // タップ / クリックイベント（マルチタッチ対応）
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
    // シーケンサーに通知（即時発音 ＋ 録音中ならノート記録）
    this.sequencer.recordHit(trackId);

    // 視覚的エフェクト
    const el = this.padElements.get(trackId);
    if (el) {
      el.classList.add('hit');
      setTimeout(() => el.classList.remove('hit'), 100);
    }
  }

  setupKeyboard() {
    // キーマッピング作成
    const keyMap = {};
    DRUM_TRACKS.forEach(t => {
      keyMap[t.key.toLowerCase()] = t.id;
    });

    window.addEventListener('keydown', (e) => {
      // 入力フォームにフォーカスがあるときは無視
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
        return;
      }

      // スペースキーで再生/停止
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
