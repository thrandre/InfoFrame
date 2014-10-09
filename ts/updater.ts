///<reference path="typing/jquery.d.ts"/>
///<reference path="typing/moment.d.ts"/>
///<reference path="simple.ts"/>
///<reference path="utils/extensions.ts"/>

module Updater 
{

    export interface EventData 
    {
        type: string;
        actor: string;
        messages: string[];
        created: Moment;
        deployMinutes: number;
    }

    export interface EventService 
    {
        getLastEventOfType(type: string): JQueryPromise<EventData>
    }

    export class GitHubEventService 
    {
        private lastPush: Moment;

        constructor(private username: string, private repository: string, private mediator: Simple.EventEmitter) {
            this.initialize();
        }

        initialize() {
        }

        private getApiUrl() {
            return "https://api.github.com/repos/"+ this.username +"/" + this.repository + "/events";
        }

        private parseEvent(event): EventData {
            return {
                type: event.type,
                actor: event.actor.login,
                messages: event.type === "PushEvent" ? event.payload.commits.map( ( c ) => c.message ) : [],
                created: moment( event.created_at ),
                deployMinutes: 7
            };
        }

        private update() {
            return $.getJSON(this.getApiUrl()).then((data) => data.map((e) => this.parseEvent(e)));
        }

        getLastEventOfType(type: string) {
            return this
                .update()
                .then((events) => events
                    .filter((e) => e.type === type)
                    .sort((a, b) => a.created.isAfter(b.created) ? 1 : -1).reverse()[0]);

        }

    }

    export class AutoUpdater 
    {

        private lastEvent;

        constructor( private mediator: Simple.EventEmitter, private eventService: EventService ) {
            this.initialize();
        }

        initialize() {
            this.mediator.on( "tick-autoUpdater-check", this.check, this );
        }

        check() {
            this.eventService.getLastEventOfType( "PushEvent" ).then( ( event ) => {
                if ( isUndefined( event ) ) {
                    return;
                }

                if ( isUndefined( this.lastEvent ) ) {
                    this.lastEvent = event;
                    return;
                }

                if ( event.created.isAfter( this.lastEvent.created ) ) {
                    this.mediator.trigger( "autoUpdater-update", event );
                    this.lastEvent = event;
                }
            });
        }

    }
}
