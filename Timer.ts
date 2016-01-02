export default class Timer
{
    private times: number;
    private maxTimes: number;
    private handle: number;

    constructor(private action: () => void) { }

    private tick()
    {
        if (!this.maxTimes || this.times < this.maxTimes)
        {
            this.action();
            this.times++;
        }
        else
        {
            window.clearInterval(this.handle);
        }
    }

    start(interval: number, immediate: boolean = false, times?: number)
    {
        this.times = 0;
        this.maxTimes = times;
        this.handle = window.setInterval(() => this.tick(), interval);
        if (immediate)
        {
            window.setTimeout(() => this.action(), 0);
        }
    }

    stop()
    {
        if (!this.handle)
        {
            return;
        }

        window.clearInterval(this.handle);
    }

    static create(action: () => void): Timer
    {
        return new Timer(action);
    }
}
