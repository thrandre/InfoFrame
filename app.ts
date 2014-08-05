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

interface GitHubEventData {
    type: string;
    actor: string;
    message: string;
    created: Moment;
}

class GitHubPushListener {
    private lastPush: Moment;

    constructor(private username: string, private repository: string, private mediator: Simple.EventEmitter) {
        this.initialize();
    }

    initialize() {
        this.mediator.on("tick-github-update", this.update, this);
    }

    private getApiUrl() {
        return "https://api.github.com/repos/"+ this.username +"/" + this.repository + "/events";
    }

    private parseEvent(event): GitHubEventData {
        return {
            type: event.type,
            actor: event.actor.login,
            message: event.type === "PushEvent" ? event.payload.commits.map( ( c ) => c.message ).join() : "",
            created: moment( event.created_at )
        };
    }

    private getNewestPush(events: GitHubEventData[]) {
        return events
            .filter((e) => e.type === "PushEvent")
            .sort((a, b) => a.created.isAfter(b.created) ? 1 : -1).reverse()[0];
    }

    private triggerIfUpdated(events: GitHubEventData[]) {
        var newest = this.getNewestPush( events );

        if (!newest) {
            return;
        }

        if ( !this.lastPush || newest.created.isAfter( this.lastPush ) ) {
            this.mediator.trigger( "github-push", newest );
        }

        this.lastPush = newest.created;
    }

    update() {
        $.getJSON(this.getApiUrl()).then((data) => this.triggerIfUpdated(data.map((e) => this.parseEvent(e))));
    }

}

$(() => {
    var bubbleStage = new Bubbles.Stage( $( ".bubble-wrapper" ), new Timers.TimerFactory() );
    var weatherProvider = new Weather.OpenWeatherMap("eee9d46aa90c56ff8b116ab88f2a5e3f");
    var flickr = new Artwork.Flickr( "c389742a61ae8e9474a14b57f1b3d19b", "126595250@N04" );

    var mediator = new Simple.Events();
    var scheduler = new Timers.Scheduler(new Timers.TimerFactory(), mediator);

    var clockService = new ClockService( mediator );
    var weatherService = new WeatherService( "Oslo", "NO", weatherProvider, mediator );
    var environmentService = new EnvironmentService( mediator );

    var github = new GitHubPushListener( "thrandre", "InfoFrame", mediator );

    var backgroundView = new Views.BackgroundView( $(".background-wrapper"), mediator, new Controllers.BackgroundController( flickr ), new Utils.ImageLoader() );
    var clockView = new Views.ClockView( $( ".clock" ), mediator );
    var weatherView = new Views.WeatherView( $( ".weather" ), mediator );

    mediator.on( "environment-update", ( data ) => console.log( data ) );
    mediator.on( "github-push", ( data ) => console.log( data ) );

    scheduler.schedule( "tick-github-update", 10 * 1000, true );
    scheduler.schedule( "tick-background-load", 60 * 60 * 1000, true );
    scheduler.schedule( "tick-background-render", 60 * 1000, true );
    scheduler.schedule( "tick-clock-trigger-update", 1000, true );
    scheduler.schedule( "tick-weather-trigger-update", 10 * 60 * 1000, true );

    (<any>window).SVG("clock").clock("100%").start();
});