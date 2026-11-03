import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class SynthGeneratorService {
  private isPlaying = false;
  private timerId: any = null;
  private step = 0;
  private bpm = 118;
  private audioCtx: AudioContext | null = null;
  private destinationNode: AudioNode | null = null;

  // Chord progression: Am7 - Fmaj7 - C - G
  private bassNotes = [55, 55, 55, 55, 43.65, 43.65, 43.65, 43.65, 65.4, 65.4, 65.4, 65.4, 49, 49, 49, 49]; // Hz
  private arpFrequencies = [
    220, 261.63, 329.63, 440, 523.25, 659.25, 880, 1046.5,
    174.61, 220, 261.63, 349.23, 440, 523.25, 698.46, 880,
    261.63, 329.63, 392, 523.25, 659.25, 783.99, 1046.5, 1318.5,
    196, 246.94, 293.66, 392, 493.88, 587.33, 783.99, 987.77
  ];

  public initialize(context: AudioContext, destination: AudioNode) {
    this.audioCtx = context;
    this.destinationNode = destination;
  }

  public start() {
    if (this.isPlaying || !this.audioCtx || !this.destinationNode) return;
    this.isPlaying = true;
    this.step = 0;

    const intervalMs = (60 / this.bpm / 4) * 1000; // 16th notes
    this.timerId = setInterval(() => {
      this.tick();
    }, intervalMs);
  }

  public stop() {
    if (!this.isPlaying) return;
    this.isPlaying = false;
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  public get active(): boolean {
    return this.isPlaying;
  }

  private tick() {
    if (!this.audioCtx || !this.destinationNode) return;
    const now = this.audioCtx.currentTime;
    const barStep = this.step % 16;
    const chordIndex = Math.floor((this.step % 64) / 16);

    // 1. Kick Drum (Steps 0, 4, 8, 12)
    if (barStep % 4 === 0) {
      this.triggerKick(now);
    }

    // 2. Snare / Clap (Steps 4, 12)
    if (barStep === 4 || barStep === 12) {
      this.triggerSnare(now);
    }

    // 3. Stereo Hi-Hats (every even 16th note, alternating left / right)
    if (barStep % 2 === 0) {
      const pan = barStep % 4 === 0 ? -0.55 : 0.55;
      this.triggerHiHat(now, barStep % 4 === 2, pan);
    }

    // 4. Bass synth (on every 16th note with syncopation)
    if (barStep % 2 === 0 || barStep === 7 || barStep === 11 || barStep === 15) {
      const bassFreq = this.bassNotes[chordIndex * 4 + (barStep % 4)];
      this.triggerBass(now, bassFreq);
    }

    // 5. Arpeggiator Lead with stereo ping-pong panning
    const arpFreq = this.arpFrequencies[this.step % this.arpFrequencies.length];
    const arpPan = Math.sin((this.step / 8) * Math.PI) * 0.8;
    this.triggerArp(now, arpFreq, arpPan);

    // 6. High sparkle shimmer (steps 3, 7, 11, 15)
    if (barStep % 4 === 3) {
      this.triggerHighShimmer(now);
    }

    this.step++;
  }

  private triggerKick(time: number) {
    if (!this.audioCtx || !this.destinationNode) return;
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();

    osc.frequency.setValueAtTime(140, time);
    osc.frequency.exponentialRampToValueAtTime(38, time + 0.12);

    gain.gain.setValueAtTime(1.0, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.28);

    osc.connect(gain);
    gain.connect(this.destinationNode);

    osc.start(time);
    osc.stop(time + 0.3);
  }

  private triggerSnare(time: number) {
    if (!this.audioCtx || !this.destinationNode) return;

    // Noise component
    const bufferSize = this.audioCtx.sampleRate * 0.15;
    const buffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = this.audioCtx.createBufferSource();
    whiteNoise.buffer = buffer;

    const filter = this.audioCtx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(1200, time);

    const gain = this.audioCtx.createGain();
    gain.gain.setValueAtTime(0.45, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.18);

    whiteNoise.connect(filter);
    filter.connect(gain);
    gain.connect(this.destinationNode);

    whiteNoise.start(time);
    whiteNoise.stop(time + 0.2);

    // Tone body
    const osc = this.audioCtx.createOscillator();
    const oscGain = this.audioCtx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(190, time);
    osc.frequency.exponentialRampToValueAtTime(80, time + 0.1);

    oscGain.gain.setValueAtTime(0.5, time);
    oscGain.gain.exponentialRampToValueAtTime(0.01, time + 0.12);

    osc.connect(oscGain);
    oscGain.connect(this.destinationNode);
    osc.start(time);
    osc.stop(time + 0.13);
  }

  private triggerHiHat(time: number, accent: boolean, panValue: number) {
    if (!this.audioCtx || !this.destinationNode) return;

    const bufferSize = this.audioCtx.sampleRate * 0.05;
    const buffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.8;
    }

    const noise = this.audioCtx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.audioCtx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(7500, time);

    const panner = this.audioCtx.createStereoPanner();
    panner.pan.setValueAtTime(panValue, time);

    const gain = this.audioCtx.createGain();
    gain.gain.setValueAtTime(accent ? 0.35 : 0.18, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + (accent ? 0.08 : 0.04));

    noise.connect(filter);
    filter.connect(panner);
    panner.connect(gain);
    gain.connect(this.destinationNode);

    noise.start(time);
    noise.stop(time + 0.09);
  }

  private triggerBass(time: number, freq: number) {
    if (!this.audioCtx || !this.destinationNode) return;

    const osc = this.audioCtx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, time);

    const filter = this.audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1100, time);
    filter.frequency.exponentialRampToValueAtTime(280, time + 0.16);

    const gain = this.audioCtx.createGain();
    gain.gain.setValueAtTime(0.38, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.2);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.destinationNode);

    osc.start(time);
    osc.stop(time + 0.22);
  }

  private triggerArp(time: number, freq: number, panValue: number) {
    if (!this.audioCtx || !this.destinationNode) return;

    const osc = this.audioCtx.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(freq, time);

    const filter = this.audioCtx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(freq * 1.5, time);
    filter.Q.value = 4.0;

    const panner = this.audioCtx.createStereoPanner();
    panner.pan.setValueAtTime(panValue, time);

    const gain = this.audioCtx.createGain();
    gain.gain.setValueAtTime(0.22, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.14);

    osc.connect(filter);
    filter.connect(panner);
    panner.connect(gain);
    gain.connect(this.destinationNode);

    osc.start(time);
    osc.stop(time + 0.15);
  }

  private triggerHighShimmer(time: number) {
    if (!this.audioCtx || !this.destinationNode) return;

    const osc = this.audioCtx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(9500 + Math.random() * 4000, time);

    const panner = this.audioCtx.createStereoPanner();
    panner.pan.setValueAtTime((Math.random() - 0.5) * 1.6, time);

    const gain = this.audioCtx.createGain();
    gain.gain.setValueAtTime(0.12, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.22);

    osc.connect(panner);
    panner.connect(gain);
    gain.connect(this.destinationNode);

    osc.start(time);
    osc.stop(time + 0.25);
  }
}
