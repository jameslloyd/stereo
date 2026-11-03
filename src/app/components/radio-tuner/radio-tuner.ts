import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RadioTunerService } from '../../services/radio-tuner.service';
import { AudioEngineService } from '../../services/audio-engine.service';
import { VfdSettingsService } from '../../services/vfd-settings.service';
import { BbcRadioPreset, RadioBand } from '../../models/radio.models';

@Component({
  selector: 'app-radio-tuner',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './radio-tuner.html',
  styleUrl: './radio-tuner.scss'
})
export class RadioTunerComponent {
  public tuner = inject(RadioTunerService);
  public audioEngine = inject(AudioEngineService);
  public vfdSettings = inject(VfdSettingsService);

  public onPresetClick(preset: BbcRadioPreset): void {
    this.tuner.selectPreset(preset);
  }

  public onTuneDown(): void {
    this.tuner.tuneStep(-1);
  }

  public onTuneUp(): void {
    this.tuner.tuneStep(1);
  }

  public onSetBand(band: RadioBand): void {
    this.tuner.setBand(band);
  }

  public onToggleStereo(): void {
    this.tuner.toggleStereoMode();
  }

  public onTogglePower(): void {
    this.tuner.togglePower();
  }

  public onAutoScan(): void {
    this.tuner.autoScan(1);
  }
}
