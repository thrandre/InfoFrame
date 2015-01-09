var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var Views;
(function (Views) {
    var UpdateView = (function (_super) {
        __extends(UpdateView, _super);
        function UpdateView(el, mediator) {
            _super.call(this, el);
            this.el = el;
            this.mediator = mediator;
            this.initialize();
        }
        UpdateView.prototype.initialize = function () {
            this.mediator.on("updateView-show", this.show, this);
            this.mediator.on("clock-update", this.update, this);
            this.renderTemplate();
            this.hide();
        };
        UpdateView.prototype.renderTemplate = function () {
            this.template = this._template.compile({
                ".eta": function (e, d) {
                    var diff = moment(d.created).add("minutes", d.deployMinutes).diff(moment(), "seconds");
                    e.text(Math.floor(diff / 60) + " minutes, " + Math.floor(diff % 60) + " seconds");
                },
                ".commits": function (e, d) {
                    e.empty();
                    d.messages.forEach(function (m) { return e.append($("<li>" + m + "</li>")); });
                }
            });
        };
        UpdateView.prototype.show = function (data) {
            this.currentData = data;
            this.el.show();
        };
        UpdateView.prototype.hide = function () {
            this.el.hide();
        };
        UpdateView.prototype.update = function (data) {
            if (this.el.is(":visible")) {
                this.template(this.currentData);
            }
        };
        return UpdateView;
    })(Simple.View);
    Views.UpdateView = UpdateView;
})(Views || (Views = {}));
//# sourceMappingURL=updateView.js.map