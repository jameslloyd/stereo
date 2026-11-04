import { Injectable, signal, effect } from '@angular/core';
import { VisualizerLayout, VisualizerTheme, PeakHoldMode } from '../models/audio.models';
import { getCookieItem, setCookieItem } from '../utils/cookie-storage';

const STORAGE_KEY = 'mplayer_vfd_settings';

export interface VfdThemePalette {
  name: string;
  primary: string;
  primaryGlow: string;
  mid: string;
  midGlow: string;
  peak: string;
  peakGlow: string;
  dim: string;
  text: string;
  accent: string;
}

export const VFD_THEME_PALETTES: Record<VisualizerTheme, VfdThemePalette> = {
  'vfd-cyan': {
    name: 'Kenwood VFD Cyan',
    primary: '#00f2e6',
    primaryGlow: 'rgba(0, 242, 230, 0.55)',
    mid: '#ffcc00',
    midGlow: 'rgba(255, 204, 0, 0.6)',
    peak: '#ff2d55',
    peakGlow: 'rgba(255, 45, 85, 0.7)',
    dim: '#0c2730',
    text: '#a5f3fc',
    accent: '#00f2e6'
  },
  'kenwood-amber': {
    name: 'Vintage Amber Gold',
    primary: '#ffaa00',
    primaryGlow: 'rgba(255, 170, 0, 0.55)',
    mid: '#ffcc33',
    midGlow: 'rgba(255, 204, 51, 0.6)',
    peak: '#ff3b30',
    peakGlow: 'rgba(255, 59, 48, 0.7)',
    dim: '#331d06',
    text: '#fed7aa',
    accent: '#ffaa00'
  },
  'technics-green': {
    name: 'Technics Fluorescent Green',
    primary: '#00ff66',
    primaryGlow: 'rgba(0, 255, 102, 0.55)',
    mid: '#ffea00',
    midGlow: 'rgba(255, 234, 0, 0.6)',
    peak: '#ff2244',
    peakGlow: 'rgba(255, 34, 68, 0.7)',
    dim: '#0b2e15',
    text: '#bbf7d0',
    accent: '#00ff66'
  },
  'ice-blue': {
    name: 'Cyber Ice Blue',
    primary: '#38bdf8',
    primaryGlow: 'rgba(56, 189, 248, 0.55)',
    mid: '#c084fc',
    midGlow: 'rgba(192, 132, 252, 0.6)',
    peak: '#f43f5e',
    peakGlow: 'rgba(244, 63, 94, 0.7)',
    dim: '#10273f',
    text: '#bae6fd',
    accent: '#38bdf8'
  }
};

@Injectable({
  providedIn: 'root'
})
export class VfdSettingsService {
  public readonly theme = signal<VisualizerTheme>('vfd-cyan');
  public readonly layout = signal<VisualizerLayout>('split');
  public readonly peakHold = signal<PeakHoldMode>('normal');
  public readonly sensitivity = signal<number>(1.2);
  public readonly glowIntensity = signal<number>(1.0);
  public readonly segmentCount = signal<number>(16);
  public readonly ghostSegments = signal<boolean>(true);
  public readonly showGrid = signal<boolean>(true);

  constructor() {
    this.loadSavedSettings();
    this.applyThemeToDOM(this.theme());

    // Synchronize CSS class and variables on documentElement / body when theme or settings change
    effect(() => {
      const curTheme = this.theme();
      // Read all signals so effect triggers whenever any setting changes
      this.layout();
      this.peakHold();
      this.sensitivity();
      this.glowIntensity();
      this.segmentCount();
      this.ghostSegments();
      this.showGrid();

      this.applyThemeToDOM(curTheme);
      this.saveSettings();
    });
  }

  private applyThemeToDOM(curTheme: VisualizerTheme): void {
    if (typeof document === 'undefined') return;

    const palette = VFD_THEME_PALETTES[curTheme];
    const root = document.documentElement;

    // Remove old theme classes
    root.classList.remove('theme-vfd-cyan', 'theme-kenwood-amber', 'theme-technics-green', 'theme-ice-blue');
    root.classList.add(`theme-${curTheme}`);

    // Set synchronized VFD CSS Custom Properties for all separates
    root.style.setProperty('--vfd-primary', palette.primary);
    root.style.setProperty('--vfd-glow', palette.primaryGlow);
    root.style.setProperty('--vfd-mid', palette.mid);
    root.style.setProperty('--vfd-mid-glow', palette.midGlow);
    root.style.setProperty('--vfd-peak', palette.peak);
    root.style.setProperty('--vfd-peak-glow', palette.peakGlow);
    root.style.setProperty('--vfd-dim', palette.dim);
    root.style.setProperty('--vfd-text', palette.text);
    root.style.setProperty('--vfd-accent', palette.accent);
  }

  public setTheme(newTheme: VisualizerTheme): void {
    this.theme.set(newTheme);
    this.applyThemeToDOM(newTheme);
    this.saveSettings();
  }

  public setLayout(newLayout: VisualizerLayout): void {
    this.layout.set(newLayout);
    this.saveSettings();
  }

  public setPeakHold(mode: PeakHoldMode): void {
    this.peakHold.set(mode);
    this.saveSettings();
  }

  public setSensitivity(val: number): void {
    this.sensitivity.set(val);
    this.saveSettings();
  }

  public setGlowIntensity(val: number): void {
    this.glowIntensity.set(Math.max(0, Math.min(2, val)));
    this.saveSettings();
  }

  public setSegmentCount(count: number): void {
    this.segmentCount.set(count);
    this.saveSettings();
  }

  public setGhostSegments(enabled: boolean): void {
    this.ghostSegments.set(enabled);
    this.saveSettings();
  }

  public setShowGrid(enabled: boolean): void {
    this.showGrid.set(enabled);
    this.saveSettings();
  }

  private loadSavedSettings(): void {
    try {
      const raw = getCookieItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.theme && VFD_THEME_PALETTES[parsed.theme as VisualizerTheme]) {
          this.theme.set(parsed.theme);
        }
        if (parsed.layout) this.layout.set(parsed.layout);
        if (parsed.peakHold) this.peakHold.set(parsed.peakHold);
        if (typeof parsed.sensitivity === 'number') this.sensitivity.set(parsed.sensitivity);
        if (typeof parsed.glowIntensity === 'number') this.glowIntensity.set(parsed.glowIntensity);
        if (typeof parsed.segmentCount === 'number') this.segmentCount.set(parsed.segmentCount);
        if (typeof parsed.ghostSegments === 'boolean') this.ghostSegments.set(parsed.ghostSegments);
        if (typeof parsed.showGrid === 'boolean') this.showGrid.set(parsed.showGrid);
      }
    } catch (e) {
      console.warn('Could not load VFD settings from cookie', e);
    }
  }

  private saveSettings(): void {
    try {
      const payload = {
        theme: this.theme(),
        layout: this.layout(),
        peakHold: this.peakHold(),
        sensitivity: this.sensitivity(),
        glowIntensity: this.glowIntensity(),
        segmentCount: this.segmentCount(),
        ghostSegments: this.ghostSegments(),
        showGrid: this.showGrid()
      };
      setCookieItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (e) {}
  }
}
