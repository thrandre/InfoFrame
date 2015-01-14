var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var $ = require("jquery");
var TReact = require("../TReact");
var Tween = require("tween.js");
var NewsView = (function (_super) {
    __extends(NewsView, _super);
    function NewsView() {
        _super.apply(this, arguments);
        this.animating = false;
        this.currentArticle = 0;
    }
    NewsView.prototype.getInitialState = function () {
        return {
            top: 0
        };
    };
    NewsView.prototype.componentDidMount = function () {
        this.animate(this.getDOMNode());
    };
    NewsView.prototype.componentDidUpdate = function () {
        this.animate(this.getDOMNode());
    };
    NewsView.prototype.animate = function (domNode) {
        var _this = this;
        if (this.animating || !domNode) {
            return;
        }
        this.animating = true;
        var scrollDistance = $(domNode).children().first().outerHeight(true);
        setInterval(function () { return _this.scroll(domNode, scrollDistance); }, 15500);
    };
    NewsView.prototype.scroll = function (domNode, scrollDistance) {
        var _this = this;
        this.currentArticle++;
        if (this.currentArticle >= this.props.articles.length) {
            this.currentArticle = 0;
        }
        var offset = this.currentArticle * scrollDistance * -1;
        this.tween(function () { return _this.state.top; }, function (val) { return _this.setState({ top: val }); }, { endValue: offset, duration: 500 }).start();
    };
    NewsView.prototype.tween = function (valueGetter, valueSetter, props) {
        var tweenFrom = { value: valueGetter() || 0 };
        var tweenTo = { value: props.endValue || 0 };
        var tween = new Tween.Tween(tweenFrom).to(tweenTo, props.duration || 0).easing(props.easing || Tween.Easing.Linear.None).onUpdate(function () { return valueSetter(tweenFrom.value); });
        return { start: function () { return tween.start(); } };
    };
    NewsView.prototype.render = function () {
        return TReact.jsx(require("./NewsView.jsx"), this.props, this);
    };
    return NewsView;
})(TReact.Component);
var NewsViewClass = TReact.createClass(NewsView);
module.exports = NewsViewClass;
//# sourceMappingURL=CalendarView.js.map