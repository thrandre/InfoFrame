var Immutable = require("immutable");
var Cursor = require("immutable/contrib/cursor");
var CursorExpr = require("./ImmCursorExpression");
var ImmCursor = (function () {
    function ImmCursor(cursor) {
        this.cursor = cursor;
    }
    ImmCursor.prototype.get = function (cursorExpr) {
        return this.cursor.get(CursorExpr(cursorExpr, true));
    };
    ImmCursor.prototype.getIn = function (cursorExpr) {
        return this.cursor.getIn(CursorExpr(cursorExpr));
    };
    ImmCursor.prototype.update = function (cursorExpr, updater) {
        return new ImmCursor(this.cursor.update(CursorExpr(cursorExpr, true), updater));
    };
    return ImmCursor;
})();
var Imm = (function () {
    function Imm(data) {
        this.data = Immutable.fromJS(data);
    }
    Imm.prototype.cursor = function (cursorExpr) {
        var _this = this;
        return new ImmCursor(Cursor.from(this.data, CursorExpr(cursorExpr), function (newData) {
            _this.data = newData;
        }));
    };
    return Imm;
})();
var create = function (struct) { return new Imm(struct); };
module.exports = create;
//# sourceMappingURL=Imm.js.map