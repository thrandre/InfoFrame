///<reference path="../simple.ts"/>

module Views {

  export class ScrobbleView extends Simple.View {
    private template;

    constructor(public el: JQuery, public mediator: Simple.EventEmitter) {
      super(el);
      this.initialize();
    }

    initialize() {
      this.mediator.on("scrobble-update", this.update, this);
      this.compileTemplate();
    }

    compileTemplate() {
      this.template = this._template.compile<LastFm.ScrobbleData>({

        "": (e, d) => e.andSelf().css("background", "linear-gradient( rgba(35, 125, 115, 0.75), rgba(35, 125, 115, 1) ), url('" + d.imageUrl + "') top/cover no-repeat"),
        ".track": (e, d) => e.text(d.track),
        ".artist": (e, d) => e.text(d.artist),
        ".album": (e, d) => e.text(d.album)

      });
    }

    update(data: LastFm.ScrobbleData) {
      if (!data) {
        this.el.css("background", "linear-gradient( rgba(35, 125, 115, 1), rgba(35, 125, 115, 1) )");
        this.el.empty();
        return;
      }
      this.template(data);
    }
  }

}
