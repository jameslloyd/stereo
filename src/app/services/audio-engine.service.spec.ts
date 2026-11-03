import { TestBed } from '@angular/core/testing';
import { AudioEngineService } from './audio-engine.service';
import { SynthGeneratorService } from './synth-generator.service';
import { FREQUENCY_BANDS_24, Track } from '../models/audio.models';

describe('AudioEngineService', () => {
  let service: AudioEngineService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AudioEngineService, SynthGeneratorService]
    });
    service = TestBed.inject(AudioEngineService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have 24 ISO frequency bands defined', () => {
    expect(FREQUENCY_BANDS_24.length).toBe(24);
    expect(FREQUENCY_BANDS_24[0].centerFreq).toBe(20);
    expect(FREQUENCY_BANDS_24[23].centerFreq).toBe(16000);
  });

  it('should provide built-in demo tracks', () => {
    const demos = service.getDemoTracks();
    expect(demos.length).toBeGreaterThanOrEqual(1);
    expect(demos[0].source).toBe('demo');
    expect(demos[0].title).toContain('Tokyo Night');
  });

  it('should initialize with default playback state', () => {
    expect(service.isPlaying()).toBe(false);
    expect(service.currentTime()).toBe(0);
    expect(service.volume()).toBe(0.85);
    expect(service.isMuted()).toBe(false);
    expect(service.queue().length).toBe(0);
  });

  it('should return 24-band empty analysis when audio context is uninitialized', () => {
    const analysis = service.getAnalysis(1.0, 'normal');
    expect(analysis.left.bandLevels.length).toBe(24);
    expect(analysis.right.bandLevels.length).toBe(24);
    expect(analysis.left.peakLevels.length).toBe(24);
    expect(analysis.right.peakLevels.length).toBe(24);
    expect(analysis.left.rms).toBe(0);
  });

  it('should manage queue correctly', () => {
    const track1: Track = {
      id: 't1',
      title: 'Track 1',
      artist: 'Artist 1',
      album: 'Album 1',
      duration: 120,
      source: 'local'
    };
    const track2: Track = {
      id: 't2',
      title: 'Track 2',
      artist: 'Artist 2',
      album: 'Album 2',
      duration: 180,
      source: 'local'
    };

    service.setQueue([track1, track2], 0);
    expect(service.queue().length).toBe(2);
    expect(service.queueIndex()).toBe(0);
    expect(service.currentTrack()?.id).toBe('t1');
  });

  it('should handle volume and mute state', () => {
    service.setVolume(0.5);
    expect(service.volume()).toBe(0.5);

    service.toggleMute();
    expect(service.isMuted()).toBe(true);

    service.toggleMute();
    expect(service.isMuted()).toBe(false);
  });

  it('should handle CD player modes (repeat, shuffle, timeMode, tray)', () => {
    expect(service.repeatMode()).toBe('off');
    service.cycleRepeat();
    expect(service.repeatMode()).toBe('all');
    service.cycleRepeat();
    expect(service.repeatMode()).toBe('one');
    service.cycleRepeat();
    expect(service.repeatMode()).toBe('off');

    expect(service.shuffle()).toBe(false);
    service.toggleShuffle();
    expect(service.shuffle()).toBe(true);

    expect(service.timeMode()).toBe('elapsed');
    service.cycleTimeMode();
    expect(service.timeMode()).toBe('remain');
    service.cycleTimeMode();
    expect(service.timeMode()).toBe('total');
    service.cycleTimeMode();
    expect(service.timeMode()).toBe('elapsed');

    expect(service.trayOpen()).toBe(false);
    service.toggleTray();
    expect(service.trayOpen()).toBe(true);
    service.toggleTray();
    expect(service.trayOpen()).toBe(false);
  });

  it('should respond to media keys via handleGlobalKeydown', () => {
    const playSpy = vi.spyOn(service, 'togglePlay');
    const nextSpy = vi.spyOn(service, 'next');
    const prevSpy = vi.spyOn(service, 'previous');
    const stopSpy = vi.spyOn(service, 'stop');

    // MediaPlayPause
    const playPauseEvent = new KeyboardEvent('keydown', { key: 'MediaPlayPause' });
    service.handleGlobalKeydown(playPauseEvent);
    expect(playSpy).toHaveBeenCalled();

    // MediaTrackNext
    const nextEvent = new KeyboardEvent('keydown', { key: 'MediaTrackNext' });
    service.handleGlobalKeydown(nextEvent);
    expect(nextSpy).toHaveBeenCalled();

    // MediaTrackPrevious
    const prevEvent = new KeyboardEvent('keydown', { key: 'MediaTrackPrevious' });
    service.handleGlobalKeydown(prevEvent);
    expect(prevSpy).toHaveBeenCalled();

    // MediaStop
    const stopEvent = new KeyboardEvent('keydown', { key: 'MediaStop' });
    service.handleGlobalKeydown(stopEvent);
    expect(stopSpy).toHaveBeenCalled();

    // Spacebar
    playSpy.mockClear();
    const spaceEvent = new KeyboardEvent('keydown', { code: 'Space' });
    service.handleGlobalKeydown(spaceEvent);
    expect(playSpy).toHaveBeenCalled();
  });

  it('should ignore spacebar when focused on an input element', () => {
    const playSpy = vi.spyOn(service, 'togglePlay');
    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();

    const spaceEvent = new KeyboardEvent('keydown', { code: 'Space' });
    service.handleGlobalKeydown(spaceEvent);
    expect(playSpy).not.toHaveBeenCalled();

    document.body.removeChild(input);
  });
});
