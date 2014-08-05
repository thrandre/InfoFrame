///<reference path="../simple.ts"/>

module Views {

    export class WeatherView extends Simple.View {
        constructor(public el: JQuery, public mediator: Simple.EventEmitter) {
            super(el);
            this.initialize();
        }

        initialize() {
            this.mediator.on("weather-update", this.update, this);
        }

        limitDescription(description: string): string {
            var parts = description.split(" ");
            if (parts.length > 2) {
                parts.shift();
            }

            return parts.join(" ");
        }

        update(data: Weather.WeatherData) {
            this.el.find(".level-1 i").removeClass().addClass("wi").addClass(data.icon);
            this.el.find(".temperature").text(data.temperature);
            this.el.find(".description").text(data.description);
            this.el.find(".rain-data").text(data.percipitation + " mm");
            this.el.find(".wind-data").text(data.windSpeed + " m/s");
        }
    }

}