///<reference path="../simple.ts"/>
///<reference path="../calendar.ts"/>
///<reference path="autoScrollView.ts"/>

module Views {

  export interface CalendarViewData {
    today: Calendar.CalendarEvent[];
    tomorrow: Calendar.CalendarEvent[];
  }

  export class CalendarView extends AutoScrollView {
    private template;

    constructor(public el: JQuery, public mediator: Simple.EventEmitter) {
      super(el);
      this.initialize();
    }

    initialize() {
      this.mediator.on("calendar-update", this.update, this);
      this.compileTemplate();
    }

    compileTemplate() {
      var itemTemplate = new Simple.Template(
        () => $(
          "<div class=\"row\">" +
          "<span class=\"col col-100\">" +
          "<span class=\"owner\"></span>" +
          "<span class=\"time\">" +
          "<span class=\"start\"></span> - " +
          "<span class=\"end\"></span>" +
          "</span>" +
          "<span class=\"title\"></span>" +
          "</span>" +
          "</div>"
          ))
        .compile<Calendar.CalendarEvent>({
          ".time .start": (e, d) => e.text(d.start.format("HH:mm")),
          ".time .end": (e, d) => e.text(d.end.format("HH:mm")),
          ".title": (e, d) => e.text(d.title),
          ".owner": (e, d) => e.text(d.owner)
        });

      this.template = this._template.compile<CalendarViewData>({
        ".today": (e, d) => {
          e.empty().append(d.today.map(i => itemTemplate(i)));
        },
        ".tomorrow": (e, d) => {
          e.empty().append(d.tomorrow.map(i => itemTemplate(i)));
        }
      });
    }

    update(data: CalendarViewData) {
      this.template(data);
      this.autoscroll(this.el.find(".list"), 5000);
    }
  }

}
