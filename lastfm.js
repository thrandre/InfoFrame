var LastFm;
(function (LastFm) {
    var ScrobbleProvider = (function () {
        function ScrobbleProvider(username, apiKey) {
            this.username = username;
            this.apiKey = apiKey;
        }
        ScrobbleProvider.prototype.parseScrobbleData = function (data) {
            return {
                artist: data.artist["#text"],
                track: data.name,
                album: data.album["#text"],
                imageUrl: data.image[3] ? data.image[3]["#text"].replace("300x300", "500") : "",
                nowPlaying: data["@attr"] ? data["@attr"].nowplaying == "true" : false
            };
        };
        ScrobbleProvider.prototype.getApiUrl = function () {
            return "http://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=" + this.username + "&api_key=" + this.apiKey + "&format=json";
        };
        ScrobbleProvider.prototype.getPlayingTrack = function () {
            var _this = this;
            return $.getJSON(this.getApiUrl()).then(function (data) { return data.recenttracks.track.map(function (d) { return _this.parseScrobbleData(d); }).filter(function (d) { return d.nowPlaying; })[0]; });
        };
        return ScrobbleProvider;
    })();
    LastFm.ScrobbleProvider = ScrobbleProvider;
})(LastFm || (LastFm = {}));
//# sourceMappingURL=lastfm.js.map