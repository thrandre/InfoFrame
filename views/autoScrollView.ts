module Views {
    
    export class AutoScrollView extends Simple.View {
        private animation;

        constructor( public el: JQuery ) {
            super( el );
        }

        autoscroll( innerEl: JQuery, duration: number ) {

            if ( this.animation ) {
                return;
            }

            this.animation = () => {
                var targetTop = ( innerEl.height() - this.el.height() ) * -1;

                if ( targetTop >= 0 ) {
                    return;
                }

                innerEl.velocity( {
                    top: targetTop
                },
                    {
                        duration: duration,
                        delay: 1000
                    })
                    .velocity( {
                        top: 0
                    },
                    {
                        duration: 1000,
                        delay: 1000,
                        complete: this.animation
                    });
            };

            this.animation();
        }

    }

} 