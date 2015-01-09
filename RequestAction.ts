import Action = require("./Action");
import RequestPayload = require("./RequestPayload");

class RequestAction<T> extends Action<RequestPayload<T>>
{
    listen(callback: (payload: RequestPayload<T>) => any): void {
        return super.listen(callback);
    }

    trigger(payload: RequestPayload<T>): Thenable<RequestPayload<T>> {
        return super.trigger(payload);
    }
}

export = RequestAction;