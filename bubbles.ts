///<reference path="timers.ts"/>

module Bubbles {

    export class Stage implements Hitable {

        bubbles: Bubble[] = [];

        constructor( public el: JQuery, public bubbleFactory: BubbleFactory, public mediator: Simple.EventEmitter ) {
            this.initialize();
        }

        initialize() {
            this.el
                .find( ".bubble" )
                .each( ( i, e ) =>
                    this.bubbles.push( this.bubbleFactory.create( $( e ), this.mediator ) ) );

            this.layout();
            this.mediator.on( "bubble-flip", ( d ) => this.bubbles[0].spotlight() );
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

            center.setVirtualPadding( -20 );
            center.originMoveTo( this.getStageOrigin() );

            var spacingAngle = ( 2 * Math.PI ) / ( this.bubbles.length - 1 );

            for ( var i = 1; i < this.bubbles.length; i++ ) {
                var angle = ( i - 1 ) * spacingAngle,
                    position = center.getPointOnCircumference( angle, true );

                this.bubbles[i].circumferenceMoveTo( center.translateToAbsolute( position ), angle );
            }
        }

        getBoundingBox(): Rectangle {
            var position = this.el.offset(),
                size = { width: this.el.width(), height: this.el.height() };
            return new Rectangle( position.left, position.top, size.width, size.height );
        }

        isHit(x: number, y: number): boolean {
            return !new Rectangle(x, y, 1, 1).intersects(this.getBoundingBox());
        }

    }

    export class BubbleFactory {
        
        create( el: JQuery, mediator: Simple.EventEmitter ): Bubble {
            if (el.hasClass("flipable")) {
                return new FlipableBubble( el, mediator );
            }
            return new ScaleableBubble( el, mediator );
        }

    }

    export class Bubble implements Hitable {

        virtualPadding: number = 0;

        constructor( public el: JQuery, public mediator: Simple.EventEmitter ) {
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

        circumferenceMoveTo( relative: JQueryCoordinates, angle: number ) {
            var position = this.el.offset(),
                beta = relative.top > position.top
                    ? angle + Math.PI
                    : angle - Math.PI,
                circ = this.getPointOnCircumference( beta );

            this.moveTo({
                left    : relative.left - circ.left,
                top     : relative.top  - circ.top
            });
        }

        getBoundingBox(): Rectangle {
            var position = this.el.offset(),
                size = { width: this.el.width(), height: this.el.height() };
            return new Rectangle( position.left, position.top, size.width, size.height );
        }

        isHit(x: number, y: number): boolean {
            var origin = this.translateToAbsolute( this.getOrigin() );
            return Math.pow( ( x - origin.left ), 2 ) + Math.pow( ( y - origin.top ), 2 ) < Math.pow( this.getRadius(), 2 );
        }

        spotlight() {}

    }

    export class FlipableBubble extends Bubble {
        
        spotlight() {
            this.flip();
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

            this.el.velocity( rotate1, () => {
                hide.hide();
                show.show();
                this.el.velocity( rotate2 );
            });
        }

    }

    export class ScaleableBubble extends Bubble {
        
        spotlight() {
            this.scale();
        }

        scale() {
            
        }

    }

    export class Rectangle {
        
        constructor( public x: number, public y: number, public w: number, public h: number ) { }

        x1(): number {
            return this.x;
        }

        x2(): number {
            return this.x + this.w;
        }

        y1(): number {
            return this.y;
        }

        y2(): number {
            return this.y + this.h;
        }

        width(): number {
            return this.w;
        }

        height(): number {
            return this.h;
        }

        intersects(rect: Rectangle): boolean {
            return this.x1() < rect.x2()
                && this.x2() > rect.x1()
                && this.y1() < rect.y2()
                && this.y2() > rect.y1();
        }

        getIntersection(rect: Rectangle): Rectangle {
            var x1, x2, y1, y2;

            x1 = this.x1() < rect.x1() ? rect.x1() : this.x1();
            x2 = this.x2() < rect.x2() ? this.x2() : rect.x2();
            y1 = this.y1() < rect.y1() ? rect.y1() : this.y1();
            y2 = this.y2() < rect.y2() ? this.y2() : rect.y2();

            return new Rectangle( x1, y1, x2 - x1, y2 - y1 );
        }

    }

    export interface Hitable {
        getBoundingBox(): Rectangle;
        isHit( x: number, y: number ): boolean;
    }

    export class HitTester {
        
        static test( obj1: Hitable, obj2: Hitable ): boolean {
            var bounding1 = obj1.getBoundingBox(),
                bounding2 = obj2.getBoundingBox();

            if ( !bounding1.intersects( bounding2 ) ) {
                return false;
            }

            var intersection = bounding1.getIntersection( bounding2 );

            for ( var x = intersection.x1(); x <= intersection.x2(); x++ ) {
                for ( var y = intersection.y1(); y <= intersection.y2(); y++ ) {
                    if ( obj1.isHit( x, y ) && obj2.isHit( x, y ) ) {
                        return true;
                    }
                }
            }

            return false;
        }

    }

} 