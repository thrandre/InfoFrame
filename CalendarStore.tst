import Store from "./Store";
import Actions from "./Actions";

import { CalendarModel } from "./CalendarModel";

class CalendarStore extends Store {
    calendarModel: CalendarModel;

    constructor() {
        super();
        Actions.getCalendarEvents.listen(p => this.setCalendarEvents(p));
    }

    private setCalendarEvents(payload: RequestPayload<CalendarModel>) {
        if(payload.state == RequestState.Success) {
            this.calendarModel = payload.data;
            this.trigger(payload.data);
        }
    }

    getCalendarEvents() {
        if(!this.calendarModel) {
            return null;
        }

        return Query
            .fromArray(this.calendarModel.events)
            .where(e => e.start.isAfter(Moment().startOf("day")) && e.start.isBefore(Moment().add(14, "days")))
            .orderByAscending(e => e.start.toDate())
            .take(15)
            .toArray();
    }
}

var calendarStore = new CalendarStore();

export = calendarStore;
