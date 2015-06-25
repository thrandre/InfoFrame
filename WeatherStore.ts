import Store = require("./Store");
import Actions = require("./Actions");
import RequestPayload = require("./RequestPayload");
import RequestState = require("./RequestState");

import WeatherModel = require("./viewmodels/WeatherProps");

class WeatherStore extends Store {
    weatherModel: WeatherModel;
    
    constructor() {
        super();
        Actions.getWeather.listen(p => this.setWeather(p));
    }
    
    private setWeather(payload: RequestPayload<WeatherModel>) {
        if(payload.state == RequestState.Success) {
            this.weatherModel = payload.data;
            this.trigger(payload.data);      
        }
    }
}

var weatherStore = new WeatherStore();

export = weatherStore;