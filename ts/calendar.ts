module Calendar {

  export interface CalendarEvent {
    title: string;
    owner: string;
    start: Moment;
    end: Moment;
    recur: any;
  }

  export interface CalendarSource {
    url: string;
    owner: string;
  }

  export interface CalendarProvider {
    getEventData(sources: CalendarSource[], today: Moment): JQueryPromise<Views.CalendarViewData>;
  }

  export class ICalCalendarProvider implements CalendarProvider {

    private parseEventData(owner: string, data: any): CalendarEvent {
      var ifNotNull = (obj: any, accessor: (obj: any) => any) => obj ? accessor(obj) : "";

      var title = ifNotNull(data[1].filter(p => p[0] === "summary")[0], o => o[3]);
      var start = ifNotNull(data[1].filter(p => p[0] === "dtstart")[0], o => moment(o[3]));
      var end = ifNotNull(data[1].filter(p => p[0] === "dtend")[0], o => moment(o[3]));
      var recur = ifNotNull(data[1].filter(p => p[0] === "rrule")[0], o => this.parseRecurRule(o[3], start));

      return {
        title: title,
        owner: owner,
        start: start,
        end: end,
        recur: recur
      };
    }

    parseRecurRule(recur: string, start: Moment) {
      var rule: any = {};
      recur.split(";").map(r => r.split("=")).forEach(r => {
        switch (r[0]) {
          case "FREQ":
            $.extend(rule, { freq: (<any>window).RRule[r[1]] });
            break;
          case "INTERVAL":
            $.extend(rule, { interval: parseInt(r[1]) });
            break;
          case "BYDAY":
            $.extend(rule, { byweekday: r[1].split(",").map(d => (<any>window).RRule[d]) });
            break;
          case "UNTIL":
            $.extend(rule, { until: moment(r[1]).toDate() });
            break;
          case "DTSTART":
            $.extend(rule, { dtstart: moment(r[1]).toDate() });
            break;
          case "WKST":
            $.extend(rule, { wkst: (<any>window).RRule[r[1]] });
            break;
        }
      });

      if (!rule.dtstart) {
        rule.dtstart = start.toDate();
      }

      return rule;
    }

    shouldIncludeEvent(event: CalendarEvent, today: Moment) {
      var recurMatch = false;

      if (event.recur) {
        var rule = new (<any>window).RRule(event.recur);
        recurMatch = rule.between(today.clone().startOf("day").toDate(), today.clone().endOf("day").toDate()).length > 0;
      }

      return event.start.isSame(today, "day") || event.end.isSame(today, "day") || recurMatch;
    }

    getEventData(sources: CalendarSource[], today: Moment): JQueryPromise<Views.CalendarViewData> {
      var promises = sources.map(s =>
        $.getJSON(s.url)
          .then(data =>
            (<any>window).ICAL.parse(data.contents)[1][2]
              .filter(e => e[0] === "vevent")
              .map(e => this.parseEventData(s.owner, e))));

      return $.when.apply($, promises).then(() => {
        var all = Query.fromArray<CalendarEvent>([].concat.apply([], arguments));
        return {
          today: all.where(e => this.shouldIncludeEvent(e, today)).toArray(),
          tomorrow: all.where(e => this.shouldIncludeEvent(e, today.clone().add(1, "day"))).toArray()
        };
      });
    }

  }
}
