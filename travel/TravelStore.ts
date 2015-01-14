import TravelData = require("TravelData");
import Store = require("../Store");
import TravelActions = require("./TravelActions");
import TravelService = require("./TravelService");
import TravelProps = require("./TravelProps");
import RequestState = require("../RequestState");
import Timer = require("../Timer");
import Query = require("../Query");
import Moment = require("moment");

class TravelStore extends Store
{
    private state: TravelProps;

    constructor(private travelService: TravelService)
	{
		super();
        
        TravelActions.getTravelData.listen(pl =>
        {
            if (pl.state === RequestState.Success)
            {
                this.processTravelData(pl.data);
            }
        });
        
        Timer.create(() => this.loadState()).start(60 * 1000, true);
	}

    private processTravelData(data: TravelData[])
    {
        var entries = Query.fromArray(data)
            .where(e => e.departure > Moment().add(3, "minutes"))
            .orderByAscending(e => e.departure).take(10).toArray();
        
        this.state = { travelEntries: entries };
        this.trigger(this.getState());
    }

    private loadState()
    {
        this.travelService.getTravelData("3010610");
    }

    getState(): TravelProps
	{
	    return this.state;
	}
}

var travelStore = new TravelStore(new TravelService());

export = travelStore;