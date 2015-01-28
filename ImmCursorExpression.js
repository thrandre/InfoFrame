var ImmCursorExpression = (function () {
    function ImmCursorExpression(expr) {
        this.expr = expr;
        this.funcRegex = /{\s?return\s(.*?);\s?}/i;
        this.indexRegex = /\[([a-zA-Z0-9]+)\]/g;
    }
    ImmCursorExpression.prototype.extractPath = function () {
        var m = this.funcRegex.exec(this.expr.toString());
        return m[1].replace(/\"|\'/g, "").replace(this.indexRegex, ".$1").split(".").slice(1);
    };
    ImmCursorExpression.prototype.getPath = function () {
        return this.path || (this.path = this.extractPath() || []);
    };
    return ImmCursorExpression;
})();
var cache = {};
var expression = function (expr, flatten) {
    var key = expr.toString();
    var path = cache[key] || (cache[key] = new ImmCursorExpression(expr).getPath());
    return flatten ? path[0] : path;
};
module.exports = expression;
//# sourceMappingURL=ImmCursorExpression.js.map