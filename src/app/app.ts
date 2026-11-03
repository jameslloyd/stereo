import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SpectrumAnalyserComponent } from './components/spectrum-analyser/spectrum-analyser';
import { PlayerBarComponent } from './components/player-bar/player-bar';
import { RadioTunerComponent } from './components/radio-tuner/radio-tuner';
import { JellyfinBrowserComponent } from './components/jellyfin-browser/jellyfin-browser';
import { QueueDrawerComponent } from './components/queue-drawer/queue-drawer';
import { AudioEngineService } from './services/audio-engine.service';
import { JellyfinService } from './services/jellyfin.service';
import { VfdSettingsService } from './services/vfd-settings.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    SpectrumAnalyserComponent,
    PlayerBarComponent,
    RadioTunerComponent,
    JellyfinBrowserComponent,
    QueueDrawerComponent
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly audioEngine = inject(AudioEngineService);
  protected readonly jellyfin = inject(JellyfinService);
  public readonly vfdSettings = inject(VfdSettingsService);

  public readonly showJellyfinModal = signal<boolean>(false);
  public readonly showQueueDrawer = signal<boolean>(false);

  public openJellyfin(): void {
    this.showJellyfinModal.set(true);
  }

  public closeJellyfin(): void {
    this.showJellyfinModal.set(false);
  }

  public toggleQueue(): void {
    this.showQueueDrawer.set(!this.showQueueDrawer());
  }
}
