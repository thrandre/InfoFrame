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
        this.distance = 0;
    }
    NewsView.prototype.getInitialState = function () {
        return {
            top: 0,
            translate: "translate(0,0);"
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
        var first = $(domNode).children().first();
        this.animating = true;
        this.distance = first.outerHeight();
        setInterval(function () { return _this.scroll(domNode); }, 15500);
    };
    NewsView.prototype.scroll = function (domNode) {
        var _this = this;
        this.currentArticle++;
        if (this.tween) {
            this.tween.stop();
        }
        if (this.currentArticle >= this.props.articles.length) {
            this.currentArticle = 0;
        }
        var newTop = this.currentArticle * this.distance * -1;
        var tweenObj = $.extend({}, this.state);
        this.tween = new Tween.Tween(tweenObj).to({ top: newTop }, 500).onUpdate(function () {
            _this.setState(tweenObj);
        }).start();
    };
    NewsView.prototype.render = function () {
        return TReact.jsx(require("./NewsView.jsx"), this.props, this);
    };
    return NewsView;
})(TReact.Component);
var NewsViewClass = TReact.createClass(NewsView);
module.exports = NewsViewClass;
//# sourceMappingURL=NewsView.js.map