module Simple {

    export interface EventListener {
        callback: ( data ) => void;
        context: any;
    }

    export interface EventEmitter {
        on( event: string, callback: ( data ) => void, context?: any );
        off( event: string, callback?: ( data ) => void, context?: any );
        trigger( event: string, data?: any )
    }

    export class Events {

        private listeners: { [key: string]: EventListener[] } = {};

        public on( event: string, callback: ( data ) => void, context?: any ) {
            ( this.listeners[event] || ( this.listeners[event] = [] ) )
                .push( { callback: callback, context: context });
        }

        public off( event: string, callback?: ( data ) => void, context?: any ) {
            if ( !callback && !context ) {
                delete this.listeners[event];
            }

            var events = this.listeners[event] || [];
            for ( var i = 0; i < events.length; i++ ) {
                if ( !( callback && events[i].callback !== callback || context && events[i].context !== context ) ) {
                    events.splice( i, 1 );
                }
            }
        }

        public trigger( event: string, data?: any ) {
            var events = this.listeners[event] || [];
            for ( var i = 0; i < events.length; i++ ) {
                events[i].callback.apply( events[i].context || this, [data] );
            }
        }

    }

    export class Controller extends Events {

    }

    export class View extends Events {

        constructor( public el: JQuery, public controller?: Controller ) {
            super();
        }

        public initialize() { }

        public render() { }

    }

} 