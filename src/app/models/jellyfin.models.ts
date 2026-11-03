export interface JellyfinServerConfig {
  serverUrl: string;
  username: string;
  userId: string;
  accessToken: string;
  serverName?: string;
  version?: string;
}

export interface JellyfinAuthResponse {
  User: {
    Id: string;
    Name: string;
  };
  AccessToken: string;
  ServerId: string;
}

export interface JellyfinItem {
  Id: string;
  Name: string;
  Type: 'Folder' | 'MusicAlbum' | 'Audio' | 'MusicArtist' | 'Playlist' | 'MusicGenre';
  RunTimeTicks?: number;
  CumulativeRunTimeTicks?: number;
  ChildCount?: number;
  Overview?: string;
  Artists?: string[];
  AlbumArtist?: string;
  Album?: string;
  AlbumId?: string;
  ProductionYear?: number;
  Genres?: string[];
  GenreItems?: Array<{ Name: string; Id: string }>;
  ArtistItems?: Array<{ Name: string; Id: string }>;
  ImageTags?: {
    Primary?: string;
    Thumb?: string;
    Banner?: string;
    Logo?: string;
  };
  IndexNumber?: number; // Track number
  ParentIndexNumber?: number; // Disc number
  MediaSources?: Array<{
    Container?: string;
    Bitrate?: number;
    Size?: number;
  }>;
}

export interface JellyfinItemsResponse {
  Items: JellyfinItem[];
  TotalRecordCount: number;
  StartIndex: number;
}
