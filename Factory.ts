interface IInstantiator<TInstance, TParams> {
	(params: TParams): TInstance;
}

export enum InstantiationMode {
	Transient,
	Singleton	
}

export class Factory<TInstance, TParams> {
	
	private _defaultParams: TParams;
	private _setup: (instance: TInstance) => void;
	private _instance: TInstance;
	
	constructor(
		private _instantiatorFunc: IInstantiator<TInstance, TParams>, 
		private _instantiationMode: InstantiationMode = InstantiationMode.Transient) { }
	
	withDefaultParams(params: TParams) {
		this._defaultParams = params;
		return this;
	}
	
	setup(setupFunc: (instance: TInstance) => void) {
		this._setup = setupFunc;
		return this;
	}
	
	getInstance(params?: TParams, instantiationMode?: InstantiationMode) {
		params = params || this._defaultParams;
		instantiationMode = instantiationMode || this._instantiationMode;
		
		var createInstance = (params?: TParams) => {
			var instance = this._instantiatorFunc(params);
			var setup = this._setup || (i => {});
			
			setup(instance);
			
			return instance;
		};
		
		if(instantiationMode == InstantiationMode.Singleton) {
			return this._instance ? this._instance : (this._instance = createInstance(params));
		}
		
		return createInstance(params);
	}
}