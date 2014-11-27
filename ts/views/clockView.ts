///<reference path="../typing/jquery.d.ts"/>
///<reference path="../typing/moment.d.ts"/>
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
      var time = this.el.find(".time .digital"),
        date = this.el.find(".date");

      time.text(data.format("HH:mm"));

      date.text(data.format("ddd Do MMM"));
    }
  }

}
