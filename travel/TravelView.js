var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var TReact = require("../TReact");
var Moment = require("moment");
var Tween = require("tween.js");
var $ = require("jquery");
var TravelView = (function (_super) {
    __extends(TravelView, _super);
    function TravelView() {
        _super.apply(this, arguments);
        this.animating = false;
    }
    TravelView.prototype.getInitialState = function () {
        return {
            left: 0
        };
    };
    TravelView.prototype.componentDidMount = function () {
        this.animate(this.getDOMNode());
    };
    TravelView.prototype.componentDidUpdate = function () {
        this.animate(this.getDOMNode());
    };
    TravelView.prototype.getDepartureString = function (departure) {
        var diff = departure.diff(Moment(), "seconds");
        if (diff < 60) {
            return "nå";
        }
        if (diff < 660) {
            return departure.diff(Moment(), "minutes") + " min";
        }
        return "ca " + departure.format("HH:mm");
    };
    TravelView.prototype.tween = function (valueGetter, valueSetter, props, onComplete) {
        var tweenFrom = { value: valueGetter() || 0 };
        var tweenTo = { value: props.endValue || 0 };
        var tween = new Tween.Tween(tweenFrom).to(tweenTo, props.duration || 0).easing(props.easing || Tween.Easing.Linear.None).onUpdate(function () { return valueSetter(tweenFrom.value); }).onComplete(onComplete);
        return { start: function () { return tween.start(); } };
    };
    TravelView.prototype.animate = function (domNode) {
        if (this.animating || $(domNode).find(".entry").length === 0) {
            return;
        }
        this.animating = true;
        this.scroll();
    };
    TravelView.prototype.scroll = function () {
        var _this = this;
        var domNode = $(this.getDOMNode());
        this.setState({ left: domNode.parent().width() });
        this.tween(function () { return _this.state.left; }, function (val) { return _this.setState({ left: val }); }, { endValue: domNode.get(0).scrollWidth * -1, duration: 60 * 1000 }, function () { return _this.scroll(); }).start();
    };
    TravelView.prototype.render = function () {
        var _this = this;
        var entries = (this.props.travelEntries || []).map(function (e) {
            return {
                line: e.line,
                destination: e.destination,
                direction: e.direction === 1 ? "Ø" : "V",
                departure: _this.getDepartureString(e.departure)
            };
        });
        ;
        return TReact.jsx(require("./TravelView.jsx"), entries, this);
    };
    return TravelView;
})(TReact.Component);
var TravelViewClass = TReact.createClass(TravelView);
module.exports = TravelViewClass;
//# sourceMappingURL=TravelView.js.map