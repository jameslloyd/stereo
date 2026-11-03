import { Component, EventEmitter, Output, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AudioEngineService } from '../../services/audio-engine.service';
import { JellyfinService } from '../../services/jellyfin.service';
import { VfdSettingsService } from '../../services/vfd-settings.service';

@Component({
  selector: 'app-player-bar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './player-bar.html',
  styleUrl: './player-bar.scss'
})
export class PlayerBarComponent {
  protected readonly audioEngine = inject(AudioEngineService);
  protected readonly jellyfin = inject(JellyfinService);
  public readonly vfdSettings = inject(VfdSettingsService);

  @Output() openJellyfin = new EventEmitter<void>();

  // 1 to 20 CD Music Calendar track numbers
  public readonly trackCalendar = Array.from({ length: 20 }, (_, i) => i + 1);

  // Formatted Current Track Number (e.g. "01", "07", "--")
  public readonly currentTrackNumber = computed(() => {
    const q = this.audioEngine.queue();
    const idx = this.audioEngine.queueIndex();
    if (q.length === 0 && !this.audioEngine.currentTrack()) return '--';
    const num = idx + 1;
    return num < 10 ? `0${num}` : `${num}`;
  });

  // Total tracks count on "disc" / queue
  public readonly totalTracksCount = computed(() => {
    const len = this.audioEngine.queue().length;
    return len > 0 ? (len < 10 ? `0${len}` : `${len}`) : '--';
  });

  // Time display based on timeMode: Elapsed, Remain, Total
  public readonly timeDisplay = computed(() => {
    const mode = this.audioEngine.timeMode();
    const curr = this.audioEngine.currentTime();
    const dur = this.audioEngine.duration();

    let displaySeconds = curr;
    let sign = '';

    if (mode === 'remain') {
      displaySeconds = Math.max(0, dur - curr);
      sign = '-';
    } else if (mode === 'total') {
      // Remaining time for rest of queue
      const q = this.audioEngine.queue();
      const idx = this.audioEngine.queueIndex();
      let totalRem = Math.max(0, dur - curr);
      for (let i = idx + 1; i < q.length; i++) {
        totalRem += q[i].duration || 0;
      }
      displaySeconds = totalRem;
      sign = '-';
    }

    const m = Math.floor(displaySeconds / 60);
    const s = Math.floor(displaySeconds % 60);
    const minStr = m < 10 ? `0${m}` : `${m}`;
    const secStr = s < 10 ? `0${s}` : `${s}`;

    return {
      sign,
      min: minStr,
      sec: secStr,
      raw: displaySeconds
    };
  });

  public isTrackAvailable(trackNum: number): boolean {
    return trackNum <= this.audioEngine.queue().length;
  }

  public isTrackPlaying(trackNum: number): boolean {
    return trackNum === this.audioEngine.queueIndex() + 1 && this.audioEngine.isPlaying();
  }

  public isTrackSelected(trackNum: number): boolean {
    return trackNum === this.audioEngine.queueIndex() + 1;
  }

  public isTrackPlayed(trackNum: number): boolean {
    return trackNum < this.audioEngine.queueIndex() + 1;
  }

  public jumpToTrack(trackNum: number): void {
    const index = trackNum - 1;
    if (index >= 0 && index < this.audioEngine.queue().length) {
      this.audioEngine.jumpToTrackIndex(index);
    }
  }

  public onKeypadClick(num: number): void {
    this.jumpToTrack(num);
  }

  public onSeekChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = parseFloat(input.value);
    this.audioEngine.seek(value);
  }

  public onVolumeChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = parseFloat(input.value);
    this.audioEngine.setVolume(value);
  }

  public onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.audioEngine.loadLocalFiles(input.files);
    }
  }

  public playDemo(index = 0): void {
    const demos = this.audioEngine.getDemoTracks();
    if (demos[index]) {
      this.audioEngine.setQueue(demos, index);
    }
  }

  public formatTime(sec: number): string {
    if (!sec || isNaN(sec)) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  }
}
