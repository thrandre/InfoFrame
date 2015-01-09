var Timer = (function () {
    function Timer(action) {
        this.action = action;
    }
    Timer.prototype.tick = function () {
        if (!this.maxTimes || this.times < this.maxTimes) {
            this.action();
            this.times++;
        }
        else {
            window.clearInterval(this.handle);
        }
    };
    Timer.prototype.start = function (interval, immediate, times) {
        var _this = this;
        if (immediate === void 0) { immediate = false; }
        this.times = 0;
        this.maxTimes = times;
        this.handle = window.setInterval(function () { return _this.tick(); }, interval);
        if (immediate) {
            window.setTimeout(function () { return _this.action(); }, 0);
        }
    };
    Timer.prototype.stop = function () {
        if (!this.handle) {
            return;
        }
        window.clearInterval(this.handle);
    };
    Timer.create = function (action) {
        return new Timer(action);
    };
    return Timer;
})();
module.exports = Timer;
//# sourceMappingURL=Timer.js.map