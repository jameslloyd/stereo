export type RadioBand = 'FM' | 'AM' | 'DAB';

export interface BbcRadioPreset {
  id: string;
  presetNumber: number;
  name: string;
  shortName: string;
  band: RadioBand;
  frequencyStr: string;
  frequencyMhz: number; // for manual tuning tracking
  genre: string;
  rdsText: string;
  brandColor: string;
  logoBg: string;
  logoColor: string;
  streamUrl: string;
  fallbackType: 'pop' | 'rock' | 'classical' | 'speech' | 'alternative' | 'urban';
}

export const BBC_RADIO_PRESETS: BbcRadioPreset[] = [
  {
    id: 'bbc-radio-1',
    presetNumber: 1,
    name: 'BBC Radio 1',
    shortName: 'RADIO 1',
    band: 'FM',
    frequencyStr: '98.8 MHz',
    frequencyMhz: 98.8,
    genre: 'Dance / Pop / Indie',
    rdsText: 'BBC R1 — THE BEST NEW MUSIC • LIVE LOUNGE SESSIONS',
    brandColor: '#00f2e6',
    logoBg: '#e61b72',
    logoColor: '#ffffff',
    streamUrl: 'https://as-hls-ww-live.akamaized.net/pool_01505109/live/ww/bbc_radio_one/bbc_radio_one.isml/bbc_radio_one-audio=96000.norewind.m3u8',
    fallbackType: 'pop'
  },
  {
    id: 'bbc-radio-2',
    presetNumber: 2,
    name: 'BBC Radio 2',
    shortName: 'RADIO 2',
    band: 'FM',
    frequencyStr: '89.1 MHz',
    frequencyMhz: 89.1,
    genre: 'Adult Contemporary / Rock',
    rdsText: 'BBC R2 — UK MOST LISTENED TO STATION • LIVE MUSIC',
    brandColor: '#ff8800',
    logoBg: '#ff6600',
    logoColor: '#ffffff',
    streamUrl: 'https://as-hls-ww-live.akamaized.net/pool_01505109/live/ww/bbc_radio_two/bbc_radio_two.isml/bbc_radio_two-audio=96000.norewind.m3u8',
    fallbackType: 'rock'
  },
  {
    id: 'bbc-radio-3',
    presetNumber: 3,
    name: 'BBC Radio 3',
    shortName: 'RADIO 3',
    band: 'FM',
    frequencyStr: '91.3 MHz',
    frequencyMhz: 91.3,
    genre: 'Classical / Jazz / World',
    rdsText: 'BBC R3 — IN TUNE • LIVE PROMS • CLASSICAL & JAZZ',
    brandColor: '#ff2d55',
    logoBg: '#b31b38',
    logoColor: '#ffffff',
    streamUrl: 'https://as-hls-ww-live.akamaized.net/pool_01505109/live/ww/bbc_radio_three/bbc_radio_three.isml/bbc_radio_three-audio=96000.norewind.m3u8',
    fallbackType: 'classical'
  },
  {
    id: 'bbc-radio-4',
    presetNumber: 4,
    name: 'BBC Radio 4',
    shortName: 'RADIO 4',
    band: 'FM',
    frequencyStr: '93.5 MHz',
    frequencyMhz: 93.5,
    genre: 'News / Speech / Drama',
    rdsText: 'BBC R4 — TODAY PROGRAMME • THE WORLD TONIGHT',
    brandColor: '#38bdf8',
    logoBg: '#005596',
    logoColor: '#ffffff',
    streamUrl: 'https://as-hls-ww-live.akamaized.net/pool_01505109/live/ww/bbc_radio_fourfm/bbc_radio_fourfm.isml/bbc_radio_fourfm-audio=96000.norewind.m3u8',
    fallbackType: 'speech'
  },
  {
    id: 'bbc-radio-5-live',
    presetNumber: 5,
    name: 'BBC Radio 5 Live',
    shortName: '5 LIVE',
    band: 'AM',
    frequencyStr: '693 kHz',
    frequencyMhz: 0.693,
    genre: 'Live News & Sport',
    rdsText: 'BBC 5L — LIVE PREMIER LEAGUE FOOTBALL & BREAKING NEWS',
    brandColor: '#22c55e',
    logoBg: '#008542',
    logoColor: '#ffffff',
    streamUrl: 'https://as-hls-ww-live.akamaized.net/pool_01505109/live/ww/bbc_radio_five_live/bbc_radio_five_live.isml/bbc_radio_five_live-audio=96000.norewind.m3u8',
    fallbackType: 'speech'
  },
  {
    id: 'bbc-radio-6-music',
    presetNumber: 6,
    name: 'BBC Radio 6 Music',
    shortName: '6 MUSIC',
    band: 'DAB',
    frequencyStr: 'DAB 12B',
    frequencyMhz: 225.648,
    genre: 'Alternative / Indie / Electronica',
    rdsText: 'BBC 6M — ALTERNATIVE MUSIC • CURATED BY ARTISTS',
    brandColor: '#c084fc',
    logoBg: '#592c82',
    logoColor: '#ffffff',
    streamUrl: 'http://as-hls-ww-live.akamaized.net/pool_81827798/live/ww/bbc_6music/bbc_6music.isml/bbc_6music-audio=96000.m3u8',
    fallbackType: 'alternative'
  },
  {
    id: 'bbc-radio-1xtra',
    presetNumber: 7,
    name: 'BBC Radio 1Xtra',
    shortName: '1XTRA',
    band: 'DAB',
    frequencyStr: 'DAB 12B',
    frequencyMhz: 225.648,
    genre: 'Hip-Hop / RnB / Grime',
    rdsText: 'BBC 1X — WE REP THE CULTURE • HIP HOP, R&B & DANCEHALL',
    brandColor: '#ffcc00',
    logoBg: '#111111',
    logoColor: '#f59e0b',
    streamUrl: 'https://as-hls-ww-live.akamaized.net/pool_01505109/live/ww/bbc_1xtra/bbc_1xtra.isml/bbc_1xtra-audio=96000.norewind.m3u8',
    fallbackType: 'urban'
  },
  {
    id: 'bbc-world-service',
    presetNumber: 8,
    name: 'BBC World Service',
    shortName: 'WORLD SVC',
    band: 'AM',
    frequencyStr: '648 kHz',
    frequencyMhz: 0.648,
    genre: 'Global News & Analysis',
    rdsText: 'BBC WS — WORLD NEWS & DISCOVERY • BROADCASTING TO THE WORLD',
    brandColor: '#ff2d55',
    logoBg: '#cc0000',
    logoColor: '#ffffff',
    streamUrl: 'http://stream.live.vc.bbcmedia.co.uk/bbc_world_service',
    fallbackType: 'speech'
  }
];
