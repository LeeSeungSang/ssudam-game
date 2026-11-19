window.Ssudam = window.Ssudam || {};

(function (ns) {
  class SsudamAudio {
    constructor() {
      this.ctx = null;
      this.muted = false;
      this.unlocked = false;
      this._lastWarningAt = 0;
    }

    unlock() {
      if (this.muted) return;
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        this.ctx = new AudioCtx();
      }
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      this.unlocked = true;
    }

    toggleMute() {
      this.muted = !this.muted;
      if (!this.muted) {
        this.unlock();
        this._tone(580, 0.06, 'triangle', 0.08);
      }
      return this.muted;
    }

    _tone(freq, duration, type = 'sine', gainVal = 0.12, endFreq = null, delay = 0) {
      if (this.muted || !this.ctx || this.ctx.state !== 'running') return;
      const now = this.ctx.currentTime + delay;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);
      if (endFreq !== null) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(30, endFreq), now + duration);
      }
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(gainVal, now + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + duration + 0.02);
    }

    _noise(duration, gainVal = 0.12, filterFreq = 800, delay = 0) {
      if (this.muted || !this.ctx || this.ctx.state !== 'running') return;
      const sampleRate = this.ctx.sampleRate;
      const frameCount = Math.max(1, Math.floor(sampleRate * duration));
      const buffer = this.ctx.createBuffer(1, frameCount, sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < frameCount; i++) {
        data[i] = (Math.random() * 2 - 1) * (1 - i / frameCount);
      }
      const src = this.ctx.createBufferSource();
      src.buffer = buffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = filterFreq;
      const gain = this.ctx.createGain();
      const now = this.ctx.currentTime + delay;
      gain.gain.setValueAtTime(gainVal, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      src.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      src.start(now);
    }

    armExtend() {
      this._tone(240, 0.08, 'triangle', 0.07, 460);
    }

    grab(isPerson = false) {
      if (isPerson) {
        this._tone(280, 0.09, 'sawtooth', 0.09, 520);
        this._tone(620, 0.14, 'triangle', 0.08, 780, 0.05);
      } else {
        this._tone(340, 0.07, 'square', 0.07, 640);
      }
    }

    throwItem(power = 0.6) {
      const base = 260 + power * 180;
      this._tone(base, 0.13, 'sine', 0.1, base * 1.9);
      this._noise(0.09, 0.05, 1600);
    }

    binDeposit(comboCount = 1) {
      const pitchShift = Math.min(1.6, 1 + (comboCount - 1) * 0.055);
      this._tone(523.25 * pitchShift, 0.09, 'triangle', 0.12);
      this._tone(659.25 * pitchShift, 0.13, 'triangle', 0.12, null, 0.06);
    }

    humanBinSlam() {
      this._noise(0.18, 0.22, 420);
      this._tone(135, 0.16, 'sawtooth', 0.14, 58);
      this._tone(520, 0.12, 'triangle', 0.11, 780, 0.09);
    }

    yeetHomeRun() {
      this._tone(360, 0.28, 'sine', 0.12, 1250);
      this._tone(1180, 0.14, 'triangle', 0.11, 1760, 0.24);
    }

    innocentOops() {
      this._tone(380, 0.12, 'sawtooth', 0.1, 210);
      this._tone(240, 0.18, 'sawtooth', 0.09, 140, 0.11);
    }

    feverStart() {
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((f, idx) => {
        this._tone(f, 0.14, 'triangle', 0.12, null, idx * 0.065);
      });
    }

    warningBeep() {
      const now = performance.now();
      if (now - this._lastWarningAt < 1100) return;
      this._lastWarningAt = now;
      this._tone(740, 0.08, 'square', 0.05);
    }

    breakdown() {
      this._noise(0.42, 0.24, 950);
      this._tone(320, 0.45, 'sawtooth', 0.14, 68);
      this._tone(210, 0.4, 'square', 0.1, 48, 0.14);
    }

    stageClear() {
      const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5];
      notes.forEach((f, idx) => {
        this._tone(f, 0.18, 'triangle', 0.12, null, idx * 0.085);
      });
    }
  }

  ns.Audio = SsudamAudio;
})(window.Ssudam);
