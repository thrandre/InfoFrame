var RequestAction = require("../RequestAction");
var WeatherActions = (function () {
    function WeatherActions() {
        this.getArticleData = new RequestAction();
    }
    return WeatherActions;
})();
var weatherActions = new WeatherActions();
module.exports = weatherActions;
//# sourceMappingURL=WeatherActions.js.map