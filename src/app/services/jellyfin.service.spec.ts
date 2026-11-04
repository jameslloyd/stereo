import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { JellyfinService } from './jellyfin.service';
import { JellyfinItem } from '../models/jellyfin.models';
import { clearAllAppCookies } from '../utils/cookie-storage';

describe('JellyfinService', () => {
  let service: JellyfinService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    clearAllAppCookies();
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.clear();
      }
      if (typeof window !== 'undefined' && window.sessionStorage) {
        window.sessionStorage.clear();
      }
    } catch (e) {}

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        JellyfinService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });
    service = TestBed.inject(JellyfinService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    try {
      httpMock.verify();
    } finally {
      clearAllAppCookies();
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.clear();
        }
        if (typeof window !== 'undefined' && window.sessionStorage) {
          window.sessionStorage.clear();
        }
      } catch (e) {}
      TestBed.resetTestingModule();
    }
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
    expect(service.connectionStatus()).toBe('disconnected');
  });

  it('should convert JellyfinItem to Track model', () => {
    const item: JellyfinItem = {
      Id: 'item-123',
      Name: 'Nightcall',
      Type: 'Audio',
      Artists: ['Kavinsky'],
      Album: 'OutRun',
      RunTimeTicks: 2590000000, // 259 seconds
      MediaSources: [
        {
          Container: 'flac',
          Bitrate: 960000
        }
      ]
    };

    const track = service.itemToTrack(item);
    expect(track.id).toBe('item-123');
    expect(track.title).toBe('Nightcall');
    expect(track.artist).toBe('Kavinsky');
    expect(track.album).toBe('OutRun');
    expect(track.duration).toBe(259);
    expect(track.source).toBe('jellyfin');
    expect(track.format).toContain('FLAC');
  });

  it('should perform login and store config', async () => {
    const loginPromise = service.login('http://192.168.1.100:8096', 'audiophile', 'secret');

    const req = httpMock.expectOne('http://192.168.1.100:8096/Users/AuthenticateByName');
    expect(req.request.method).toBe('POST');
    expect(req.request.headers.has('Authorization')).toBe(true);
    expect(req.request.headers.get('Authorization')).toContain('MediaBrowser Client=');
    expect(req.request.headers.has('X-Emby-Authorization')).toBe(true);
    expect(req.request.headers.get('Content-Type')).toBe('application/json');

    req.flush({
      User: {
        Id: 'user-001',
        Name: 'audiophile'
      },
      AccessToken: 'mock-token-xyz',
      ServerId: 'server-999'
    });

    const success = await loginPromise;
    expect(success).toBe(true);
    expect(service.connectionStatus()).toBe('connected');
    expect(service.serverConfig()?.userId).toBe('user-001');
    expect(service.serverConfig()?.accessToken).toBe('mock-token-xyz');

    // Clean up stored credentials so subsequent tests start in a clean disconnected state
    service.logout();
  });

  it('should fetch artists when connected', async () => {
    service.serverConfig.set({
      serverUrl: 'http://192.168.1.100:8096',
      username: 'audiophile',
      userId: 'user-001',
      accessToken: 'token-123'
    });

    const artistsPromise = service.getArtists();
    const req = httpMock.expectOne('http://192.168.1.100:8096/Artists/AlbumArtists?userId=user-001&SortBy=SortName&SortOrder=Ascending&Limit=120');
    expect(req.request.method).toBe('GET');
    req.flush({
      Items: [
        { Id: 'art-1', Name: 'Daft Punk', Type: 'MusicArtist' },
        { Id: 'art-2', Name: 'Kavinsky', Type: 'MusicArtist' }
      ],
      TotalRecordCount: 2,
      StartIndex: 0
    });

    const artists = await artistsPromise;
    expect(artists.length).toBe(2);
    expect(artists[0].Name).toBe('Daft Punk');
  });

  it('should fetch playlists and playlist tracks', async () => {
    service.serverConfig.set({
      serverUrl: 'http://192.168.1.100:8096',
      username: 'audiophile',
      userId: 'user-001',
      accessToken: 'token-123'
    });

    const playlistsPromise = service.getPlaylists();
    const req1 = httpMock.expectOne('http://192.168.1.100:8096/Users/user-001/Items?IncludeItemTypes=Playlist&Recursive=true&SortBy=SortName&SortOrder=Ascending&Limit=100');
    req1.flush({
      Items: [{ Id: 'pl-1', Name: 'Synthwave Classics', Type: 'Playlist' }],
      TotalRecordCount: 1,
      StartIndex: 0
    });

    const playlists = await playlistsPromise;
    expect(playlists.length).toBe(1);
    expect(playlists[0].Name).toBe('Synthwave Classics');

    const tracksPromise = service.getPlaylistTracks('pl-1');
    const req2 = httpMock.expectOne('http://192.168.1.100:8096/Playlists/pl-1/Items?userId=user-001');
    req2.flush({
      Items: [{ Id: 'track-1', Name: 'Pacific Coast', Type: 'Audio' }],
      TotalRecordCount: 1,
      StartIndex: 0
    });

    const tracks = await tracksPromise;
    expect(tracks.length).toBe(1);
    expect(tracks[0].Name).toBe('Pacific Coast');
  });
});
