var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var Dispatcher = require("./Dispatcher");
var Store = (function (_super) {
    __extends(Store, _super);
    function Store() {
        _super.apply(this, arguments);
    }
    return Store;
})(Dispatcher);
module.exports = Store;
//# sourceMappingURL=Store.js.map