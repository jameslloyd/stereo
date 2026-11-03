import { TestBed } from '@angular/core/testing';
import { VfdSettingsService, VFD_THEME_PALETTES } from './vfd-settings.service';

describe('VfdSettingsService', () => {
  let service: VfdSettingsService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [VfdSettingsService]
    });
    service = TestBed.inject(VfdSettingsService);
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
  });
});
