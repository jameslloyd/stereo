import { Injectable, signal, inject } from '@angular/core';
import { BBC_RADIO_PRESETS, BbcRadioPreset, RadioBand } from '../models/radio.models';
import { AudioEngineService } from './audio-engine.service';
import { Track } from '../models/audio.models';

@Injectable({
  providedIn: 'root'
})
export class RadioTunerService {
  private audioEngine = inject(AudioEngineService);

  public readonly presets = signal<BbcRadioPreset[]>(BBC_RADIO_PRESETS);
  public readonly activePreset = signal<BbcRadioPreset | null>(BBC_RADIO_PRESETS[0]);
  public readonly frequencyMhz = signal<number>(BBC_RADIO_PRESETS[0].frequencyMhz);
  public readonly frequencyDisplay = signal<string>(BBC_RADIO_PRESETS[0].frequencyStr);
  public readonly band = signal<RadioBand>(BBC_RADIO_PRESETS[0].band);
  public readonly stereoMode = signal<'auto-stereo' | 'mono'>('auto-stereo');
  public readonly signalStrength = signal<number>(5); // 0 to 5
  public readonly isTuned = signal<boolean>(true);
  public readonly isStereo = signal<boolean>(true);
  public readonly rdsText = signal<string>(BBC_RADIO_PRESETS[0].rdsText);
  public readonly isPowerOn = signal<boolean>(true);
  public readonly isScanning = signal<boolean>(false);

  constructor() {}

  public selectPreset(preset: BbcRadioPreset): void {
    if (!this.isPowerOn()) {
      this.isPowerOn.set(true);
    }
    this.activePreset.set(preset);
    this.frequencyMhz.set(preset.frequencyMhz);
    this.frequencyDisplay.set(preset.frequencyStr);
    this.band.set(preset.band);
    this.isTuned.set(true);
    this.isStereo.set(preset.band !== 'AM' && this.stereoMode() === 'auto-stereo');
    this.signalStrength.set(5);
    this.rdsText.set(preset.rdsText);

    // Route audio to audio engine
    const track: Track = {
      id: `radio-${preset.id}`,
      title: preset.name,
      artist: 'BBC Radio (Live Stereo Broadcast)',
      album: `${preset.frequencyStr} • ${preset.genre}`,
      duration: 0,
      streamUrl: preset.streamUrl,
      source: 'radio',
      format: preset.band === 'DAB' ? 'DAB DIGITAL STEREO' : `${preset.band} STEREO`
    };

    this.audioEngine.playTrack(track);
  }

  public selectPresetByNumber(num: number): void {
    const found = this.presets().find(p => p.presetNumber === num);
    if (found) {
      this.selectPreset(found);
    }
  }

  public tuneStep(direction: 1 | -1): void {
    if (!this.isPowerOn()) return;

    let current = this.frequencyMhz();
    const currentBand = this.band();

    if (currentBand === 'FM') {
      current = Math.round((current + direction * 0.1) * 10) / 10;
      if (current > 108.0) current = 87.5;
      if (current < 87.5) current = 108.0;
      this.frequencyMhz.set(current);
      this.frequencyDisplay.set(`${current.toFixed(1)} MHz`);
    } else if (currentBand === 'AM') {
      current = Math.round((current + direction * 0.009) * 1000) / 1000;
      if (current > 1.602) current = 0.531;
      if (current < 0.531) current = 1.602;
      this.frequencyMhz.set(current);
      this.frequencyDisplay.set(`${Math.round(current * 1000)} kHz`);
    } else {
      // DAB cycles presets in DAB band
      const dabPresets = this.presets().filter(p => p.band === 'DAB');
      if (dabPresets.length > 0) {
        const curIdx = dabPresets.findIndex(p => p.id === this.activePreset()?.id);
        const nextIdx = (curIdx + direction + dabPresets.length) % dabPresets.length;
        this.selectPreset(dabPresets[nextIdx]);
        return;
      }
    }

    // Check if close to an existing preset
    const match = this.presets().find(p => p.band === currentBand && Math.abs(p.frequencyMhz - current) < 0.08);
    if (match) {
      this.activePreset.set(match);
      this.isTuned.set(true);
      this.signalStrength.set(5);
      this.isStereo.set(currentBand !== 'AM' && this.stereoMode() === 'auto-stereo');
      this.rdsText.set(match.rdsText);
    } else {
      this.activePreset.set(null);
      this.isTuned.set(false);
      this.signalStrength.set(Math.random() > 0.6 ? 2 : 1);
      this.isStereo.set(false);
      this.rdsText.set('TUNING — NO RDS CARRIER DETECTED');
    }
  }

  public setBand(band: RadioBand): void {
    if (this.band() === band) return;
    this.band.set(band);

    const firstInBand = this.presets().find(p => p.band === band);
    if (firstInBand) {
      this.selectPreset(firstInBand);
    } else {
      if (band === 'FM') {
        this.frequencyMhz.set(98.8);
        this.frequencyDisplay.set('98.8 MHz');
      } else if (band === 'AM') {
        this.frequencyMhz.set(0.693);
        this.frequencyDisplay.set('693 kHz');
      } else {
        this.frequencyMhz.set(225.648);
        this.frequencyDisplay.set('DAB 12B');
      }
      this.activePreset.set(null);
      this.isTuned.set(false);
      this.signalStrength.set(1);
      this.rdsText.set(`SEARCHING ${band} BAND...`);
    }
  }

  public toggleStereoMode(): void {
    const nextMode = this.stereoMode() === 'auto-stereo' ? 'mono' : 'auto-stereo';
    this.stereoMode.set(nextMode);
    this.isStereo.set(nextMode === 'auto-stereo' && this.band() !== 'AM' && this.isTuned());
  }

  public togglePower(): void {
    const nextPower = !this.isPowerOn();
    this.isPowerOn.set(nextPower);
    if (!nextPower) {
      // Tuner standby: pause radio audio if playing
      if (this.audioEngine.currentTrack()?.source === 'radio') {
        this.audioEngine.pause();
      }
    } else if (this.activePreset()) {
      this.selectPreset(this.activePreset()!);
    }
  }

  public autoScan(direction: 1 | -1 = 1): void {
    if (!this.isPowerOn()) return;
    this.isScanning.set(true);

    const currentPresets = this.presets().filter(p => p.band === this.band());
    if (currentPresets.length === 0) {
      this.isScanning.set(false);
      return;
    }

    const curIdx = currentPresets.findIndex(p => p.id === this.activePreset()?.id);
    const nextIdx = (curIdx + direction + currentPresets.length) % currentPresets.length;

    setTimeout(() => {
      this.selectPreset(currentPresets[nextIdx]);
      this.isScanning.set(false);
    }, 280);
  }
}
