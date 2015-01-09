var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var React = require("react/addons");
var NotImplementedError = (function () {
    function NotImplementedError(methodName) {
        this.name = "NotImplementedError";
        this.message = methodName + " should be implemented by React";
    }
    return NotImplementedError;
})();
exports.NotImplementedError = NotImplementedError;
var Mixin = (function () {
    function Mixin() {
    }
    Mixin.prototype.getDOMNode = function () {
        throw new NotImplementedError("getDomNode");
    };
    Mixin.prototype.setState = function (nextState, callback) {
        throw new NotImplementedError("setState");
    };
    Mixin.prototype.replaceState = function (nextState, callback) {
        throw new NotImplementedError("replaceState");
    };
    Mixin.prototype.forceUpdate = function (callback) {
        throw new NotImplementedError("forceUpdate");
    };
    Mixin.prototype.isMounted = function () {
        throw new NotImplementedError("isMounted");
    };
    Mixin.prototype.setProps = function (nextProps, callback) {
        throw new NotImplementedError("setProps");
    };
    Mixin.prototype.replaceProps = function (nextProps, callback) {
        throw new NotImplementedError("replaceProps");
    };
    return Mixin;
})();
exports.Mixin = Mixin;
var Component = (function (_super) {
    __extends(Component, _super);
    function Component() {
        _super.apply(this, arguments);
    }
    Component.prototype.render = function () {
        return null;
    };
    return Component;
})(Mixin);
exports.Component = Component;
var ILLEGAL_KEYS = {
    constructor: true,
    refs: true,
    props: true,
    state: true,
    getDOMNode: true,
    setState: true,
    replaceState: true,
    forceUpdate: true,
    isMounted: true,
    setProps: true,
    replaceProps: true
};
function extractPrototype(clazz) {
    var proto = {};
    for (var key in clazz.prototype) {
        if (ILLEGAL_KEYS[key] === undefined) {
            proto[key] = clazz.prototype[key];
        }
    }
    return proto;
}
function createMixin(clazz) {
    return extractPrototype(clazz);
}
exports.createMixin = createMixin;
function createClass(clazz, mixins) {
    var spec = extractPrototype(clazz);
    spec.displayName = clazz.prototype.constructor.name;
    if (spec.componentWillMount !== undefined) {
        var componentWillMount = spec.componentWillMount;
        spec.componentWillMount = function () {
            clazz.apply(this);
            componentWillMount.apply(this);
        };
    }
    else {
        spec.componentWillMount = function () {
            clazz.apply(this);
        };
    }
    if (mixins !== undefined && mixins !== null) {
        spec.mixins = mixins;
    }
    return React.createClass(spec);
}
exports.createClass = createClass;
function jsx(transformedJsx, data, context) {
    return transformedJsx.call(context || this, data);
}
exports.jsx = jsx;
//# sourceMappingURL=TReact.js.map