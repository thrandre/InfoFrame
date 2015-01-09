var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var Simple;
(function (Simple) {
    var Events = (function () {
        function Events() {
            this.listeners = {};
        }
        Events.prototype.on = function (event, callback, context) {
            (this.listeners[event] || (this.listeners[event] = [])).push({ callback: callback, context: context });
        };
        Events.prototype.off = function (event, callback, context) {
            if (!callback && !context) {
                delete this.listeners[event];
            }
            var events = this.listeners[event] || [];
            for (var i = 0; i < events.length; i++) {
                if (!(callback && events[i].callback !== callback || context && events[i].context !== context)) {
                    events.splice(i, 1);
                }
            }
        };
        Events.prototype.trigger = function (event, data) {
            var events = this.listeners[event] || [];
            for (var i = 0; i < events.length; i++) {
                events[i].callback.apply(events[i].context || this, [data]);
            }
        };
        return Events;
    })();
    Simple.Events = Events;
    var Controller = (function (_super) {
        __extends(Controller, _super);
        function Controller() {
            _super.apply(this, arguments);
        }
        return Controller;
    })(Events);
    Simple.Controller = Controller;
    var View = (function (_super) {
        __extends(View, _super);
        function View(el, controller) {
            _super.call(this);
            this.el = el;
            this.controller = controller;
            this._template = new Template(function () { return el; });
        }
        View.prototype.initialize = function () {
        };
        View.prototype.render = function () {
        };
        return View;
    })(Events);
    Simple.View = View;
    var Template = (function () {
        function Template(factory) {
            this.factory = factory;
        }
        Template.prototype.compile = function (map) {
            var _this = this;
            return function (data) {
                var el = _this.factory();
                Object.keys(map).forEach(function (i) {
                    map[i](el.find(i), data);
                });
                return el;
            };
        };
        return Template;
    })();
    Simple.Template = Template;
})(Simple || (Simple = {}));
//# sourceMappingURL=simple.js.map