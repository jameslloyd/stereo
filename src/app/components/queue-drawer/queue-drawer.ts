import { Component, EventEmitter, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AudioEngineService } from '../../services/audio-engine.service';
import { Track } from '../../models/audio.models';

@Component({
  selector: 'app-queue-drawer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './queue-drawer.html',
  styleUrl: './queue-drawer.scss'
})
export class QueueDrawerComponent {
  protected readonly audioEngine = inject(AudioEngineService);

  @Output() close = new EventEmitter<void>();

  public playTrack(track: Track, index: number): void {
    this.audioEngine.queueIndex.set(index);
    this.audioEngine.playTrack(track);
  }

  public clearQueue(): void {
    this.audioEngine.setQueue([]);
  }

  public formatDuration(sec: number): string {
    if (!sec || isNaN(sec)) return '--:--';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  }
}
