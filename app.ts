module Simple {
    interface EventListener {
        callback: ( data ) => void;
        context: any;
    }

    export class Events {

        private listeners: { [key: string]: EventListener[] } = {};

        public on(event: string, callback: (data) => void, context?: any) {
            (this.listeners[event] || (this.listeners[event] = []))
                .push({ callback: callback, context: context });
        }

        public off(event: string, callback?: (data) => void, context?: any) {
            if ( !callback && !context ) {
                delete this.listeners[event];
            }

            var events = this.listeners[event] || [];
            for ( var i = 0; i < events.length; i++ ) {
                if ( !( callback && events[i].callback !== callback || context && events[i].context !== context ) ) {
                    events.splice( i, 1 );
                }
            }
        }

        public trigger(event: string, data?: any) {
            var events = this.listeners[event] || [];
            for ( var i = 0; i < events.length; i++ ) {
                events[i].callback.apply( events[i].context || this, [data] );
            }
        }

    }

    export class Controller extends Events {

    }

    export class View extends Events {

        constructor(public el: JQuery, public controller?: Controller) {
            super();
        }

        public initialize() {}

        public render() {}

    }
}

module Weather {

    export interface WeatherData {
        description: string;
        main: string;
        icon: string;
        temperature: number;
        percipitation: number;
        windSpeed: number;
        sunrise: Moment;
        sunset: Moment;
    }

    export interface WeatherProvider {
        getWeather( city: string, countryCode: string ): JQueryPromise<WeatherData>;
    }

    export class OpenWeatherMap implements WeatherProvider {

        constructor( private appId: string ) { }

        private translateIcon(icon: string): string {
            switch(icon) {
                case "01d":
                    return "wi-day-sunny";
                case "02d":
                    return "wi-day-sunny-overcast";
                case "03d":
                    return "wi-day-cloudy";
                case "04d":
                    return "wi-cloudy";
                case "09d":
                    return "wi-rain";
                case "10d":
                    return "wi-showers";
                case "11d":
                    return "wi-thunderstorm";
                case "13d":
                    return "wi-snow";
                case "50d":
                    return "wi-fog";
                default:
                    return "wi-cloudy";
            }
        }

        private parseWeatherData( data: any ): WeatherData {
            return {
                description: data.weather[0].description,
                main: data.weather[0].main,
                icon: this.translateIcon(data.weather[0].icon),
                temperature: Math.round( data.main.temp - 273.15 ),
                percipitation: data.rain["3h"],
                windSpeed: data.wind.speed,
                sunrise: moment.unix(data.sys.sunrise),
                sunset: moment.unix(data.sys.sunset)
            };
        }

        private getApiUrl(city: string, countryCode: string): string {
            return "http://api.openweathermap.org/data/2.5/weather?q=" + city + "," + countryCode + "&APPID=" + this.appId + "&callback=?";
        }

        getWeather(city: string, countryCode: string): JQueryPromise<WeatherData> {
            return $.getJSON(this.getApiUrl(city, countryCode))
                .then((data) => {
                    return this.parseWeatherData(data);
                });
        }

    }
}

module Artwork {
    
    export interface PhotoData {
        title: string;
        tags: string[];
        source: string;
        width: number;
        height: number;    
    }

    export interface IPhotoProvider {
        search( minWidth: number, minHeight: number ): JQueryPromise<PhotoData[]>
    }

    export class Flickr implements IPhotoProvider {

        constructor(private apiKey: string, private userId: string) {}

        private getApiUrl() {
            return "https://api.flickr.com/services/rest/?method=flickr.favorites.getPublicList&api_key="+ this.apiKey +"&user_id="+ this.userId +"&extras=o_dims%2Curl_o%2Ctags&per_page=500&format=json&nojsoncallback=1";
        }

        search( minWidth: number, minHeight: number ): JQueryPromise<PhotoData[]> {
            return $.getJSON(this.getApiUrl()).then((data) => {
                return data.photos.photo
                    .filter( ( photo ) =>
                        photo.width_o >= minWidth
                        && photo.height_o >= minHeight )
                    .map((photo) => {
                    return {
                        title: photo.title,
                        tags: photo.tags.split(" ").map((tag) => tag.toLowerCase()),
                        source: photo.url_o,
                            width: photo.width_o,
                            height: photo.height_o
                    };
                });
            });
        }

    }

}

class Stage {

    bubbles: Bubble[] = [];

    constructor( public el: JQuery, public timerFactory: TimerFactory ) {
        this.initialize();
    }

    initialize() {
        this.el.find( ".bubble" ).each( ( i, e ) => this.bubbles.push( new Bubble( $( e ) ) ) );
        this.timerFactory.create( () => this.bubbles.forEach( ( b ) => b.flip() ) ).start( 10000 );
        this.layout();
    }

    getStageOrigin(): JQueryCoordinates {
        return {
            left    : this.el.width()   / 2,
            top     : this.el.height()  / 2
        };
    }

    layout() {
        if (this.bubbles.length == 0) {
            return;
        }

        var center = this.bubbles[0];

        center.setVirtualPadding(200);
        center.originMoveTo( this.getStageOrigin() );

        var spacingAngle = (2 * Math.PI) / (this.bubbles.length - 1);

        for (var i = 1; i < this.bubbles.length; i++) {
            var angle = ( i - 1 ) * spacingAngle;
            var position = center.getPointOnCircumference( angle, true );
            this.bubbles[i].originMoveTo(center.translateToAbsolute(position));
        }

    }

}

class Bubble {

    virtualPadding: number = 0;

    constructor(public el: JQuery) {
        this.initialize();
    }

    initialize() {
        this.el.find( ".back" ).hide();
    }

    getOrigin(): JQueryCoordinates {
        return {
            left    : this.el.outerWidth( true ) / 2,
            top     : this.el.outerHeight( true ) / 2
        };
    }

    getRadius(includeMargin?: boolean): number {
        return this.el.outerWidth( !!includeMargin ) / 2;
    }

    setRadius(radius: number) {
        this.el.width(radius * 2);
    }

    setVirtualPadding(padding: number) {
        this.virtualPadding = padding;
    }

    getPointOnCircumference(angle: number, includeMargin?:boolean): JQueryCoordinates {
        var radius = this.getRadius(includeMargin),
            origin = this.getOrigin();

        return {
            left    : origin.left   + (radius + this.virtualPadding) * Math.cos( angle ),
            top     : origin.top    - (radius + this.virtualPadding) * Math.sin( angle )
        };
    }

    translateToAbsolute(relative: JQueryCoordinates): JQueryCoordinates {
        var position = this.el.offset();
        return {
            left: position.left + relative.left,
            top: position.top + relative.top
        };
    }

    moveTo( position: JQueryCoordinates ) {
        this.el.offset(position);
    }

    originMoveTo(position: JQueryCoordinates) {
        var origin = this.getOrigin();

        this.moveTo({
            left    : position.left - origin.left,
            top     : position.top  - origin.top
        });
    }

    flip() {
        var front = this.el.find(".front"),
            back = this.el.find(".back"),
            rotate1,
            rotate2,
            show,
            hide;

        if (front.is(":visible")) {
            show = back;
            hide = front;
            rotate1 = { rotateX: "90deg" };
            rotate2 = { rotateX: "180deg" };
        }
        else {
            show = front;
            hide = back;
            rotate1 = { rotateX: "90deg" };
            rotate2 = { rotateX: "0deg" }; 
        }

        this.el.transition(rotate1, () => {
            hide.hide();
            show.show();
            this.el.transition(rotate2);
        });
    }

}

class BackgroundCarousellController extends Simple.Controller {
    
    constructor(private photoProvider: Artwork.IPhotoProvider) {
        super();
    }
    
    public getPhotos( minWidth: number, minHeight: number ): JQueryPromise<Artwork.PhotoData[]> {
        return this.photoProvider.search( minWidth, minHeight );
    }

}

class ImageLoader {
    
    public load(photoData: Artwork.PhotoData): JQueryPromise<any> {
        var deferred = $.Deferred();
        var image = $( "<img src=\"" + photoData.source + "\"/>" );
        image.load( () => {
            deferred.resolve();
            image.remove();
        } );
        return deferred.promise();
    }

}

class Timer {
    
    private times: number;
    private maxTimes: number;
    private handle: number;

    constructor( private action: () => void ) { }

    private tick() {
        if (!this.maxTimes || this.times < this.maxTimes) {
            this.action();
            this.times++;
        }
        else {
            window.clearInterval(this.handle);
        }
    }

    trigger() {
        this.action();
    }

    start(interval: number, times?: number) {
        this.times = 0;
        this.maxTimes = times;
        this.handle = window.setInterval( () => this.tick(), interval );
    }

    stop() {
        if ( !this.handle ) {
            return;
        }
        window.clearInterval( this.handle );
    }

}

class TimerFactory {
    
    create( action: () => void ): Timer {
        return new Timer( action );
    }

}

class Scheduler {
    
    private timers: {[key: string]: Timer} = {};

    constructor( private timerFactory: TimerFactory, private mediator: EventEmitter ) { }

    schedule( event: string, interval: number, immediate: boolean = false, times?: number ) {
        var timer = (this.timers[event] || (this.timers[event] = this.timerFactory.create(() => this.mediator.trigger(event))));

        if ( immediate ) {
            timer.trigger();
        }

        timer.start( interval, times );
    }
}

interface EventEmitter {
    on( event: string, callback: ( data ) => void, context?: any );
    off( event: string, callback?: ( data ) => void, context?: any );
    trigger( event: string, data?: any )
}

class BackgroundCarousellView extends Simple.View {
    
    private photos: Artwork.PhotoData[];
    private currentPhotoSet: Artwork.PhotoData[];
    private currentPhoto: number = 0;

    constructor( public el: JQuery, public mediator: EventEmitter, public controller: BackgroundCarousellController, public imageLoader: ImageLoader ) {
        super( el, controller );
        this.initialize();
    }

    initialize() {
        this.mediator.on( "tick-background-load", this.getPhotos, this );
        this.mediator.on( "environment-update", this.environmentUpdate, this );
        this.mediator.on( "tick-background-render", this.render, this );
    }

    getPhotos(): JQueryPromise<any> {
        return this.controller.getPhotos( this.el.width(), this.el.height() )
            .then( ( photos ) => this.photos = photos );
    }

    matchTags( wantedTags: string[], tags: string[] ) {
        var matches = 0;
        wantedTags.forEach( ( tag ) => {
            if ( tags.indexOf( tag ) !== -1 ) {
                matches++;
            }
        });

        return matches;
    }

    photoIsMatch( wantedTags: string[], tags: string[], fuzzyness: number ): boolean {
        return this.matchTags( wantedTags, tags ) >= wantedTags.length - fuzzyness;
    }

    updatePhotoSet(tags: string[]) {
        if (!this.photos) {
            return;
        }

        var photoSet = [];

        for (var i = 0; i <= tags.length; i++) {
            photoSet = this.photos
                .filter( ( photo ) => this.photoIsMatch( tags, photo.tags, i ) );

            if (photoSet.length !== 0) {
                break;
            }
        }

        if (photoSet.length === 0) {
            return;
        }

        photoSet.sort( ( a, b ) => {
            return this.matchTags(tags, a.tags) - this.matchTags(tags, b.tags);
        });

        this.currentPhotoSet = photoSet;
        this.currentPhoto = 0;
    }

    getEnvironmentTags(data: EnvironmentData) {
        return [data.season, data.timeOfDay, data.weather];
    }

    environmentUpdate(data: EnvironmentData) {
        if (!this.photos || this.photos.length === 0) {
            this.getPhotos().then(() => this.updatePhotoSet(this.getEnvironmentTags(data)));
            return;
        }

        this.updatePhotoSet(this.getEnvironmentTags(data));
    }

    renderNext() {
        var l1 = this.el.find( ".l1" );
        var l2 = this.el.find( ".l2" );

        l2.css( { "background-image": "url(" + this.currentPhotoSet[this.currentPhoto].source + ")" });

        l2.animate({ opacity: 1 }, { duration: 1000, complete: () => {
            l1.css( { opacity: 0 });
            l1.removeClass( "l1" ).addClass( "l2" );
            l2.removeClass( "l2" ).addClass( "l1" );
        } });
    }

    render() {
        if ( !this.currentPhotoSet || this.currentPhotoSet.length === 0 ) {
            return;
        }

        if (this.currentPhoto === this.currentPhotoSet.length) {
            this.currentPhoto = 0;
        }

        this.imageLoader.load( this.currentPhotoSet[this.currentPhoto] )
            .then(() => {
                this.renderNext();
                this.currentPhoto++;
        });
    }

}

class ClockView extends Simple.View {
    constructor(public el: JQuery, public mediator: EventEmitter) {
        super(el);
        this.initialize();
    }

    initialize() {
        this.mediator.on("clock-update", this.update, this);
    }

    update(data: Moment) {
        var time = this.el.find( ".time" ),
            date = this.el.find( ".date" );

        time.find( ".hour" ).text( data.format( "HH" ) );
        time.find( ".minute" ).text( data.format( "mm" ) );

        date.find( ".day" ).text( data.format("dddd") );
        date.find( ".dayMonth" ).text( data.format("Mo MMM") );
    }
}

class WeatherView extends Simple.View {
    constructor( public el: JQuery, public mediator: EventEmitter ) {
        super( el );
        this.initialize();
    }

    initialize() {
        this.mediator.on( "weather-update", this.update, this );
    }

    limitDescription(description: string): string {
        var parts = description.split( " " );
        if (parts.length > 2) {
            parts.shift();
        }

        return parts.join( " " );
    }

    update( data: Weather.WeatherData ) {
        this.el.find( ".level-1 i" ).removeClass().addClass( "wi" ).addClass( data.icon );
        this.el.find( ".temperature" ).text( data.temperature );
        this.el.find( ".description" ).text( data.description );
        this.el.find( ".rain-data" ).text( data.percipitation + " mm" );
        this.el.find( ".wind-data" ).text( data.windSpeed + " m/s" );
    }
}

class ClockService {
    
    constructor( private mediator: EventEmitter ) {
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
    
    constructor( private city: string, private countryCode: string, private weatherProvider: Weather.WeatherProvider, private mediator: EventEmitter ) {
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

    constructor( private mediator: EventEmitter ) {
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

        this.mediator.on( "pull-environment", this.pull, this );
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

    pull(data) {
        if (!data.cb) {
            return;
        }
        data.cb(this.currentEnvironment);
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

    constructor(private username: string, private repository: string, private mediator: EventEmitter) {
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
    var bubbleStage = new Stage( $( ".bubble-wrapper" ), new TimerFactory() );
    var weatherProvider = new Weather.OpenWeatherMap("eee9d46aa90c56ff8b116ab88f2a5e3f");
    var flickr = new Artwork.Flickr( "c389742a61ae8e9474a14b57f1b3d19b", "126595250@N04" );

    var mediator = new Simple.Events();
    var scheduler = new Scheduler(new TimerFactory(), mediator);

    var clockService = new ClockService( mediator );
    var weatherService = new WeatherService( "Oslo", "NO", weatherProvider, mediator );
    var environmentService = new EnvironmentService( mediator );

    var github = new GitHubPushListener( "thrandre", "InfoFrame", mediator );

    var backgroundView = new BackgroundCarousellView( $(".background-wrapper"), mediator, new BackgroundCarousellController( flickr ), new ImageLoader() );
    
    var clockView = new ClockView( $( ".clock" ), mediator );
    var weatherView = new WeatherView( $( ".weather" ), mediator );

    mediator.on( "environment-update", ( data ) => console.log( data ) );
    mediator.on( "github-push", ( data ) => console.log( data ) );

    scheduler.schedule( "tick-github-update", 10 * 1000, true );
    scheduler.schedule( "tick-background-load", 60 * 60 * 1000, true );
    scheduler.schedule( "tick-background-render", 60 * 1000, true );
    scheduler.schedule( "tick-clock-trigger-update", 1000, true );
    scheduler.schedule( "tick-weather-trigger-update", 10 * 60 * 1000, true );

    (<any>window).SVG("clock").clock("100%").start();
});