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
        }
        View.prototype.initialize = function () {
        };

        View.prototype.render = function () {
        };
        return View;
    })(Events);
    Simple.View = View;
})(Simple || (Simple = {}));

var Weather;
(function (Weather) {
    var OpenWeatherMap = (function () {
        function OpenWeatherMap(appId) {
            this.appId = appId;
        }
        OpenWeatherMap.prototype.translateIcon = function (icon) {
            switch (icon) {
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
                percipitation: data.rain["3h"],
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
            return $.getJSON(this.getApiUrl(city, countryCode)).then(function (data) {
                return _this.parseWeatherData(data);
            });
        };
        return OpenWeatherMap;
    })();
    Weather.OpenWeatherMap = OpenWeatherMap;
})(Weather || (Weather = {}));

var Artwork;
(function (Artwork) {
    var Flickr = (function () {
        function Flickr(apiKey, userId) {
            this.apiKey = apiKey;
            this.userId = userId;
        }
        Flickr.prototype.getApiUrl = function () {
            return "https://api.flickr.com/services/rest/?method=flickr.favorites.getPublicList&api_key=" + this.apiKey + "&user_id=" + this.userId + "&extras=o_dims%2Curl_o%2Ctags&per_page=500&format=json&nojsoncallback=1";
        };

        Flickr.prototype.search = function (minWidth, minHeight) {
            return $.getJSON(this.getApiUrl()).then(function (data) {
                return data.photos.photo.filter(function (photo) {
                    return photo.width_o >= minWidth && photo.height_o >= minHeight;
                }).map(function (photo) {
                    return {
                        title: photo.title,
                        tags: photo.tags.split(" ").map(function (tag) {
                            return tag.toLowerCase();
                        }),
                        source: photo.url_o,
                        width: photo.width_o,
                        height: photo.height_o
                    };
                });
            });
        };
        return Flickr;
    })();
    Artwork.Flickr = Flickr;
})(Artwork || (Artwork = {}));

var Stage = (function () {
    function Stage(el, timerFactory) {
        this.el = el;
        this.timerFactory = timerFactory;
        this.bubbles = [];
        this.initialize();
    }
    Stage.prototype.initialize = function () {
        var _this = this;
        this.el.find(".bubble").each(function (i, e) {
            return _this.bubbles.push(new Bubble($(e)));
        });
        this.timerFactory.create(function () {
            return _this.bubbles.forEach(function (b) {
                return b.flip();
            });
        }).start(10000);
        this.layout();
    };

    Stage.prototype.getStageOrigin = function () {
        return {
            left: this.el.width() / 2,
            top: this.el.height() / 2
        };
    };

    Stage.prototype.layout = function () {
        if (this.bubbles.length == 0) {
            return;
        }

        var center = this.bubbles[0];

        center.setVirtualPadding(200);
        center.originMoveTo(this.getStageOrigin());

        var spacingAngle = (2 * Math.PI) / (this.bubbles.length - 1);

        for (var i = 1; i < this.bubbles.length; i++) {
            var angle = (i - 1) * spacingAngle;
            var position = center.getPointOnCircumference(angle, true);
            this.bubbles[i].originMoveTo(center.translateToAbsolute(position));
        }
    };
    return Stage;
})();

var Bubble = (function () {
    function Bubble(el) {
        this.el = el;
        this.virtualPadding = 0;
        this.initialize();
    }
    Bubble.prototype.initialize = function () {
        this.el.find(".back").hide();
    };

    Bubble.prototype.getOrigin = function () {
        return {
            left: this.el.outerWidth(true) / 2,
            top: this.el.outerHeight(true) / 2
        };
    };

    Bubble.prototype.getRadius = function (includeMargin) {
        return this.el.outerWidth(!!includeMargin) / 2;
    };

    Bubble.prototype.setRadius = function (radius) {
        this.el.width(radius * 2);
    };

    Bubble.prototype.setVirtualPadding = function (padding) {
        this.virtualPadding = padding;
    };

    Bubble.prototype.getPointOnCircumference = function (angle, includeMargin) {
        var radius = this.getRadius(includeMargin), origin = this.getOrigin();

        return {
            left: origin.left + (radius + this.virtualPadding) * Math.cos(angle),
            top: origin.top - (radius + this.virtualPadding) * Math.sin(angle)
        };
    };

    Bubble.prototype.translateToAbsolute = function (relative) {
        var position = this.el.offset();
        return {
            left: position.left + relative.left,
            top: position.top + relative.top
        };
    };

    Bubble.prototype.moveTo = function (position) {
        this.el.offset(position);
    };

    Bubble.prototype.originMoveTo = function (position) {
        var origin = this.getOrigin();

        this.moveTo({
            left: position.left - origin.left,
            top: position.top - origin.top
        });
    };

    Bubble.prototype.flip = function () {
        var _this = this;
        var front = this.el.find(".front"), back = this.el.find(".back"), rotate1, rotate2, show, hide;

        if (front.is(":visible")) {
            show = back;
            hide = front;
            rotate1 = { rotateX: "90deg" };
            rotate2 = { rotateX: "180deg" };
        } else {
            show = front;
            hide = back;
            rotate1 = { rotateX: "90deg" };
            rotate2 = { rotateX: "0deg" };
        }

        this.el.transition(rotate1, function () {
            hide.hide();
            show.show();
            _this.el.transition(rotate2);
        });
    };
    return Bubble;
})();

var BackgroundCarousellController = (function (_super) {
    __extends(BackgroundCarousellController, _super);
    function BackgroundCarousellController(photoProvider) {
        _super.call(this);
        this.photoProvider = photoProvider;
    }
    BackgroundCarousellController.prototype.getPhotos = function (minWidth, minHeight) {
        return this.photoProvider.search(minWidth, minHeight);
    };
    return BackgroundCarousellController;
})(Simple.Controller);

var ImageLoader = (function () {
    function ImageLoader() {
    }
    ImageLoader.prototype.load = function (photoData) {
        var deferred = $.Deferred();
        var image = $("<img src=\"" + photoData.source + "\"/>");
        image.load(function () {
            deferred.resolve();
            image.remove();
        });
        return deferred.promise();
    };
    return ImageLoader;
})();

var Timer = (function () {
    function Timer(action) {
        this.action = action;
    }
    Timer.prototype.tick = function () {
        if (!this.maxTimes || this.times < this.maxTimes) {
            this.action();
            this.times++;
        } else {
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
        this.handle = window.setInterval(function () {
            return _this.tick();
        }, interval);
    };

    Timer.prototype.stop = function () {
        if (!this.handle) {
            return;
        }
        window.clearInterval(this.handle);
    };
    return Timer;
})();

var TimerFactory = (function () {
    function TimerFactory() {
    }
    TimerFactory.prototype.create = function (action) {
        return new Timer(action);
    };
    return TimerFactory;
})();

var Scheduler = (function () {
    function Scheduler(timerFactory, mediator) {
        this.timerFactory = timerFactory;
        this.mediator = mediator;
        this.timers = {};
    }
    Scheduler.prototype.schedule = function (event, interval, immediate, times) {
        var _this = this;
        if (typeof immediate === "undefined") { immediate = false; }
        var timer = (this.timers[event] || (this.timers[event] = this.timerFactory.create(function () {
            return _this.mediator.trigger(event);
        })));

        if (immediate) {
            timer.trigger();
        }

        timer.start(interval, times);
    };
    return Scheduler;
})();

var BackgroundCarousellView = (function (_super) {
    __extends(BackgroundCarousellView, _super);
    function BackgroundCarousellView(el, mediator, controller, imageLoader) {
        _super.call(this, el, controller);
        this.el = el;
        this.mediator = mediator;
        this.controller = controller;
        this.imageLoader = imageLoader;
        this.currentPhoto = 0;
        this.initialize();
    }
    BackgroundCarousellView.prototype.initialize = function () {
        this.mediator.on("tick-background-load", this.getPhotos, this);
        this.mediator.on("environment-update", this.environmentUpdate, this);
        this.mediator.on("tick-background-render", this.render, this);
    };

    BackgroundCarousellView.prototype.getPhotos = function () {
        var _this = this;
        return this.controller.getPhotos(this.el.width(), this.el.height()).then(function (photos) {
            return _this.photos = photos;
        });
    };

    BackgroundCarousellView.prototype.matchTags = function (wantedTags, tags) {
        var matches = 0;
        wantedTags.forEach(function (tag) {
            if (tags.indexOf(tag) !== -1) {
                matches++;
            }
        });

        return matches;
    };

    BackgroundCarousellView.prototype.photoIsMatch = function (wantedTags, tags, fuzzyness) {
        return this.matchTags(wantedTags, tags) >= wantedTags.length - fuzzyness;
    };

    BackgroundCarousellView.prototype.updatePhotoSet = function (tags) {
        var _this = this;
        if (!this.photos) {
            return;
        }

        var photoSet = [];

        for (var i = 0; i <= tags.length; i++) {
            photoSet = this.photos.filter(function (photo) {
                return _this.photoIsMatch(tags, photo.tags, i);
            });

            if (photoSet.length !== 0) {
                break;
            }
        }

        if (photoSet.length === 0) {
            return;
        }

        photoSet.sort(function (a, b) {
            return _this.matchTags(tags, a.tags) - _this.matchTags(tags, b.tags);
        });

        this.currentPhotoSet = photoSet;
        this.currentPhoto = 0;
    };

    BackgroundCarousellView.prototype.getEnvironmentTags = function (data) {
        return [data.season, data.timeOfDay, data.weather];
    };

    BackgroundCarousellView.prototype.environmentUpdate = function (data) {
        var _this = this;
        if (!this.photos || this.photos.length === 0) {
            this.getPhotos().then(function () {
                return _this.updatePhotoSet(_this.getEnvironmentTags(data));
            });
            return;
        }

        this.updatePhotoSet(this.getEnvironmentTags(data));
    };

    BackgroundCarousellView.prototype.renderNext = function () {
        var l1 = this.el.find(".l1");
        var l2 = this.el.find(".l2");

        l2.css({ "background-image": "url(" + this.currentPhotoSet[this.currentPhoto].source + ")" });

        l2.animate({ opacity: 1 }, {
            duration: 1000, complete: function () {
                l1.css({ opacity: 0 });
                l1.removeClass("l1").addClass("l2");
                l2.removeClass("l2").addClass("l1");
            } });
    };

    BackgroundCarousellView.prototype.render = function () {
        var _this = this;
        if (!this.currentPhotoSet || this.currentPhotoSet.length === 0) {
            return;
        }

        if (this.currentPhoto === this.currentPhotoSet.length) {
            this.currentPhoto = 0;
        }

        this.imageLoader.load(this.currentPhotoSet[this.currentPhoto]).then(function () {
            _this.renderNext();
            _this.currentPhoto++;
        });
    };
    return BackgroundCarousellView;
})(Simple.View);

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
        var time = this.el.find(".time"), date = this.el.find(".date");

        time.find(".hour").text(data.format("HH"));
        time.find(".minute").text(data.format("mm"));

        date.find(".day").text(data.format("dddd"));
        date.find(".dayMonth").text(data.format("Mo MMM"));
    };
    return ClockView;
})(Simple.View);

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
    };

    WeatherView.prototype.limitDescription = function (description) {
        var parts = description.split(" ");
        if (parts.length > 2) {
            parts.shift();
        }

        return parts.join(" ");
    };

    WeatherView.prototype.update = function (data) {
        this.el.find(".level-1 i").removeClass().addClass("wi").addClass(data.icon);
        this.el.find(".temperature").text(data.temperature);
        this.el.find(".description").text(data.description);
        this.el.find(".rain-data").text(data.percipitation + " mm");
        this.el.find(".wind-data").text(data.windSpeed + " m/s");
    };
    return WeatherView;
})(Simple.View);

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
        this.weatherProvider.getWeather(this.city, this.countryCode).then(function (data) {
            return _this.mediator.trigger("weather-update", data);
        });
    };
    return WeatherService;
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

        this.mediator.on("pull-environment", this.pull, this);
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

    EnvironmentService.prototype.pull = function (data) {
        if (!data.cb) {
            return;
        }
        data.cb(this.currentEnvironment);
    };
    return EnvironmentService;
})();

$(function () {
    var bubbleStage = new Stage($(".bubble-wrapper"), new TimerFactory());
    var weatherProvider = new Weather.OpenWeatherMap("eee9d46aa90c56ff8b116ab88f2a5e3f");
    var flickr = new Artwork.Flickr("c389742a61ae8e9474a14b57f1b3d19b", "126595250@N04");

    var mediator = new Simple.Events();
    var scheduler = new Scheduler(new TimerFactory(), mediator);

    var clockService = new ClockService(mediator);
    var weatherService = new WeatherService("Oslo", "NO", weatherProvider, mediator);
    var environmentService = new EnvironmentService(mediator);

    var backgroundView = new BackgroundCarousellView($(".background-wrapper"), mediator, new BackgroundCarousellController(flickr), new ImageLoader());

    var clockView = new ClockView($(".clock"), mediator);
    var weatherView = new WeatherView($(".weather"), mediator);

    mediator.on("environment-update", function (data) {
        return console.log(data);
    });

    scheduler.schedule("tick-background-load", 60 * 60 * 1000, true);
    scheduler.schedule("tick-background-render", 60 * 1000, true);
    scheduler.schedule("tick-clock-trigger-update", 1000, true);
    scheduler.schedule("tick-weather-trigger-update", 10 * 60 * 1000, true);

    window.SVG("clock").clock("100%").start();
});
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
            var bucket = Enumerable.fromArray(this._storage).firstOrDefault(function (b) {
                return b.key === key;
            });

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
            return this._sortOrder === 0 /* Ascending */ ? function (i1, i2) {
                return i1 > i2;
            } : function (i1, i2) {
                return i2 > i1;
            };
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
            return new ArrayEnumerator(function (i) {
                return _this.storage[i];
            });
        };

        EnumerableCore.prototype.aggr = function (aggFunc) {
            return new Iterator(this.getEnumerator()).aggregate(function (i) {
                return new IterationResult(i, false);
            }, new AggregationAggregator(aggFunc));
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
            return this.iterate(function (i) {
                return new IterationResult(i, false);
            }, new SortingAggregator(selector, order));
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
                selector = function (i) {
                    return i;
                };
            }
            return this.aggregate(function (sum, next) {
                return sum + selector(next);
            }, 0);
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
            return this.group(function (i) {
                return new IterationResult(i, false);
            }, new GroupingAggregator(selector));
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
//# sourceMappingURL=app.js.map
