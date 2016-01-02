import * as Assign from "object-assign";
import Store from "./Store";
import { IAction } from "./Action";
	
export default function<TActions extends {[key: string]: IAction}>(actions: TActions): TActions  {
	
	Object.keys(actions).forEach(a => {
		actions[a].bindToName(a);
	});
	
	return actions;
	
};