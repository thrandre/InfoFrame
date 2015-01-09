var Timer = (function () {
    function Timer(action) {
        this.action = action;
    }
    Timer.prototype.tick = function () {
        if (isUndefined(this.maxTimes) || this.times < this.maxTimes) {
            this.action();
            this.times++;
        }
        else {
            window.clearInterval(this.handle);
        }
    };
    Timer.prototype.trigger = function () {
        this.action();
    };
    Timer.prototype.start = function (interval, times) {
        var _this = this;
        this.times = 0;
        this.maxTimes = times;
        this.handle = window.setInterval(function () { return _this.tick(); }, interval);
    };
    Timer.prototype.stop = function () {
        if (isUndefined(this.handle)) {
            return;
        }
        window.clearInterval(this.handle);
    };
    return Timer;
})();
//# sourceMappingURL=timers.js.map