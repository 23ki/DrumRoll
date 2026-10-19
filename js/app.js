/**
 * DrumRoll - メインアプリケーション
 */
import { DrumSynth } from './audio.js';
import { Sequencer } from './sequencer.js';
import { PianoRoll } from './pianoroll.js';
import { DrumPads } from './pads.js';
import { Exporter } from './export.js';
import { StorageManager } from './storage.js';

class App {
  constructor() {
    this.synth = new DrumSynth();
    this.sequencer = new Sequencer(this.synth);
    this.storage = new StorageManager(this.sequencer);
    this.exporter = new Exporter(this.sequencer, this.synth);

    this.initUI();
    this.initModules();
    this.setupListeners();
    this.loadInitialData();
  }

  initUI() {
    // ボタン要素のキャッシュ
    this.btnPlay = document.getElementById('btn-play');
    this.btnStop = document.getElementById('btn-stop');
    this.btnRecord = document.getElementById('btn-record');
    this.btnMetronome = document.getElementById('btn-metronome');
    this.btnQuantize = document.getElementById('btn-quantize');
    this.btnClear = document.getElementById('btn-clear');

    this.inputBpm = document.getElementById('input-bpm');
    this.selectBeats = document.getElementById('select-beats');
    this.selectBars = document.getElementById('select-bars');

    this.iconPlay = document.getElementById('icon-play');
    this.iconPause = document.getElementById('icon-pause');

    this.modePianoRoll = document.getElementById('mode-pianoroll');
    this.modeRealtime = document.getElementById('mode-realtime');
    this.viewPianoRoll = document.getElementById('view-pianoroll');
    this.viewRealtime = document.getElementById('view-realtime');

    this.statusMessage = document.getElementById('status-message');
    this.currentPosition = document.getElementById('current-position');
    this.recordStatus = document.getElementById('record-status');

    // ドロップダウン
    this.btnExportMenu = document.getElementById('btn-export-menu');
    this.exportDropdown = document.getElementById('export-dropdown');
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

    // シーケンサーコールバック
    this.sequencer.onStepChange = (step, total) => {
      this.pianoRoll.updatePlayhead(step);

      const stepsPerBeat = this.sequencer.stepsPerBeat;
      const beatsPerBar = this.sequencer.beatsPerBar;
      const bar = Math.floor(step / (stepsPerBeat * beatsPerBar)) + 1;
      const beat = (Math.floor(step / stepsPerBeat) % beatsPerBar) + 1;
      const tick = (step % stepsPerBeat) + 1;
      this.currentPosition.textContent = `${bar}.${beat}.0${tick}`;
    };

    this.sequencer.onNotesChange = () => {
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
        this.recordStatus.textContent = '● 録音中：パッドまたはキーボードを叩くと記録されます';
        this.recordStatus.style.color = 'var(--accent-red)';
      } else {
        this.btnRecord.classList.remove('recording');
        this.recordStatus.textContent = '録音待機中：● 録音ボタンを押すとカウント後に記録開始します';
        this.recordStatus.style.color = 'var(--text-muted)';
      }
    };

    this.sequencer.onStatusMessage = (msg) => {
      this.showStatus(msg);
    };
  }

  setupListeners() {
    // 再生 / 停止 / 録音
    this.btnPlay.addEventListener('click', () => {
      this.synth.init();
      this.sequencer.togglePlay();
    });

    this.btnStop.addEventListener('click', () => {
      this.sequencer.stop();
    });

    this.btnRecord.addEventListener('click', () => {
      this.synth.init();
      this.sequencer.toggleRecord();
    });

    // テンポ・小節設定
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

    // メトロノーム
    this.btnMetronome.addEventListener('click', () => {
      this.synth.init();
      const active = this.sequencer.toggleMetronome();
      this.btnMetronome.classList.toggle('active', active);
    });

    // クオンタイズ
    this.btnQuantize.addEventListener('click', () => {
      const activeGridBtn = document.querySelector('.grid-btn.active');
      const res = activeGridBtn ? Number(activeGridBtn.dataset.grid) : 16;
      this.sequencer.quantize(res);
    });

    // クリア
    this.btnClear.addEventListener('click', () => {
      if (confirm('配置されたすべてのノートを消去しますか？')) {
        this.sequencer.clearPattern();
        this.pianoRoll.render();
      }
    });

    // モード切替
    this.modePianoRoll.addEventListener('click', () => this.switchMode('pianoroll'));
    this.modeRealtime.addEventListener('click', () => this.switchMode('realtime'));

    // グリッド幅ボタン
    document.querySelectorAll('.grid-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.grid-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
      });
    });

    // 書き出しドロップダウン
    this.btnExportMenu.addEventListener('click', (e) => {
      e.stopPropagation();
      this.exportDropdown.classList.toggle('show');
    });

    window.addEventListener('click', () => {
      this.exportDropdown.classList.remove('show');
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

    // JSONインポート
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
          alert('プロジェクトの読み込みに失敗しました: 不正なファイル形式です');
        }
      };
      reader.readAsText(file);
    });

    // 初回ユーザーインタラクション時にAudioContext準備
    const unlockAudio = () => {
      this.synth.init();
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
    };
    window.addEventListener('click', unlockAudio);
    window.addEventListener('keydown', unlockAudio);
    window.addEventListener('touchstart', unlockAudio);

    // リサイズ対応
    window.addEventListener('resize', () => {
      this.pianoRoll.resize();
    });
  }

  switchMode(mode) {
    if (mode === 'pianoroll') {
      this.modePianoRoll.classList.add('active');
      this.modeRealtime.classList.remove('active');
      this.viewPianoRoll.classList.add('active');
      this.viewRealtime.classList.remove('active');
      this.pianoRoll.resize();
    } else {
      this.modePianoRoll.classList.remove('active');
      this.modeRealtime.classList.add('active');
      this.viewPianoRoll.classList.remove('active');
      this.viewRealtime.classList.add('active');
    }
  }

  loadInitialData() {
    // 1. URL共有パラメータがあるか確認
    const loadedFromUrl = this.storage.loadFromUrlHash();
    if (!loadedFromUrl) {
      // 2. LocalStorageから確認
      const loadedFromStorage = this.storage.loadFromLocalStorage();
      if (!loadedFromStorage) {
        // 3. 初回：定番のかっこいい8ビートパターンをセット！
        this.setDefaultBeat();
      }
    }

    this.updateUiFromSequencer();
    this.pianoRoll.resize();
  }

  setDefaultBeat() {
    // 定番のタイトな8ビート (2小節分 = 32ステップ)
    // Kick: 1拍目, 3拍目のウラ(ステップ10)など
    const kicks = [0, 10, 16, 26];
    // Snare: 2拍目, 4拍目 (ステップ4, 12, 20, 28)
    const snares = [4, 12, 20, 28];
    // Closed Hat: 8分刻み (0, 2, 4, 6, 8...)
    const clhats = [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30];
    // Crash: 1拍目頭
    const crashes = [0];

    kicks.forEach(s => this.sequencer.addNote('kick', s, 0.95));
    snares.forEach(s => this.sequencer.addNote('snare', s, 0.9));
    clhats.forEach(s => this.sequencer.addNote('clhat', s, 0.7));
    crashes.forEach(s => this.sequencer.addNote('crash', s, 0.8));
  }

  updateUiFromSequencer() {
    this.inputBpm.value = this.sequencer.bpm;
    this.selectBeats.value = this.sequencer.beatsPerBar;
    this.selectBars.value = this.sequencer.bars;
    this.pianoRoll.resize();
    this.pianoRoll.render();
  }

  showStatus(msg) {
    if (this.statusMessage) {
      this.statusMessage.textContent = msg;
    }
  }
}

// アプリ起動
window.addEventListener('DOMContentLoaded', () => {
  window.app = new App();
});
