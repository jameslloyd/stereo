import { Component, EventEmitter, OnInit, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { JellyfinService } from '../../services/jellyfin.service';
import { AudioEngineService } from '../../services/audio-engine.service';
import { JellyfinItem } from '../../models/jellyfin.models';
import { Track } from '../../models/audio.models';

@Component({
  selector: 'app-jellyfin-browser',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './jellyfin-browser.html',
  styleUrl: './jellyfin-browser.scss'
})
export class JellyfinBrowserComponent implements OnInit {
  protected readonly jellyfin = inject(JellyfinService);
  protected readonly audioEngine = inject(AudioEngineService);

  @Output() close = new EventEmitter<void>();

  // Connection form fields
  public serverUrl = 'http://localhost:8096';
  public username = '';
  public password = '';
  public isSubmitting = signal<boolean>(false);

  // Library browser state
  public activeTab = signal<'browse' | 'settings'>('browse');
  public albums = signal<JellyfinItem[]>([]);
  public selectedAlbum = signal<JellyfinItem | null>(null);
  public albumTracks = signal<JellyfinItem[]>([]);
  public searchQuery = signal<string>('');
  public searchResults = signal<JellyfinItem[]>([]);
  public isSearching = signal<boolean>(false);
  public isLoadingLibrary = signal<boolean>(false);

  ngOnInit(): void {
    const config = this.jellyfin.serverConfig();
    if (config) {
      this.serverUrl = config.serverUrl;
      this.username = config.username;
      this.loadAlbums();
    } else {
      this.activeTab.set('settings');
    }
  }

  public async onConnect(): Promise<void> {
    if (!this.serverUrl || !this.username) return;
    this.isSubmitting.set(true);

    const success = await this.jellyfin.login(this.serverUrl, this.username, this.password);
    this.isSubmitting.set(false);

    if (success) {
      this.activeTab.set('browse');
      this.loadAlbums();
    }
  }

  public onDisconnect(): void {
    this.jellyfin.logout();
    this.albums.set([]);
    this.selectedAlbum.set(null);
    this.albumTracks.set([]);
    this.searchResults.set([]);
    this.activeTab.set('settings');
  }

  public async loadAlbums(): Promise<void> {
    if (this.jellyfin.connectionStatus() !== 'connected') return;
    this.isLoadingLibrary.set(true);
    const albums = await this.jellyfin.getAlbums();
    this.albums.set(albums);
    this.isLoadingLibrary.set(false);
  }

  public async selectAlbum(album: JellyfinItem): Promise<void> {
    this.selectedAlbum.set(album);
    const tracks = await this.jellyfin.getAlbumTracks(album.Id);
    this.albumTracks.set(tracks);
  }

  public backToAlbums(): void {
    this.selectedAlbum.set(null);
    this.albumTracks.set([]);
  }

  public async onSearch(query: string): Promise<void> {
    this.searchQuery.set(query);
    if (!query.trim()) {
      this.searchResults.set([]);
      this.isSearching.set(false);
      return;
    }

    this.isSearching.set(true);
    const results = await this.jellyfin.searchTracks(query);
    this.searchResults.set(results);
    this.isSearching.set(false);
  }

  public playJellyfinItem(item: JellyfinItem): void {
    const track = this.jellyfin.itemToTrack(item);
    this.audioEngine.playTrack(track);
  }

  public playAllAlbumTracks(): void {
    const items = this.albumTracks();
    if (items.length === 0) return;
    const tracks: Track[] = items.map(item => this.jellyfin.itemToTrack(item));
    this.audioEngine.setQueue(tracks, 0);
  }

  public addAlbumToQueue(): void {
    const items = this.albumTracks();
    for (const item of items) {
      const track = this.jellyfin.itemToTrack(item);
      this.audioEngine.addToQueue(track);
    }
  }

  public getCoverUrl(item: JellyfinItem): string {
    return this.jellyfin.getImageUrl(item.Id);
  }

  public formatDuration(ticks?: number): string {
    if (!ticks) return '--:--';
    const sec = Math.floor(ticks / 10000000);
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  }
}
