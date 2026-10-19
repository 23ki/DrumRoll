/**
 * DrumRoll - ストレージ ＆ URL共有コントローラー
 */

export class StorageManager {
  constructor(sequencer) {
    this.sequencer = sequencer;
    this.storageKey = 'drumroll_project_v1';
  }

  /**
   * 現在のプロジェクトデータをシリアライズ
   */
  serialize() {
    return {
      bpm: this.sequencer.bpm,
      bars: this.sequencer.bars,
      beatsPerBar: this.sequencer.beatsPerBar,
      pattern: Object.fromEntries(this.sequencer.notes)
    };
  }

  /**
   * データをシーケンサーに反映
   */
  deserialize(data) {
    if (!data) return false;
    if (data.bpm) this.sequencer.setBpm(data.bpm);
    if (data.bars) this.sequencer.setBars(data.bars);
    if (data.beatsPerBar) this.sequencer.setBeatsPerBar(data.beatsPerBar);

    this.sequencer.notes.clear();
    if (data.pattern) {
      for (const [k, v] of Object.entries(data.pattern)) {
        this.sequencer.notes.set(k, v);
      }
    }
    if (this.sequencer.onNotesChange) {
      this.sequencer.onNotesChange();
    }
    return true;
  }

  /**
   * LocalStorageに保存
   */
  saveToLocalStorage() {
    try {
      const data = this.serialize();
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (e) {
      console.warn('LocalStorage save failed:', e);
    }
  }

  /**
   * LocalStorageから読み込み
   */
  loadFromLocalStorage() {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (raw) {
        const data = JSON.parse(raw);
        return this.deserialize(data);
      }
    } catch (e) {
      console.warn('LocalStorage load failed:', e);
    }
    return false;
  }

  /**
   * URLハッシュからロード（共有URL）
   */
  loadFromUrlHash() {
    try {
      const hash = window.location.hash;
      if (hash && hash.startsWith('#beat=')) {
        const base64 = hash.replace('#beat=', '');
        const jsonStr = decodeURIComponent(escape(atob(base64)));
        const data = JSON.parse(jsonStr);
        return this.deserialize(data);
      }
    } catch (e) {
      console.warn('Failed to parse URL hash beat data:', e);
    }
    return false;
  }

  /**
   * 共有用URLを生成
   */
  generateShareUrl() {
    const data = this.serialize();
    const jsonStr = JSON.stringify(data);
    const base64 = btoa(unescape(encodeURIComponent(jsonStr)));
    const url = new URL(window.location.href);
    url.hash = `beat=${base64}`;
    return url.toString();
  }
}
