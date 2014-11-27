///<reference path="../simple.ts"/>
///<reference path="../typing/jquery.d.ts"/>
///<reference path="../updater.ts"/>

module Views {

  export class UpdateView extends Simple.View {

    private template;
    private currentData;

    constructor(public el: JQuery, private mediator: Simple.EventEmitter) {
      super(el);
      this.initialize();
    }

    initialize() {
      this.mediator.on("updateView-show", this.show, this);
      this.mediator.on("clock-update", this.update, this);

      this.renderTemplate();
      this.hide();
    }

    renderTemplate() {
      this.template = this._template.compile<Updater.EventData>({
        ".eta": (e, d) => {
          var diff = moment(d.created)
            .add("minutes", d.deployMinutes)
            .diff(moment(), "seconds");

          e.text(Math.floor(diff / 60) + " minutes, " + Math.floor(diff % 60) + " seconds");
        },
        ".commits": (e, d) => {
          e.empty();
          d.messages.forEach((m) => e.append($("<li>" + m + "</li>")));
        }
      });
    }

    show(data: Updater.EventData) {
      this.currentData = data;
      this.el.show();
    }

    hide() {
      this.el.hide();
    }

    update(data: Moment) {
      if (this.el.is(":visible")) {
        this.template(this.currentData);
      }
    }

  }

}
