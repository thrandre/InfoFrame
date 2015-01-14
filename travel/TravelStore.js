var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var Store = require("../Store");
var TravelActions = require("./TravelActions");
var TravelService = require("./TravelService");
var RequestState = require("../RequestState");
var Timer = require("../Timer");
var Query = require("../Query");
var Moment = require("moment");
var TravelStore = (function (_super) {
    __extends(TravelStore, _super);
    function TravelStore(travelService) {
        var _this = this;
        _super.call(this);
        this.travelService = travelService;
        TravelActions.getTravelData.listen(function (pl) {
            if (pl.state === 2 /* Success */) {
                _this.processTravelData(pl.data);
            }
        });
        Timer.create(function () { return _this.loadState(); }).start(60 * 1000, true);
    }
    TravelStore.prototype.processTravelData = function (data) {
        var entries = Query.fromArray(data).where(function (e) { return e.departure > Moment().add(3, "minutes"); }).orderByAscending(function (e) { return e.departure; }).take(10).toArray();
        this.state = { travelEntries: entries };
        this.trigger(this.getState());
    };
    TravelStore.prototype.loadState = function () {
        this.travelService.getTravelData("3010610");
    };
    TravelStore.prototype.getState = function () {
        return this.state;
    };
    return TravelStore;
})(Store);
var travelStore = new TravelStore(new TravelService());
module.exports = travelStore;
//# sourceMappingURL=TravelStore.js.map