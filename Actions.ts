/// <reference path="typings/tsd.d.ts"/>

import Dispatcher from "./Dispatcher";
import { Action, ServerAction } from "./Action";
import { Factory, InstantiationMode } from "./Factory";

import { ClockModel } from "./ClockModel";
import { WeatherModel } from "./WeatherModel";

import Services from "./Services";

var Actions = ActionAssign({	
	getTime: new ServerAction<any, ClockModel>(Dispatcher)
		.loadWith(() => Services.timeService.getTime())
});

var actions = {
	test: null
};

ActionsAssign(d => {
	test: new ServerAction(d)
})

export var ActionsFactory = new Factory<Actions, { dispatcher: typeof Dispatcher }>(n => new Actions(n.dispatcher), InstantiationMode.Singleton)
	.withDefaultParams({ dispatcher: Dispatcher });

export default ActionsFactory.getInstance();