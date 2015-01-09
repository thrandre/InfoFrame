var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var Dispatcher = require("./Dispatcher");
var Promises = require("es6-promise");
var Promise = Promises.Promise;
var Action = (function (_super) {
    __extends(Action, _super);
    function Action() {
        _super.apply(this, arguments);
    }
    Action.prototype.listen = function (callback) {
        return _super.prototype.listen.call(this, callback);
    };
    Action.prototype.trigger = function (payload) {
        return _super.prototype.trigger.call(this, payload);
    };
    return Action;
})(Dispatcher);
module.exports = Action;
//# sourceMappingURL=Action.js.map