import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RadioTunerComponent } from './radio-tuner';
import { RadioTunerService } from '../../services/radio-tuner.service';
import { AudioEngineService } from '../../services/audio-engine.service';
import { SynthGeneratorService } from '../../services/synth-generator.service';

describe('RadioTunerComponent', () => {
  let component: RadioTunerComponent;
  let fixture: ComponentFixture<RadioTunerComponent>;
  let tunerService: RadioTunerService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RadioTunerComponent],
      providers: [RadioTunerService, AudioEngineService, SynthGeneratorService]
    }).compileComponents();

    fixture = TestBed.createComponent(RadioTunerComponent);
    component = fixture.componentInstance;
    tunerService = TestBed.inject(RadioTunerService);
    fixture.detectChanges();
  });

  it('should create the radio tuner component', () => {
    expect(component).toBeTruthy();
  });

  it('should render Kenwood KT-2400 model designation', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.brand-name')?.textContent).toContain('KENWOOD');
    expect(compiled.querySelector('.model-number')?.textContent).toContain('KT-2400');
  });

  it('should render 8 BBC Radio preset buttons with station logos', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const presetButtons = compiled.querySelectorAll('.preset-button');
    expect(presetButtons.length).toBe(8);

    const firstButton = presetButtons[0];
    expect(firstButton.textContent).toContain('P-01');
    expect(firstButton.querySelector('svg.bbc-station-logo')).toBeTruthy();
  });

  it('should change preset on preset button click', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const presetButtons = compiled.querySelectorAll('.preset-button');
    (presetButtons[1] as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(tunerService.activePreset()?.name).toBe('BBC Radio 2');
    expect(presetButtons[1].classList.contains('active')).toBe(true);
  });

  it('should step tune on tune buttons click', () => {
    const initialFreq = tunerService.frequencyMhz();
    component.onTuneUp();
    fixture.detectChanges();

    expect(tunerService.frequencyMhz()).not.toBe(initialFreq);
  });

  it('should switch radio bands on band pill click', () => {
    component.onSetBand('AM');
    fixture.detectChanges();
    expect(tunerService.band()).toBe('AM');

    component.onSetBand('DAB');
    fixture.detectChanges();
    expect(tunerService.band()).toBe('DAB');
  });
});
