var $ = require("jquery");
var TravelActions = require("./TravelActions");
var RequestState = require("../RequestState");
var Moment = require("moment");
var TravelService = (function () {
    function TravelService() {
    }
    TravelService.prototype.parseTravelData = function (data) {
        return {
            line: data.MonitoredVehicleJourney.LineRef,
            destination: data.MonitoredVehicleJourney.DestinationName,
            direction: data.MonitoredVehicleJourney.DirectionRef,
            departure: Moment(data.MonitoredVehicleJourney.MonitoredCall.ExpectedDepartureTime)
        };
    };
    TravelService.prototype.getApiUrl = function (stopId) {
        return "http://whateverorigin.org/get?url=http://reisapi.ruter.no/StopVisit/GetDepartures/" + stopId + "&callback=?";
    };
    TravelService.prototype.getTravelData = function (stopId) {
        var _this = this;
        TravelActions.getTravelData.trigger({ state: 0 /* Pending */ });
        return $.getJSON(this.getApiUrl(stopId)).then(function (data) { return TravelActions.getTravelData.trigger({ data: JSON.parse(data.contents).map(function (e) { return _this.parseTravelData(e); }), state: 2 /* Success */ }); });
    };
    return TravelService;
})();
module.exports = TravelService;
//# sourceMappingURL=TravelService.js.map