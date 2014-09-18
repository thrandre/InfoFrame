﻿var __extends = this.__extends || function (d, b) {
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
            this._template = new Template(function () {
                return el;
            });
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
            return "https://api.flickr.com/services/rest/?method=flickr.favorites.getPublicList&api_key=" + this.apiKey + "&user_id=" + this.userId + "&extras=o_dims,url_o,url_l,tags&per_page=500&format=json&nojsoncallback=1";
        };

        Flickr.prototype.parsePhoto = function (data) {
            return {
                title: data.title,
                tags: data.tags.split(" ").map(function (tag) {
                    return tag.toLowerCase();
                }),
                source_original: data.url_o,
                source_large: data.url_l,
                width: data.width_o,
                height: data.height_o
            };
        };

        Flickr.prototype.search = function (minWidth, minHeight) {
            var _this = this;
            return $.getJSON(this.getApiUrl()).then(function (data) {
                return data.photos.photo.filter(function (photo) {
                    return photo.width_o >= minWidth && photo.height_o >= minHeight;
                }).map(function (photo) {
                    return _this.parsePhoto(photo);
                });
            });
        };
        return Flickr;
    })();
    Artwork.Flickr = Flickr;
})(Artwork || (Artwork = {}));
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
    Timers.Scheduler = Scheduler;
})(Timers || (Timers = {}));
///<reference path="timers.ts"/>
var Bubbles;
(function (Bubbles) {
    var Stage = (function () {
        function Stage(el, bubbleFactory, mediator) {
            this.el = el;
            this.bubbleFactory = bubbleFactory;
            this.mediator = mediator;
            this.bubbles = [];
            this.initialize();
        }
        Stage.prototype.initialize = function () {
            var _this = this;
            this.el.find(".bubble").each(function (i, e) {
                return _this.bubbles.push(_this.bubbleFactory.create($(e), _this.mediator));
            });

            this.layout();
            this.mediator.on("bubble-flip", function (d) {
                return _this.bubbles[0].spotlight();
            });
        };

        Stage.prototype.getStageOrigin = function () {
            return {
                left: this.el.width() / 2,
                top: this.el.height() / 2
            };
        };

        Stage.prototype.layout = function () {
            if (isEmpty(this.bubbles)) {
                return;
            }

            var center = this.bubbles[0];

            center.setVirtualPadding(-20);
            center.originMoveTo(this.getStageOrigin());

            var spacingAngle = (2 * Math.PI) / (this.bubbles.length - 1);

            for (var i = 1; i < this.bubbles.length; i++) {
                var angle = (i - 1) * spacingAngle, position = center.getPointOnCircumference(angle, true);

                this.bubbles[i].circumferenceMoveTo(center.translateToAbsolute(position), angle);
            }
        };

        Stage.prototype.getBoundingBox = function () {
            var position = this.el.offset(), size = { width: this.el.width(), height: this.el.height() };
            return new Rectangle(position.left, position.top, size.width, size.height);
        };

        Stage.prototype.isHit = function (x, y) {
            return !new Rectangle(x, y, 1, 1).intersects(this.getBoundingBox());
        };
        return Stage;
    })();
    Bubbles.Stage = Stage;

    var BubbleFactory = (function () {
        function BubbleFactory() {
        }
        BubbleFactory.prototype.create = function (el, mediator) {
            if (el.hasClass("flipable")) {
                return new FlipableBubble(el, mediator);
            }
            return new ScaleableBubble(el, mediator);
        };
        return BubbleFactory;
    })();
    Bubbles.BubbleFactory = BubbleFactory;

    var Bubble = (function () {
        function Bubble(el, mediator) {
            this.el = el;
            this.mediator = mediator;
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
            this.el.css(position);
        };

        Bubble.prototype.originMoveTo = function (position) {
            var origin = this.getOrigin();

            this.moveTo({
                left: position.left - origin.left,
                top: position.top - origin.top
            });
        };

        Bubble.prototype.circumferenceMoveTo = function (relative, angle) {
            var position = this.el.offset(), beta = relative.top > position.top ? angle + Math.PI : angle - Math.PI, circ = this.getPointOnCircumference(beta);

            this.moveTo({
                left: relative.left - circ.left,
                top: relative.top - circ.top
            });
        };

        Bubble.prototype.getBoundingBox = function () {
            var position = this.el.offset(), size = { width: this.el.width(), height: this.el.height() };
            return new Rectangle(position.left, position.top, size.width, size.height);
        };

        Bubble.prototype.isHit = function (x, y) {
            var origin = this.translateToAbsolute(this.getOrigin());
            return Math.pow((x - origin.left), 2) + Math.pow((y - origin.top), 2) < Math.pow(this.getRadius(), 2);
        };

        Bubble.prototype.spotlight = function () {
        };
        return Bubble;
    })();
    Bubbles.Bubble = Bubble;

    var FlipableBubble = (function (_super) {
        __extends(FlipableBubble, _super);
        function FlipableBubble() {
            _super.apply(this, arguments);
        }
        FlipableBubble.prototype.spotlight = function () {
            this.flip();
        };

        FlipableBubble.prototype.flip = function () {
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

            this.el.velocity(rotate1, function () {
                hide.hide();
                show.show();
                _this.el.velocity(rotate2);
            });
        };
        return FlipableBubble;
    })(Bubble);
    Bubbles.FlipableBubble = FlipableBubble;

    var ScaleableBubble = (function (_super) {
        __extends(ScaleableBubble, _super);
        function ScaleableBubble() {
            _super.apply(this, arguments);
        }
        ScaleableBubble.prototype.spotlight = function () {
            this.scale();
        };

        ScaleableBubble.prototype.scale = function () {
        };
        return ScaleableBubble;
    })(Bubble);
    Bubbles.ScaleableBubble = ScaleableBubble;

    var Rectangle = (function () {
        function Rectangle(x, y, w, h) {
            this.x = x;
            this.y = y;
            this.w = w;
            this.h = h;
        }
        Rectangle.prototype.x1 = function () {
            return this.x;
        };

        Rectangle.prototype.x2 = function () {
            return this.x + this.w;
        };

        Rectangle.prototype.y1 = function () {
            return this.y;
        };

        Rectangle.prototype.y2 = function () {
            return this.y + this.h;
        };

        Rectangle.prototype.width = function () {
            return this.w;
        };

        Rectangle.prototype.height = function () {
            return this.h;
        };

        Rectangle.prototype.intersects = function (rect) {
            return this.x1() < rect.x2() && this.x2() > rect.x1() && this.y1() < rect.y2() && this.y2() > rect.y1();
        };

        Rectangle.prototype.getIntersection = function (rect) {
            var x1, x2, y1, y2;

            x1 = this.x1() < rect.x1() ? rect.x1() : this.x1();
            x2 = this.x2() < rect.x2() ? this.x2() : rect.x2();
            y1 = this.y1() < rect.y1() ? rect.y1() : this.y1();
            y2 = this.y2() < rect.y2() ? this.y2() : rect.y2();

            return new Rectangle(x1, y1, x2 - x1, y2 - y1);
        };
        return Rectangle;
    })();
    Bubbles.Rectangle = Rectangle;

    var HitTester = (function () {
        function HitTester() {
        }
        HitTester.test = function (obj1, obj2) {
            var bounding1 = obj1.getBoundingBox(), bounding2 = obj2.getBoundingBox();

            if (!bounding1.intersects(bounding2)) {
                return false;
            }

            var intersection = bounding1.getIntersection(bounding2);

            for (var x = intersection.x1(); x <= intersection.x2(); x++) {
                for (var y = intersection.y1(); y <= intersection.y2(); y++) {
                    if (obj1.isHit(x, y) && obj2.isHit(x, y)) {
                        return true;
                    }
                }
            }

            return false;
        };
        return HitTester;
    })();
    Bubbles.HitTester = HitTester;
})(Bubbles || (Bubbles = {}));
///<reference path="../simple.ts"/>
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
                    d.messages.forEach(function (m) {
                        return e.append($("<li>" + m + "</li>"));
                    });
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
var Controllers;
(function (Controllers) {
    var BackgroundController = (function (_super) {
        __extends(BackgroundController, _super);
        function BackgroundController(photoProvider) {
            _super.call(this);
            this.photoProvider = photoProvider;
        }
        BackgroundController.prototype.getPhotos = function (minWidth, minHeight) {
            return this.photoProvider.search(minWidth, minHeight);
        };
        return BackgroundController;
    })(Simple.Controller);
    Controllers.BackgroundController = BackgroundController;
})(Controllers || (Controllers = {}));
var Utils;
(function (Utils) {
    var ImageLoader = (function () {
        function ImageLoader() {
        }
        ImageLoader.prototype.load = function (photoData) {
            var deferred = $.Deferred();

            var image = new Image();

            image.onload = function () {
                if (image.complete) {
                    deferred.resolve();
                    image = null;
                }
            };

            image.src = photoData.source_large;

            return deferred.promise();
        };
        return ImageLoader;
    })();
    Utils.ImageLoader = ImageLoader;
})(Utils || (Utils = {}));
///<reference path="../simple.ts"/>
///<reference path="../controllers/backgroundController.ts"/>
///<reference path="../utils/imageLoader.ts"/>
var Views;
(function (Views) {
    var BackgroundView = (function (_super) {
        __extends(BackgroundView, _super);
        function BackgroundView(el, mediator, controller) {
            _super.call(this, el, controller);
            this.el = el;
            this.mediator = mediator;
            this.controller = controller;
            this.currentPhoto = 0;
            this.initialize();
        }
        BackgroundView.prototype.initialize = function () {
            this.mediator.on("tick-background-load", this.getPhotos, this);
            this.mediator.on("environment-update", this.environmentUpdate, this);
            this.mediator.on("tick-background-render", this.render, this);
        };

        BackgroundView.prototype.getPhotos = function () {
            var _this = this;
            return this.controller.getPhotos(1024, 768).then(function (photos) {
                return _this.photos = photos;
            });
        };

        BackgroundView.prototype.matchTags = function (wantedTags, tags) {
            var matches = 0;
            wantedTags.forEach(function (tag) {
                if (tags.indexOf(tag) !== -1) {
                    matches++;
                }
            });

            return matches;
        };

        BackgroundView.prototype.photoIsMatch = function (wantedTags, tags, fuzzyness) {
            return this.matchTags(wantedTags, tags) >= wantedTags.length - fuzzyness;
        };

        BackgroundView.prototype.updatePhotoSet = function (tags) {
            var _this = this;
            if (isUndefined(this.photos)) {
                return;
            }

            var photoSet = [];

            for (var i = 0; i <= tags.length; i++) {
                photoSet = this.photos.filter(function (photo) {
                    return _this.photoIsMatch(tags, photo.tags, i);
                });

                if (!isEmpty(photoSet)) {
                    break;
                }
            }

            if (isEmpty(photoSet)) {
                return;
            }

            photoSet.sort(function (a, b) {
                return _this.matchTags(tags, a.tags) - _this.matchTags(tags, b.tags);
            });

            this.currentPhotoSet = photoSet;
            this.currentPhoto = 0;
        };

        BackgroundView.prototype.getEnvironmentTags = function (data) {
            return [data.season, data.weather];
        };

        BackgroundView.prototype.environmentUpdate = function (data) {
            var _this = this;
            if (isUndefinedOrEmpty(this.photos)) {
                this.getPhotos().then(function () {
                    return _this.updatePhotoSet(_this.getEnvironmentTags(data));
                });
                return;
            }

            this.updatePhotoSet(this.getEnvironmentTags(data));
        };

        BackgroundView.prototype.fit = function (image) {
            var canvasWidth = this.el.width(), canvasHeight = this.el.height(), imageWidth = image.width(), imageHeight = image.height(), aspect = imageWidth / imageHeight;

            image.width(canvasWidth);
        };

        BackgroundView.prototype.renderNext = function () {
            var _this = this;
            var deferred = $.Deferred();

            var l1 = this.el.find(".l1");
            var l2 = this.el.find(".l2");

            l2.load(function () {
                _this.fit(l2);
                l2.velocity({ opacity: 1 }, {
                    duration: 1000,
                    complete: function () {
                        l1.css({ opacity: 0 });
                        l1.removeClass("l1").addClass("l2");
                        l2.removeClass("l2").addClass("l1");

                        deferred.resolve();
                    }
                });
            });

            l2.attr("src", this.currentPhotoSet[this.currentPhoto].source_large);

            return deferred.promise();
        };

        BackgroundView.prototype.render = function () {
            var _this = this;
            if (isUndefinedOrEmpty(this.currentPhotoSet)) {
                return;
            }

            if (this.currentPhoto === this.currentPhotoSet.length) {
                this.currentPhoto = 0;
            }

            this.renderNext().then(function () {
                return _this.currentPhoto++;
            });
        };
        return BackgroundView;
    })(Simple.View);
    Views.BackgroundView = BackgroundView;
})(Views || (Views = {}));
///<reference path="../simple.ts"/>
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
                ".symbol i": function (e, d) {
                    return e.removeClass().addClass("wi").addClass(d.icon);
                },
                ".temperature .val": function (e, d) {
                    return e.text(d.temperature);
                },
                ".description": function (e, d) {
                    return e.text(d.description);
                },
                ".rain .val": function (e, d) {
                    return e.text(d.percipitation);
                },
                ".wind .val": function (e, d) {
                    return e.text(d.windSpeed);
                }
            });
        };

        WeatherView.prototype.update = function (data) {
            this.template(data);
        };
        return WeatherView;
    })(Simple.View);
    Views.WeatherView = WeatherView;
})(Views || (Views = {}));
///<reference path="updateView.ts"/>
///<reference path="backroundView.ts"/>
///<reference path="clockView.ts"/>
///<reference path="weatherView.ts"/>
///<reference path="simple.ts"/>
///<reference path="weather.ts"/>
///<reference path="artwork.ts"/>
///<reference path="timers.ts"/>
///<reference path="bubbles.ts"/>
///<reference path="views/views.ts"/>
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
            messages: event.type === "PushEvent" ? event.payload.commits.map(function (c) {
                return c.message;
            }) : [],
            created: moment(event.created_at),
            deployMinutes: 7
        };
    };

    GitHubEventService.prototype.update = function () {
        var _this = this;
        return $.getJSON(this.getApiUrl()).then(function (data) {
            return data.map(function (e) {
                return _this.parseEvent(e);
            });
        });
    };

    GitHubEventService.prototype.getLastEventOfType = function (type) {
        return this.update().then(function (events) {
            return events.filter(function (e) {
                return e.type === type;
            }).sort(function (a, b) {
                return a.created.isAfter(b.created) ? 1 : -1;
            }).reverse()[0];
        });
    };
    return GitHubEventService;
})();

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
    var flickr = new Artwork.Flickr("c389742a61ae8e9474a14b57f1b3d19b", "126595250@N04");

    var scheduler = new Timers.Scheduler(new Timers.TimerFactory(), mediator);

    var clockService = new ClockService(mediator);
    var weatherService = new WeatherService("Oslo", "NO", weatherProvider, mediator);
    var environmentService = new EnvironmentService(mediator);

    var github = new GitHubEventService("thrandre", "InfoFrame", mediator);

    var autoUpdater = new AutoUpdater(mediator, github);

    var updateView = new Views.UpdateView($(".update-info"), mediator);

    var clockView = new Views.ClockView($(".clock"), mediator);
    var weatherView = new Views.WeatherView($(".weather"), mediator);

    var ruter = new Travel.Ruter();

    var travelView = new Views.TravelView($(".travel"), mediator);

    mediator.on("environment-update", function (data) {
        return console.log(data);
    });
    mediator.on("github-push", function (data) {
        return console.log(data);
    });

    mediator.on("autoUpdater-update", function (data) {
        mediator.trigger("updateView-show", data);
        new Timers.Timer(function () {
            return window.location.href = noCacheUrl(window.location.href);
        }).start(moment(data.created).add("minutes", data.deployMinutes).diff(moment()), 1);
    });

    scheduler.schedule("tick-github-update", 5 * 60 * 1000, true);
    scheduler.schedule("tick-background-load", 60 * 60 * 1000, true);
    scheduler.schedule("tick-background-render", 10 * 1000, true);
    scheduler.schedule("tick-clock-trigger-update", 1000, true);
    scheduler.schedule("tick-weather-trigger-update", 10 * 60 * 1000, true);
    scheduler.schedule("tick-autoUpdater-check", 60 * 1000, true);
    scheduler.schedule("bubble-flip", 10 * 1000, false);

    window.SVG("clock").clock("100%").start();

    $.getJSON("http://whateverorigin.org/get?url=https://sharing.calendar.live.com/calendar/private/0ec5c5e9-a270-40ab-a244-581302314b18/f7dd211a-88b0-4a5e-a963-d807a40fe6a7/cid-5d3f62a70d427c52/calendar.ics&callback=?").then(function (data) {
        console.log(window.ICAL.parse(data.contents));
    });

    var travelTimer = new Timers.Timer(function () {
        return ruter.getTravelData("3010610").then(function (data) {
            var viewData = {
                east: Query.fromArray(data).where(function (t) {
                    return t.direction == 1;
                }).where(function (t) {
                    return t.departure.add(5, 'minutes') > moment();
                }).orderByAscending(function (t) {
                    return t.departure;
                }).take(5).toArray(),
                west: Query.fromArray(data).where(function (t) {
                    return t.direction == 2;
                }).where(function (t) {
                    return t.departure.add(5, 'minutes') > moment();
                }).orderByAscending(function (t) {
                    return t.departure;
                }).take(5).toArray()
            };
            mediator.trigger("travel-update", viewData);
        });
    });

    travelTimer.start(60 * 1000);
    travelTimer.trigger();

    window.CalParser.parse(["foo"]);
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
            return $.getJSON(this.getApiUrl(stopId)).then(function (data) {
                return JSON.parse(data.contents).filter(function (i) {
                    return i.MonitoredVehicleJourney.DirectionRef > 0;
                }).map(function (i) {
                    return _this.parseTravelData(i);
                });
            });
        };
        return Ruter;
    })();
    Travel.Ruter = Ruter;
})(Travel || (Travel = {}));
function isUndefined(obj) {
    return !obj;
}

function isEmpty(obj) {
    return obj.length === 0;
}

function isUndefinedOrEmpty(obj) {
    return isUndefined(obj) || isEmpty(obj);
}
///<reference path="../simple.ts"/>
var Views;
(function (Views) {
    var AutoScrollView = (function (_super) {
        __extends(AutoScrollView, _super);
        function AutoScrollView(el) {
            _super.call(this, el);
            this.el = el;
        }
        AutoScrollView.prototype.autoscroll = function (innerEl, duration) {
            var _this = this;
            if (this.animation) {
                return;
            }

            this.animation = function () {
                var targetTop = (innerEl.height() - _this.el.height()) * -1;

                if (targetTop >= 0) {
                    return;
                }

                innerEl.velocity({
                    top: targetTop
                }, {
                    duration: duration,
                    delay: 1000
                }).velocity({
                    top: 0
                }, {
                    duration: 1000,
                    delay: 1000,
                    complete: _this.animation
                });
            };

            this.animation();
        };
        return AutoScrollView;
    })(Simple.View);
    Views.AutoScrollView = AutoScrollView;

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
            var itemTemplate = new Simple.Template(function () {
                return $("<div class=\"row\"><span class=\"col col-25 line\">1</span>" + "<span class=\"col col-50 destination\">Mortensrud</span >" + "<span class=\"col col-25 departure\">3 min</span >" + "</div>");
            }).compile({
                ".line": function (e, d) {
                    return e.text(d.line);
                },
                ".destination": function (e, d) {
                    return e.text(d.destination);
                },
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
                    e.empty().append(d.east.map(function (i) {
                        return itemTemplate(i);
                    }));
                },
                ".west": function (e, d) {
                    e.empty().append(d.west.map(function (i) {
                        return itemTemplate(i);
                    }));
                }
            });
        };

        TravelView.prototype.update = function (data) {
            this.template(data);
            this.autoscroll(this.el.find(".list"), 5000);
        };
        return TravelView;
    })(AutoScrollView);
    Views.TravelView = TravelView;
})(Views || (Views = {}));
//# sourceMappingURL=app.js.map
