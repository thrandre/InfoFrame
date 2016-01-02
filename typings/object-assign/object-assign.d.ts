declare module "object-assign" {
	interface IAssign {
		<T1, T2, T3>(t1: T1, t2: T2, t3?: T3): T1 & T2 & T3;
	}

	const t: IAssign;
	export = t;
}