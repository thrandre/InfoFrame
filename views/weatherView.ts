﻿///<reference path="../simple.ts"/>

module Views {

    export class WeatherView extends Simple.View {
        private template;

        constructor( public el: JQuery, public mediator: Simple.EventEmitter ) {
            super(el);
            this.initialize();
        }

        initialize() {
            this.mediator.on( "weather-update", this.update, this );
            this.compileTemplate();
        }

        limitDescription(description: string): string {
            var parts = description.split(" ");
            if (parts.length > 2) {
                parts.shift();
            }

            return parts.join(" ");
        }

        compileTemplate() {
            this.template = this._template.compile<Weather.WeatherData>( {
                ".level-1 i"    : ( e, d ) => e.removeClass().addClass( "wi" ).addClass( d.icon ),
                ".temperature"  : ( e, d ) => e.text( d.temperature ),
                ".description"  : ( e, d ) => e.text( d.description ),
                ".rain-data"    : ( e, d ) => e.text( d.percipitation + " mm" ),
                ".wind-data"    : ( e, d ) => e.text( d.windSpeed + " m/s")
            });
        }

        update(data: Weather.WeatherData) {
            this.template(data);
        }
    }

}