import Store = require("../Store");
import WeatherActions = require("./WeatherActions");
import WeatherService = require("./WeatherService");
import WeatherProps = require("./WeatherProps");
import RequestState = require("../RequestState");
import Timer = require("../Timer");

class WeatherStore extends Store
{
    private state: WeatherProps;

    constructor(private weatherService: WeatherService)
	{
		super();
        WeatherActions.getArticleData.listen(pl => { 
            if (pl.state === RequestState.Success) {
                this.state = pl.data;
                this.trigger(this.getState());
            }
        });
        
        Timer.create(() => this.loadState()).start(10 * 60 * 1000, true);
	}

    private loadState()
    {
        this.weatherService.getWeather("Oslo", "NO");
    }

    getState(): WeatherProps
	{
	    return this.state;
	}
}

var weatherStore = new WeatherStore(new WeatherService("eee9d46aa90c56ff8b116ab88f2a5e3f"));

export = weatherStore;