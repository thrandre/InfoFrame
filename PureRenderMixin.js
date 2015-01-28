var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var TReact = require("./TReact");
var _ = require("lodash");
var PureRenderMixin = (function (_super) {
    __extends(PureRenderMixin, _super);
    function PureRenderMixin() {
        _super.apply(this, arguments);
    }
    PureRenderMixin.prototype.shouldComponentUpdate = function (nextProps, nextState) {
        return !_.isEqual(this.state, nextState) || !_.isEqual(this.props, nextProps);
    };
    return PureRenderMixin;
})(TReact.Mixin);
module.exports = PureRenderMixin;
//# sourceMappingURL=PureRenderMixin.js.map