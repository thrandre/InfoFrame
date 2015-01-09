var Promises = require("es6-promise");
var Promise = Promises.Promise;
var Dispatcher = (function () {
    function Dispatcher() {
        this.callbacks = [];
        this.promises = [];
    }
    Dispatcher.prototype.listen = function (callback) {
        this.callbacks.push(callback);
    };
    Dispatcher.prototype.trigger = function (payload) {
        var resolves = [];
        var rejects = [];
        this.promises = this.callbacks.map(function (_, i) { return new Promise(function (resolve, reject) {
            resolves[i] = resolve;
            rejects[i] = reject;
        }); });
        this.callbacks.forEach(function (callback, i) { return Promise.resolve(callback(payload)).then(function () { return resolves[i](payload); }); });
        return Promise.all(this.promises).then(function () { return payload; });
    };
    Dispatcher.prototype.waitFor = function () {
        return Promise.all(this.promises);
    };
    return Dispatcher;
})();
module.exports = Dispatcher;
//# sourceMappingURL=Dispatcher.js.map