/**
 * DrumRoll - MIDI ＆ WAV ＆ JSON エクスポートモジュール
 * 外部ライブラリ不要で直接バイナリ生成
 */
import { DRUM_TRACKS } from './audio.js';

export class Exporter {
  constructor(sequencer, synth) {
    this.sequencer = sequencer;
    this.synth = synth;
  }

  /**
   * Standard MIDI File (Format 0) を直接生成してダウンロード
   */
  exportMidi() {
    const ticksPerBeat = 480;
    const ticksPerStep = ticksPerBeat / this.sequencer.stepsPerBeat; // 120 ticks per 16th note

    // MIDIイベントの収集: { tick, type, note, velocity }
    const midiEvents = [];

    // トラック毎のノート
    for (const [trackId, list] of this.sequencer.notes.entries()) {
      const track = DRUM_TRACKS.find(t => t.id === trackId);
      if (!track) continue;

      list.forEach(item => {
        const startTick = item.step * ticksPerStep;
        const endTick = startTick + Math.floor(ticksPerStep * 0.8); // 80%の長さ
        const midiPitch = track.midi;
        const vel = Math.round((item.velocity || 0.9) * 127);

        // Note On (Channel 10 = 0x99)
        midiEvents.push({ tick: startTick, type: 'noteOn', note: midiPitch, vel });
        // Note Off (Channel 10 = 0x89)
        midiEvents.push({ tick: endTick, type: 'noteOff', note: midiPitch, vel: 0 });
      });
    }

    // 時間順にソート（同じtickならnoteOffを先に）
    midiEvents.sort((a, b) => {
      if (a.tick !== b.tick) return a.tick - b.tick;
      if (a.type === 'noteOff' && b.type === 'noteOn') return -1;
      if (a.type === 'noteOn' && b.type === 'noteOff') return 1;
      return 0;
    });

    // デルタタイムとバイト列の組み立て
    const trackBytes = [];

    // 1. テンポ設定 (Set Tempo メタイベント)
    // microseconds per beat = 60,000,000 / BPM
    const mpqn = Math.round(60000000 / this.sequencer.bpm);
    trackBytes.push(0x00); // delta time
    trackBytes.push(0xFF, 0x51, 0x03); // Meta event: Set Tempo, length 3
    trackBytes.push((mpqn >> 16) & 0xFF, (mpqn >> 8) & 0xFF, mpqn & 0xFF);

    // 2. 拍子設定 (Time Signature メタイベント)
    trackBytes.push(0x00); // delta time
    trackBytes.push(0xFF, 0x58, 0x04); // Meta event: Time Signature, length 4
    trackBytes.push(this.sequencer.beatsPerBar, 0x02, 0x18, 0x08); // numerator, denominator (2^2=4), clocks per metronome, 32nds per beat

    // 3. 各MIDIイベント
    let lastTick = 0;
    midiEvents.forEach(e => {
      const delta = e.tick - lastTick;
      lastTick = e.tick;

      // Variable length delta time
      trackBytes.push(...this.toVariableLength(delta));

      if (e.type === 'noteOn') {
        trackBytes.push(0x99, e.note, e.vel); // Channel 10 Note On
      } else {
        trackBytes.push(0x89, e.note, 0); // Channel 10 Note Off
      }
    });

    // 4. End of Track メタイベント
    trackBytes.push(0x00, 0xFF, 0x2F, 0x00);

    // ヘッダーチャンク (MThd)
    const headerChunk = [
      0x4D, 0x54, 0x68, 0x64, // "MThd"
      0x00, 0x00, 0x00, 0x06, // Chunk length (6 bytes)
      0x00, 0x00,             // Format 0
      0x00, 0x01,             // 1 track
      (ticksPerBeat >> 8) & 0xFF, ticksPerBeat & 0xFF // Division (480)
    ];

    // トラックチャンク (MTrk)
    const trackLen = trackBytes.length;
    const trackChunkHeader = [
      0x4D, 0x54, 0x72, 0x6B, // "MTrk"
      (trackLen >> 24) & 0xFF,
      (trackLen >> 16) & 0xFF,
      (trackLen >> 8) & 0xFF,
      trackLen & 0xFF
    ];

    const fullMidi = new Uint8Array([...headerChunk, ...trackChunkHeader, ...trackBytes]);
    const blob = new Blob([fullMidi], { type: 'audio/midi' });
    this.downloadFile(blob, `DrumRoll_Pattern_${this.sequencer.bpm}bpm.mid`);
  }

  toVariableLength(value) {
    let buffer = value & 0x7F;
    const bytes = [];
    while ((value >>= 7) > 0) {
      buffer <<= 8;
      buffer |= (value & 0x7F) | 0x80;
    }
    while (true) {
      bytes.push(buffer & 0xFF);
      if (buffer & 0x80) {
        buffer >>= 8;
      } else {
        break;
      }
    }
    return bytes;
  }

  /**
   * Web Audio OfflineAudioContext を使って高音質WAVファイルをレンダリング
   */
  async exportWav() {
    const totalSteps = this.sequencer.totalSteps;
    const stepDuration = this.sequencer.stepDuration;
    const totalDuration = (totalSteps * stepDuration) + 1.5; // 余韻 +1.5秒
    const sampleRate = 44100;

    const offlineCtx = new OfflineAudioContext(2, Math.ceil(totalDuration * sampleRate), sampleRate);

    // 全ノートをスケジュール
    for (const [trackId, list] of this.sequencer.notes.entries()) {
      list.forEach(note => {
        const time = note.step * stepDuration;
        this.synth.play(trackId, time, note.velocity, offlineCtx);
      });
    }

    const renderedBuffer = await offlineCtx.startRendering();
    const wavBlob = this.audioBufferToWav(renderedBuffer);
    this.downloadFile(wavBlob, `DrumRoll_Beat_${this.sequencer.bpm}bpm.wav`);
  }

  audioBufferToWav(buffer) {
    const numChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const format = 1; // PCM
    const bitDepth = 16;

    const left = buffer.getChannelData(0);
    const right = numChannels > 1 ? buffer.getChannelData(1) : left;

    const length = left.length * numChannels * 2;
    const arrayBuffer = new ArrayBuffer(44 + length);
    const view = new DataView(arrayBuffer);

    // RIFF identifier
    this.writeString(view, 0, 'RIFF');
    // file length
    view.setUint32(4, 36 + length, true);
    // RIFF type
    this.writeString(view, 8, 'WAVE');
    // format chunk identifier
    this.writeString(view, 12, 'fmt ');
    // format chunk length
    view.setUint32(16, 16, true);
    // sample format (raw)
    view.setUint16(20, format, true);
    // channel count
    view.setUint16(22, numChannels, true);
    // sample rate
    view.setUint32(24, sampleRate, true);
    // byte rate (sample rate * block align)
    view.setUint32(28, sampleRate * numChannels * 2, true);
    // block align (channel count * bytes per sample)
    view.setUint16(32, numChannels * 2, true);
    // bits per sample
    view.setUint16(34, bitDepth, true);
    // data chunk identifier
    this.writeString(view, 36, 'data');
    // data chunk length
    view.setUint32(40, length, true);

    // インターリーブPCM書き込み
    let offset = 44;
    for (let i = 0; i < left.length; i++) {
      let sampleL = Math.max(-1, Math.min(1, left[i]));
      let sampleR = Math.max(-1, Math.min(1, right[i]));

      view.setInt16(offset, sampleL < 0 ? sampleL * 0x8000 : sampleL * 0x7FFF, true);
      offset += 2;
      view.setInt16(offset, sampleR < 0 ? sampleR * 0x8000 : sampleR * 0x7FFF, true);
      offset += 2;
    }

    return new Blob([view], { type: 'audio/wav' });
  }

  writeString(view, offset, string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }

  /**
   * JSONプロジェクトファイルのダウンロード
   */
  exportJson() {
    const project = {
      version: '1.0',
      bpm: this.sequencer.bpm,
      bars: this.sequencer.bars,
      beatsPerBar: this.sequencer.beatsPerBar,
      pattern: Object.fromEntries(this.sequencer.notes)
    };
    const jsonStr = JSON.stringify(project, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
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
