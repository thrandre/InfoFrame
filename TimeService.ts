/// <reference path="typings/tsd.d.ts"/>

import * as Moment from "moment";

interface ITimeServiceResponse {
	getFormattedTime(format: string): string;
}

export default class TimeService {
	
	constructor() {
		Moment.locale("nb");
	}
	
	getTime(): ITimeServiceResponse {
		var moment = Moment();
		
		return {
			getFormattedTime: (format) => moment.format(format)
		};
	}
	
}