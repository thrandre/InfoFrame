var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var Actions = require("../Actions");
var RequestAction = require("../RequestAction");
var CalendarActions = (function (_super) {
    __extends(CalendarActions, _super);
    function CalendarActions() {
        _super.apply(this, arguments);
        this.getArticleData = new RequestAction();
    }
    return CalendarActions;
})(Actions);
var calendarActions = new CalendarActions();
module.exports = calendarActions;
//# sourceMappingURL=CalendarActions.js.map