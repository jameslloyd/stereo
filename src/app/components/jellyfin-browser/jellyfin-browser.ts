import { Component, EventEmitter, OnInit, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { JellyfinService } from '../../services/jellyfin.service';
import { AudioEngineService } from '../../services/audio-engine.service';
import { JellyfinItem } from '../../models/jellyfin.models';
import { Track } from '../../models/audio.models';

export type LibrarySection = 'albums' | 'artists' | 'playlists' | 'songs' | 'genres';

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
  public librarySection = signal<LibrarySection>('albums');

  // Category data signals
  public albums = signal<JellyfinItem[]>([]);
  public artists = signal<JellyfinItem[]>([]);
  public playlists = signal<JellyfinItem[]>([]);
  public songs = signal<JellyfinItem[]>([]);
  public genres = signal<JellyfinItem[]>([]);

  // Selected drilldown items
  public selectedAlbum = signal<JellyfinItem | null>(null);
  public albumTracks = signal<JellyfinItem[]>([]);

  public selectedArtist = signal<JellyfinItem | null>(null);
  public artistAlbums = signal<JellyfinItem[]>([]);
  public artistTracks = signal<JellyfinItem[]>([]);

  public selectedPlaylist = signal<JellyfinItem | null>(null);
  public playlistTracks = signal<JellyfinItem[]>([]);

  public selectedGenre = signal<JellyfinItem | null>(null);
  public genreAlbums = signal<JellyfinItem[]>([]);

  // Search state
  public searchQuery = signal<string>('');
  public searchResults = signal<JellyfinItem[]>([]);
  public isSearching = signal<boolean>(false);
  public isLoadingLibrary = signal<boolean>(false);

  ngOnInit(): void {
    const config = this.jellyfin.serverConfig();
    if (config) {
      this.serverUrl = config.serverUrl;
      this.username = config.username;
      this.loadSectionData('albums');
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
      this.loadSectionData(this.librarySection());
    }
  }

  public onDisconnect(): void {
    this.jellyfin.logout();
    this.resetAllData();
    this.activeTab.set('settings');
  }

  private resetAllData(): void {
    this.albums.set([]);
    this.artists.set([]);
    this.playlists.set([]);
    this.songs.set([]);
    this.genres.set([]);
    this.selectedAlbum.set(null);
    this.albumTracks.set([]);
    this.selectedArtist.set(null);
    this.artistAlbums.set([]);
    this.artistTracks.set([]);
    this.selectedPlaylist.set(null);
    this.playlistTracks.set([]);
    this.selectedGenre.set(null);
    this.genreAlbums.set([]);
    this.searchResults.set([]);
  }

  public async switchSection(section: LibrarySection): Promise<void> {
    this.librarySection.set(section);
    this.selectedAlbum.set(null);
    this.selectedArtist.set(null);
    this.selectedPlaylist.set(null);
    this.selectedGenre.set(null);
    await this.loadSectionData(section);
  }

  public async loadSectionData(section: LibrarySection): Promise<void> {
    if (this.jellyfin.connectionStatus() !== 'connected') return;
    this.isLoadingLibrary.set(true);

    switch (section) {
      case 'albums':
        if (this.albums().length === 0) {
          const res = await this.jellyfin.getAlbums();
          this.albums.set(res);
        }
        break;
      case 'artists':
        if (this.artists().length === 0) {
          const res = await this.jellyfin.getArtists();
          this.artists.set(res);
        }
        break;
      case 'playlists':
        if (this.playlists().length === 0) {
          const res = await this.jellyfin.getPlaylists();
          this.playlists.set(res);
        }
        break;
      case 'songs':
        if (this.songs().length === 0) {
          const res = await this.jellyfin.getSongs();
          this.songs.set(res);
        }
        break;
      case 'genres':
        if (this.genres().length === 0) {
          const res = await this.jellyfin.getGenres();
          this.genres.set(res);
        }
        break;
    }

    this.isLoadingLibrary.set(false);
  }

  public async refreshCurrentSection(): Promise<void> {
    const sec = this.librarySection();
    switch (sec) {
      case 'albums':
        this.albums.set([]);
        break;
      case 'artists':
        this.artists.set([]);
        break;
      case 'playlists':
        this.playlists.set([]);
        break;
      case 'songs':
        this.songs.set([]);
        break;
      case 'genres':
        this.genres.set([]);
        break;
    }
    this.selectedAlbum.set(null);
    this.selectedArtist.set(null);
    this.selectedPlaylist.set(null);
    this.selectedGenre.set(null);
    await this.loadSectionData(sec);
  }

  // Drilldown: Albums
  public async selectAlbum(album: JellyfinItem): Promise<void> {
    this.selectedAlbum.set(album);
    const tracks = await this.jellyfin.getAlbumTracks(album.Id);
    this.albumTracks.set(tracks);
  }

  public backToAlbums(): void {
    this.selectedAlbum.set(null);
    this.albumTracks.set([]);
  }

  // Drilldown: Artists
  public async selectArtist(artist: JellyfinItem): Promise<void> {
    this.selectedArtist.set(artist);
    this.isLoadingLibrary.set(true);
    const [albums, tracks] = await Promise.all([
      this.jellyfin.getArtistAlbums(artist.Id),
      this.jellyfin.getArtistTracks(artist.Id)
    ]);
    this.artistAlbums.set(albums);
    this.artistTracks.set(tracks);
    this.isLoadingLibrary.set(false);
  }

  public backToArtists(): void {
    this.selectedArtist.set(null);
    this.artistAlbums.set([]);
    this.artistTracks.set([]);
  }

  // Drilldown: Playlists
  public async selectPlaylist(playlist: JellyfinItem): Promise<void> {
    this.selectedPlaylist.set(playlist);
    this.isLoadingLibrary.set(true);
    const tracks = await this.jellyfin.getPlaylistTracks(playlist.Id);
    this.playlistTracks.set(tracks);
    this.isLoadingLibrary.set(false);
  }

  public backToPlaylists(): void {
    this.selectedPlaylist.set(null);
    this.playlistTracks.set([]);
  }

  // Drilldown: Genres
  public async selectGenre(genre: JellyfinItem): Promise<void> {
    this.selectedGenre.set(genre);
    this.isLoadingLibrary.set(true);
    const albums = await this.jellyfin.getGenreAlbums(genre.Id);
    this.genreAlbums.set(albums);
    this.isLoadingLibrary.set(false);
  }

  public backToGenres(): void {
    this.selectedGenre.set(null);
    this.genreAlbums.set([]);
  }

  // Universal Search
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

  // Playback Operations
  public playJellyfinItem(item: JellyfinItem): void {
    const track = this.jellyfin.itemToTrack(item);
    this.audioEngine.playTrack(track);
  }

  public queueTrack(item: JellyfinItem): void {
    const track = this.jellyfin.itemToTrack(item);
    this.audioEngine.addToQueue(track);
  }

  // Album actions
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

  // Playlist actions
  public playAllPlaylistTracks(): void {
    const items = this.playlistTracks();
    if (items.length === 0) return;
    const tracks: Track[] = items.map(item => this.jellyfin.itemToTrack(item));
    this.audioEngine.setQueue(tracks, 0);
  }

  public addPlaylistToQueue(): void {
    const items = this.playlistTracks();
    for (const item of items) {
      const track = this.jellyfin.itemToTrack(item);
      this.audioEngine.addToQueue(track);
    }
  }

  // Artist actions
  public playAllArtistTracks(): void {
    const items = this.artistTracks();
    if (items.length === 0) return;
    const tracks: Track[] = items.map(item => this.jellyfin.itemToTrack(item));
    this.audioEngine.setQueue(tracks, 0);
  }

  public addArtistToQueue(): void {
    const items = this.artistTracks();
    for (const item of items) {
      const track = this.jellyfin.itemToTrack(item);
      this.audioEngine.addToQueue(track);
    }
  }

  // Songs actions
  public playAllSongs(): void {
    const items = this.songs();
    if (items.length === 0) return;
    const tracks: Track[] = items.map(item => this.jellyfin.itemToTrack(item));
    this.audioEngine.setQueue(tracks, 0);
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
