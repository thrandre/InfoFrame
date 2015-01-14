var $ = require("jquery");
var Moment = require("moment");
var NewsActions = require("./NewsActions");
var RequestState = require("../RequestState");
var NewsService = (function () {
    function NewsService() {
    }
    NewsService.prototype.parseArticleData = function (data) {
        var entry = $(data);
        return {
            id: entry.find("id").text(),
            title: entry.find("title").text(),
            summary: entry.find("summary").text(),
            updated: Moment(entry.find("updated").text())
        };
    };
    NewsService.prototype.getApiUrl = function () {
        return "http://www.vg.no/rss/feed/?categories=1075,1068,1072,1107,1074&keywords=&limit=25&format=atom";
    };
    NewsService.prototype.getArticles = function () {
        var _this = this;
        NewsActions.getArticleData.trigger({ state: 0 /* Pending */ });
        return $.get(this.getApiUrl()).then(function (data) { return NewsActions.getArticleData.trigger({ data: $(data).find("entry").map(function (i, e) { return _this.parseArticleData(e); }).toArray(), state: 2 /* Success */ }); });
    };
    return NewsService;
})();
module.exports = NewsService;
//# sourceMappingURL=NewsService.js.map