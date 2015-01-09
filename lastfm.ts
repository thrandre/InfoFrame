module LastFm {

  export interface ScrobbleData {
    artist: string;
    track: string;
    album: string;
    imageUrl: string;
    nowPlaying: boolean;
  }

  export class ScrobbleProvider {
    constructor(private username: string, private apiKey: string) { }

    private parseScrobbleData(data: any): ScrobbleData {
      return {
        artist: data.artist["#text"],
        track: data.name,
        album: data.album["#text"],
        imageUrl: data.image[3] ? data.image[3]["#text"].replace("300x300", "500") : "",
        nowPlaying: data["@attr"] ? data["@attr"].nowplaying == "true" : false
      };
    }

    private getApiUrl(): string {
      return "http://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=" + this.username + "&api_key=" + this.apiKey + "&format=json";
    }

    getPlayingTrack(): JQueryPromise<ScrobbleData> {
      return $.getJSON(this.getApiUrl())
        .then(data => data.recenttracks.track.map(d => this.parseScrobbleData(d)).filter(d => d.nowPlaying)[0]);
    }

  }

}
