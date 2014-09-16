///<reference path="simple.ts"/>
///<reference path="weather.ts"/>
///<reference path="artwork.ts"/>
///<reference path="timers.ts"/>
///<reference path="bubbles.ts"/>
///<reference path="views/views.ts"/>

class ClockService {
    
    constructor( private mediator: Simple.EventEmitter ) {
        this.initialize();
    }

    initialize() {
        this.mediator.on( "tick-clock-trigger-update", this.triggerUpdate, this );
    }

    triggerUpdate() {
        this.mediator.trigger( "clock-update", moment() );
    }

}

class WeatherService {
    
    constructor( private city: string, private countryCode: string, private weatherProvider: Weather.WeatherProvider, private mediator: Simple.EventEmitter ) {
        this.initialize();
    }

    initialize() {
        this.mediator.on( "tick-weather-trigger-update", this.triggerUpdate, this );
    }

    triggerUpdate() {
        this.weatherProvider.getWeather( this.city, this.countryCode )
            .then( ( data ) => this.mediator.trigger( "weather-update", data ) );
    }
}

interface EnvironmentData {
    timeOfDay: string;
    season: string;
    weather: string;
    sunrise: Moment;
    sunset: Moment;
    updated: Moment;
}

class EnvironmentService {

    private currentEnvironment: EnvironmentData;
    private currentChanged: boolean = false;

    constructor( private mediator: Simple.EventEmitter ) {
        this.initialize();
    }

    initialize() {
        this.currentEnvironment = {
            timeOfDay: undefined,
            weather: undefined,
            season: undefined,
            sunrise: undefined,
            sunset: undefined,
            updated: undefined
        };

        this.mediator.on( "weather-update", this.weatherUpdate, this );
        this.mediator.on( "clock-update", this.clockUpdate, this );
    }

    private setProperty(key: string, value: any) {
        if (this.currentEnvironment[key] !== value) {
            this.currentEnvironment[key] = value;
            this.currentChanged = true;
            this.currentEnvironment.updated = moment();
        }
    }

    private isComplete(): boolean {
        for(var key in this.currentEnvironment)
        {
            if (!this.currentEnvironment[key]) {
                return false;
            }
        }

        return true;
    }

    private getTimeOfDay(now: Moment, sunrise: Moment, sunset: Moment): string {
        return sunrise && sunset
            ? now.isBefore(sunrise) || now.isAfter(sunset) ? "night" : "day"
            : "";
    }

    private getSeason(now: Moment): string {
        var month = now.month();

        if (month === 2 || month === 3 || month === 4) {
            return "spring";
        }
        if ( month === 5 || month === 6 || month === 7 ) {
            return "summer";
        }
        if ( month === 8 || month === 9 || month === 10 ) {
            return "fall";
        }

        return "winter";
    }

    private weatherUpdate(data: Weather.WeatherData) {
        this.setProperty( "weather", data.main.toLowerCase() );
        this.setProperty( "sunrise", data.sunrise );
        this.setProperty( "sunset", data.sunset );

        this.triggerEnvironmentUpdate();
    }

    private clockUpdate(data: Moment) {
        this.setProperty( "timeOfDay", this.getTimeOfDay( data, this.currentEnvironment.sunrise, this.currentEnvironment.sunset ));
        this.setProperty( "season", this.getSeason( data ) );

        this.triggerEnvironmentUpdate();
    }

    triggerEnvironmentUpdate() {
        if (this.currentChanged && this.isComplete()) {
            this.mediator.trigger("environment-update", this.currentEnvironment);
            this.currentChanged = false;
        }
    }
}

interface EventData {
    type: string;
    actor: string;
    messages: string[];
    created: Moment;
    deployMinutes: number;
}

interface EventService {
    getLastEventOfType(type: string): JQueryPromise<EventData>
}

class GitHubEventService {
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

class AutoUpdater {
    
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

var noCacheUrl = (url: string) => {
    var noCache = url,
        split = url.split( "?" );

    if (split.length > 1) {
        noCache = split[0];
    }

    return noCache + "?" + Math.random();
};

$(() => {
    var mediator = new Simple.Events();

    var weatherProvider = new Weather.OpenWeatherMap("eee9d46aa90c56ff8b116ab88f2a5e3f");
    var flickr = new Artwork.Flickr( "c389742a61ae8e9474a14b57f1b3d19b", "126595250@N04" );

    var scheduler = new Timers.Scheduler(new Timers.TimerFactory(), mediator);

    var clockService = new ClockService( mediator );
    var weatherService = new WeatherService( "Oslo", "NO", weatherProvider, mediator );
    var environmentService = new EnvironmentService( mediator );

    var github = new GitHubEventService( "thrandre", "InfoFrame", mediator );

    var autoUpdater = new AutoUpdater( mediator, github );

    var updateView = new Views.UpdateView( $(".update-info"), mediator );

    var clockView = new Views.ClockView( $( ".clock" ), mediator );
    var weatherView = new Views.WeatherView( $( ".weather" ), mediator );

    mediator.on( "environment-update", ( data ) => console.log( data ) );
    mediator.on( "github-push", ( data ) => console.log( data ) );

    mediator.on( "autoUpdater-update", ( data ) => {
        mediator.trigger( "updateView-show", data );
        new Timers.Timer(() => window.location.href = noCacheUrl(window.location.href)).start(
            moment(data.created)
                .add("minutes", data.deployMinutes)
                .diff(moment()), 1);
    });

    scheduler.schedule( "tick-github-update", 5 * 60 * 1000, true );
    scheduler.schedule( "tick-background-load", 60 * 60 * 1000, true );
    scheduler.schedule( "tick-background-render", 10 * 1000, true );
    scheduler.schedule( "tick-clock-trigger-update", 1000, true );
    scheduler.schedule( "tick-weather-trigger-update", 10 * 60 * 1000, true );
    scheduler.schedule( "tick-autoUpdater-check", 60 * 1000, true );
    scheduler.schedule( "bubble-flip", 10 * 1000, false );

    ( <any>window ).SVG( "clock" ).clock( "100%" ).start();
});