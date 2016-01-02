/// <reference path="typings/tsd.d.ts"/>

import * as React from "react";
import * as ReactDom from "react-dom";

function Keys<T extends {[key: string]: string}>(hash: T): T {
	return Object
		.keys(hash)
		.reduce((p, n) => {
			p[n] = n;
			return p;
		}, {}) as T;
}

type ActionType = string;

enum ActionStatus {
	Pending,
	Success,
	Error
}

interface IAction<TPayload, TData> {
	type: ActionType;
	status?: ActionStatus;
	payload?: TPayload;
	data?: TData;
}

interface IActionCreator<TPayload, TData> {
	(payload?: TPayload): IAction<TPayload, TData>;
}

interface IPayloadCreator<TPayload, TCreatedPayload> {
	(payload?: TPayload): TCreatedPayload;
}

function Identity<T>(i: T) {
	return i;
}

function CreateAction<TPayload, TData>(type: ActionType): IAction<TPayload, TData> {
	return {
		type: type,
		status: ActionStatus.Pending
	};
}

function CreateActionCreator<TPayload, TData>(action: IAction<TPayload, TData>, payloadCreator: IPayloadCreator<TPayload, any> = Identity): IActionCreator<TPayload, TData> {
	return function(payload?: TPayload) {
		const createdPayload = payloadCreator(payload);
		return Assign(
			{},
			action,
			{
				payload: payloadCreator(payload)
			}
		);
	};
}

interface IReducer<TState> {
	(state: TState, action: IAction<any, any>): TState;
}

interface IHandlerMap<TState> {
	[key: string]: IReducer<TState>;
}

interface IStore<TState> {
	dispatch(): void;
	getState(): TState;
}

class Store<TState> {

	private _state: TState;
	private _reducers: IReducer<TState>[];

	constructor(reducers: IReducer<TState>[]) {
		this._reducers = reducers;
	}

	getState(): TState {
		return Object.assign({}, this._state);
	}

};

function CreateStore<TState>(...reducers: IReducer<TState>[]) {
	return new Store<TState>(reducers);
}

interface TestState {
	foo: number;
}

const ActionTypes = Keys({ BAR: null });

function createReducer<TState>(initialState: TState, handlers: IHandlerMap<TState>): IReducer<TState> {
	return function reducer(state = initialState, action) {
		if (handlers.hasOwnProperty(action.type)) {
			return handlers[action.type](state, action);
		}

		return state;
	}
}

const TestActions = {
	bar: CreateAction<number, any>(ActionTypes.BAR)
};

const TestActionCreator = {
	bar: CreateActionCreator(TestActions.bar)
};

const testReducer = createReducer<TestState>({ foo: 0 }, {
	[TestActions.bar.type](state: TestState, action: typeof TestActions.bar) {
		state.foo = action.payload;
		return state;
	}
});

const testStore = CreateStore<TestState>(testReducer);

var init = () => {
};

window.onload = init;