var RequestState;
(function (RequestState) {
    RequestState[RequestState["Pending"] = 0] = "Pending";
    RequestState[RequestState["Error"] = 1] = "Error";
    RequestState[RequestState["Success"] = 2] = "Success";
})(RequestState || (RequestState = {}));
module.exports = RequestState;
//# sourceMappingURL=RequestState.js.map