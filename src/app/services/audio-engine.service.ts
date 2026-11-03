import { Injectable, signal } from '@angular/core';
import Hls from 'hls.js';
import { FREQUENCY_BANDS_24, FrequencyBand, Track } from '../models/audio.models';
import { SynthGeneratorService } from './synth-generator.service';

export interface ChannelAnalysis {
  bandLevels: number[]; // 24 values, 0.0 - 1.0
  peakLevels: number[]; // 24 values, 0.0 - 1.0
  rms: number;          // Overall channel level
}

@Injectable({
  providedIn: 'root'
})
export class AudioEngineService {
  private audioCtx: AudioContext | null = null;
  private audioElement: HTMLAudioElement;
  private mediaSourceNode: MediaElementAudioSourceNode | null = null;
  private synthBusNode: GainNode | null = null;
  private masterGainNode: GainNode | null = null;
  private splitterNode: ChannelSplitterNode | null = null;
  private mergerNode: ChannelMergerNode | null = null;
  private hls: Hls | null = null;

  private leftAnalyser: AnalyserNode | null = null;
  private rightAnalyser: AnalyserNode | null = null;
  private leftFreqBuffer: Uint8Array<ArrayBuffer> | null = null;
  private rightFreqBuffer: Uint8Array<ArrayBuffer> | null = null;

  // Peak hold state
  private leftPeaks: number[] = new Array(24).fill(0);
  private rightPeaks: number[] = new Array(24).fill(0);
  private leftPeakTimers: number[] = new Array(24).fill(0);
  private rightPeakTimers: number[] = new Array(24).fill(0);
  private lastAnalysisTime = 0;

  // Public state signals
  public readonly isPlaying = signal<boolean>(false);
  public readonly currentTime = signal<number>(0);
  public readonly duration = signal<number>(0);
  public readonly volume = signal<number>(0.85);
  public readonly isMuted = signal<boolean>(false);
  public readonly currentTrack = signal<Track | null>(null);
  public readonly queue = signal<Track[]>([]);
  public readonly queueIndex = signal<number>(0);
  public readonly isAudioContextRunning = signal<boolean>(false);

  // CD Player specific signals
  public readonly repeatMode = signal<'off' | 'all' | 'one'>('off');
  public readonly shuffle = signal<boolean>(false);
  public readonly timeMode = signal<'elapsed' | 'remain' | 'total'>('elapsed');
  public readonly trayOpen = signal<boolean>(false);

  private readonly fftSize = 4096;

  constructor(private synthGenerator: SynthGeneratorService) {
    this.audioElement = new Audio();
    this.audioElement.crossOrigin = 'anonymous';
    this.audioElement.preload = 'auto';

    this.setupAudioElementListeners();
    this.setupMediaSessionHandlers();
    this.setupGlobalKeyboardListeners();
  }

  private initAudioContext() {
    if (this.audioCtx) return;

    const AudioContextClass = typeof window !== 'undefined'
      ? (window.AudioContext || (window as any).webkitAudioContext)
      : null;

    if (!AudioContextClass) {
      return;
    }

    try {
      this.audioCtx = new AudioContextClass();
    } catch (e) {
      return;
    }

    this.masterGainNode = this.audioCtx.createGain();
    this.masterGainNode.gain.value = this.volume();

    this.splitterNode = this.audioCtx.createChannelSplitter(2);
    this.mergerNode = this.audioCtx.createChannelMerger(2);

    this.leftAnalyser = this.audioCtx.createAnalyser();
    this.leftAnalyser.fftSize = this.fftSize;
    this.leftAnalyser.smoothingTimeConstant = 0.65;
    this.leftAnalyser.minDecibels = -90;
    this.leftAnalyser.maxDecibels = -10;

    this.rightAnalyser = this.audioCtx.createAnalyser();
    this.rightAnalyser.fftSize = this.fftSize;
    this.rightAnalyser.smoothingTimeConstant = 0.65;
    this.rightAnalyser.minDecibels = -90;
    this.rightAnalyser.maxDecibels = -10;

    this.leftFreqBuffer = new Uint8Array(this.leftAnalyser.frequencyBinCount);
    this.rightFreqBuffer = new Uint8Array(this.rightAnalyser.frequencyBinCount);

    // Channel splitting and analyzer insertion:
    // Splitter output 0 (Left) -> leftAnalyser -> Merger input 0
    // Splitter output 1 (Right) -> rightAnalyser -> Merger input 1
    this.splitterNode.connect(this.leftAnalyser, 0);
    this.leftAnalyser.connect(this.mergerNode, 0, 0);

    this.splitterNode.connect(this.rightAnalyser, 1);
    this.rightAnalyser.connect(this.mergerNode, 0, 1);

    // Merger connects to Master Gain, then to speakers
    this.mergerNode.connect(this.masterGainNode);
    this.masterGainNode.connect(this.audioCtx.destination);

    // Synth generator input bus
    this.synthBusNode = this.audioCtx.createGain();
    this.synthBusNode.gain.value = 1.0;
    this.synthBusNode.connect(this.splitterNode);
    this.synthGenerator.initialize(this.audioCtx, this.synthBusNode);

    // HTML5 Audio Element connection
    try {
      this.mediaSourceNode = this.audioCtx.createMediaElementSource(this.audioElement);
      this.mediaSourceNode.connect(this.splitterNode);
    } catch (e) {
      console.warn('MediaElementSource already connected or error:', e);
    }

    this.isAudioContextRunning.set(this.audioCtx.state === 'running');
  }

  public async resumeContext(): Promise<void> {
    this.initAudioContext();
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      await this.audioCtx.resume();
      this.isAudioContextRunning.set(true);
    }
  }

  private setupAudioElementListeners() {
    this.audioElement.addEventListener('timeupdate', () => {
      this.currentTime.set(this.audioElement.currentTime);
      this.updatePositionState();
    });

    this.audioElement.addEventListener('durationchange', () => {
      this.duration.set(this.audioElement.duration || 0);
    });

    this.audioElement.addEventListener('ended', () => {
      this.handleTrackEnded();
    });

    this.audioElement.addEventListener('error', (e) => {
      console.error('Audio playback error:', e);
      if (this.currentTrack()?.source === 'radio') {
        console.warn('Live radio stream error, falling back to simulated broadcast:', this.currentTrack()?.title);
        this.synthGenerator.start();
        this.isPlaying.set(true);
      } else {
        this.isPlaying.set(false);
      }
    });
  }

  public async playTrack(track: Track): Promise<void> {
    this.currentTrack.set(track);
    await this.resumeContext();

    // Reset previous HLS instance if active
    if (this.hls) {
      this.hls.destroy();
      this.hls = null;
    }

    if (track.source === 'demo') {
      this.audioElement.pause();
      this.synthGenerator.start();
      this.isPlaying.set(true);
      this.updatePlaybackState('playing');
      this.duration.set(track.duration);
      this.currentTime.set(0);
      this.updateMediaSession(track);
      return;
    }

    // Stop synth if it was running
    this.synthGenerator.stop();

    if (track.streamUrl) {
      const isM3u8 = track.streamUrl.includes('.m3u8');

      if (isM3u8 && Hls.isSupported()) {
        try {
          this.hls = new Hls({
            enableWorker: true,
            lowLatencyMode: true
          });
          this.hls.loadSource(track.streamUrl);
          this.hls.attachMedia(this.audioElement);

          this.hls.on(Hls.Events.MANIFEST_PARSED, () => {
            this.audioElement.play().catch(err => {
              console.warn('HLS play error:', err);
              this.handlePlaybackFailure(track);
            });
          });

          this.hls.on(Hls.Events.ERROR, (_evt, data) => {
            if (data.fatal) {
              console.warn('Fatal HLS error:', data.details);
              this.handlePlaybackFailure(track);
            }
          });

          this.isPlaying.set(true);
          this.updatePlaybackState('playing');
          this.updateMediaSession(track);
        } catch (hlsErr) {
          console.warn('HLS initialization error:', hlsErr);
          this.handlePlaybackFailure(track);
        }
      } else {
        this.audioElement.src = track.streamUrl;
        try {
          await this.audioElement.play();
          this.isPlaying.set(true);
          this.updatePlaybackState('playing');
          this.updateMediaSession(track);
        } catch (err) {
          console.error('Failed to play audio stream:', err);
          this.handlePlaybackFailure(track);
        }
      }
    }
  }

  private handlePlaybackFailure(track: Track): void {
    if (track.source === 'radio') {
      console.warn('Falling back to synth broadcast preview for radio station:', track.title);
      this.synthGenerator.start();
      this.isPlaying.set(true);
      this.updatePlaybackState('playing');
    } else {
      this.isPlaying.set(false);
      this.updatePlaybackState('paused');
    }
  }

  public async togglePlay(): Promise<void> {
    await this.resumeContext();
    const track = this.currentTrack();

    if (!track) {
      // Default to demo track if queue is empty
      const demo = this.getDemoTracks()[0];
      await this.playTrack(demo);
      return;
    }

    if (this.isPlaying()) {
      this.pause();
    } else {
      if (track.source === 'demo' || (track.source === 'radio' && this.synthGenerator.active)) {
        this.synthGenerator.start();
        this.isPlaying.set(true);
        this.updatePlaybackState('playing');
      } else {
        try {
          await this.audioElement.play();
          this.isPlaying.set(true);
          this.updatePlaybackState('playing');
        } catch (e) {
          if (track.source === 'radio') {
            this.synthGenerator.start();
            this.isPlaying.set(true);
            this.updatePlaybackState('playing');
          }
        }
      }
    }
  }

  public pause(): void {
    if (this.currentTrack()?.source === 'demo' || this.synthGenerator.active) {
      this.synthGenerator.stop();
    }
    this.audioElement.pause();
    this.isPlaying.set(false);
    this.updatePlaybackState('paused');
  }

  public seek(seconds: number): void {
    if (this.currentTrack()?.source === 'demo') {
      this.currentTime.set(seconds);
    } else {
      this.audioElement.currentTime = seconds;
      this.currentTime.set(seconds);
    }
    this.updatePositionState();
  }

  public setVolume(vol: number): void {
    const clamped = Math.max(0, Math.min(1, vol));
    this.volume.set(clamped);
    if (this.masterGainNode) {
      this.masterGainNode.gain.setValueAtTime(this.isMuted() ? 0 : clamped, this.audioCtx?.currentTime || 0);
    }
  }

  public toggleMute(): void {
    const nextMuted = !this.isMuted();
    this.isMuted.set(nextMuted);
    if (this.masterGainNode) {
      this.masterGainNode.gain.setValueAtTime(nextMuted ? 0 : this.volume(), this.audioCtx?.currentTime || 0);
    }
  }

  public stop(): void {
    if (this.hls) {
      try {
        this.hls.stopLoad();
      } catch (e) {}
    }
    this.pause();
    this.seek(0);
    this.updatePlaybackState('none');
  }

  public handleTrackEnded(): void {
    if (this.repeatMode() === 'one') {
      this.seek(0);
      if (this.currentTrack()?.source === 'demo') {
        this.synthGenerator.start();
        this.isPlaying.set(true);
      } else {
        this.audioElement.play().catch(console.error);
        this.isPlaying.set(true);
      }
      return;
    }

    const q = this.queue();
    if (q.length === 0) return;

    if (this.repeatMode() === 'off' && this.queueIndex() >= q.length - 1 && !this.shuffle()) {
      this.stop();
      return;
    }

    this.next();
  }

  public cycleRepeat(): void {
    const modes: Array<'off' | 'all' | 'one'> = ['off', 'all', 'one'];
    const idx = modes.indexOf(this.repeatMode());
    this.repeatMode.set(modes[(idx + 1) % modes.length]);
  }

  public toggleShuffle(): void {
    this.shuffle.set(!this.shuffle());
  }

  public cycleTimeMode(): void {
    const modes: Array<'elapsed' | 'remain' | 'total'> = ['elapsed', 'remain', 'total'];
    const idx = modes.indexOf(this.timeMode());
    this.timeMode.set(modes[(idx + 1) % modes.length]);
  }

  public toggleTray(): void {
    this.trayOpen.set(!this.trayOpen());
  }

  public seekRelative(deltaSeconds: number): void {
    const target = Math.max(0, Math.min(this.duration(), this.currentTime() + deltaSeconds));
    this.seek(target);
  }

  public jumpToTrackIndex(index: number): void {
    const q = this.queue();
    if (index >= 0 && index < q.length) {
      this.queueIndex.set(index);
      this.playTrack(q[index]);
    }
  }

  public next(): void {
    const q = this.queue();
    if (q.length === 0) return;

    let nextIdx: number;
    if (this.shuffle() && q.length > 1) {
      do {
        nextIdx = Math.floor(Math.random() * q.length);
      } while (nextIdx === this.queueIndex());
    } else {
      nextIdx = (this.queueIndex() + 1) % q.length;
    }

    this.queueIndex.set(nextIdx);
    this.playTrack(q[nextIdx]);
  }

  public previous(): void {
    const q = this.queue();
    if (q.length === 0) return;
    if (this.currentTime() > 3) {
      this.seek(0);
      return;
    }
    const prevIdx = (this.queueIndex() - 1 + q.length) % q.length;
    this.queueIndex.set(prevIdx);
    this.playTrack(q[prevIdx]);
  }

  public setQueue(tracks: Track[], startIndex = 0): void {
    this.queue.set(tracks);
    this.queueIndex.set(startIndex);
    if (tracks[startIndex]) {
      this.currentTrack.set(tracks[startIndex]);
      this.playTrack(tracks[startIndex]);
    }
  }

  public addToQueue(track: Track): void {
    const currentQ = this.queue();
    this.queue.set([...currentQ, track]);
    if (!this.currentTrack()) {
      this.playTrack(track);
    }
  }

  public loadLocalFiles(files: FileList): void {
    const newTracks: Track[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith('audio/') && !file.name.match(/\.(mp3|flac|wav|ogg|m4a|aac)$/i)) {
        continue;
      }
      const url = URL.createObjectURL(file);
      const nameParts = file.name.replace(/\.[^/.]+$/, '').split(' - ');
      const artist = nameParts.length > 1 ? nameParts[0].trim() : 'Local Audio';
      const title = nameParts.length > 1 ? nameParts[1].trim() : nameParts[0].trim();

      newTracks.push({
        id: 'local-' + Date.now() + '-' + i,
        title,
        artist,
        album: 'Local Upload',
        duration: 0,
        streamUrl: url,
        source: 'local',
        format: file.name.split('.').pop()?.toUpperCase() || 'AUDIO'
      });
    }

    if (newTracks.length > 0) {
      const currentQ = this.queue();
      this.queue.set([...currentQ, ...newTracks]);
      this.playTrack(newTracks[0]);
    }
  }

  public getDemoTracks(): Track[] {
    return [
      {
        id: 'demo-synthwave-1993',
        title: 'Tokyo Night Drive (24-Band Stereo)',
        artist: 'Kenwood Hi-Fi Sound Lab',
        album: 'Audiophile Demonstration Disc Vol. 1',
        duration: 180,
        source: 'demo',
        format: 'ANALOG SYNTH (LIVE STEREO)'
      },
      {
        id: 'demo-frequency-sweep',
        title: 'Full Spectrum 20Hz - 20kHz Stereo Test',
        artist: 'Kenwood Laboratory Reference',
        album: 'Acoustic Calibration Series',
        duration: 120,
        source: 'demo',
        format: '24-BAND REFERENCE'
      }
    ];
  }

  /**
   * Calculates 24 frequency band levels and peak-hold levels for both Left and Right channels.
   */
  public getAnalysis(sensitivity = 1.0, peakHoldMode: 'normal' | 'slow' | 'infinite' | 'off' = 'normal'): {
    left: ChannelAnalysis;
    right: ChannelAnalysis;
  } {
    const emptyAnalysis: ChannelAnalysis = {
      bandLevels: new Array(24).fill(0),
      peakLevels: new Array(24).fill(0),
      rms: 0
    };

    if (!this.audioCtx || !this.leftAnalyser || !this.rightAnalyser || !this.leftFreqBuffer || !this.rightFreqBuffer) {
      return { left: emptyAnalysis, right: emptyAnalysis };
    }

    // Populate FFT frequency byte data (0 - 255)
    this.leftAnalyser.getByteFrequencyData(this.leftFreqBuffer);
    this.rightAnalyser.getByteFrequencyData(this.rightFreqBuffer);

    const now = performance.now();
    const dt = this.lastAnalysisTime ? Math.min((now - this.lastAnalysisTime) / 1000, 0.1) : 0.016;
    this.lastAnalysisTime = now;

    const sampleRate = this.audioCtx.sampleRate;
    const binCount = this.leftAnalyser.frequencyBinCount;
    const binWidth = sampleRate / this.fftSize;

    const leftBands = this.calculateBands(this.leftFreqBuffer, binWidth, binCount, sensitivity);
    const rightBands = this.calculateBands(this.rightFreqBuffer, binWidth, binCount, sensitivity);

    this.updatePeaks(this.leftPeaks, this.leftPeakTimers, leftBands, dt, peakHoldMode);
    this.updatePeaks(this.rightPeaks, this.rightPeakTimers, rightBands, dt, peakHoldMode);

    return {
      left: {
        bandLevels: leftBands,
        peakLevels: [...this.leftPeaks],
        rms: this.calcRms(leftBands)
      },
      right: {
        bandLevels: rightBands,
        peakLevels: [...this.rightPeaks],
        rms: this.calcRms(rightBands)
      }
    };
  }

  private calculateBands(
    buffer: Uint8Array<ArrayBuffer>,
    binWidth: number,
    binCount: number,
    sensitivity: number
  ): number[] {
    const levels: number[] = new Array(24);

    for (let i = 0; i < FREQUENCY_BANDS_24.length; i++) {
      const band = FREQUENCY_BANDS_24[i];
      const startBin = Math.max(1, Math.floor(band.lowFreq / binWidth));
      const endBin = Math.min(binCount - 1, Math.ceil(band.highFreq / binWidth));

      let sumSq = 0;
      let count = 0;
      let peak = 0;

      for (let b = startBin; b <= endBin; b++) {
        const val = buffer[b] / 255;
        sumSq += val * val;
        if (val > peak) peak = val;
        count++;
      }

      const rms = count > 0 ? Math.sqrt(sumSq / count) : 0;
      // Combine RMS and peak for punchy transient response like hardware equalizers
      const energy = (rms * 0.7 + peak * 0.3) * band.weight * sensitivity;

      // Normalized 0..1 with slight exponential curve to match analog dB scale
      const dbScaled = Math.pow(Math.min(1.0, energy), 1.25);
      levels[i] = Math.max(0, Math.min(1, dbScaled));
    }

    return levels;
  }

  private updatePeaks(
    peaks: number[],
    timers: number[],
    currentLevels: number[],
    dt: number,
    mode: 'normal' | 'slow' | 'infinite' | 'off'
  ) {
    if (mode === 'off') {
      for (let i = 0; i < 24; i++) {
        peaks[i] = currentLevels[i];
      }
      return;
    }

    const holdTime = mode === 'slow' ? 1.8 : 0.9; // seconds
    const fallSpeed = mode === 'slow' ? 0.8 : 1.5; // units per second

    for (let i = 0; i < 24; i++) {
      const level = currentLevels[i];
      if (level >= peaks[i]) {
        peaks[i] = level;
        timers[i] = holdTime;
      } else {
        if (mode === 'infinite') {
          continue;
        }
        if (timers[i] > 0) {
          timers[i] -= dt;
        } else {
          peaks[i] = Math.max(level, peaks[i] - fallSpeed * dt);
        }
      }
    }
  }

  private calcRms(bands: number[]): number {
    let sum = 0;
    for (let i = 0; i < bands.length; i++) {
      sum += bands[i] * bands[i];
    }
    return Math.sqrt(sum / bands.length);
  }

  private setupMediaSessionHandlers() {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator) || !navigator.mediaSession) {
      return;
    }

    const ms = navigator.mediaSession;
    const safeSetHandler = (action: MediaSessionAction, handler: MediaSessionActionHandler | null) => {
      try {
        ms.setActionHandler(action, handler);
      } catch (e) {
        // unsupported action in current browser
      }
    };

    safeSetHandler('play', () => this.togglePlay());
    safeSetHandler('pause', () => this.pause());
    safeSetHandler('stop', () => this.stop());
    safeSetHandler('previoustrack', () => this.previous());
    safeSetHandler('nexttrack', () => this.next());
    safeSetHandler('seekbackward', (details) => this.seekRelative(-(details?.seekOffset || 10)));
    safeSetHandler('seekforward', (details) => this.seekRelative(details?.seekOffset || 10));
    safeSetHandler('seekto', (details) => {
      if (typeof details?.seekTime === 'number') {
        this.seek(details.seekTime);
      }
    });
  }

  private setupGlobalKeyboardListeners() {
    if (typeof window === 'undefined') return;

    window.addEventListener('keydown', (e: KeyboardEvent) => {
      this.handleGlobalKeydown(e);
    });
  }

  public handleGlobalKeydown(e: KeyboardEvent) {
    // 1. Hardware media keys
    if (e.key === 'MediaPlayPause' || e.code === 'MediaPlayPause') {
      this.togglePlay();
      e.preventDefault();
      return;
    }
    if (e.key === 'MediaTrackNext' || e.code === 'MediaTrackNext') {
      this.next();
      e.preventDefault();
      return;
    }
    if (e.key === 'MediaTrackPrevious' || e.code === 'MediaTrackPrevious') {
      this.previous();
      e.preventDefault();
      return;
    }
    if (e.key === 'MediaStop' || e.code === 'MediaStop') {
      this.stop();
      e.preventDefault();
      return;
    }

    // Do not hijack standard typing if focus is inside a form control or contenteditable
    const active = typeof document !== 'undefined' ? document.activeElement : null;
    const isTyping = active && (
      active.tagName === 'INPUT' ||
      active.tagName === 'TEXTAREA' ||
      active.tagName === 'SELECT' ||
      (active as HTMLElement).isContentEditable
    );
    if (isTyping) {
      return;
    }

    // 2. Spacebar for play/pause (when not on an interactive button which triggers click on space)
    if ((e.code === 'Space' || e.key === ' ') && active?.tagName !== 'BUTTON') {
      this.togglePlay();
      e.preventDefault();
      return;
    }

    // 3. Arrow keys with modifier for next/previous
    if ((e.ctrlKey || e.metaKey) && e.key === 'ArrowRight') {
      this.next();
      e.preventDefault();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'ArrowLeft') {
      this.previous();
      e.preventDefault();
      return;
    }

    // 4. Arrow keys for seeking (when not focusing an interactive button or slider)
    if (e.key === 'ArrowRight' && active?.tagName !== 'BUTTON' && active?.tagName !== 'INPUT') {
      this.seekRelative(5);
      e.preventDefault();
      return;
    }
    if (e.key === 'ArrowLeft' && active?.tagName !== 'BUTTON' && active?.tagName !== 'INPUT') {
      this.seekRelative(-5);
      e.preventDefault();
      return;
    }
  }

  private updatePlaybackState(state: 'playing' | 'paused' | 'none') {
    if (typeof navigator !== 'undefined' && 'mediaSession' in navigator && navigator.mediaSession) {
      try {
        navigator.mediaSession.playbackState = state;
      } catch (e) {
        // ignore in mock environments
      }
    }
  }

  private updatePositionState() {
    if (typeof navigator !== 'undefined' && 'mediaSession' in navigator && navigator.mediaSession) {
      const dur = this.duration();
      const pos = this.currentTime();
      if (dur > 0 && typeof navigator.mediaSession.setPositionState === 'function') {
        try {
          navigator.mediaSession.setPositionState({
            duration: Math.max(0, dur),
            playbackRate: 1,
            position: Math.max(0, Math.min(pos, dur))
          });
        } catch (e) {
          // ignore invalid position state
        }
      }
    }
  }

  private updateMediaSession(track: Track) {
    if (typeof navigator !== 'undefined' && 'mediaSession' in navigator && navigator.mediaSession) {
      try {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: track.title,
          artist: track.artist,
          album: track.album,
          artwork: track.coverUrl
            ? [{ src: track.coverUrl, sizes: '512x512', type: 'image/jpeg' }]
            : []
        });
      } catch (e) {
        // ignore in mock environments
      }
    }
  }
}
