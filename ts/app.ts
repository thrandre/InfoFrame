///<reference path="typing/moment.d.ts"/>
///<reference path="typing/jquery.d.ts"/>
///<reference path="utils/extensions.ts"/>
///<reference path="query.ts"/>
///<reference path="simple.ts"/>
///<reference path="weather.ts"/>
///<reference path="timers.ts"/>
///<reference path="views/views.ts"/>
///<reference path="travel.ts"/>
///<reference path="calendar.ts"/>
///<reference path="updater.ts"/>

class ClockService {
    
    constructor( private mediator: Simple.EventEmitter ) 
	{
        this.initialize();
    }

    initialize()
	{
        this.mediator.on( "tick-clock-trigger-update", this.triggerUpdate, this );
    }

    triggerUpdate() 
	{
        this.mediator.trigger( "clock-update", moment() );
    }

}

class WeatherService 
{
    
    constructor( private city: string, private countryCode: string, private weatherProvider: Weather.WeatherProvider, private mediator: Simple.EventEmitter ) 
	{
        this.initialize();
    }

    initialize() 
	{
        this.mediator.on( "tick-weather-trigger-update", this.triggerUpdate, this );
    }

    triggerUpdate() 
	{
        this.weatherProvider.getWeather( this.city, this.countryCode )
            .then( ( data ) => this.mediator.trigger( "weather-update", data ) );
    }
}

interface EnvironmentData 
{
    timeOfDay: string;
    season: string;
    weather: string;
    sunrise: Moment;
    sunset: Moment;
    updated: Moment;
}

class EnvironmentService 
{

    private currentEnvironment: EnvironmentData;
    private currentChanged: boolean = false;

    constructor( private mediator: Simple.EventEmitter ) 
	{
        this.initialize();
    }

    initialize() 
	{
        this.currentEnvironment = 
		{
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

    private setProperty(key: string, value: any) 
	{
        if (this.currentEnvironment[key] !== value) 
		{
            this.currentEnvironment[key] = value;
            this.currentChanged = true;
            this.currentEnvironment.updated = moment();
        }
    }

    private isComplete(): boolean 
	{
        for(var key in this.currentEnvironment)
        {
            if (!this.currentEnvironment[key]) 
			{
                return false;
            }
        }

        return true;
    }

    private getTimeOfDay(now: Moment, sunrise: Moment, sunset: Moment): string 
	{
        return sunrise && sunset
            ? now.isBefore(sunrise) || now.isAfter(sunset) ? "night" : "day"
            : "";
    }

    private getSeason(now: Moment): string 
	{
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

    private weatherUpdate(data: Weather.WeatherData) 
	{
        this.setProperty( "weather", data.main.toLowerCase() );
        this.setProperty( "sunrise", data.sunrise );
        this.setProperty( "sunset", data.sunset );

        this.triggerEnvironmentUpdate();
    }

    private clockUpdate(data: Moment) 
	{
        this.setProperty
		( 
			"timeOfDay", 
			this.getTimeOfDay
			( 
				data, 
				this.currentEnvironment.sunrise, 
				this.currentEnvironment.sunset 
			)
		);
        
		this.setProperty( "season", this.getSeason( data ) );
        this.triggerEnvironmentUpdate();
    }

    triggerEnvironmentUpdate() 
	{
        if (this.currentChanged && this.isComplete()) 
		{
            this.mediator.trigger("environment-update", this.currentEnvironment);
            this.currentChanged = false;
        }
    }
}

var noCacheUrl = (url: string) => 
{
    var noCache = url,
        split = url.split( "?" );

    if (split.length > 1) {
        noCache = split[0];
    }

    return noCache + "?" + Math.random();
};

$(() => 
{
    var mediator = new Simple.Events();

    var weatherProvider = new Weather.OpenWeatherMap( "eee9d46aa90c56ff8b116ab88f2a5e3f" );

    var scheduler = new Timers.Scheduler(new Timers.TimerFactory(), mediator);

    var clockService = new ClockService( mediator );
    var weatherService = new WeatherService( "Oslo", "NO", weatherProvider, mediator );
    var environmentService = new EnvironmentService( mediator );

    var github = new Updater.GitHubEventService( "thrandre", "InfoFrame", mediator );

    var autoUpdater = new Updater.AutoUpdater( mediator, github );

    var updateView = new Views.UpdateView( $(".update-info"), mediator );

    var clockView = new Views.ClockView( $( ".clock" ), mediator );
    var weatherView = new Views.WeatherView( $( ".weather" ), mediator );

    var ruter = new Travel.Ruter();

    var travelView = new Views.TravelView( $( ".travel" ), mediator );

    var calendar = new Calendar.ICalCalendarProvider();

    var calenderView = new Views.CalendarView( $( ".calendar" ), mediator );

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

    var travelTimer = new Timers.Timer( () => ruter.getTravelData( "3010610" ).then( ( data: Travel.TravelData[] ) => {
        var viewData: Views.TravelViewData = {
            east: Query.fromArray( data ).where( t => t.direction == 1 ).where(t => t.departure.add(5, 'minutes') > moment()).orderByAscending( t => t.departure ).take( 5 ).toArray(),
            west: Query.fromArray( data ).where( t => t.direction == 2 ).where( t => t.departure.add( 5, 'minutes' ) > moment()).orderByAscending( t => t.departure ).take( 5 ).toArray()
        };
        mediator.trigger( "travel-update", viewData );
    }) );

    travelTimer.start( 60 * 1000 );
    travelTimer.trigger();

    var calendarSources = 
	[
        {
            owner: "Thomas",
            url: "http://whateverorigin.org/get?url=https://sharing.calendar.live.com/calendar/private/0ec5c5e9-a270-40ab-a244-581302314b18/f7dd211a-88b0-4a5e-a963-d807a40fe6a7/cid-5d3f62a70d427c52/calendar.ics&callback=?"
        },
        {
            owner: "Caroline",
            url: "http://whateverorigin.org/get?url=https://sharing.calendar.live.com/calendar/private/97ab575d-b24f-454c-adc7-8247e5218994/e676ed5e-dc22-425a-94e5-b2396e146762/cid-c2490ffbe195f761/calendar.ics&callback=?"
        }
    ];

    var calendarTimer = new Timers.Timer( () => calendar.getEventData( calendarSources, moment() ).then( ( data: Views.CalendarViewData ) => mediator.trigger( "calendar-update", data ) ) );

    calendarTimer.start( 10 * 60 * 1000 );
    calendarTimer.trigger();

});