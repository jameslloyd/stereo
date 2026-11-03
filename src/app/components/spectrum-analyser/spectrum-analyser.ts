import {
  Component,
  ElementRef,
  ViewChild,
  AfterViewInit,
  OnDestroy,
  signal,
  inject,
  HostListener
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AudioEngineService } from '../../services/audio-engine.service';
import { FREQUENCY_BANDS_24, VisualizerLayout, VisualizerTheme, PeakHoldMode } from '../../models/audio.models';

interface ColorPalette {
  name: string;
  normal: string;
  normalGlow: string;
  mid: string;
  midGlow: string;
  peak: string;
  peakGlow: string;
  ghost: string;
  gridColor: string;
  accent: string;
}

const PALETTES: Record<VisualizerTheme, ColorPalette> = {
  'vfd-cyan': {
    name: 'Kenwood VFD Cyan',
    normal: '#00f2e6',
    normalGlow: 'rgba(0, 242, 230, 0.45)',
    mid: '#ffcc00',
    midGlow: 'rgba(255, 204, 0, 0.5)',
    peak: '#ff2d55',
    peakGlow: 'rgba(255, 45, 85, 0.65)',
    ghost: 'rgba(0, 242, 230, 0.05)',
    gridColor: 'rgba(0, 242, 230, 0.12)',
    accent: '#00f2e6'
  },
  'kenwood-amber': {
    name: 'Vintage Amber Gold',
    normal: '#ff9900',
    normalGlow: 'rgba(255, 153, 0, 0.45)',
    mid: '#ffcc33',
    midGlow: 'rgba(255, 204, 51, 0.5)',
    peak: '#ff3b30',
    peakGlow: 'rgba(255, 59, 48, 0.65)',
    ghost: 'rgba(255, 153, 0, 0.05)',
    gridColor: 'rgba(255, 153, 0, 0.12)',
    accent: '#ff9900'
  },
  'technics-green': {
    name: 'Technics Fluorescent Green',
    normal: '#00ff66',
    normalGlow: 'rgba(0, 255, 102, 0.45)',
    mid: '#ffea00',
    midGlow: 'rgba(255, 234, 0, 0.5)',
    peak: '#ff2244',
    peakGlow: 'rgba(255, 34, 68, 0.65)',
    ghost: 'rgba(0, 255, 102, 0.05)',
    gridColor: 'rgba(0, 255, 102, 0.12)',
    accent: '#00ff66'
  },
  'ice-blue': {
    name: 'Cyber Ice Blue',
    normal: '#38bdf8',
    normalGlow: 'rgba(56, 189, 248, 0.45)',
    mid: '#c084fc',
    midGlow: 'rgba(192, 132, 252, 0.5)',
    peak: '#f43f5e',
    peakGlow: 'rgba(244, 63, 94, 0.65)',
    ghost: 'rgba(56, 189, 248, 0.05)',
    gridColor: 'rgba(56, 189, 248, 0.12)',
    accent: '#38bdf8'
  }
};

@Component({
  selector: 'app-spectrum-analyser',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './spectrum-analyser.html',
  styleUrl: './spectrum-analyser.scss'
})
export class SpectrumAnalyserComponent implements AfterViewInit, OnDestroy {
  @ViewChild('visualizerCanvas', { static: true })
  private canvasRef!: ElementRef<HTMLCanvasElement>;

  @ViewChild('containerRef', { static: true })
  private containerRef!: ElementRef<HTMLDivElement>;

  protected readonly audioEngine = inject(AudioEngineService);
  protected readonly bands = FREQUENCY_BANDS_24;

  // Settings
  public readonly layout = signal<VisualizerLayout>('split');
  public readonly theme = signal<VisualizerTheme>('vfd-cyan');
  public readonly peakHold = signal<PeakHoldMode>('normal');
  public readonly sensitivity = signal<number>(1.2);
  public readonly segmentCount = signal<number>(16);
  public readonly ghostSegments = signal<boolean>(true);
  public readonly showGrid = signal<boolean>(true);

  // Settings dropdown menu visibility
  public readonly isSettingsMenuOpen = signal<boolean>(false);

  // Real-time VU stats for display meters
  public readonly leftRms = signal<number>(0);
  public readonly rightRms = signal<number>(0);

  private ctx: CanvasRenderingContext2D | null = null;
  private animationId: number | null = null;
  private isRendering = false;
  private resizeObserver: ResizeObserver | null = null;

  private dpr = 1;
  private cssWidth = 0;
  private cssHeight = 0;

  ngAfterViewInit(): void {
    const canvas = this.canvasRef.nativeElement;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.dpr = window.devicePixelRatio || 1;

    this.setupResizeObserver();
    this.setupVisibilityListeners();
    this.startAnimation();
  }

  ngOnDestroy(): void {
    this.stopAnimation();
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
  }

  @HostListener('window:resize')
  onResize(): void {
    this.handleResize();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.isSettingsMenuOpen()) {
      this.closeSettingsMenu();
    }
  }

  public toggleSettingsMenu(): void {
    this.isSettingsMenuOpen.set(!this.isSettingsMenuOpen());
  }

  public closeSettingsMenu(): void {
    this.isSettingsMenuOpen.set(false);
  }

  public setLayout(val: VisualizerLayout): void {
    this.layout.set(val);
  }

  public setTheme(val: VisualizerTheme): void {
    this.theme.set(val);
  }

  public setPeakHold(val: PeakHoldMode): void {
    this.peakHold.set(val);
  }

  private setupResizeObserver(): void {
    if (typeof ResizeObserver === 'undefined') {
      this.handleResize();
      return;
    }
    const container = this.containerRef?.nativeElement;
    if (!container) return;
    this.resizeObserver = new ResizeObserver(() => {
      this.handleResize();
    });
    this.resizeObserver.observe(container);
    this.handleResize();
  }

  private handleResize(): void {
    const canvas = this.canvasRef?.nativeElement;
    const container = this.containerRef?.nativeElement;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect ? container.getBoundingClientRect() : { width: 800, height: 420 };

    this.dpr = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1;
    this.cssWidth = rect.width || 800;
    this.cssHeight = Math.max(180, rect.height || 220);

    canvas.width = Math.floor(this.cssWidth * this.dpr);
    canvas.height = Math.floor(this.cssHeight * this.dpr);

    if (this.ctx) {
      this.ctx.imageSmoothingEnabled = false;
    }
  }

  /**
   * Guidance: efficient-background-processing
   * Pause canvas render loop when document is hidden or element is off-screen.
   */
  private setupVisibilityListeners(): void {
    if (typeof document !== 'undefined' && document.addEventListener) {
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          this.stopAnimation();
        } else {
          this.startAnimation();
        }
      });
    }

    const container = this.containerRef?.nativeElement;
    // Check if contentvisibilityautostatechange is supported
    if (container && container.addEventListener) {
      container.addEventListener('contentvisibilityautostatechange', (event: any) => {
        if (event.skipped) {
          this.stopAnimation();
        } else {
          this.startAnimation();
        }
      });
    }
  }

  public startAnimation(): void {
    if (this.isRendering) return;
    this.isRendering = true;
    const loop = () => {
      this.render();
      if (this.isRendering) {
        this.animationId = requestAnimationFrame(loop);
      }
    };
    this.animationId = requestAnimationFrame(loop);
  }

  public stopAnimation(): void {
    this.isRendering = false;
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  public toggleLayout(): void {
    const current = this.layout();
    if (current === 'split') this.layout.set('side-by-side');
    else if (current === 'side-by-side') this.layout.set('mirror');
    else this.layout.set('split');
  }

  public toggleTheme(): void {
    const themes: VisualizerTheme[] = ['vfd-cyan', 'kenwood-amber', 'technics-green', 'ice-blue'];
    const idx = themes.indexOf(this.theme());
    this.theme.set(themes[(idx + 1) % themes.length]);
  }

  public togglePeakHold(): void {
    const modes: PeakHoldMode[] = ['normal', 'slow', 'infinite', 'off'];
    const idx = modes.indexOf(this.peakHold());
    this.peakHold.set(modes[(idx + 1) % modes.length]);
  }

  public adjustSensitivity(delta: number): void {
    const current = this.sensitivity();
    const updated = Math.max(0.4, Math.min(2.5, current + delta));
    this.sensitivity.set(Math.round(updated * 10) / 10);
  }

  /**
   * Main 60fps render routine
   */
  private render(): void {
    if (!this.ctx || this.cssWidth <= 0 || this.cssHeight <= 0) return;

    const ctx = this.ctx;
    const dpr = this.dpr;
    const width = this.cssWidth * dpr;
    const height = this.cssHeight * dpr;

    // Get real frequency analysis for Left and Right channels (24 bands each)
    const analysis = this.audioEngine.getAnalysis(this.sensitivity(), this.peakHold());
    this.leftRms.set(analysis.left.rms);
    this.rightRms.set(analysis.right.rms);

    const palette = PALETTES[this.theme()];
    const layout = this.layout();
    const segments = this.segmentCount();
    const showGhost = this.ghostSegments();

    // 1. Draw VFD smoked glass background
    this.drawBackground(ctx, width, height, palette);

    // 2. Render layout
    if (layout === 'split') {
      // Split mode: Top Left channel (24 bands), Bottom Right channel (24 bands)
      const channelHeight = (height - 60 * dpr) / 2;
      const topY = 24 * dpr;
      const bottomY = topY + channelHeight + 20 * dpr;

      this.drawChannelHeader(ctx, 'LEFT CHANNEL (CH 1)', 30 * dpr, topY + 12 * dpr, palette);
      this.drawSpectrumGrid(ctx, 60 * dpr, topY + 20 * dpr, width - 90 * dpr, channelHeight - 34 * dpr, palette);
      this.draw24Bands(
        ctx,
        analysis.left.bandLevels,
        analysis.left.peakLevels,
        60 * dpr,
        topY + 20 * dpr,
        width - 90 * dpr,
        channelHeight - 34 * dpr,
        segments,
        palette,
        showGhost
      );
      this.drawFrequencyLabels(ctx, 60 * dpr, topY + channelHeight - 4 * dpr, width - 90 * dpr, palette);

      this.drawChannelHeader(ctx, 'RIGHT CHANNEL (CH 2)', 30 * dpr, bottomY + 12 * dpr, palette);
      this.drawSpectrumGrid(ctx, 60 * dpr, bottomY + 20 * dpr, width - 90 * dpr, channelHeight - 34 * dpr, palette);
      this.draw24Bands(
        ctx,
        analysis.right.bandLevels,
        analysis.right.peakLevels,
        60 * dpr,
        bottomY + 20 * dpr,
        width - 90 * dpr,
        channelHeight - 34 * dpr,
        segments,
        palette,
        showGhost
      );
      this.drawFrequencyLabels(ctx, 60 * dpr, bottomY + channelHeight - 4 * dpr, width - 90 * dpr, palette);
    } else if (layout === 'side-by-side') {
      // Side-by-side mode: Left 24 bands on Left half, Right 24 bands on Right half
      const halfWidth = (width - 120 * dpr) / 2;
      const startY = 36 * dpr;
      const h = height - 76 * dpr;

      // Left Channel
      this.drawChannelHeader(ctx, 'L-CH (24 BANDS)', 30 * dpr, startY - 8 * dpr, palette);
      this.drawSpectrumGrid(ctx, 40 * dpr, startY, halfWidth, h, palette);
      this.draw24Bands(
        ctx,
        analysis.left.bandLevels,
        analysis.left.peakLevels,
        40 * dpr,
        startY,
        halfWidth,
        h,
        segments,
        palette,
        showGhost
      );
      this.drawFrequencyLabels(ctx, 40 * dpr, startY + h + 24 * dpr, halfWidth, palette, true);

      // Center separator divider
      const dividerX = 40 * dpr + halfWidth + 20 * dpr;
      ctx.strokeStyle = palette.gridColor;
      ctx.lineWidth = 2 * dpr;
      ctx.beginPath();
      ctx.moveTo(dividerX, startY);
      ctx.lineTo(dividerX, startY + h);
      ctx.stroke();

      // Right Channel
      const rightStartX = dividerX + 20 * dpr;
      this.drawChannelHeader(ctx, 'R-CH (24 BANDS)', rightStartX - 10 * dpr, startY - 8 * dpr, palette);
      this.drawSpectrumGrid(ctx, rightStartX, startY, halfWidth, h, palette);
      this.draw24Bands(
        ctx,
        analysis.right.bandLevels,
        analysis.right.peakLevels,
        rightStartX,
        startY,
        halfWidth,
        h,
        segments,
        palette,
        showGhost
      );
      this.drawFrequencyLabels(ctx, rightStartX, startY + h + 24 * dpr, halfWidth, palette, true);
    } else {
      // Mirror mode: Left channel grows outward to left, Right grows outward to right from center
      const startY = 36 * dpr;
      const h = height - 76 * dpr;
      const fullWidth = width - 80 * dpr;
      const halfWidth = fullWidth / 2;

      this.drawChannelHeader(ctx, 'STEREO MIRROR EQUALIZER - 24 BANDS PER CHANNEL', 30 * dpr, startY - 8 * dpr, palette);
      this.drawSpectrumGrid(ctx, 40 * dpr, startY, fullWidth, h, palette);

      // Left 24 bands reversed (so bass is at center)
      const reversedLeftLevels = [...analysis.left.bandLevels].reverse();
      const reversedLeftPeaks = [...analysis.left.peakLevels].reverse();

      this.draw24Bands(
        ctx,
        reversedLeftLevels,
        reversedLeftPeaks,
        40 * dpr,
        startY,
        halfWidth - 10 * dpr,
        h,
        segments,
        palette,
        showGhost
      );

      this.draw24Bands(
        ctx,
        analysis.right.bandLevels,
        analysis.right.peakLevels,
        40 * dpr + halfWidth + 10 * dpr,
        startY,
        halfWidth - 10 * dpr,
        h,
        segments,
        palette,
        showGhost
      );

      this.drawFrequencyLabels(ctx, 40 * dpr + halfWidth + 10 * dpr, startY + h + 24 * dpr, halfWidth - 10 * dpr, palette);
    }

    // 3. Render VFD smoked glass sheen overlay
    this.drawGlassSheen(ctx, width, height);
  }

  private drawBackground(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    palette: ColorPalette
  ): void {
    // Deep dark chassis / VFD vacuum glass color
    ctx.fillStyle = '#06080d';
    ctx.fillRect(0, 0, width, height);

    // Subtle dark radial tint
    const grad = ctx.createRadialGradient(
      width / 2, height / 2, width * 0.1,
      width / 2, height / 2, width * 0.7
    );
    grad.addColorStop(0, '#0a0f18');
    grad.addColorStop(1, '#030508');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Subtle phosphor dot matrix background grid
    if (this.showGrid()) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.015)';
      const step = 8 * this.dpr;
      for (let x = 0; x < width; x += step) {
        for (let y = 0; y < height; y += step) {
          ctx.fillRect(x, y, 1, 1);
        }
      }
    }
  }

  private drawSpectrumGrid(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    palette: ColorPalette
  ): void {
    if (!this.showGrid()) return;

    ctx.save();
    ctx.strokeStyle = palette.gridColor;
    ctx.lineWidth = 1;
    ctx.setLineDash([2 * this.dpr, 4 * this.dpr]);

    const levels = ['+6', '+3', ' 0', '-3', '-6', '-10', '-15', '-20'];
    ctx.font = `${Math.max(8, 9 * this.dpr)}px "Share Tech Mono", "Consolas", monospace`;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    for (let i = 0; i < levels.length; i++) {
      const lineY = y + (i / (levels.length - 1)) * height;
      ctx.beginPath();
      ctx.moveTo(x, lineY);
      ctx.lineTo(x + width, lineY);
      ctx.stroke();

      // dB tick label on left
      ctx.fillText(`${levels[i]}dB`, x - 6 * this.dpr, lineY);
    }

    ctx.restore();
  }

  private drawChannelHeader(
    ctx: CanvasRenderingContext2D,
    title: string,
    x: number,
    y: number,
    palette: ColorPalette
  ): void {
    ctx.save();
    ctx.font = `bold ${Math.max(9, 10 * this.dpr)}px "Share Tech Mono", "Consolas", monospace`;
    ctx.fillStyle = palette.accent;
    ctx.shadowColor = palette.normalGlow;
    ctx.shadowBlur = 4 * this.dpr;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.fillText(title, x, y);
    ctx.restore();
  }

  /**
   * Render 24 segmented bars and peak hold segments with phosphor glow
   */
  private draw24Bands(
    ctx: CanvasRenderingContext2D,
    bandLevels: number[],
    peakLevels: number[],
    x: number,
    y: number,
    width: number,
    height: number,
    segmentCount: number,
    palette: ColorPalette,
    showGhost: boolean
  ): void {
    const bandCount = 24;
    const bandSpacing = Math.max(2 * this.dpr, Math.min(8 * this.dpr, (width / bandCount) * 0.1));
    const totalSpacing = bandSpacing * (bandCount - 1);
    const bandWidth = (width - totalSpacing) / bandCount;

    const segmentGap = 1.8 * this.dpr;
    const totalSegGap = segmentGap * (segmentCount - 1);
    const segmentHeight = (height - totalSegGap) / segmentCount;

    for (let i = 0; i < bandCount; i++) {
      const colX = x + i * (bandWidth + bandSpacing);
      const level = bandLevels[i] || 0;
      const peak = peakLevels[i] || 0;

      const activeSegments = Math.round(level * segmentCount);
      const peakSegmentIdx = Math.min(segmentCount - 1, Math.round(peak * segmentCount));

      // Draw vertical column segments
      for (let s = 0; s < segmentCount; s++) {
        // s = 0 is bottom segment, s = segmentCount - 1 is top segment
        const segY = y + height - (s + 1) * segmentHeight - s * segmentGap;

        // Color coding by height (Kenwood style: cyan bottom -> amber mid -> red top)
        let segColor = palette.normal;
        let segGlow = palette.normalGlow;

        const ratio = s / segmentCount;
        if (ratio >= 0.82) {
          segColor = palette.peak;
          segGlow = palette.peakGlow;
        } else if (ratio >= 0.65) {
          segColor = palette.mid;
          segGlow = palette.midGlow;
        }

        const isLit = s < activeSegments;

        if (isLit) {
          // Lit Segment with VFD phosphor glow
          ctx.save();
          ctx.shadowColor = segGlow;
          ctx.shadowBlur = 6 * this.dpr;
          ctx.fillStyle = segColor;
          ctx.fillRect(colX, segY, bandWidth, segmentHeight);

          // Subtle bright center highlight on each phosphor block
          ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
          ctx.fillRect(colX + 1, segY + 1, bandWidth - 2, Math.max(1, segmentHeight * 0.3));
          ctx.restore();
        } else if (showGhost) {
          // Unlit / ghost VFD segment
          ctx.fillStyle = palette.ghost;
          ctx.fillRect(colX, segY, bandWidth, segmentHeight);
        }
      }

      // Draw Peak Hold Segment
      if (peakSegmentIdx > 0) {
        const peakSegY = y + height - (peakSegmentIdx + 1) * segmentHeight - peakSegmentIdx * segmentGap;

        let peakColor = palette.normal;
        let peakGlow = palette.normalGlow;
        const ratio = peakSegmentIdx / segmentCount;
        if (ratio >= 0.82) {
          peakColor = palette.peak;
          peakGlow = palette.peakGlow;
        } else if (ratio >= 0.65) {
          peakColor = palette.mid;
          peakGlow = palette.midGlow;
        }

        ctx.save();
        ctx.shadowColor = peakGlow;
        ctx.shadowBlur = 10 * this.dpr;
        ctx.fillStyle = '#ffffff'; // White-hot core
        ctx.fillRect(colX, peakSegY, bandWidth, segmentHeight);

        ctx.fillStyle = peakColor;
        ctx.fillRect(colX, peakSegY + 1, bandWidth, Math.max(1, segmentHeight - 2));
        ctx.restore();
      }
    }
  }

  private drawFrequencyLabels(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    palette: ColorPalette,
    compact = false
  ): void {
    const bandCount = 24;
    const bandSpacing = Math.max(2 * this.dpr, Math.min(8 * this.dpr, (width / bandCount) * 0.1));
    const totalSpacing = bandSpacing * (bandCount - 1);
    const bandWidth = (width - totalSpacing) / bandCount;

    ctx.save();
    ctx.font = `${Math.max(7, (compact ? 7 : 8.5) * this.dpr)}px "Share Tech Mono", "Consolas", monospace`;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    for (let i = 0; i < bandCount; i++) {
      const colCenterX = x + i * (bandWidth + bandSpacing) + bandWidth / 2;
      const label = this.bands[i].label;

      if (compact && i % 2 !== 0 && bandWidth < 18 * this.dpr) {
        // Skip alternate labels on narrow displays in side-by-side mode
        continue;
      }
      ctx.fillText(label, colCenterX, y);
    }

    ctx.restore();
  }

  private drawGlassSheen(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    // 90s smoked acrylic glass reflection line across top third
    const sheenGrad = ctx.createLinearGradient(0, 0, width, height * 0.4);
    sheenGrad.addColorStop(0, 'rgba(255, 255, 255, 0.05)');
    sheenGrad.addColorStop(0.3, 'rgba(255, 255, 255, 0.02)');
    sheenGrad.addColorStop(0.31, 'rgba(255, 255, 255, 0.07)');
    sheenGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = sheenGrad;
    ctx.fillRect(0, 0, width, height * 0.45);

    // Outer dark bezel inner shadow
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.lineWidth = 4 * this.dpr;
    ctx.strokeRect(0, 0, width, height);
  }
}
