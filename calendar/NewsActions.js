var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var Actions = require("../Actions");
var RequestAction = require("../RequestAction");
var NewsActions = (function (_super) {
    __extends(NewsActions, _super);
    function NewsActions() {
        _super.apply(this, arguments);
        this.getArticleData = new RequestAction();
    }
    return NewsActions;
})(Actions);
var newsActions = new NewsActions();
module.exports = newsActions;
//# sourceMappingURL=NewsActions.js.map