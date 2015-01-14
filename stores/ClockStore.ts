import ClockProps = require("../viewmodels/ClockProps");
import Store = require("../Store");
import Moment = require("moment");

class ClockStore extends Store {
	constructor() {
		super();
		setInterval(() => this.trigger(this.getState()), 10000);
	}

	getState(): ClockProps {
		return { datetime: Moment() };
	}
}

var clockStore = new ClockStore();

export = clockStore;