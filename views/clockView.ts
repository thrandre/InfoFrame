///<reference path="../simple.ts"/>

module Views {

    export class ClockView extends Simple.View {
        constructor(public el: JQuery, public mediator: Simple.EventEmitter) {
            super(el);
            this.initialize();
        }

        initialize() {
            this.mediator.on("clock-update", this.update, this);
        }

        update(data: Moment) {
            var time = this.el.find(".time"),
                date = this.el.find(".date");

            time.find(".hour").text(data.format("HH"));
            time.find(".minute").text(data.format("mm"));

            date.find(".day").text(data.format("dddd"));
            date.find(".dayMonth").text(data.format("Mo MMM"));
        }
    }

}