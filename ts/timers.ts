module Timers {

    export class Timer {

        private times: number;
        private maxTimes: number;
        private handle: number;

        constructor(private action: () => void) {}

        private tick() {
            if (isUndefined(this.maxTimes) || this.times < this.maxTimes) {
                this.action();
                this.times++;
            }
            else {
                window.clearInterval(this.handle);
            }
        }

        trigger() {
            this.action();
        }

        start(interval: number, times?: number) {
            this.times = 0;
            this.maxTimes = times;
            this.handle = window.setInterval(() => this.tick(), interval);
        }

        stop() {
            if (isUndefined(this.handle)) {
                return;
            }
            window.clearInterval(this.handle);
        }

    }

    export class TimerFactory {

        create(action: () => void): Timer {
            return new Timer(action);
        }

    }

    export class Scheduler {

        private timers: { [key: string]: Timer } = {};

        constructor(private timerFactory: TimerFactory, private mediator: Simple.EventEmitter) {}

        schedule(event: string, interval: number, immediate: boolean = false, times?: number) {
            var timer = (this.timers[event] || (this.timers[event] = this.timerFactory.create(() => this.mediator.trigger(event))));

            if (immediate) {
                timer.trigger();
            }

            timer.start(interval, times);
        }
    }
}