///<reference path="../simple.ts"/>

module Views {
    
    export class UpdateView extends Simple.View {
        
        private template;
        private currentData;

        constructor( public el: JQuery, private mediator: Simple.EventEmitter ) {
            super( el );
            this.initialize();
        }

        initialize() {
            this.mediator.on( "updateView-show", this.show, this );
            this.mediator.on( "tick-clock-trigger-update", this.update, this );

            this.renderTemplate();
            this.hide();
        }

        renderTemplate() {
            this.template = this._template.compile<EventData>({
                ".eta"      : ( e, d ) => e.text(d.created.add("minutes", d.deployMinutes).diff(moment())),
                ".commits"  : ( e, d ) => {
                    e.empty();
                    d.messages.forEach( ( m ) => e.append( $( "<li>" + m + "</li>" ) ) );
                }
            });
        }

        show(data: EventData) {
            this.currentData = data;
            this.el.show();
        }

        hide() {
            this.el.hide();
        }

        update() {
            if (this.el.is(":visible")) {
                this.template(this.currentData);
            }
        }

    }

} 