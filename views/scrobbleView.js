var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var Views;
(function (Views) {
    var ScrobbleView = (function (_super) {
        __extends(ScrobbleView, _super);
        function ScrobbleView(el, mediator) {
            _super.call(this, el);
            this.el = el;
            this.mediator = mediator;
            this.initialize();
        }
        ScrobbleView.prototype.initialize = function () {
            this.mediator.on("scrobble-update", this.update, this);
            this.compileTemplate();
        };
        ScrobbleView.prototype.compileTemplate = function () {
            this.template = this._template.compile({
                "": function (e, d) { return e.andSelf().css("background", "linear-gradient( rgba(181, 0, 0, 0.45), rgba(181, 0, 0, 1) ), url('" + d.imageUrl + "') top/cover no-repeat"); },
                ".track": function (e, d) { return e.text(d.track); },
                ".artist": function (e, d) { return e.text(d.artist); },
                ".album": function (e, d) { return e.text(d.album); }
            });
        };
        ScrobbleView.prototype.update = function (data) {
            if (!data) {
                this.template({ track: "", artist: "", album: "", imageUrl: "" });
                return;
            }
            this.template(data);
        };
        return ScrobbleView;
    })(Simple.View);
    Views.ScrobbleView = ScrobbleView;
})(Views || (Views = {}));
//# sourceMappingURL=scrobbleView.js.map