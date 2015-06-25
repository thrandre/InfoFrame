import Action = require("./Action");
import RequestPayload = require("./RequestPayload");
import RequestState = require("./RequestState");

class RequestAction<TIn, TOut> extends Action<RequestPayload<TOut>>
{
    constructor(private loader: (p: TIn) => Promise<TOut>) {
        super();   
    }
    
    listen(callback: (payload?: RequestPayload<TOut>) => any): void {
        return super.listen(callback);
    }
    
    load(p: TIn) {
        this.pending();
        
        this.loader(p)
            .then(v => this.completed({ data: v }))
            .catch(e => this.error({ data: e }));
    }
    
    pending(payload?: RequestPayload<TOut>): Promise<RequestPayload<TOut>> {
        var pl = payload || {};
        
        pl.state = RequestState.Pending;
        
        return super.trigger(pl);
    }
    
    completed(payload?: RequestPayload<TOut>): Promise<RequestPayload<TOut>> {
        var pl = payload || {};
        
        pl.state = RequestState.Success;
        
        return super.trigger(pl);
    }
    
    error(payload?: RequestPayload<TOut>): Promise<RequestPayload<TOut>> {
        var pl = payload || {};
        
        pl.state = RequestState.Error;
        
        return super.trigger(pl);
    }
}

export = RequestAction;