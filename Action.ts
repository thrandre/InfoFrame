/// <reference path="typings/tsd.d.ts"/>

import { Promise } from "es6-promise";
import { Dispatcher } from "./Dispatcher";
import * as Assign from "object-assign";

export enum ActionState {
    Pending,
    Error,
    Success
}

export interface IAction {
    bindToName(name: string);
}

export interface ActionPayload<TPayload> {
    action: any;
	state: ActionState;
    data: TPayload;
}

export interface ServerActionPayload<TPayload> extends ActionPayload<TPayload> {
    state: ActionState;
}

abstract class ActionBase<TPayload> implements IAction {
    
    protected name: string;
    
    constructor(protected dispatcher: Dispatcher) {}
    
    bindToName(name: string) {
        this.name = name;
    }
        
    abstract trigger(payload?: TPayload, state?: ActionState);

}

export class Action<TPayload> extends ActionBase<TPayload> {

    constructor(dispatcher: Dispatcher) {
        super(dispatcher);
    }

    trigger(payload: TPayload, state?: ActionState) {
        this.dispatcher.trigger({ action: this, state: state || ActionState.Success, data: payload });
    }

}

export class ServerAction<TParams, TPayload> extends ActionBase<TParams> {
    
    private _loader;
    
    constructor(dispatcher: Dispatcher) {
        super(dispatcher);
    }
    
    loadWith(loader: (params: TParams) => Promise<TPayload> | TPayload) {
        this._loader = loader;
    }
    
    trigger(params: TParams, state?: ActionState, data?: any) {
        
        if(state) {
            return this.forced(state, data);   
        }
        
        this.pending();
        
        this._loader(Assign({}, params, { $name: this.name }))
            .catch(e => this.error(e))
            .done(v => this.success(v));
    }
    
    private forced(state: ActionState, data: any) {
        this.dispatcher.trigger({ action: this, state, data });
    }
    
    private success(data: TPayload) {
        this.dispatcher.trigger({ action: this, state: ActionState.Success, data });
    }

    private error(err: Error) {
        this.dispatcher.trigger({ action: this, state: ActionState.Error, data });
    }

    private pending(data?: TPayload) {
        this.dispatcher.trigger({ action: this, state: ActionState.Pending, data });
    }

}