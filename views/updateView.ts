///<reference path="../simple.ts"/>

module Views {
    
    export class UpdateView extends Simple.View {
        
        constructor( public el: JQuery, private mediator: Simple.EventEmitter ) {
            super( el );
            this.initialize();
        }

        initialize() {
            this.mediator.on( "updateView-show", this.show, this );
            this.hide();
        }

        show(data: EventData) {
            this.el.show();
            console.log(data);
        }

        hide() {
            this.el.hide();
        }

    }

} 