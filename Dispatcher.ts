import { Promise } from "es6-promise";

export class Dispatcher {

    private callbacks: { (payload: any): any }[] = [];
	private promises: any[] = <any>[];

	listen(callback: (payload: any) => any) {
		this.callbacks.push(callback);
	}

	trigger(payload?: any): Promise<any> {
		var resolves = <any>[];
		var rejects = <any>[];

		this.promises = this.callbacks.map((_: any, i: number) => new Promise((resolve, reject) => {
			resolves[i] = resolve;
			rejects[i] = reject;
		}));

		this.callbacks.forEach((callback, i) => Promise.resolve(callback(payload)).then(() => resolves[i](payload)));

		return Promise.all(this.promises).then(() => payload);
	}

	waitFor(): Promise<any> {
		return Promise.all(this.promises);
	}
}

export default new Dispatcher();
