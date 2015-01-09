var Updater;
(function (Updater) {
    var GitHubEventService = (function () {
        function GitHubEventService(username, repository, mediator) {
            this.username = username;
            this.repository = repository;
            this.mediator = mediator;
            this.initialize();
        }
        GitHubEventService.prototype.initialize = function () {
        };
        GitHubEventService.prototype.getApiUrl = function () {
            return "https://api.github.com/repos/" + this.username + "/" + this.repository + "/events";
        };
        GitHubEventService.prototype.parseEvent = function (event) {
            return {
                type: event.type,
                actor: event.actor.login,
                messages: event.type === "PushEvent" ? event.payload.commits.map(function (c) { return c.message; }) : [],
                created: moment(event.created_at),
                deployMinutes: 7
            };
        };
        GitHubEventService.prototype.update = function () {
            var _this = this;
            return $.getJSON(this.getApiUrl()).then(function (data) { return data.map(function (e) { return _this.parseEvent(e); }); });
        };
        GitHubEventService.prototype.getLastEventOfType = function (type) {
            return this.update().then(function (events) { return events.filter(function (e) { return e.type === type; }).sort(function (a, b) { return a.created.isAfter(b.created) ? 1 : -1; }).reverse()[0]; });
        };
        return GitHubEventService;
    })();
    Updater.GitHubEventService = GitHubEventService;
    var AutoUpdater = (function () {
        function AutoUpdater(mediator, eventService) {
            this.mediator = mediator;
            this.eventService = eventService;
            this.initialize();
        }
        AutoUpdater.prototype.initialize = function () {
            this.mediator.on("tick-autoUpdater-check", this.check, this);
        };
        AutoUpdater.prototype.check = function () {
            var _this = this;
            this.eventService.getLastEventOfType("PushEvent").then(function (event) {
                if (isUndefined(event)) {
                    return;
                }
                if (isUndefined(_this.lastEvent)) {
                    _this.lastEvent = event;
                    return;
                }
                if (event.created.isAfter(_this.lastEvent.created)) {
                    _this.mediator.trigger("autoUpdater-update", event);
                    _this.lastEvent = event;
                }
            });
        };
        return AutoUpdater;
    })();
    Updater.AutoUpdater = AutoUpdater;
})(Updater || (Updater = {}));
//# sourceMappingURL=updater.js.map