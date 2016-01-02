import * as Assign from "object-assign";

export interface ISelector<TData> {
	(value: TData): TData;
}

export interface IStorageAccessor<TVal> {
	get(): TVal;
	set(value: TVal);
}

export interface IStorage<TData> {
	bindToBackingStore(storage: IStorageAccessor<TData>);
	select(selector: ISelector<TData>): IStorage<TData>
}

abstract class AbstractStorage<TData> implements IStorage<TData> {
	protected storage: IStorageAccessor<TData> = null;
	protected _selector: ISelector<TData> = null;

	protected get selector() {
		return this._selector || (o => o);
	}

	bindToBackingStore(storage: IStorageAccessor<TData>) {
		this.storage = storage;
		this.initialize();
	}

	protected abstract initialize();
}

class SingleStorage<TData> extends AbstractStorage<TData> {

	constructor() {
		super();
	}

	protected initialize() {
		this.storage.set(undefined);
	}

	public get(): TData {
		return this.selector(this.storage.get());
	}

	public set(value: TData) {
		this.storage.set(value);
	}
	
	public select(selector: ISelector<TData>): SingleStorage<TData> {
		this.selector = selector;
		return this;
	}
	
}

class MultipleStorage<TData, TKey extends string | number> extends AbstractStorage<TData> {

	constructor(private _keySelector: (e: TData) => TKey) { super(); }

	protected initialize() {
		this.storage.set(null);
	}

	public contains(key: TKey) {
		var storage = this.storage.get();
		return typeof storage[key.toString()] !== "undefined";
	}

	public get(key: TKey): TData {
		var storage = this.storage.get();

		if(!storage) {
			return null;
		}

		return this.selector(storage[key.toString()]);
	}

	public all(): TData[] {
		var storage = this.storage.get();

		return Object.keys(storage).map(k => this.selector(storage[k]), this);
	}

	public add(value: TData) {
		var storage = this.storage.get();
		var key = this._keySelector(value);

		if(this.contains(key)) {
			throw Error(`Duplicate key ${key.toString()} in store.`);
		}

		var obj = {};
			obj[key.toString()] = value;

		this.storage.set(Assign({}, storage, obj));
	}

	public addMany(values: TData[]) {
		values.forEach(this.add, this);
	}
	
	public select(selector: ISelector<TData>): MultipleStorage<TData, TKey> {
		this.selector = selector;
		return this;
	}

}

export class Storage {
	static single<TData>() {
		return new SingleStorage<TData>();
	}
	
	static multiple<TData, TKey extends string | number>(keySelector: (e: TData) => TKey) {
		return new MultipleStorage<TData, TKey>(keySelector);
	}
}