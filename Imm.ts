import Immutable = require("immutable");
import Cursor = require("immutable/contrib/cursor");
import CursorExpr = require("./ImmCursorExpression");

class ImmCursor<TIn>
{
    constructor(private cursor: Cursor.Cursor) { }

    get<TOut>(cursorExpr: (root: TIn) => TOut): TOut
    {
        return this.cursor.get(CursorExpr(cursorExpr, true));
    }

    getIn<TOut>(cursorExpr: (root: TIn) => TOut): TOut
    {
        return this.cursor.getIn(CursorExpr(cursorExpr));
    }

    update<TOut>(cursorExpr: (root: TIn) => TOut, updater: (value: TOut) => TOut): ImmCursor<TIn>
    {
        return new ImmCursor<TIn>(this.cursor.update(CursorExpr(cursorExpr, true), updater));
    }
}

class Imm<TIn>
{
    private data: any;

    constructor(data: TIn)
    {
        this.data = Immutable.fromJS(data);
    }

    cursor<TOut>(cursorExpr: (root: TIn) => TOut): ImmCursor<TOut>
    {
        return new ImmCursor(Cursor.from(this.data, CursorExpr(cursorExpr), newData =>
        {
            this.data = newData;
        }));
    }
}

var create = <T>(struct: T) => new Imm<T>(struct);

export = create;