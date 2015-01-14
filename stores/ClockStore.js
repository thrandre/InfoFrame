var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var Store = require("../Store");
var Moment = require("moment");
var ClockStore = (function (_super) {
    __extends(ClockStore, _super);
    function ClockStore() {
        var _this = this;
        _super.call(this);
        setInterval(function () { return _this.trigger(_this.getState()); }, 10000);
    }
    ClockStore.prototype.getState = function () {
        return { datetime: Moment() };
    };
    return ClockStore;
})(Store);
var clockStore = new ClockStore();
module.exports = clockStore;
//# sourceMappingURL=ClockStore.js.map