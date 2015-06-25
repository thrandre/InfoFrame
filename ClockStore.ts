import Store = require("./Store");
import Actions = require("./Actions");

import ClockProps = require("./viewmodels/ClockProps");

class ClockStore extends Store
{
	clockModel: ClockProps;
	
	constructor() {
		super();
		Actions.setClock.listen(s => this.clockUpdate(s));
	}
	
	private clockUpdate(model: ClockProps) {
		this.clockModel = model;
		this.trigger(model);
	}
}

var clockStore = new ClockStore();

export = clockStore;