module Travel {

    export interface TravelData {
        line: string;
        destination: string;
        direction: number;
        departure: Moment;
    }

    export interface TravelProvider {
        getTravelData( stopId: string ): JQueryPromise<TravelData[]>;
    }

    export class Ruter implements TravelProvider {

        private parseTravelData( data: any ): TravelData {
            return {
                line: data.MonitoredVehicleJourney.LineRef,
                destination: data.MonitoredVehicleJourney.DestinationName,
                direction: data.MonitoredVehicleJourney.DirectionRef,
                departure: moment(data.MonitoredVehicleJourney.MonitoredCall.ExpectedDepartureTime)
            };
        }

        private getApiUrl( stopId: string ): string {
            return "http://whateverorigin.org/get?url=http://reisapi.ruter.no/StopVisit/GetDepartures/" + stopId + "&callback=?";
        }

        getTravelData( stopId: string ): JQueryPromise<TravelData[]> {
            return $.getJSON( this.getApiUrl( stopId ) )
                .then( ( data ) => JSON.parse( data.contents ).filter( i => i.MonitoredVehicleJourney.DirectionRef > 0 ).map( i => this.parseTravelData( i ) ));
        }

    }
} 