var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var Store = require("../Store");
var NewsActions = require("./NewsActions");
var NewsService = require("./NewsService");
var RequestState = require("../RequestState");
var Timer = require("../Timer");
var NewsStore = (function (_super) {
    __extends(NewsStore, _super);
    function NewsStore(newsService) {
        var _this = this;
        _super.call(this);
        this.newsService = newsService;
        NewsActions.getArticleData.listen(function (pl) {
            if (pl.state === 2 /* Success */) {
                _this.state = { articles: pl.data };
                _this.trigger(_this.getState());
            }
        });
        Timer.create(function () { return _this.loadState(); }).start(5 * 60 * 1000, true);
    }
    NewsStore.prototype.loadState = function () {
        this.newsService.getArticles();
    };
    NewsStore.prototype.getState = function () {
        return this.state;
    };
    return NewsStore;
})(Store);
var weatherStore = new NewsStore(new NewsService());
module.exports = weatherStore;
//# sourceMappingURL=NewsStore.js.map