import * as Assign from "object-assign";
import { Store } from "./Store";
import { IStorage } from "./Storage";
	
export default function<TStore extends Store, TProps extends {[key: string]: IStorage<any>}>(props: TProps, setup?: (store: (TStore & TProps)) => void): (store: TStore) => (TStore & TProps)  {
	return store => {
		var assigned = Assign(store, props);
			assigned.bindProps(props);
		
		if(setup) {
			setup(assigned);
		}
		
		return assigned;
	};
};