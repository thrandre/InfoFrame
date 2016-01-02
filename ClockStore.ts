import StoreFactory from "./Store";
import StoreAssign from "./StoreAssign";
import Actions from "./Actions";
import DispatcherInstance from "./Dispatcher";
import { Factory, InstantiationMode } from "./Factory";
import { Storage } from "./Storage";

import { ClockModel } from "./ClockModel";

var ClockStore = StoreAssign
(
	{
		model: Storage.single<ClockModel>(),
		numbers: Storage.multiple<number, number>(n => n).select(n => n.foo = FooStore.getSomeShit(n))
	}, 
	store => 
	{
		store.bindTo(Actions.setClock, { onSuccess: d => store.model.set(null) });
	}
);

export var ClockStoreFactory = new Factory(ClockStore, InstantiationMode.Singleton)
	.withDefaultParams(StoreFactory.getInstance(DispatcherInstance));

ClockStoreFactory.getInstance().numbers.get(1)
ClockStoreFactory.getInstance().numbers.all()

export default ClockStoreFactory.getInstance();