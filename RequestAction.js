var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var Action = require("./Action");
var RequestAction = (function (_super) {
    __extends(RequestAction, _super);
    function RequestAction() {
        _super.apply(this, arguments);
    }
    RequestAction.prototype.listen = function (callback) {
        return _super.prototype.listen.call(this, callback);
    };
    RequestAction.prototype.trigger = function (payload) {
        return _super.prototype.trigger.call(this, payload);
    };
    return RequestAction;
})(Action);
module.exports = RequestAction;
//# sourceMappingURL=RequestAction.js.map