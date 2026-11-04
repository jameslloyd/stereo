import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { JellyfinAuthResponse, JellyfinItem, JellyfinItemsResponse, JellyfinServerConfig } from '../models/jellyfin.models';
import { Track } from '../models/audio.models';
import { getCookieItem, removeCookieItem, setCookieItem } from '../utils/cookie-storage';

const STORAGE_KEY = 'mplayer_jellyfin_config';
const DEVICE_ID_KEY = 'mplayer_jellyfin_device_id';

@Injectable({
  providedIn: 'root'
})
export class JellyfinService {
  private deviceId: string;
  public readonly serverConfig = signal<JellyfinServerConfig | null>(null);
  public readonly connectionStatus = signal<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  public readonly errorMessage = signal<string | null>(null);

  constructor(private http: HttpClient) {
    this.deviceId = this.getOrCreateDeviceId();
    this.loadSavedConfig();
  }

  private getStorageItem(key: string): string | null {
    return getCookieItem(key);
  }

  private setStorageItem(key: string, value: string): void {
    setCookieItem(key, value);
  }

  private removeStorageItem(key: string): void {
    removeCookieItem(key);
  }

  private getOrCreateDeviceId(): string {
    let id = this.getStorageItem(DEVICE_ID_KEY);
    if (!id) {
      id = 'kenwood-mplayer-' + Math.random().toString(36).substring(2, 11) + Date.now();
      this.setStorageItem(DEVICE_ID_KEY, id);
    }
    return id;
  }

  private loadSavedConfig() {
    const raw = this.getStorageItem(STORAGE_KEY);
    if (raw) {
      try {
        const config: JellyfinServerConfig = JSON.parse(raw);
        this.serverConfig.set(config);
        // Test if existing token is valid
        this.validateSession(config);
      } catch (e) {
        console.warn('Failed to parse saved Jellyfin config', e);
      }
    }
  }

  private getAuthHeaders(token?: string): HttpHeaders {
    let authHeader = `MediaBrowser Client="Kenwood-HiFi-MPlayer", Device="Web Browser", DeviceId="${this.deviceId}", Version="1.0.0"`;
    if (token) {
      authHeader += `, Token="${token}"`;
    }

    let headers = new HttpHeaders()
      .set('Authorization', authHeader)
      .set('X-Emby-Authorization', authHeader)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    if (token) {
      headers = headers.set('X-Emby-Token', token);
    }
    return headers;
  }

  private cleanUrl(url: string): string {
    return url.trim().replace(/\/+$/, '');
  }

  public async validateSession(config: JellyfinServerConfig): Promise<boolean> {
    try {
      this.connectionStatus.set('connecting');
      const headers = this.getAuthHeaders(config.accessToken);
      await firstValueFrom(
        this.http.get<any>(`${config.serverUrl}/System/Info`, { headers })
      );
      this.connectionStatus.set('connected');
      this.errorMessage.set(null);
      return true;
    } catch (err: any) {
      this.connectionStatus.set('disconnected');
      return false;
    }
  }

  public async login(serverUrl: string, username: string, password?: string): Promise<boolean> {
    const cleanServerUrl = this.cleanUrl(serverUrl);
    this.connectionStatus.set('connecting');
    this.errorMessage.set(null);

    try {
      const headers = this.getAuthHeaders();
      const body = {
        Username: username.trim(),
        Pw: password || ''
      };

      const res = await firstValueFrom(
        this.http.post<JellyfinAuthResponse>(`${cleanServerUrl}/Users/AuthenticateByName`, body, { headers })
      );

      const config: JellyfinServerConfig = {
        serverUrl: cleanServerUrl,
        username: res.User.Name,
        userId: res.User.Id,
        accessToken: res.AccessToken,
        serverName: res.ServerId
      };

      this.serverConfig.set(config);
      this.setStorageItem(STORAGE_KEY, JSON.stringify(config));
      this.connectionStatus.set('connected');
      return true;
    } catch (err: any) {
      console.error('Jellyfin login failed:', err);
      this.connectionStatus.set('error');
      const serverMsg =
        err.error?.message ||
        err.error?.Message ||
        (typeof err.error === 'string' ? err.error : null);
      this.errorMessage.set(serverMsg || err.message || 'Connection failed. Check server URL & credentials.');
      return false;
    }
  }

  public logout(): void {
    this.removeStorageItem(STORAGE_KEY);
    this.serverConfig.set(null);
    this.connectionStatus.set('disconnected');
    this.errorMessage.set(null);
  }

  public async getMusicLibraries(): Promise<JellyfinItem[]> {
    const config = this.serverConfig();
    if (!config) return [];
    try {
      const headers = this.getAuthHeaders(config.accessToken);
      const res = await firstValueFrom(
        this.http.get<JellyfinItemsResponse>(`${config.serverUrl}/Users/${config.userId}/Views`, { headers })
      );
      // Filter for music or return all if music isn't strictly typed
      const musicViews = res.Items.filter(item => (item as any).CollectionType === 'music');
      return musicViews.length > 0 ? musicViews : res.Items;
    } catch (err) {
      console.error('Error fetching libraries:', err);
      return [];
    }
  }

  public async getAlbums(parentId?: string): Promise<JellyfinItem[]> {
    const config = this.serverConfig();
    if (!config) return [];
    try {
      const headers = this.getAuthHeaders(config.accessToken);
      let url = `${config.serverUrl}/Users/${config.userId}/Items?IncludeItemTypes=MusicAlbum&Recursive=true&SortBy=SortName&SortOrder=Ascending&Limit=100`;
      if (parentId) {
        url += `&ParentId=${parentId}`;
      }
      const res = await firstValueFrom(this.http.get<JellyfinItemsResponse>(url, { headers }));
      return res.Items;
    } catch (err) {
      console.error('Error fetching albums:', err);
      return [];
    }
  }

  public async getAlbumTracks(albumId: string): Promise<JellyfinItem[]> {
    const config = this.serverConfig();
    if (!config) return [];
    try {
      const headers = this.getAuthHeaders(config.accessToken);
      const url = `${config.serverUrl}/Users/${config.userId}/Items?ParentId=${albumId}&SortBy=ParentIndexNumber,IndexNumber,SortName&SortOrder=Ascending`;
      const res = await firstValueFrom(this.http.get<JellyfinItemsResponse>(url, { headers }));
      return res.Items;
    } catch (err) {
      console.error('Error fetching album tracks:', err);
      return [];
    }
  }

  public async getArtists(limit = 120): Promise<JellyfinItem[]> {
    const config = this.serverConfig();
    if (!config) return [];
    const headers = this.getAuthHeaders(config.accessToken);

    // Try AlbumArtists first for cleaner music library view
    try {
      const url = `${config.serverUrl}/Artists/AlbumArtists?userId=${config.userId}&SortBy=SortName&SortOrder=Ascending&Limit=${limit}`;
      const res = await firstValueFrom(this.http.get<JellyfinItemsResponse>(url, { headers }));
      if (res.Items && res.Items.length > 0) {
        return res.Items;
      }
    } catch (e) {
      // Fallback to Artists or Users/Items
    }

    try {
      const fallbackUrl = `${config.serverUrl}/Users/${config.userId}/Items?IncludeItemTypes=MusicArtist&Recursive=true&SortBy=SortName&SortOrder=Ascending&Limit=${limit}`;
      const res = await firstValueFrom(this.http.get<JellyfinItemsResponse>(fallbackUrl, { headers }));
      return res.Items || [];
    } catch (err) {
      console.error('Error fetching artists:', err);
      return [];
    }
  }

  public async getArtistAlbums(artistId: string): Promise<JellyfinItem[]> {
    const config = this.serverConfig();
    if (!config) return [];
    try {
      const headers = this.getAuthHeaders(config.accessToken);
      const url = `${config.serverUrl}/Users/${config.userId}/Items?IncludeItemTypes=MusicAlbum&ArtistIds=${artistId}&Recursive=true&SortBy=ProductionYear,SortName&SortOrder=Descending`;
      const res = await firstValueFrom(this.http.get<JellyfinItemsResponse>(url, { headers }));
      return res.Items || [];
    } catch (err) {
      console.error('Error fetching artist albums:', err);
      return [];
    }
  }

  public async getArtistTracks(artistId: string, limit = 100): Promise<JellyfinItem[]> {
    const config = this.serverConfig();
    if (!config) return [];
    try {
      const headers = this.getAuthHeaders(config.accessToken);
      const url = `${config.serverUrl}/Users/${config.userId}/Items?IncludeItemTypes=Audio&ArtistIds=${artistId}&Recursive=true&SortBy=Album,IndexNumber,SortName&SortOrder=Ascending&Limit=${limit}`;
      const res = await firstValueFrom(this.http.get<JellyfinItemsResponse>(url, { headers }));
      return res.Items || [];
    } catch (err) {
      console.error('Error fetching artist tracks:', err);
      return [];
    }
  }

  public async getPlaylists(limit = 100): Promise<JellyfinItem[]> {
    const config = this.serverConfig();
    if (!config) return [];
    try {
      const headers = this.getAuthHeaders(config.accessToken);
      const url = `${config.serverUrl}/Users/${config.userId}/Items?IncludeItemTypes=Playlist&Recursive=true&SortBy=SortName&SortOrder=Ascending&Limit=${limit}`;
      const res = await firstValueFrom(this.http.get<JellyfinItemsResponse>(url, { headers }));
      return res.Items || [];
    } catch (err) {
      console.error('Error fetching playlists:', err);
      return [];
    }
  }

  public async getPlaylistTracks(playlistId: string): Promise<JellyfinItem[]> {
    const config = this.serverConfig();
    if (!config) return [];
    const headers = this.getAuthHeaders(config.accessToken);

    // Try modern Jellyfin playlist items endpoint
    try {
      const url = `${config.serverUrl}/Playlists/${playlistId}/Items?userId=${config.userId}`;
      const res = await firstValueFrom(this.http.get<JellyfinItemsResponse>(url, { headers }));
      if (res.Items && res.Items.length > 0) {
        return res.Items;
      }
    } catch (e) {
      // Fallback to ParentId query
    }

    try {
      const url = `${config.serverUrl}/Users/${config.userId}/Items?ParentId=${playlistId}&SortBy=SortName&SortOrder=Ascending`;
      const res = await firstValueFrom(this.http.get<JellyfinItemsResponse>(url, { headers }));
      return res.Items || [];
    } catch (err) {
      console.error('Error fetching playlist tracks:', err);
      return [];
    }
  }

  public async getSongs(limit = 150): Promise<JellyfinItem[]> {
    const config = this.serverConfig();
    if (!config) return [];
    try {
      const headers = this.getAuthHeaders(config.accessToken);
      const url = `${config.serverUrl}/Users/${config.userId}/Items?IncludeItemTypes=Audio&Recursive=true&SortBy=SortName&SortOrder=Ascending&Limit=${limit}`;
      const res = await firstValueFrom(this.http.get<JellyfinItemsResponse>(url, { headers }));
      return res.Items || [];
    } catch (err) {
      console.error('Error fetching songs:', err);
      return [];
    }
  }

  public async getGenres(limit = 60): Promise<JellyfinItem[]> {
    const config = this.serverConfig();
    if (!config) return [];
    const headers = this.getAuthHeaders(config.accessToken);

    try {
      const url = `${config.serverUrl}/MusicGenres?userId=${config.userId}&SortBy=SortName&SortOrder=Ascending&Limit=${limit}`;
      const res = await firstValueFrom(this.http.get<JellyfinItemsResponse>(url, { headers }));
      if (res.Items && res.Items.length > 0) {
        return res.Items;
      }
    } catch (e) {}

    try {
      const url = `${config.serverUrl}/Users/${config.userId}/Items?IncludeItemTypes=MusicGenre&Recursive=true&SortBy=SortName&SortOrder=Ascending&Limit=${limit}`;
      const res = await firstValueFrom(this.http.get<JellyfinItemsResponse>(url, { headers }));
      return res.Items || [];
    } catch (err) {
      console.error('Error fetching genres:', err);
      return [];
    }
  }

  public async getGenreAlbums(genreId: string): Promise<JellyfinItem[]> {
    const config = this.serverConfig();
    if (!config) return [];
    try {
      const headers = this.getAuthHeaders(config.accessToken);
      const url = `${config.serverUrl}/Users/${config.userId}/Items?IncludeItemTypes=MusicAlbum&GenreIds=${genreId}&Recursive=true&SortBy=SortName&SortOrder=Ascending`;
      const res = await firstValueFrom(this.http.get<JellyfinItemsResponse>(url, { headers }));
      return res.Items || [];
    } catch (err) {
      console.error('Error fetching genre albums:', err);
      return [];
    }
  }

  public async searchTracks(query: string): Promise<JellyfinItem[]> {
    const config = this.serverConfig();
    if (!config || !query.trim()) return [];
    try {
      const headers = this.getAuthHeaders(config.accessToken);
      const url = `${config.serverUrl}/Users/${config.userId}/Items?searchTerm=${encodeURIComponent(query)}&IncludeItemTypes=Audio,MusicAlbum&Recursive=true&Limit=40`;
      const res = await firstValueFrom(this.http.get<JellyfinItemsResponse>(url, { headers }));
      return res.Items;
    } catch (err) {
      console.error('Error searching:', err);
      return [];
    }
  }

  public getStreamUrl(itemId: string): string {
    const config = this.serverConfig();
    if (!config) return '';
    return `${config.serverUrl}/Audio/${itemId}/stream?static=true&api_key=${config.accessToken}`;
  }

  public getImageUrl(itemId: string): string {
    const config = this.serverConfig();
    if (!config) return '';
    return `${config.serverUrl}/Items/${itemId}/Images/Primary?fillWidth=400&quality=85&api_key=${config.accessToken}`;
  }

  public itemToTrack(item: JellyfinItem): Track {
    const durationSec = item.RunTimeTicks ? Math.floor(item.RunTimeTicks / 10000000) : 0;
    const artist = item.Artists && item.Artists.length > 0 ? item.Artists.join(', ') : (item.AlbumArtist || 'Unknown Artist');
    const container = item.MediaSources?.[0]?.Container?.toUpperCase() || 'AUDIO';
    const bitrate = item.MediaSources?.[0]?.Bitrate;

    const coverId = item.Type === 'MusicAlbum' ? item.Id : (item.AlbumId || (item as any).ParentId || item.Id);

    return {
      id: item.Id,
      title: item.Name,
      artist,
      album: item.Album || (item.Type === 'MusicAlbum' ? item.Name : 'Jellyfin Track'),
      duration: durationSec,
      streamUrl: this.getStreamUrl(item.Id),
      coverUrl: this.getImageUrl(coverId),
      source: 'jellyfin',
      format: `${container}${bitrate ? ` ${(bitrate / 1000).toFixed(0)}kbps` : ''}`,
      bitrate
    };
  }
}
