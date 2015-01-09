var RequestAction = require("../RequestAction");
var WeatherActions = (function () {
    function WeatherActions() {
        this.getWeatherData = new RequestAction();
    }
    return WeatherActions;
})();
var weatherActions = new WeatherActions();
module.exports = weatherActions;
//# sourceMappingURL=WeatherActions.js.map