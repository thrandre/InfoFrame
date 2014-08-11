declare module Simple {
    interface EventListener {
        callback: (data: any) => void;
        context: any;
    }
    interface EventEmitter {
        on(event: string, callback: (data: any) => void, context?: any): any;
        off(event: string, callback?: (data: any) => void, context?: any): any;
        trigger(event: string, data?: any): any;
    }
    class Events {
        private listeners;
        public on(event: string, callback: (data: any) => void, context?: any): void;
        public off(event: string, callback?: (data: any) => void, context?: any): void;
        public trigger(event: string, data?: any): void;
    }
    class Controller extends Events {
    }
    class View extends Events {
        public el: JQuery;
        public controller: Controller;
        public _template: Template;
        constructor(el: JQuery, controller?: Controller);
        public initialize(): void;
        public render(): void;
    }
    class Template {
        private el;
        constructor(el: JQuery);
        public compile<T>(map: {
            [selector: string]: (el: JQuery, data: T) => void;
        }): (data: T) => void;
    }
}
declare module Weather {
    interface WeatherData {
        description: string;
        main: string;
        icon: string;
        temperature: number;
        percipitation: number;
        windSpeed: number;
        sunrise: Moment;
        sunset: Moment;
    }
    interface WeatherProvider {
        getWeather(city: string, countryCode: string): JQueryPromise<WeatherData>;
    }
    class OpenWeatherMap implements WeatherProvider {
        private appId;
        constructor(appId: string);
        private translateIcon(icon);
        private parseWeatherData(data);
        private getApiUrl(city, countryCode);
        public getWeather(city: string, countryCode: string): JQueryPromise<WeatherData>;
    }
}
declare module Artwork {
    interface PhotoData {
        title: string;
        tags: string[];
        source: string;
        width: number;
        height: number;
    }
    interface IPhotoProvider {
        search(minWidth: number, minHeight: number): JQueryPromise<PhotoData[]>;
    }
    class Flickr implements IPhotoProvider {
        private apiKey;
        private userId;
        constructor(apiKey: string, userId: string);
        private getApiUrl();
        private parsePhoto(data);
        public search(minWidth: number, minHeight: number): JQueryPromise<PhotoData[]>;
    }
}
declare module Timers {
    class Timer {
        private action;
        private times;
        private maxTimes;
        private handle;
        constructor(action: () => void);
        private tick();
        public trigger(): void;
        public start(interval: number, times?: number): void;
        public stop(): void;
    }
    class TimerFactory {
        public create(action: () => void): Timer;
    }
    class Scheduler {
        private timerFactory;
        private mediator;
        private timers;
        constructor(timerFactory: TimerFactory, mediator: Simple.EventEmitter);
        public schedule(event: string, interval: number, immediate?: boolean, times?: number): void;
    }
}
declare module Bubbles {
    class Stage {
        public el: JQuery;
        public timerFactory: Timers.TimerFactory;
        public bubbles: Bubble[];
        constructor(el: JQuery, timerFactory: Timers.TimerFactory);
        public initialize(): void;
        public getStageOrigin(): JQueryCoordinates;
        public layout(): void;
    }
    class Bubble {
        public el: JQuery;
        public virtualPadding: number;
        constructor(el: JQuery);
        public initialize(): void;
        public getOrigin(): JQueryCoordinates;
        public getRadius(includeMargin?: boolean): number;
        public setRadius(radius: number): void;
        public setVirtualPadding(padding: number): void;
        public getPointOnCircumference(angle: number, includeMargin?: boolean): JQueryCoordinates;
        public translateToAbsolute(relative: JQueryCoordinates): JQueryCoordinates;
        public moveTo(position: JQueryCoordinates): void;
        public originMoveTo(position: JQueryCoordinates): void;
        public flip(): void;
    }
}
declare module Views {
    class UpdateView extends Simple.View {
        public el: JQuery;
        private mediator;
        private template;
        private currentData;
        constructor(el: JQuery, mediator: Simple.EventEmitter);
        public initialize(): void;
        public renderTemplate(): void;
        public show(data: EventData): void;
        public hide(): void;
        public update(data: Moment): void;
    }
}
declare module Controllers {
    class BackgroundController extends Simple.Controller {
        private photoProvider;
        constructor(photoProvider: Artwork.IPhotoProvider);
        public getPhotos(minWidth: number, minHeight: number): JQueryPromise<Artwork.PhotoData[]>;
    }
}
declare module Utils {
    class ImageLoader {
        public load(photoData: Artwork.PhotoData): JQueryPromise<any>;
    }
}
declare module Views {
    class BackgroundView extends Simple.View {
        public el: JQuery;
        public mediator: Simple.EventEmitter;
        public controller: Controllers.BackgroundController;
        public imageLoader: Utils.ImageLoader;
        private photos;
        private currentPhotoSet;
        private currentPhoto;
        constructor(el: JQuery, mediator: Simple.EventEmitter, controller: Controllers.BackgroundController, imageLoader: Utils.ImageLoader);
        public initialize(): void;
        public getPhotos(): JQueryPromise<any>;
        public matchTags(wantedTags: string[], tags: string[]): number;
        public photoIsMatch(wantedTags: string[], tags: string[], fuzzyness: number): boolean;
        public updatePhotoSet(tags: string[]): void;
        public getEnvironmentTags(data: EnvironmentData): string[];
        public environmentUpdate(data: EnvironmentData): void;
        public renderNext(): void;
        public render(): void;
    }
}
declare module Views {
    class ClockView extends Simple.View {
        public el: JQuery;
        public mediator: Simple.EventEmitter;
        constructor(el: JQuery, mediator: Simple.EventEmitter);
        public initialize(): void;
        public update(data: Moment): void;
    }
}
declare module Views {
    class WeatherView extends Simple.View {
        public el: JQuery;
        public mediator: Simple.EventEmitter;
        private template;
        constructor(el: JQuery, mediator: Simple.EventEmitter);
        public initialize(): void;
        public limitDescription(description: string): string;
        public compileTemplate(): void;
        public update(data: Weather.WeatherData): void;
    }
}
declare class ClockService {
    private mediator;
    constructor(mediator: Simple.EventEmitter);
    public initialize(): void;
    public triggerUpdate(): void;
}
declare class WeatherService {
    private city;
    private countryCode;
    private weatherProvider;
    private mediator;
    constructor(city: string, countryCode: string, weatherProvider: Weather.WeatherProvider, mediator: Simple.EventEmitter);
    public initialize(): void;
    public triggerUpdate(): void;
}
interface EnvironmentData {
    timeOfDay: string;
    season: string;
    weather: string;
    sunrise: Moment;
    sunset: Moment;
    updated: Moment;
}
declare class EnvironmentService {
    private mediator;
    private currentEnvironment;
    private currentChanged;
    constructor(mediator: Simple.EventEmitter);
    public initialize(): void;
    private setProperty(key, value);
    private isComplete();
    private getTimeOfDay(now, sunrise, sunset);
    private getSeason(now);
    private weatherUpdate(data);
    private clockUpdate(data);
    public triggerEnvironmentUpdate(): void;
}
interface EventData {
    type: string;
    actor: string;
    messages: string[];
    created: Moment;
    deployMinutes: number;
}
interface EventService {
    getLastEventOfType(type: string): JQueryPromise<EventData>;
}
declare class GitHubEventService {
    private username;
    private repository;
    private mediator;
    private lastPush;
    constructor(username: string, repository: string, mediator: Simple.EventEmitter);
    public initialize(): void;
    private getApiUrl();
    private parseEvent(event);
    private update();
    public getLastEventOfType(type: string): JQueryPromise<any>;
}
declare class AutoUpdater {
    private mediator;
    private eventService;
    private lastEvent;
    constructor(mediator: Simple.EventEmitter, eventService: EventService);
    public initialize(): void;
    public check(): void;
}
declare var noCacheUrl: (url: string) => string;
declare module Query {
    interface IEnumerableFactory {
        fromArray<T>(arr: T[]): IEnumerable<T>;
        fromObject<TVal>(obj: {
            [id: string]: TVal;
        }): IEnumerable<IKeyValuePair<string, TVal>>;
    }
    interface IEnumerable<TIn> {
        getEnumerator: () => IEnumerator<TIn>;
        count: (predicate?: IPredicate<TIn>) => number;
        where: (predicate: IPredicate<TIn>) => IEnumerable<TIn>;
        firstOrDefault: (predicate?: IPredicate<TIn>) => TIn;
        select: <TOut>(selector: ISelector<TIn, TOut>) => IEnumerable<TOut>;
        orderByAscending: <TOut>(selector: ISelector<TIn, TOut>) => IEnumerable<TIn>;
        orderByDescending: <TOut>(selector: ISelector<TIn, TOut>) => IEnumerable<TIn>;
        groupBy: <TOut>(selector: ISelector<TIn, TOut>) => IEnumerable<Grouping<TIn, TOut>>;
        aggregate: <TOut>(aggFunc: IAggregatorFunction<TIn, TOut>, seed: TOut) => TOut;
        sum: (selector?: ISelector<TIn, number>) => number;
        take: (count: number) => IEnumerable<TIn>;
        skip: (count: number) => IEnumerable<TIn>;
        toArray: () => TIn[];
        toList: () => IList<TIn>;
    }
    interface IPredicate<TIn> {
        (item: TIn, i?: number): boolean;
    }
    interface IAction<TIn> {
        (item: TIn, i?: number): any;
    }
    interface ISelector<TIn, TOut> {
        (item: TIn, i?: number): TOut;
    }
    interface IAggregatorFunction<TIn, TOut> {
        (agg: TOut, next: TIn): TOut;
    }
    interface IComparerFunction<TIn> {
        (item1: TIn, item2: TIn): boolean;
    }
    interface IIteratorKernel<TIn, TOut> {
        (item: TIn, i: number): IIterationResult<TOut>;
    }
    interface IIterationResult<TIn> {
        result: TIn;
        shouldBreak: boolean;
    }
    interface IAggregator<TIn, TOut> {
        aggregate(item: TIn): any;
        getResult(): TOut;
    }
    interface IList<TIn> extends IEnumerable<TIn> {
        add: (item: TIn) => void;
        item: (index: number) => TIn;
        remove: (index: number) => void;
        each: (action: IAction<TIn>) => void;
    }
    interface IKeyValuePair<TKey, TVal> {
        key: TKey;
        value: TVal;
    }
    interface IEnumerator<TIn> {
        current: TIn;
        next: () => TIn;
        reset: () => void;
    }
    interface IPromise<TOut> {
    }
    function fromArray<T>(arr: T[]): IEnumerable<T>;
    function fromObject<TVal>(obj: {
        [id: string]: TVal;
    }): IEnumerable<IKeyValuePair<string, TVal>>;
    class Enumerable {
        static fromArray<T>(arr: T[]): IEnumerable<T>;
        static fromObject<TVal>(obj: {
            [id: string]: TVal;
        }): IEnumerable<IKeyValuePair<string, TVal>>;
    }
    enum SortOrder {
        Ascending = 0,
        Descending = 1,
    }
    class EnumerableCore<TIn> implements IEnumerable<TIn> {
        public storage: TIn[];
        public getEnumerator(): IEnumerator<TIn>;
        public aggr<TOut>(aggFunc: IAggregatorFunction<TIn, TOut>): TOut;
        public iterate<TOut>(iterator: IIteratorKernel<TIn, TOut>, aggregator: IAggregator<TOut, IEnumerable<TOut>>): IEnumerable<TOut>;
        public group<TOut, TOut2>(iterator: IIteratorKernel<TIn, TOut>, aggregator: IAggregator<TOut, IEnumerable<Grouping<TIn, TOut2>>>): IEnumerable<Grouping<TIn, TOut2>>;
        public filter<TOut>(iterator: IIteratorKernel<TIn, TOut>): IEnumerable<TOut>;
        public sort<TOut>(selector: ISelector<TIn, TOut>, order: SortOrder): IEnumerable<TIn>;
        public item(index: number): TIn;
        public count(predicate?: IPredicate<TIn>): number;
        public where(predicate: IPredicate<TIn>): IEnumerable<TIn>;
        public firstOrDefault(predicate?: IPredicate<TIn>): TIn;
        public select<TOut>(selector: ISelector<TIn, TOut>): IEnumerable<TOut>;
        public orderByAscending<TOut>(selector: ISelector<TIn, TOut>): IEnumerable<TIn>;
        public orderByDescending<TOut>(selector: ISelector<TIn, TOut>): IEnumerable<TIn>;
        public aggregate<TOut>(aggFunc: IAggregatorFunction<TIn, TOut>, seed: TOut): TOut;
        public sum(selector?: ISelector<TIn, number>): number;
        public take(count: number): IEnumerable<TIn>;
        public skip(count: number): IEnumerable<TIn>;
        public groupBy<TOut>(selector: ISelector<TIn, TOut>): IEnumerable<Grouping<TIn, TOut>>;
        public toArray(): TIn[];
        public toList(): IList<TIn>;
        constructor(arr?: TIn[]);
    }
    class List<TIn> extends EnumerableCore<TIn> implements IList<TIn> {
        public add(item: TIn): void;
        public remove(index: number): void;
        public each(action: IAction<TIn>): void;
        constructor(arr?: TIn[]);
    }
    class Grouping<TIn, TOut> extends List<TIn> {
        public key: TOut;
        constructor(key: TOut);
    }
}
declare function isUndefined(obj: any): boolean;
declare function isEmpty(obj: any[]): boolean;
declare function isUndefinedOrEmpty(obj: any[]): boolean;
