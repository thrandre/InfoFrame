///<reference path="../simple.ts"/>

module Views {

	export class CalendarView extends AutoScrollView {
		private template;

		constructor( public el: JQuery, public mediator: Simple.EventEmitter ) {
			super(el);
			this.initialize();
		}

		initialize() {
			this.mediator.on( "calendar-update", this.update, this );
			this.compileTemplate();
		}

		compileTemplate() {
			var itemTemplate = new Simple.Template(
					() => $(
						"<div class=\"row\">" +
						"<span class=\"col col-100\">" +
						"<span class=\"owner\"></span>" +
						"<span class=\"time\">"+
						"<span class=\"start\"></span> - "+
						"<span class=\"end\"></span>"+
						"</span>" +
						"<span class=\"title\"></span>" +
						"</span>" +
						"</div>"
					))
				.compile<Calendar.CalendarEvent>({
					".time .start": ( e, d ) => e.text( d.start.format( "HH:mm" ) ),
					".time .end": ( e, d ) => e.text( d.end.format( "HH:mm" ) ),
					".title": (e, d) => e.text(d.title),
					".owner": (e, d) => e.text(d.owner)
				});

			this.template = this._template.compile<Calendar.CalendarEvent[]>({
				".list": (e, d) => {
					console.log(d);
					e.empty().append( d.map( i => itemTemplate( i ) ) );
				}
			});
		}

		update(data: TravelViewData) {
			this.template( data );
			this.autoscroll( this.el.find( ".list" ), 5000 );
		}
	}

}