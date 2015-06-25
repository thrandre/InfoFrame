/// <reference path="typings/tsd.d.ts"/>

import Promises = require("es6-promise");
import Dispatcher = require("./Dispatcher");

var Promise = Promises.Promise;

class Action<T> extends Dispatcher
{
	listen(callback: (payload?: T) => any): void
	{
		return super.listen(callback);
	}

	trigger(payload?: T): Promise<T>
	{
		return super.trigger(payload);
	}
}

export = Action;