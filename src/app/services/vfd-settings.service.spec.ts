import { TestBed } from '@angular/core/testing';
import { VfdSettingsService, VFD_THEME_PALETTES } from './vfd-settings.service';
import { clearAllAppCookies, getCookieItem } from '../utils/cookie-storage';

describe('VfdSettingsService', () => {
  let service: VfdSettingsService;

  beforeEach(() => {
    clearAllAppCookies();
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.clear();
      }
    } catch (e) {}

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [VfdSettingsService]
    });
    service = TestBed.inject(VfdSettingsService);
  });

  afterEach(() => {
    clearAllAppCookies();
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.clear();
      }
    } catch (e) {}
    TestBed.resetTestingModule();
  });

  it('should be created with default VFD settings', () => {
    expect(service).toBeTruthy();
    expect(service.theme()).toBe('vfd-cyan');
    expect(service.layout()).toBe('split');
    expect(service.sensitivity()).toBe(1.2);
  });

  it('should change theme and update DOM custom properties', () => {
    service.setTheme('kenwood-amber');
    expect(service.theme()).toBe('kenwood-amber');

    const amberPalette = VFD_THEME_PALETTES['kenwood-amber'];
    const root = document.documentElement;
    expect(root.style.getPropertyValue('--vfd-primary')).toBe(amberPalette.primary);
    expect(root.classList.contains('theme-kenwood-amber')).toBe(true);

    service.setTheme('technics-green');
    expect(service.theme()).toBe('technics-green');
    const greenPalette = VFD_THEME_PALETTES['technics-green'];
    expect(root.style.getPropertyValue('--vfd-primary')).toBe(greenPalette.primary);
    expect(root.classList.contains('theme-technics-green')).toBe(true);
  });

  it('should update visualizer layout and sensitivity', () => {
    service.setLayout('mirror');
    expect(service.layout()).toBe('mirror');

    service.setSensitivity(1.8);
    expect(service.sensitivity()).toBe(1.8);

    service.setPeakHold('slow');
    expect(service.peakHold()).toBe('slow');

    service.setGlowIntensity(1.5);
    expect(service.glowIntensity()).toBe(1.5);

    service.setGlowIntensity(5.0);
    expect(service.glowIntensity()).toBe(2.0);

    service.setGlowIntensity(-1.0);
    expect(service.glowIntensity()).toBe(0);
  });

  it('should persist settings to a local cookie and restore them', () => {
    service.setTheme('ice-blue');
    service.setLayout('mirror');
    service.setPeakHold('infinite');
    service.setSensitivity(1.9);
    service.setGlowIntensity(1.4);
    service.setGhostSegments(false);
    service.setShowGrid(false);

    expect(document.cookie).toContain('mplayer_vfd_settings=');
    const cookieVal = getCookieItem('mplayer_vfd_settings');
    expect(cookieVal).toBeTruthy();

    // Clear localStorage to verify restoration specifically from cookie
    window.localStorage.clear();

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [VfdSettingsService]
    });
    const restoredService = TestBed.inject(VfdSettingsService);

    expect(restoredService.theme()).toBe('ice-blue');
    expect(restoredService.layout()).toBe('mirror');
    expect(restoredService.peakHold()).toBe('infinite');
    expect(restoredService.sensitivity()).toBe(1.9);
    expect(restoredService.glowIntensity()).toBe(1.4);
    expect(restoredService.ghostSegments()).toBe(false);
    expect(restoredService.showGrid()).toBe(false);
  });
});
