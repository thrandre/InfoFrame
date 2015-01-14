var RequestAction = require("../RequestAction");
var TravelActions = (function () {
    function TravelActions() {
        this.getTravelData = new RequestAction();
    }
    return TravelActions;
})();
var travelActions = new TravelActions();
module.exports = travelActions;
//# sourceMappingURL=TravelActions.js.map