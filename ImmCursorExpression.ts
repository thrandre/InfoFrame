class ImmCursorExpression<TIn, TOut>
{
    private path: string[];
    private funcRegex = /{\s?return\s(.*?);\s?}/i;
    private indexRegex = /\[([a-zA-Z0-9]+)\]/g;

    constructor(private expr: (root: TIn) => TOut) { }

    private extractPath(): string[] {
        var m = this.funcRegex.exec(this.expr.toString());
        return m[1].replace(/\"|\'/g, "").replace(this.indexRegex, ".$1").split(".").slice(1);
    }

    getPath() {
        return this.path || (this.path = this.extractPath() || []);
    }
}

var cache = {};

var expression = <TIn, TOut>(expr: (root: TIn) => TOut, flatten?: boolean): string[] =>
{
    var key = expr.toString();
    var path = cache[key] || (cache[key] = new ImmCursorExpression(expr).getPath());
    return flatten ? path[0] : path;
};

export = expression;