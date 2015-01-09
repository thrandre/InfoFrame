import RequestState = require("./RequestState");

interface RequestPayload<T> {
    data?: T;
    state: RequestState;
}

export = RequestPayload;