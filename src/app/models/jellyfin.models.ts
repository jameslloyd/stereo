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
  Type: 'Folder' | 'MusicAlbum' | 'Audio' | 'MusicArtist';
  RunTimeTicks?: number;
  Artists?: string[];
  AlbumArtist?: string;
  Album?: string;
  ProductionYear?: number;
  ImageTags?: {
    Primary?: string;
    Thumb?: string;
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
