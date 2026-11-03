import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { JellyfinBrowserComponent } from './jellyfin-browser';
import { JellyfinService } from '../../services/jellyfin.service';
import { AudioEngineService } from '../../services/audio-engine.service';
import { SynthGeneratorService } from '../../services/synth-generator.service';
import { JellyfinItem } from '../../models/jellyfin.models';

describe('JellyfinBrowserComponent', () => {
  let component: JellyfinBrowserComponent;
  let fixture: ComponentFixture<JellyfinBrowserComponent>;
  let jellyfinService: JellyfinService;
  let audioEngine: AudioEngineService;

  beforeEach(async () => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.clear();
      }
    } catch (e) {}

    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [JellyfinBrowserComponent],
      providers: [
        JellyfinService,
        AudioEngineService,
        SynthGeneratorService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(JellyfinBrowserComponent);
    component = fixture.componentInstance;
    jellyfinService = TestBed.inject(JellyfinService);
    audioEngine = TestBed.inject(AudioEngineService);
  });

  afterEach(() => {
    try {
      audioEngine?.stop();
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.clear();
      }
    } catch (e) {}
    TestBed.resetTestingModule();
  });

  it('should create the Jellyfin browser component', () => {
    expect(component).toBeTruthy();
  });

  it('should default to settings tab if not connected', () => {
    component.ngOnInit();
    expect(component.activeTab()).toBe('settings');
  });

  it('should switch between library sections (albums, artists, playlists, songs, genres)', async () => {
    jellyfinService.serverConfig.set({
      serverUrl: 'http://192.168.1.100:8096',
      username: 'audiophile',
      userId: 'user-001',
      accessToken: 'token-xyz'
    });
    jellyfinService.connectionStatus.set('connected');

    const artistSpy = vi.spyOn(jellyfinService, 'getArtists').mockResolvedValue([
      { Id: 'art-1', Name: 'Kraftwerk', Type: 'MusicArtist' }
    ]);
    const playlistSpy = vi.spyOn(jellyfinService, 'getPlaylists').mockResolvedValue([
      { Id: 'pl-1', Name: '90s Techno', Type: 'Playlist' }
    ]);
    const songsSpy = vi.spyOn(jellyfinService, 'getSongs').mockResolvedValue([
      { Id: 'song-1', Name: 'Computer World', Type: 'Audio' }
    ]);
    const genresSpy = vi.spyOn(jellyfinService, 'getGenres').mockResolvedValue([
      { Id: 'gen-1', Name: 'Electronic', Type: 'MusicGenre' }
    ]);

    await component.switchSection('artists');
    expect(component.librarySection()).toBe('artists');
    expect(artistSpy).toHaveBeenCalled();
    expect(component.artists().length).toBe(1);

    await component.switchSection('playlists');
    expect(component.librarySection()).toBe('playlists');
    expect(playlistSpy).toHaveBeenCalled();
    expect(component.playlists().length).toBe(1);

    await component.switchSection('songs');
    expect(component.librarySection()).toBe('songs');
    expect(songsSpy).toHaveBeenCalled();
    expect(component.songs().length).toBe(1);

    await component.switchSection('genres');
    expect(component.librarySection()).toBe('genres');
    expect(genresSpy).toHaveBeenCalled();
    expect(component.genres().length).toBe(1);
  });

  it('should drill into artist details and back', async () => {
    const artistItem: JellyfinItem = { Id: 'art-10', Name: 'Jean-Michel Jarre', Type: 'MusicArtist' };
    vi.spyOn(jellyfinService, 'getArtistAlbums').mockResolvedValue([
      { Id: 'alb-1', Name: 'Oxygene', Type: 'MusicAlbum' }
    ]);
    vi.spyOn(jellyfinService, 'getArtistTracks').mockResolvedValue([
      { Id: 'trk-1', Name: 'Oxygene IV', Type: 'Audio' }
    ]);

    await component.selectArtist(artistItem);
    expect(component.selectedArtist()?.Name).toBe('Jean-Michel Jarre');
    expect(component.artistAlbums().length).toBe(1);
    expect(component.artistTracks().length).toBe(1);

    component.backToArtists();
    expect(component.selectedArtist()).toBeNull();
    expect(component.artistAlbums().length).toBe(0);
  });

  it('should drill into playlist details and play all playlist tracks', async () => {
    const playlistItem: JellyfinItem = { Id: 'pl-20', Name: 'Hi-Fi Demo', Type: 'Playlist' };
    const trackItem: JellyfinItem = { Id: 'trk-2', Name: 'Equinoxe IV', Type: 'Audio', Artists: ['Jarre'] };
    vi.spyOn(jellyfinService, 'getPlaylistTracks').mockResolvedValue([trackItem]);

    const queueSpy = vi.spyOn(audioEngine, 'setQueue');

    await component.selectPlaylist(playlistItem);
    expect(component.selectedPlaylist()?.Name).toBe('Hi-Fi Demo');
    expect(component.playlistTracks().length).toBe(1);

    component.playAllPlaylistTracks();
    expect(queueSpy).toHaveBeenCalled();
  });
});
