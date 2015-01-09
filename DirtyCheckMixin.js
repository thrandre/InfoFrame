var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var TReact = require("./TReact");
var DirtyCheckMixin = (function (_super) {
    __extends(DirtyCheckMixin, _super);
    function DirtyCheckMixin() {
        _super.apply(this, arguments);
    }
    DirtyCheckMixin.prototype.shouldComponentUpdate = function (nextProps) {
        return JSON.stringify(this.props) !== JSON.stringify(nextProps);
    };
    return DirtyCheckMixin;
})(TReact.Mixin);
module.exports = DirtyCheckMixin;
//# sourceMappingURL=DirtyCheckMixin.js.map