import { Dispatcher } from "./Dispatcher";
import { IAction, ActionPayload, ActionState } from "./Action";

export interface IProgressData {
	progressText?: string;
	progress?: number;
}

export interface IFluxCallback<TPayload> {
	onSuccess: (payload?: TPayload) => any;
	onError?: (error?: Error) => any;
	onPending?: (progress?: IProgressData) => any;
	autoEmit?: boolean;
}

export class FluxListener<TPayload> {
		
	private _action: IAction;
	private _callbacks: IFluxCallback<TPayload>;
	
	constructor(dispatcher: Dispatcher, action: IAction, callbacks: IFluxCallback<TPayload>) {		
		this._action = action;
		this._callbacks = callbacks;
		
		dispatcher.listen(this.handleDispatch.bind(this));
	}
	
	private handleDispatch(payload: ActionPayload<any>) {
		if(payload.action !== this._action) {
			return;
		}
		
		let handle = (callback, data) => {
			if(!callback) {
				return;
			}

			return callback(data);
		};
		
		let { onSuccess, onError, onPending } = this._callbacks;
		
		let callbackMap = {};
			callbackMap[ActionState.Success] = onSuccess;
			callbackMap[ActionState.Pending] = onPending;
			callbackMap[ActionState.Error] = onError;
			
		return handle(callbackMap[payload.state || ActionState.Success], payload.data);
	}
	
}