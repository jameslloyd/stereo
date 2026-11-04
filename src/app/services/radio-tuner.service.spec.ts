import { TestBed } from '@angular/core/testing';
import { RadioTunerService } from './radio-tuner.service';
import { AudioEngineService } from './audio-engine.service';
import { SynthGeneratorService } from './synth-generator.service';
import { BBC_RADIO_PRESETS } from '../models/radio.models';
import { clearAllAppCookies } from '../utils/cookie-storage';

describe('RadioTunerService', () => {
  let service: RadioTunerService;
  let audioEngine: AudioEngineService;

  beforeEach(() => {
    clearAllAppCookies();
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.clear();
      }
    } catch (e) {}

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [RadioTunerService, AudioEngineService, SynthGeneratorService]
    });
    service = TestBed.inject(RadioTunerService);
    audioEngine = TestBed.inject(AudioEngineService);
  });

  afterEach(() => {
    clearAllAppCookies();
    try {
      audioEngine?.stop();
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.clear();
      }
    } catch (e) {}
    TestBed.resetTestingModule();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have 8 BBC Radio presets defined', () => {
    expect(service.presets().length).toBe(8);
    expect(service.presets()[0].name).toBe('BBC Radio 1');
    expect(service.presets()[1].name).toBe('BBC Radio 2');
    expect(service.presets()[2].name).toBe('BBC Radio 3');
    expect(service.presets()[3].name).toBe('BBC Radio 4');
    expect(service.presets()[4].name).toBe('BBC Radio 5 Live');
    expect(service.presets()[5].name).toBe('BBC Radio 6 Music');
    expect(service.presets()[6].name).toBe('BBC Radio 1Xtra');
    expect(service.presets()[7].name).toBe('BBC World Service');
  });

  it('should initialize with Radio 1 active', () => {
    expect(service.activePreset()?.id).toBe('bbc-radio-1');
    expect(service.band()).toBe('FM');
    expect(service.isTuned()).toBe(true);
    expect(service.signalStrength()).toBe(5);
  });

  it('should switch preset and dispatch track to AudioEngine', () => {
    const radio2 = BBC_RADIO_PRESETS[1];
    service.selectPreset(radio2);

    expect(service.activePreset()?.name).toBe('BBC Radio 2');
    expect(service.frequencyMhz()).toBe(89.1);
    expect(audioEngine.currentTrack()?.title).toBe('BBC Radio 2');
    expect(audioEngine.currentTrack()?.source).toBe('radio');
  });

  it('should handle band switching', () => {
    service.setBand('AM');
    expect(service.band()).toBe('AM');
    expect(service.activePreset()?.name).toBe('BBC Radio 5 Live');

    service.setBand('DAB');
    expect(service.band()).toBe('DAB');
    expect(service.activePreset()?.name).toBe('BBC Radio 6 Music');
  });

  it('should tune step and detect match', () => {
    // Current is Radio 1 at 98.8
    service.tuneStep(1); // 98.9
    expect(service.frequencyMhz()).toBe(98.9);
    // Still close enough to 98.8 (<0.08 tolerance might fail or succeed depending on delta)
    service.tuneStep(1); // 99.0
    expect(service.frequencyMhz()).toBe(99.0);
    expect(service.activePreset()).toBeNull();
    expect(service.isTuned()).toBe(false);
  });

  it('should toggle stereo mode and power', () => {
    expect(service.stereoMode()).toBe('auto-stereo');
    service.toggleStereoMode();
    expect(service.stereoMode()).toBe('mono');
    expect(service.isStereo()).toBe(false);

    expect(service.isPowerOn()).toBe(true);
    service.togglePower();
    expect(service.isPowerOn()).toBe(false);
  });
});
