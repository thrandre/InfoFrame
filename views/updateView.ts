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

        show() {
            this.el.show();
        }

        hide() {
            this.el.hide();
        }

    }

} 