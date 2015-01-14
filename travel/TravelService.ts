import $ = require("jquery");
import TravelData = require("./TravelData");
import TravelActions = require("./TravelActions");
import RequestState = require("../RequestState");
import Moment = require("moment");

class TravelService
{
    private parseTravelData(data: any): TravelData 
    {
        return {
            line: data.MonitoredVehicleJourney.LineRef,
            destination: data.MonitoredVehicleJourney.DestinationName,
            direction: data.MonitoredVehicleJourney.DirectionRef,
            departure: Moment(data.MonitoredVehicleJourney.MonitoredCall.ExpectedDepartureTime)
        };
    }

    private getApiUrl(stopId: string): string 
    {
        return "http://whateverorigin.org/get?url=http://reisapi.ruter.no/StopVisit/GetDepartures/" + stopId + "&callback=?";
    }

	getTravelData(stopId: string): Thenable<TravelData[]>
	{
        TravelActions.getTravelData.trigger({ state: RequestState.Pending });
        return $.getJSON(this.getApiUrl(stopId)).then((data: any) => TravelActions.getTravelData.trigger({ data: JSON.parse(data.contents).map(e => this.parseTravelData(e)), state: RequestState.Success }));
	}
}

export = TravelService;