
import { EventEmitter } from "events";
import * as Assign from "object-assign";
import * as Extend from "extend";
import * as DeepFreeze from "deep-freeze";

import { IAction, Action, ServerAction, ActionPayload, ServerActionPayload, ActionState } from "./Action";
import { IStorage } from "./Storage";
import { Dispatcher } from "./Dispatcher";
import { FluxListener, IFluxCallback } from "./FluxListener";

import { Factory, InstantiationMode } from "./Factory";

const CHANGE_EVENT = "CHANGE";

class Utils {
	
	static isStrictlyFalse<T>(val: T) {
		return !val && val !== null && typeof val !== "undefined";
	}

	static isFunction<T>(val: T) {
		return typeof val === "function";
	}
	
}

export interface IStore {
	onChange(callback: () => any);
	offChange(callback: () => any);
}

export class Store extends EventEmitter implements IStore {

	private _storage: {} = {};
	private _listeners: FluxListener<any>[] = [];
	
    constructor(private _dispatcher: Dispatcher) { super(); }

    public bindTo<TPayload>(action: Action<TPayload>, callbacks: IFluxCallback<TPayload>) {
    	let callbackCurryer = (cb, f) => p => f(cb(p));
		let emitCurryer = (cb, emit) => callbackCurryer(cb, r => emit && !Utils.isStrictlyFalse(r) && this.emitChange());
		
		Object.keys(callbacks)
			.filter(key => Utils.isFunction(callbacks[key]))
			.forEach(key => callbacks[key] = emitCurryer(callbacks[key], !Utils.isStrictlyFalse(callbacks.autoEmit)));
		
		this._listeners.push(new FluxListener(this._dispatcher, action, callbacks));
	}

	public bindProps(props: {[key: string]: IStorage<any>}) {
		Object
			.keys(props)
			.filter(key => props.hasOwnProperty(key))
			.forEach(key => this.bindPropToNamespacedStorage(key, props[key]));
	}

	public dump() {
		return this._storage;
	}

	private makePropValueImmutable(obj: any) {
		return obj ? (
			Object.isFrozen(obj) ?
				obj : DeepFreeze(
					typeof obj === "object" ?
						Extend(true, {}, obj) :
						obj
				)
		) : obj;
	}

	private bindPropToNamespacedStorage<TVal>(key: string, storage: IStorage<TVal>) {
		storage.bindToBackingStore({
			get: () => this._storage[key],
			set: value => this._storage[key] = this.makePropValueImmutable(value)
		});
	}

    public emitChange() {
		this.emit(CHANGE_EVENT);
	}

	public onChange(callback: () => any) {
		this.on(CHANGE_EVENT, callback);
	}

	public offChange(callback: () => any) {
		this.removeListener(CHANGE_EVENT, callback);
	}

}

export default new Factory<Store, Dispatcher>(dispatcher => new Store(dispatcher), InstantiationMode.Transient);