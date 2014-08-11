///<reference path="../simple.ts"/>

module Views {
    
    export class UpdateView extends Simple.View {
        
        private template;

        constructor( public el: JQuery, private mediator: Simple.EventEmitter ) {
            super( el );
            this.initialize();
        }

        initialize() {
            this.mediator.on( "updateView-show", this.show, this );
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
            this.template( data );
            this.el.show();
        }

        hide() {
            this.el.hide();
        }

    }

} 