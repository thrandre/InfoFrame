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
            return $.getJSON(this.getApiUrl(stopId)).then(function (data) { return JSON.parse(data.contents).filter(function (i) { return i.MonitoredVehicleJourney.DirectionRef > 0; }).map(function (i) { return _this.parseTravelData(i); }); });
        };
        return Ruter;
    })();
    Travel.Ruter = Ruter;
})(Travel || (Travel = {}));
//# sourceMappingURL=travel.js.map