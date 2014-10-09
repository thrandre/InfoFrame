///<reference path="../typing/velocity-animate.d.ts"/>
///<reference path="../simple.ts"/>
module Views {
    
    export class AutoScrollView extends Simple.View {
        private animation;

        constructor( public el: JQuery ) {
            super( el );
        }

        autoscroll( innerEl: JQuery, speed: number ) {

            if ( this.animation ) {
                return;
            }

            this.animation = () => {
                var targetTop = ( innerEl.height() - this.el.height() ) * -1;

                if ( targetTop >= 0 ) {
                    return;
                }

                var duration = (targetTop * -1 / 100) * speed;

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
                        duration: duration/2,
                        delay: 1000,
                        complete: this.animation
                    });
            };

            this.animation();
        }

    }

} 