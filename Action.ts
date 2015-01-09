import Dispatcher = require("./Dispatcher");
import Promises = require("es6-promise");

var Promise = Promises.Promise;

class Action<T> extends Dispatcher
{
	listen(callback: (payload: T) => any): void
	{
		return super.listen(callback);
	}

	trigger(payload: T): Thenable<T>
	{
		return super.trigger(payload);
	}
}

export = Action;