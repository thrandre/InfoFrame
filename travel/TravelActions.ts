import Action = require("../Action");
import RequestAction = require("../RequestAction");
import TravelData = require("./TravelData");

class TravelActions 
{
    getTravelData = new RequestAction<TravelData[]>();
}

var travelActions = new TravelActions();

export = travelActions;