function isUndefined(obj) {
    return !obj;
}
function isEmpty(obj) {
    return obj.length === 0;
}
function isUndefinedOrEmpty(obj) {
    return isUndefined(obj) || isEmpty(obj);
}

var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var Query;
(function (Query) {
    function fromArray(arr) {
        return Enumerable.fromArray(arr);
    }
    Query.fromArray = fromArray;
    function fromObject(obj) {
        return Enumerable.fromObject(obj);
    }
    Query.fromObject = fromObject;
    var Enumerable = (function () {
        function Enumerable() {
        }
        Enumerable.fromArray = function (arr) {
            return new EnumerableCore(arr);
        };
        Enumerable.fromObject = function (obj) {
            var pairs = [];
            for (var key in obj) {
                if (obj.hasOwnProperty(key)) {
                    pairs.push(new KeyValuePair(key, obj[key]));
                }
            }
            return new EnumerableCore(pairs);
        };
        return Enumerable;
    })();
    Query.Enumerable = Enumerable;
    (function (SortOrder) {
        SortOrder[SortOrder["Ascending"] = 0] = "Ascending";
        SortOrder[SortOrder["Descending"] = 1] = "Descending";
    })(Query.SortOrder || (Query.SortOrder = {}));
    var SortOrder = Query.SortOrder;
    var IterationResult = (function () {
        function IterationResult(result, shouldBreak) {
            this.result = result;
            this.shouldBreak = shouldBreak;
        }
        return IterationResult;
    })();
    var FilterAggregator = (function () {
        function FilterAggregator() {
            this._storage = [];
        }
        FilterAggregator.prototype.aggregate = function (item) {
            this._storage.push(item);
        };
        FilterAggregator.prototype.getResult = function () {
            return Enumerable.fromArray(this._storage);
        };
        return FilterAggregator;
    })();
    var AggregationAggregator = (function () {
        function AggregationAggregator(_aggregatorFunction) {
            this._aggregatorFunction = _aggregatorFunction;
        }
        AggregationAggregator.prototype.aggregate = function (item) {
            this._storage = this._aggregatorFunction(this._storage, item);
        };
        AggregationAggregator.prototype.getResult = function () {
            return this._storage;
        };
        return AggregationAggregator;
    })();
    var GroupingAggregator = (function () {
        function GroupingAggregator(_selector) {
            this._selector = _selector;
            this._storage = [];
        }
        GroupingAggregator.prototype.bucket = function (item) {
            var key = this._selector(item);
            var bucket = Enumerable.fromArray(this._storage).firstOrDefault(function (b) { return b.key === key; });
            if (!bucket) {
                bucket = new Grouping(key);
                this._storage.push(bucket);
            }
            bucket.add(item);
        };
        GroupingAggregator.prototype.aggregate = function (item) {
            this.bucket(item);
        };
        GroupingAggregator.prototype.getResult = function () {
            return Enumerable.fromArray(this._storage);
        };
        return GroupingAggregator;
    })();
    var SortingAggregator = (function () {
        function SortingAggregator(_selector, _sortOrder) {
            this._selector = _selector;
            this._sortOrder = _sortOrder;
            this._storage = [];
        }
        SortingAggregator.prototype.getComparer = function () {
            return this._sortOrder === 0 /* Ascending */ ? function (i1, i2) { return i1 > i2; } : function (i1, i2) { return i2 > i1; };
        };
        SortingAggregator.prototype.getInsertionPosition = function (item1) {
            var _this = this;
            var comparer = this.getComparer();
            var pos = 0;
            Enumerable.fromArray(this._storage).firstOrDefault(function (item2) {
                if (comparer(_this._selector(item1), _this._selector(item2))) {
                    pos++;
                    return false;
                }
                return true;
            });
            return pos;
        };
        SortingAggregator.prototype.aggregate = function (item) {
            this._storage.splice(this.getInsertionPosition(item), 0, item);
        };
        SortingAggregator.prototype.getResult = function () {
            return Enumerable.fromArray(this._storage);
        };
        return SortingAggregator;
    })();
    var Iterator = (function () {
        function Iterator(_enumerator) {
            this._enumerator = _enumerator;
        }
        Iterator.prototype.iterate = function (iterator, aggregator) {
            var i = 0;
            var currentItem;
            while ((currentItem = this._enumerator.next()) !== null) {
                var iteration = iterator(currentItem, i);
                if (iteration.result !== null) {
                    aggregator.aggregate(iteration.result);
                }
                if (iteration.shouldBreak) {
                    break;
                }
                i++;
            }
            return aggregator.getResult();
        };
        Iterator.prototype.filter = function (iterator, aggregator) {
            return this.iterate(iterator, aggregator);
        };
        Iterator.prototype.aggregate = function (iterator, aggregator) {
            return this.iterate(iterator, aggregator);
        };
        return Iterator;
    })();
    var EnumerableCore = (function () {
        function EnumerableCore(arr) {
            this.storage = arr ? arr : new Array();
        }
        EnumerableCore.prototype.getEnumerator = function () {
            var _this = this;
            return new ArrayEnumerator(function (i) { return _this.storage[i]; });
        };
        EnumerableCore.prototype.aggr = function (aggFunc) {
            return new Iterator(this.getEnumerator()).aggregate(function (i) { return new IterationResult(i, false); }, new AggregationAggregator(aggFunc));
        };
        EnumerableCore.prototype.iterate = function (iterator, aggregator) {
            return new Iterator(this.getEnumerator()).filter(iterator, aggregator);
        };
        EnumerableCore.prototype.group = function (iterator, aggregator) {
            return new Iterator(this.getEnumerator()).filter(iterator, aggregator);
        };
        EnumerableCore.prototype.filter = function (iterator) {
            return this.iterate(iterator, new FilterAggregator());
        };
        EnumerableCore.prototype.sort = function (selector, order) {
            return this.iterate(function (i) { return new IterationResult(i, false); }, new SortingAggregator(selector, order));
        };
        EnumerableCore.prototype.item = function (index) {
            return this.storage[index];
        };
        EnumerableCore.prototype.count = function (predicate) {
            return predicate ? this.where(predicate).count() : this.storage.length;
        };
        EnumerableCore.prototype.where = function (predicate) {
            return this.filter(function (item) {
                if (predicate(item)) {
                    return new IterationResult(item, false);
                }
                return new IterationResult(null, false);
            });
        };
        EnumerableCore.prototype.firstOrDefault = function (predicate) {
            if (!predicate) {
                return this.item(0);
            }
            var result = this.filter(function (item, i) {
                if (predicate(item, i)) {
                    return new IterationResult(item, true);
                }
                return new IterationResult(null, false);
            });
            return result.count() > 0 ? result.firstOrDefault() : null;
        };
        EnumerableCore.prototype.select = function (selector) {
            return this.filter(function (item) {
                return new IterationResult(selector(item), false);
            });
        };
        EnumerableCore.prototype.orderByAscending = function (selector) {
            return this.sort(selector, 0 /* Ascending */);
        };
        EnumerableCore.prototype.orderByDescending = function (selector) {
            return this.sort(selector, 1 /* Descending */);
        };
        EnumerableCore.prototype.aggregate = function (aggFunc, seed) {
            return this.aggr(function (sum, next) {
                return aggFunc(sum === undefined ? seed : sum, next);
            });
        };
        EnumerableCore.prototype.sum = function (selector) {
            if (!selector) {
                selector = function (i) { return i; };
            }
            return this.aggregate(function (sum, next) { return sum + selector(next); }, 0);
        };
        EnumerableCore.prototype.take = function (count) {
            var taken = 0;
            return this.filter(function (i) {
                if (taken < count) {
                    taken++;
                    return new IterationResult(i, false);
                }
                return new IterationResult(null, true);
            });
        };
        EnumerableCore.prototype.skip = function (count) {
            var skipped = 0;
            return this.filter(function (i) {
                if (skipped < count) {
                    skipped++;
                    return new IterationResult(null, false);
                }
                return new IterationResult(i, false);
            });
        };
        EnumerableCore.prototype.groupBy = function (selector) {
            return this.group(function (i) { return new IterationResult(i, false); }, new GroupingAggregator(selector));
        };
        EnumerableCore.prototype.toArray = function () {
            return this.storage.slice(0);
        };
        EnumerableCore.prototype.toList = function () {
            return new List(this.toArray());
        };
        return EnumerableCore;
    })();
    Query.EnumerableCore = EnumerableCore;
    var List = (function (_super) {
        __extends(List, _super);
        function List(arr) {
            _super.call(this, arr);
        }
        List.prototype.add = function (item) {
            this.storage.push(item);
        };
        List.prototype.remove = function (index) {
            this.storage.splice(index, 1);
        };
        List.prototype.each = function (action) {
            this.filter(function (item) {
                action(item);
                return new IterationResult(null, false);
            });
        };
        return List;
    })(EnumerableCore);
    Query.List = List;
    var Grouping = (function (_super) {
        __extends(Grouping, _super);
        function Grouping(key) {
            _super.call(this);
            this.key = key;
        }
        return Grouping;
    })(List);
    Query.Grouping = Grouping;
    var KeyValuePair = (function () {
        function KeyValuePair(key, value) {
            this.key = key;
            this.value = value;
        }
        return KeyValuePair;
    })();
    var ArrayEnumerator = (function () {
        function ArrayEnumerator(_accessor) {
            this._accessor = _accessor;
            this._currentIndex = 0;
        }
        Object.defineProperty(ArrayEnumerator.prototype, "current", {
            get: function () {
                return this._accessor(this._currentIndex);
            },
            enumerable: true,
            configurable: true
        });
        ArrayEnumerator.prototype.next = function () {
            var next = this.current;
            if (next) {
                this._currentIndex++;
                return next;
            }
            return null;
        };
        ArrayEnumerator.prototype.reset = function () {
            this._currentIndex = 0;
        };
        return ArrayEnumerator;
    })();
})(Query || (Query = {}));

var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var Simple;
(function (Simple) {
    var Events = (function () {
        function Events() {
            this.listeners = {};
        }
        Events.prototype.on = function (event, callback, context) {
            (this.listeners[event] || (this.listeners[event] = [])).push({ callback: callback, context: context });
        };
        Events.prototype.off = function (event, callback, context) {
            if (!callback && !context) {
                delete this.listeners[event];
            }
            var events = this.listeners[event] || [];
            for (var i = 0; i < events.length; i++) {
                if (!(callback && events[i].callback !== callback || context && events[i].context !== context)) {
                    events.splice(i, 1);
                }
            }
        };
        Events.prototype.trigger = function (event, data) {
            var events = this.listeners[event] || [];
            for (var i = 0; i < events.length; i++) {
                events[i].callback.apply(events[i].context || this, [data]);
            }
        };
        return Events;
    })();
    Simple.Events = Events;
    var Controller = (function (_super) {
        __extends(Controller, _super);
        function Controller() {
            _super.apply(this, arguments);
        }
        return Controller;
    })(Events);
    Simple.Controller = Controller;
    var View = (function (_super) {
        __extends(View, _super);
        function View(el, controller) {
            _super.call(this);
            this.el = el;
            this.controller = controller;
            this._template = new Template(function () { return el; });
        }
        View.prototype.initialize = function () {
        };
        View.prototype.render = function () {
        };
        return View;
    })(Events);
    Simple.View = View;
    var Template = (function () {
        function Template(factory) {
            this.factory = factory;
        }
        Template.prototype.compile = function (map) {
            var _this = this;
            return function (data) {
                var el = _this.factory();
                Object.keys(map).forEach(function (i) {
                    map[i](el.find(i), data);
                });
                return el;
            };
        };
        return Template;
    })();
    Simple.Template = Template;
})(Simple || (Simple = {}));

var Weather;
(function (Weather) {
    var OpenWeatherMap = (function () {
        function OpenWeatherMap(appId) {
            this.appId = appId;
        }
        OpenWeatherMap.prototype.translateIcon = function (icon) {
            switch (icon.replace("n", "d")) {
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
        };
        OpenWeatherMap.prototype.parseWeatherData = function (data) {
            return {
                description: data.weather[0].description,
                main: data.weather[0].main,
                icon: this.translateIcon(data.weather[0].icon),
                temperature: Math.round(data.main.temp - 273.15),
                percipitation: data.rain ? data.rain["3h"] : 0,
                windSpeed: data.wind.speed,
                sunrise: moment.unix(data.sys.sunrise),
                sunset: moment.unix(data.sys.sunset)
            };
        };
        OpenWeatherMap.prototype.getApiUrl = function (city, countryCode) {
            return "http://api.openweathermap.org/data/2.5/weather?q=" + city + "," + countryCode + "&APPID=" + this.appId + "&callback=?";
        };
        OpenWeatherMap.prototype.getWeather = function (city, countryCode) {
            var _this = this;
            return $.getJSON(this.getApiUrl(city, countryCode)).then(function (data) { return _this.parseWeatherData(data); });
        };
        return OpenWeatherMap;
    })();
    Weather.OpenWeatherMap = OpenWeatherMap;
})(Weather || (Weather = {}));

var Timers;
(function (Timers) {
    var Timer = (function () {
        function Timer(action) {
            this.action = action;
        }
        Timer.prototype.tick = function () {
            if (isUndefined(this.maxTimes) || this.times < this.maxTimes) {
                this.action();
                this.times++;
            }
            else {
                window.clearInterval(this.handle);
            }
        };
        Timer.prototype.trigger = function () {
            this.action();
        };
        Timer.prototype.start = function (interval, times) {
            var _this = this;
            this.times = 0;
            this.maxTimes = times;
            this.handle = window.setInterval(function () { return _this.tick(); }, interval);
        };
        Timer.prototype.stop = function () {
            if (isUndefined(this.handle)) {
                return;
            }
            window.clearInterval(this.handle);
        };
        return Timer;
    })();
    Timers.Timer = Timer;
    var TimerFactory = (function () {
        function TimerFactory() {
        }
        TimerFactory.prototype.create = function (action) {
            return new Timer(action);
        };
        return TimerFactory;
    })();
    Timers.TimerFactory = TimerFactory;
    var Scheduler = (function () {
        function Scheduler(timerFactory, mediator) {
            this.timerFactory = timerFactory;
            this.mediator = mediator;
            this.timers = {};
        }
        Scheduler.prototype.schedule = function (event, interval, immediate, times) {
            var _this = this;
            if (immediate === void 0) { immediate = false; }
            var timer = (this.timers[event] || (this.timers[event] = this.timerFactory.create(function () { return _this.mediator.trigger(event); })));
            if (immediate) {
                timer.trigger();
            }
            timer.start(interval, times);
        };
        return Scheduler;
    })();
    Timers.Scheduler = Scheduler;
})(Timers || (Timers = {}));

///<reference path="typing/jquery.d.ts"/>
///<reference path="typing/moment.d.ts"/>
///<reference path="simple.ts"/>
///<reference path="utils/extensions.ts"/>
var Updater;
(function (Updater) {
    var GitHubEventService = (function () {
        function GitHubEventService(username, repository, mediator) {
            this.username = username;
            this.repository = repository;
            this.mediator = mediator;
            this.initialize();
        }
        GitHubEventService.prototype.initialize = function () {
        };
        GitHubEventService.prototype.getApiUrl = function () {
            return "https://api.github.com/repos/" + this.username + "/" + this.repository + "/events";
        };
        GitHubEventService.prototype.parseEvent = function (event) {
            return {
                type: event.type,
                actor: event.actor.login,
                messages: event.type === "PushEvent" ? event.payload.commits.map(function (c) { return c.message; }) : [],
                created: moment(event.created_at),
                deployMinutes: 7
            };
        };
        GitHubEventService.prototype.update = function () {
            var _this = this;
            return $.getJSON(this.getApiUrl()).then(function (data) { return data.map(function (e) { return _this.parseEvent(e); }); });
        };
        GitHubEventService.prototype.getLastEventOfType = function (type) {
            return this.update().then(function (events) { return events.filter(function (e) { return e.type === type; }).sort(function (a, b) { return a.created.isAfter(b.created) ? 1 : -1; }).reverse()[0]; });
        };
        return GitHubEventService;
    })();
    Updater.GitHubEventService = GitHubEventService;
    var AutoUpdater = (function () {
        function AutoUpdater(mediator, eventService) {
            this.mediator = mediator;
            this.eventService = eventService;
            this.initialize();
        }
        AutoUpdater.prototype.initialize = function () {
            this.mediator.on("tick-autoUpdater-check", this.check, this);
        };
        AutoUpdater.prototype.check = function () {
            var _this = this;
            this.eventService.getLastEventOfType("PushEvent").then(function (event) {
                if (isUndefined(event)) {
                    return;
                }
                if (isUndefined(_this.lastEvent)) {
                    _this.lastEvent = event;
                    return;
                }
                if (event.created.isAfter(_this.lastEvent.created)) {
                    _this.mediator.trigger("autoUpdater-update", event);
                    _this.lastEvent = event;
                }
            });
        };
        return AutoUpdater;
    })();
    Updater.AutoUpdater = AutoUpdater;
})(Updater || (Updater = {}));

///<reference path="../simple.ts"/>
///<reference path="../typing/jquery.d.ts"/>
///<reference path="../updater.ts"/>
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var Views;
(function (Views) {
    var UpdateView = (function (_super) {
        __extends(UpdateView, _super);
        function UpdateView(el, mediator) {
            _super.call(this, el);
            this.el = el;
            this.mediator = mediator;
            this.initialize();
        }
        UpdateView.prototype.initialize = function () {
            this.mediator.on("updateView-show", this.show, this);
            this.mediator.on("clock-update", this.update, this);
            this.renderTemplate();
            this.hide();
        };
        UpdateView.prototype.renderTemplate = function () {
            this.template = this._template.compile({
                ".eta": function (e, d) {
                    var diff = moment(d.created).add("minutes", d.deployMinutes).diff(moment(), "seconds");
                    e.text(Math.floor(diff / 60) + " minutes, " + Math.floor(diff % 60) + " seconds");
                },
                ".commits": function (e, d) {
                    e.empty();
                    d.messages.forEach(function (m) { return e.append($("<li>" + m + "</li>")); });
                }
            });
        };
        UpdateView.prototype.show = function (data) {
            this.currentData = data;
            this.el.show();
        };
        UpdateView.prototype.hide = function () {
            this.el.hide();
        };
        UpdateView.prototype.update = function (data) {
            if (this.el.is(":visible")) {
                this.template(this.currentData);
            }
        };
        return UpdateView;
    })(Simple.View);
    Views.UpdateView = UpdateView;
})(Views || (Views = {}));

///<reference path="../typing/jquery.d.ts"/>
///<reference path="../typing/moment.d.ts"/>
///<reference path="../simple.ts"/>
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var Views;
(function (Views) {
    var ClockView = (function (_super) {
        __extends(ClockView, _super);
        function ClockView(el, mediator) {
            _super.call(this, el);
            this.el = el;
            this.mediator = mediator;
            this.initialize();
        }
        ClockView.prototype.initialize = function () {
            this.mediator.on("clock-update", this.update, this);
        };
        ClockView.prototype.update = function (data) {
            var time = this.el.find(".time .digital"), date = this.el.find(".date");
            time.text(data.format("HH:mm"));
            date.text(data.format("ddd Do MMM"));
        };
        return ClockView;
    })(Simple.View);
    Views.ClockView = ClockView;
})(Views || (Views = {}));

///<reference path="../simple.ts"/>
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var Views;
(function (Views) {
    var WeatherView = (function (_super) {
        __extends(WeatherView, _super);
        function WeatherView(el, mediator) {
            _super.call(this, el);
            this.el = el;
            this.mediator = mediator;
            this.initialize();
        }
        WeatherView.prototype.initialize = function () {
            this.mediator.on("weather-update", this.update, this);
            this.compileTemplate();
        };
        WeatherView.prototype.limitDescription = function (description) {
            var parts = description.split(" ");
            if (parts.length > 2) {
                parts.shift();
            }
            return parts.join(" ");
        };
        WeatherView.prototype.compileTemplate = function () {
            this.template = this._template.compile({
                ".symbol i": function (e, d) { return e.removeClass().addClass("wi").addClass(d.icon); },
                ".temperature .val": function (e, d) { return e.text(d.temperature); },
                ".description": function (e, d) { return e.text(d.description); },
                ".rain .val": function (e, d) { return e.text(d.percipitation); },
                ".wind .val": function (e, d) { return e.text(d.windSpeed); }
            });
        };
        WeatherView.prototype.update = function (data) {
            this.template(data);
        };
        return WeatherView;
    })(Simple.View);
    Views.WeatherView = WeatherView;
})(Views || (Views = {}));

var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
///<reference path="../typing/velocity-animate.d.ts"/>
///<reference path="../simple.ts"/>
var Views;
(function (Views) {
    var AutoScrollView = (function (_super) {
        __extends(AutoScrollView, _super);
        function AutoScrollView(el) {
            _super.call(this, el);
            this.el = el;
        }
        AutoScrollView.prototype.autoscroll = function (innerEl, speed) {
            var _this = this;
            var self = this;
            var start = false;
            if (!this.animation) {
                start = true;
            }
            this.animation = function () {
                var targetTop = (innerEl.height() - _this.el.height()) * -1;
                if (targetTop >= 0) {
                    _this.animation = undefined;
                    return;
                }
                var duration = (targetTop * -1 / 100) * speed;
                innerEl.velocity({
                    top: targetTop
                }, {
                    duration: duration,
                    delay: 1000,
                    complete: function () {
                        innerEl.css("top", "0px");
                        self.animation();
                    }
                });
            };
            if (start) {
                this.animation();
            }
        };
        return AutoScrollView;
    })(Simple.View);
    Views.AutoScrollView = AutoScrollView;
})(Views || (Views = {}));

var Travel;
(function (Travel) {
    var Ruter = (function () {
        function Ruter() {
        }
        Ruter.prototype.parseTravelData = function (data) {
            return {
                line: data.MonitoredVehicleJourney.LineRef,
                destination: data.MonitoredVehicleJourney.DestinationName,
                direction: data.MonitoredVehicleJourney.DirectionRef,
                departure: moment(data.MonitoredVehicleJourney.MonitoredCall.ExpectedDepartureTime)
            };
        };
        Ruter.prototype.getApiUrl = function (stopId) {
            return "http://whateverorigin.org/get?url=http://reisapi.ruter.no/StopVisit/GetDepartures/" + stopId + "&callback=?";
        };
        Ruter.prototype.getTravelData = function (stopId) {
            var _this = this;
            return $.getJSON(this.getApiUrl(stopId)).then(function (data) { return JSON.parse(data.contents).filter(function (i) { return i.MonitoredVehicleJourney.DirectionRef > 0; }).map(function (i) { return _this.parseTravelData(i); }); });
        };
        return Ruter;
    })();
    Travel.Ruter = Ruter;
})(Travel || (Travel = {}));

///<reference path="../simple.ts"/>
///<reference path="autoScrollView.ts"/>
///<reference path="../travel.ts"/>
///<reference path="../typing/moment.d.ts"/>
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var Views;
(function (Views) {
    var TravelView = (function (_super) {
        __extends(TravelView, _super);
        function TravelView(el, mediator) {
            _super.call(this, el);
            this.el = el;
            this.mediator = mediator;
            this.initialize();
        }
        TravelView.prototype.initialize = function () {
            this.mediator.on("travel-update", this.update, this);
            this.compileTemplate();
        };
        TravelView.prototype.compileTemplate = function () {
            var itemTemplate = new Simple.Template(function () { return $("<div class=\"row\"><span class=\"col col-25 line\">1</span>" + "<span class=\"col col-50 destination\">Mortensrud</span >" + "<span class=\"col col-25 departure\">3 min</span >" + "</div>"); }).compile({
                ".line": function (e, d) { return e.text(d.line); },
                ".destination": function (e, d) { return e.text(d.destination); },
                ".departure": function (e, d) {
                    var secondsDiff = d.departure.diff(moment(), "seconds");
                    if (secondsDiff < 420) {
                        e.parent().addClass("urgent");
                    }
                    if (secondsDiff < 45) {
                        e.text("Nå");
                        return;
                    }
                    if (secondsDiff < 540) {
                        e.text(d.departure.diff(moment(), "minutes") + " min");
                        return;
                    }
                    e.text("ca " + d.departure.format("HH:mm"));
                }
            });
            this.template = this._template.compile({
                ".east": function (e, d) {
                    e.empty().append(d.east.map(function (i) { return itemTemplate(i); }));
                },
                ".west": function (e, d) {
                    e.empty().append(d.west.map(function (i) { return itemTemplate(i); }));
                }
            });
        };
        TravelView.prototype.update = function (data) {
            this.template(data);
            this.autoscroll(this.el.find(".list"), 3000);
        };
        return TravelView;
    })(Views.AutoScrollView);
    Views.TravelView = TravelView;
})(Views || (Views = {}));

var Calendar;
(function (Calendar) {
    var ICalCalendarProvider = (function () {
        function ICalCalendarProvider() {
        }
        ICalCalendarProvider.prototype.parseEventData = function (owner, data) {
            var _this = this;
            var ifNotNull = function (obj, accessor) { return obj ? accessor(obj) : ""; };
            var title = ifNotNull(data[1].filter(function (p) { return p[0] === "summary"; })[0], function (o) { return o[3]; });
            var start = ifNotNull(data[1].filter(function (p) { return p[0] === "dtstart"; })[0], function (o) { return moment(o[3]); });
            var end = ifNotNull(data[1].filter(function (p) { return p[0] === "dtend"; })[0], function (o) { return moment(o[3]); });
            var recur = ifNotNull(data[1].filter(function (p) { return p[0] === "rrule"; })[0], function (o) { return _this.parseRecurRule(o[3], start); });
            return {
                title: title,
                owner: owner,
                start: start,
                end: end,
                recur: recur
            };
        };
        ICalCalendarProvider.prototype.parseRecurRule = function (recur, start) {
            var rule = {};
            recur.split(";").map(function (r) { return r.split("="); }).forEach(function (r) {
                switch (r[0]) {
                    case "FREQ":
                        $.extend(rule, { freq: window.RRule[r[1]] });
                        break;
                    case "INTERVAL":
                        $.extend(rule, { interval: parseInt(r[1]) });
                        break;
                    case "BYDAY":
                        $.extend(rule, { byweekday: r[1].split(",").map(function (d) { return window.RRule[d]; }) });
                        break;
                    case "UNTIL":
                        $.extend(rule, { until: moment(r[1]).toDate() });
                        break;
                    case "DTSTART":
                        $.extend(rule, { dtstart: moment(r[1]).toDate() });
                        break;
                    case "WKST":
                        $.extend(rule, { wkst: window.RRule[r[1]] });
                        break;
                }
            });
            if (!rule.dtstart) {
                rule.dtstart = start.toDate();
            }
            return rule;
        };
        ICalCalendarProvider.prototype.shouldIncludeEvent = function (event, today) {
            var recurMatch = false;
            if (event.recur) {
                var rule = new window.RRule(event.recur);
                recurMatch = rule.between(today.clone().startOf("day").toDate(), today.clone().endOf("day").toDate()).length > 0;
            }
            return event.start.isSame(today, "day") || event.end.isSame(today, "day") || recurMatch;
        };
        ICalCalendarProvider.prototype.getEventData = function (sources, today) {
            var _this = this;
            var promises = sources.map(function (s) { return $.getJSON(s.url).then(function (data) { return window.ICAL.parse(data.contents)[1][2].filter(function (e) { return e[0] === "vevent"; }).map(function (e) { return _this.parseEventData(s.owner, e); }); }); });
            return $.when.apply($, promises).then(function () {
                var all = Query.fromArray([].concat.apply([], arguments));
                return {
                    today: all.where(function (e) { return _this.shouldIncludeEvent(e, today); }).toArray(),
                    tomorrow: all.where(function (e) { return _this.shouldIncludeEvent(e, today.clone().add(1, "day")); }).toArray()
                };
            });
        };
        return ICalCalendarProvider;
    })();
    Calendar.ICalCalendarProvider = ICalCalendarProvider;
})(Calendar || (Calendar = {}));

///<reference path="../simple.ts"/>
///<reference path="../calendar.ts"/>
///<reference path="autoScrollView.ts"/>
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var Views;
(function (Views) {
    var CalendarView = (function (_super) {
        __extends(CalendarView, _super);
        function CalendarView(el, mediator) {
            _super.call(this, el);
            this.el = el;
            this.mediator = mediator;
            this.initialize();
        }
        CalendarView.prototype.initialize = function () {
            this.mediator.on("calendar-update", this.update, this);
            this.compileTemplate();
        };
        CalendarView.prototype.compileTemplate = function () {
            var itemTemplate = new Simple.Template(function () { return $("<div class=\"row\">" + "<span class=\"col col-100\">" + "<span class=\"owner\"></span>" + "<span class=\"time\">" + "<span class=\"start\"></span> - " + "<span class=\"end\"></span>" + "</span>" + "<span class=\"title\"></span>" + "</span>" + "</div>"); }).compile({
                ".time .start": function (e, d) { return e.text(d.start.format("HH:mm")); },
                ".time .end": function (e, d) { return e.text(d.end.format("HH:mm")); },
                ".title": function (e, d) { return e.text(d.title); },
                ".owner": function (e, d) { return e.text(d.owner); }
            });
            this.template = this._template.compile({
                ".today": function (e, d) {
                    e.empty().append(d.today.map(function (i) { return itemTemplate(i); }));
                },
                ".tomorrow": function (e, d) {
                    e.empty().append(d.tomorrow.map(function (i) { return itemTemplate(i); }));
                }
            });
        };
        CalendarView.prototype.update = function (data) {
            this.template(data);
            this.autoscroll(this.el.find(".list"), 5000);
        };
        return CalendarView;
    })(Views.AutoScrollView);
    Views.CalendarView = CalendarView;
})(Views || (Views = {}));



var LastFm;
(function (LastFm) {
    var ScrobbleProvider = (function () {
        function ScrobbleProvider(username, apiKey) {
            this.username = username;
            this.apiKey = apiKey;
        }
        ScrobbleProvider.prototype.parseScrobbleData = function (data) {
            return {
                artist: data.artist["#text"],
                track: data.name,
                album: data.album["#text"],
                imageUrl: data.image[3] ? data.image[3]["#text"].replace("300x300", "500") : "",
                nowPlaying: data["@attr"] ? data["@attr"].nowplaying == "true" : false
            };
        };
        ScrobbleProvider.prototype.getApiUrl = function () {
            return "http://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=" + this.username + "&api_key=" + this.apiKey + "&format=json";
        };
        ScrobbleProvider.prototype.getPlayingTrack = function () {
            var _this = this;
            return $.getJSON(this.getApiUrl()).then(function (data) { return data.recenttracks.track.map(function (d) { return _this.parseScrobbleData(d); }).filter(function (d) { return d.nowPlaying; })[0]; });
        };
        return ScrobbleProvider;
    })();
    LastFm.ScrobbleProvider = ScrobbleProvider;
})(LastFm || (LastFm = {}));

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
///<reference path="LastFm.ts"/>
var ClockService = (function () {
    function ClockService(mediator) {
        this.mediator = mediator;
        this.initialize();
    }
    ClockService.prototype.initialize = function () {
        this.mediator.on("tick-clock-trigger-update", this.triggerUpdate, this);
    };
    ClockService.prototype.triggerUpdate = function () {
        this.mediator.trigger("clock-update", moment());
    };
    return ClockService;
})();
var WeatherService = (function () {
    function WeatherService(city, countryCode, weatherProvider, mediator) {
        this.city = city;
        this.countryCode = countryCode;
        this.weatherProvider = weatherProvider;
        this.mediator = mediator;
        this.initialize();
    }
    WeatherService.prototype.initialize = function () {
        this.mediator.on("tick-weather-trigger-update", this.triggerUpdate, this);
    };
    WeatherService.prototype.triggerUpdate = function () {
        var _this = this;
        this.weatherProvider.getWeather(this.city, this.countryCode).then(function (data) { return _this.mediator.trigger("weather-update", data); });
    };
    return WeatherService;
})();
var ScrobbleService = (function () {
    function ScrobbleService(scrobbleProvider, mediator) {
        this.scrobbleProvider = scrobbleProvider;
        this.mediator = mediator;
        this.initialize();
    }
    ScrobbleService.prototype.initialize = function () {
        this.mediator.on("tick-lastfm-update", this.triggerUpdate, this);
    };
    ScrobbleService.prototype.triggerUpdate = function () {
        var _this = this;
        this.scrobbleProvider.getPlayingTrack().then(function (data) { return _this.mediator.trigger("scrobble-update", data); });
    };
    return ScrobbleService;
})();
var EnvironmentService = (function () {
    function EnvironmentService(mediator) {
        this.mediator = mediator;
        this.currentChanged = false;
        this.initialize();
    }
    EnvironmentService.prototype.initialize = function () {
        this.currentEnvironment = {
            timeOfDay: undefined,
            weather: undefined,
            season: undefined,
            sunrise: undefined,
            sunset: undefined,
            updated: undefined
        };
        this.mediator.on("weather-update", this.weatherUpdate, this);
        this.mediator.on("clock-update", this.clockUpdate, this);
    };
    EnvironmentService.prototype.setProperty = function (key, value) {
        if (this.currentEnvironment[key] !== value) {
            this.currentEnvironment[key] = value;
            this.currentChanged = true;
            this.currentEnvironment.updated = moment();
        }
    };
    EnvironmentService.prototype.isComplete = function () {
        for (var key in this.currentEnvironment) {
            if (!this.currentEnvironment[key]) {
                return false;
            }
        }
        return true;
    };
    EnvironmentService.prototype.getTimeOfDay = function (now, sunrise, sunset) {
        return sunrise && sunset ? now.isBefore(sunrise) || now.isAfter(sunset) ? "night" : "day" : "";
    };
    EnvironmentService.prototype.getSeason = function (now) {
        var month = now.month();
        if (month === 2 || month === 3 || month === 4) {
            return "spring";
        }
        if (month === 5 || month === 6 || month === 7) {
            return "summer";
        }
        if (month === 8 || month === 9 || month === 10) {
            return "fall";
        }
        return "winter";
    };
    EnvironmentService.prototype.weatherUpdate = function (data) {
        this.setProperty("weather", data.main.toLowerCase());
        this.setProperty("sunrise", data.sunrise);
        this.setProperty("sunset", data.sunset);
        this.triggerEnvironmentUpdate();
    };
    EnvironmentService.prototype.clockUpdate = function (data) {
        this.setProperty("timeOfDay", this.getTimeOfDay(data, this.currentEnvironment.sunrise, this.currentEnvironment.sunset));
        this.setProperty("season", this.getSeason(data));
        this.triggerEnvironmentUpdate();
    };
    EnvironmentService.prototype.triggerEnvironmentUpdate = function () {
        if (this.currentChanged && this.isComplete()) {
            this.mediator.trigger("environment-update", this.currentEnvironment);
            this.currentChanged = false;
        }
    };
    return EnvironmentService;
})();
var noCacheUrl = function (url) {
    var noCache = url, split = url.split("?");
    if (split.length > 1) {
        noCache = split[0];
    }
    return noCache + "?" + Math.random();
};
$(function () {
    var mediator = new Simple.Events();
    var weatherProvider = new Weather.OpenWeatherMap("eee9d46aa90c56ff8b116ab88f2a5e3f");
    var scheduler = new Timers.Scheduler(new Timers.TimerFactory(), mediator);
    var clockService = new ClockService(mediator);
    var weatherService = new WeatherService("Oslo", "NO", weatherProvider, mediator);
    var environmentService = new EnvironmentService(mediator);
    var scrobbleService = new ScrobbleService(new LastFm.ScrobbleProvider("thomrand", "42fc325d7df948bf99b0e8713cf93584"), mediator);
    var github = new Updater.GitHubEventService("thrandre", "InfoFrame", mediator);
    var autoUpdater = new Updater.AutoUpdater(mediator, github);
    var updateView = new Views.UpdateView($(".update-info"), mediator);
    var clockView = new Views.ClockView($(".clock"), mediator);
    var weatherView = new Views.WeatherView($(".weather"), mediator);
    var scrobbleView = new Views.ScrobbleView($(".lastfm"), mediator);
    var ruter = new Travel.Ruter();
    var travelView = new Views.TravelView($(".travel"), mediator);
    var calendar = new Calendar.ICalCalendarProvider();
    var calenderView = new Views.CalendarView($(".calendar"), mediator);
    mediator.on("environment-update", function (data) { return console.log(data); });
    mediator.on("github-push", function (data) { return console.log(data); });
    mediator.on("autoUpdater-update", function (data) {
        mediator.trigger("updateView-show", data);
        new Timers.Timer(function () { return window.location.href = noCacheUrl(window.location.href); }).start(moment(data.created).add("minutes", data.deployMinutes).diff(moment()), 1);
    });
    scheduler.schedule("tick-github-update", 5 * 60 * 1000, true);
    scheduler.schedule("tick-background-load", 60 * 60 * 1000, true);
    scheduler.schedule("tick-background-render", 10 * 1000, true);
    scheduler.schedule("tick-clock-trigger-update", 1000, true);
    scheduler.schedule("tick-weather-trigger-update", 10 * 60 * 1000, true);
    scheduler.schedule("tick-autoUpdater-check", 60 * 1000, true);
    scheduler.schedule("tick-lastfm-update", 10 * 1000, true);
    window.SVG("clock").clock("100%").start();
    var travelTimer = new Timers.Timer(function () { return ruter.getTravelData("3010610").then(function (data) {
        var viewData = {
            east: Query.fromArray(data).where(function (t) { return t.direction == 1; }).where(function (t) { return t.departure.add(5, 'minutes') > moment(); }).orderByAscending(function (t) { return t.departure; }).take(5).toArray(),
            west: Query.fromArray(data).where(function (t) { return t.direction == 2; }).where(function (t) { return t.departure.add(5, 'minutes') > moment(); }).orderByAscending(function (t) { return t.departure; }).take(5).toArray()
        };
        mediator.trigger("travel-update", viewData);
    }); });
    travelTimer.start(60 * 1000);
    travelTimer.trigger();
    var calendarSources = [
        {
            owner: "Thomas",
            url: "http://whateverorigin.org/get?url=https://sharing.calendar.live.com/calendar/private/0ec5c5e9-a270-40ab-a244-581302314b18/f7dd211a-88b0-4a5e-a963-d807a40fe6a7/cid-5d3f62a70d427c52/calendar.ics&callback=?"
        },
        {
            owner: "Caroline",
            url: "http://whateverorigin.org/get?url=https://sharing.calendar.live.com/calendar/private/97ab575d-b24f-454c-adc7-8247e5218994/e676ed5e-dc22-425a-94e5-b2396e146762/cid-c2490ffbe195f761/calendar.ics&callback=?"
        }
    ];
    var calendarTimer = new Timers.Timer(function () { return calendar.getEventData(calendarSources, moment()).then(function (data) { return mediator.trigger("calendar-update", data); }); });
    calendarTimer.start(10 * 60 * 1000);
    calendarTimer.trigger();
});

///<reference path="../simple.ts"/>
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var Views;
(function (Views) {
    var ScrobbleView = (function (_super) {
        __extends(ScrobbleView, _super);
        function ScrobbleView(el, mediator) {
            _super.call(this, el);
            this.el = el;
            this.mediator = mediator;
            this.initialize();
        }
        ScrobbleView.prototype.initialize = function () {
            this.mediator.on("scrobble-update", this.update, this);
            this.compileTemplate();
        };
        ScrobbleView.prototype.compileTemplate = function () {
            this.template = this._template.compile({
                "": function (e, d) { return e.andSelf().css("background", "linear-gradient( rgba(181, 0, 0, 0.45), rgba(181, 0, 0, 1) ), url('" + d.imageUrl + "') top/cover no-repeat"); },
                ".track": function (e, d) { return e.text(d.track); },
                ".artist": function (e, d) { return e.text(d.artist); },
                ".album": function (e, d) { return e.text(d.album); }
            });
        };
        ScrobbleView.prototype.update = function (data) {
            if (!data) {
                this.template({ track: "", artist: "", album: "", imageUrl: "" });
                return;
            }
            this.template(data);
        };
        return ScrobbleView;
    })(Simple.View);
    Views.ScrobbleView = ScrobbleView;
})(Views || (Views = {}));