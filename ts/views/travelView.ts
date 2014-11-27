///<reference path="../simple.ts"/>
///<reference path="autoScrollView.ts"/>
///<reference path="../travel.ts"/>
///<reference path="../typing/moment.d.ts"/>

module Views {

  export interface TravelViewData {
    east: Travel.TravelData[];
    west: Travel.TravelData[];
  }

  export class TravelView extends AutoScrollView {
    private template;

    constructor(public el: JQuery, public mediator: Simple.EventEmitter) {
      super(el);
      this.initialize();
    }

    initialize() {
      this.mediator.on("travel-update", this.update, this);
      this.compileTemplate();
    }

    compileTemplate() {
      var itemTemplate = new Simple.Template(
        () => $(
          "<div class=\"row\"><span class=\"col col-25 line\">1</span>" +
          "<span class=\"col col-50 destination\">Mortensrud</span >" +
          "<span class=\"col col-25 departure\">3 min</span >" +
          "</div>"
          ))
        .compile<Travel.TravelData>({
          ".line": (e, d) => e.text(d.line),
          ".destination": (e, d) => e.text(d.destination),
          ".departure": (e, d) => {
            var secondsDiff = d.departure.diff(moment(), "seconds");

            if (secondsDiff < 420) {
              e.parent().addClass("urgent");
            }

            if (secondsDiff < 45) {
              e.text("Nå");
              return;
            }
            if (secondsDiff < 540) {
              e.text(d.departure.diff(moment(), "minutes") + " min");
              return;
            }

            e.text("ca " + d.departure.format("HH:mm"));
          }
        });

      this.template = this._template.compile<TravelViewData>({
        ".east": (e, d) => {
          e.empty().append(d.east.map(i => itemTemplate(i)));
        },
        ".west": (e, d) => {
          e.empty().append(d.west.map(i => itemTemplate(i)));
        }
      });
    }

    update(data: TravelViewData) {
      this.template(data);
      this.autoscroll(this.el.find(".list"), 3000);
    }
  }

}
