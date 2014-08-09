///<reference path="timers.ts"/>

module Bubbles {

    export class Stage {

        bubbles: Bubble[] = [];

        constructor( public el: JQuery, public timerFactory: Timers.TimerFactory ) {
            this.initialize();
        }

        initialize() {
            this.el.find( ".bubble" ).each( ( i, e ) => this.bubbles.push( new Bubble( $( e ) ) ) );
            this.timerFactory.create( () => this.bubbles.forEach( ( b ) => b.flip() ) ).start( 10000 );
            this.layout();
        }

        getStageOrigin(): JQueryCoordinates {
            return {
                left: this.el.width() / 2,
                top: this.el.height() / 2
            };
        }

        layout() {
            if ( isEmpty( this.bubbles ) ) {
                return;
            }

            var center = this.bubbles[0];

            center.setVirtualPadding( 0 );
            center.originMoveTo( this.getStageOrigin() );

            var spacingAngle = ( 2 * Math.PI ) / ( this.bubbles.length - 1 );

            for ( var i = 1; i < this.bubbles.length; i++ ) {
                var angle = ( i - 1 ) * spacingAngle;
                var position = center.getPointOnCircumference( angle, true );
                this.bubbles[i].originMoveTo( center.translateToAbsolute( position ) );
            }

        }

    }

    export class Bubble {

        virtualPadding: number = 0;

        constructor( public el: JQuery ) {
            this.initialize();
        }

        initialize() {
            this.el.find( ".back" ).hide();
        }

        getOrigin(): JQueryCoordinates {
            return {
                left: this.el.outerWidth( true ) / 2,
                top: this.el.outerHeight( true ) / 2
            };
        }

        getRadius( includeMargin?: boolean ): number {
            return this.el.outerWidth( !!includeMargin ) / 2;
        }

        setRadius( radius: number ) {
            this.el.width( radius * 2 );
        }

        setVirtualPadding( padding: number ) {
            this.virtualPadding = padding;
        }

        getPointOnCircumference( angle: number, includeMargin?: boolean ): JQueryCoordinates {
            var radius = this.getRadius( includeMargin ),
                origin = this.getOrigin();

            return {
                left: origin.left + ( radius + this.virtualPadding ) * Math.cos( angle ),
                top: origin.top - ( radius + this.virtualPadding ) * Math.sin( angle )
            };
        }

        translateToAbsolute( relative: JQueryCoordinates ): JQueryCoordinates {
            var position = this.el.offset();
            return {
                left: position.left + relative.left,
                top: position.top + relative.top
            };
        }

        moveTo( position: JQueryCoordinates ) {
            this.el.css(position);
        }

        originMoveTo( position: JQueryCoordinates ) {
            var origin = this.getOrigin();

            this.moveTo( {
                left: position.left - origin.left,
                top: position.top - origin.top
            } );
        }

        flip() {
            var front = this.el.find( ".front" ),
                back = this.el.find( ".back" ),
                rotate1,
                rotate2,
                show,
                hide;

            if ( front.is( ":visible" ) ) {
                show = back;
                hide = front;
                rotate1 = { rotateX: "90deg" };
                rotate2 = { rotateX: "180deg" };
            }
            else {
                show = front;
                hide = back;
                rotate1 = { rotateX: "90deg" };
                rotate2 = { rotateX: "0deg" };
            }

            this.el.transition( rotate1, () => {
                hide.hide();
                show.show();
                this.el.transition( rotate2 );
            });
        }

    }

} 