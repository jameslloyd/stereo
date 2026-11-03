import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { JellyfinService } from './jellyfin.service';
import { JellyfinItem } from '../models/jellyfin.models';

describe('JellyfinService', () => {
  let service: JellyfinService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
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
    httpMock.verify();
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
  });
});
