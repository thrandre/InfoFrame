import WeatherService from "./WeatherService";
import TimeService from "./TimeService";

class Services {

	weatherService = new WeatherService("eee9d46aa90c56ff8b116ab88f2a5e3f");
	timeService = new TimeService();

}

export default new Services();