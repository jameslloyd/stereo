export interface FrequencyBand {
  readonly id: number;
  readonly centerFreq: number;
  readonly label: string;
  readonly lowFreq: number;
  readonly highFreq: number;
  readonly weight: number; // Compensation curve weight for balanced visual response
}

export const FREQUENCY_BANDS_24: FrequencyBand[] = [
  { id: 0, centerFreq: 20, label: '20', lowFreq: 16, highFreq: 25, weight: 1.45 },
  { id: 1, centerFreq: 31.5, label: '31.5', lowFreq: 25, highFreq: 40, weight: 1.35 },
  { id: 2, centerFreq: 50, label: '50', lowFreq: 40, highFreq: 56, weight: 1.25 },
  { id: 3, centerFreq: 63, label: '63', lowFreq: 56, highFreq: 71, weight: 1.15 },
  { id: 4, centerFreq: 80, label: '80', lowFreq: 71, highFreq: 90, weight: 1.05 },
  { id: 5, centerFreq: 100, label: '100', lowFreq: 90, highFreq: 112, weight: 1.0 },
  { id: 6, centerFreq: 125, label: '125', lowFreq: 112, highFreq: 140, weight: 1.0 },
  { id: 7, centerFreq: 160, label: '160', lowFreq: 140, highFreq: 180, weight: 1.0 },
  { id: 8, centerFreq: 200, label: '200', lowFreq: 180, highFreq: 224, weight: 1.05 },
  { id: 9, centerFreq: 250, label: '250', lowFreq: 224, highFreq: 280, weight: 1.1 },
  { id: 10, centerFreq: 315, label: '315', lowFreq: 280, highFreq: 355, weight: 1.15 },
  { id: 11, centerFreq: 400, label: '400', lowFreq: 355, highFreq: 450, weight: 1.2 },
  { id: 12, centerFreq: 500, label: '500', lowFreq: 450, highFreq: 560, weight: 1.25 },
  { id: 13, centerFreq: 630, label: '630', lowFreq: 560, highFreq: 710, weight: 1.3 },
  { id: 14, centerFreq: 800, label: '800', lowFreq: 710, highFreq: 900, weight: 1.35 },
  { id: 15, centerFreq: 1000, label: '1k', lowFreq: 900, highFreq: 1120, weight: 1.4 },
  { id: 16, centerFreq: 1250, label: '1.25k', lowFreq: 1120, highFreq: 1400, weight: 1.5 },
  { id: 17, centerFreq: 1600, label: '1.6k', lowFreq: 1400, highFreq: 1800, weight: 1.6 },
  { id: 18, centerFreq: 2000, label: '2k', lowFreq: 1800, highFreq: 2240, weight: 1.75 },
  { id: 19, centerFreq: 2500, label: '2.5k', lowFreq: 2240, highFreq: 2800, weight: 1.9 },
  { id: 20, centerFreq: 3150, label: '3.15k', lowFreq: 2800, highFreq: 3550, weight: 2.1 },
  { id: 21, centerFreq: 4000, label: '4k', lowFreq: 3550, highFreq: 5600, weight: 2.3 },
  { id: 22, centerFreq: 8000, label: '8k', lowFreq: 5600, highFreq: 11200, weight: 2.8 },
  { id: 23, centerFreq: 16000, label: '16k', lowFreq: 11200, highFreq: 20000, weight: 3.4 }
];

export type VisualizerTheme = 'vfd-cyan' | 'kenwood-amber' | 'technics-green' | 'ice-blue';
export type VisualizerLayout = 'split' | 'side-by-side' | 'mirror';
export type PeakHoldMode = 'normal' | 'slow' | 'infinite' | 'off';

export interface VisualizerSettings {
  theme: VisualizerTheme;
  layout: VisualizerLayout;
  peakHoldMode: PeakHoldMode;
  segmentsCount: number; // typically 16
  sensitivity: number; // multiplier 0.5 - 2.5
  glowIntensity: number; // 0 - 1
  ghostSegments: boolean; // draw faint unlit segments
  showGrid: boolean;
}

export interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number; // in seconds
  streamUrl?: string;
  coverUrl?: string;
  source: 'jellyfin' | 'demo' | 'local' | 'radio';
  format?: string;
  bitrate?: number;
}
