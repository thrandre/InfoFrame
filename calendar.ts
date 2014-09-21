module Calendar {

    export interface CalendarEvent {
        title: string;
        owner: string;
        start: Moment;
        end: Moment;
    }

    export interface CalendarSource {
        url: string;
        owner: string;
    }

    export interface CalendarProvider {
        getEventData( sources: CalendarSource[], today: Moment ): JQueryPromise<CalendarEvent[]>;
    }

    export class ICalCalendarProvider implements CalendarProvider {

        private parseEventData( owner: string, data: any ): CalendarEvent {
            return {
                title: data[1].filter(p => p[0] === "summary")[0][3],
                owner: owner,
                start: moment(data[1].filter( p => p[0] === "dtstart" )[0][3]),
                end: moment( data[1].filter( p => p[0] === "dtend" )[0][3])
            };
        }

        getEventData( sources: CalendarSource[], today: Moment ): JQueryPromise<CalendarEvent[]> {
            var promises = sources.map(s =>
                $.getJSON( s.url )
                    .then( data =>
                        ( <any>window ).ICAL.parse( data.contents )[1][2]
                            .filter( e => e[0] === "vevent" )
                            .map( e => this.parseEventData( s.owner, e ) ) ) );

            return $.when.apply( $, promises ).then( () => Query.fromArray<CalendarEvent>( [].concat.apply( [], arguments ) ).where( e => e.start.isSame( today, "day" ) || e.end.isSame( today, "day" )).toArray());
        }

    }
} 