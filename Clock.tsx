import * as React from "react";
import AnalogClock, { AnalogClockProps } from "./AnalogClock";

import { ClockModel } from "./ClockModel";

export interface ClockProps {
    model: ClockModel;
}

export default class Clock extends React.Component<ClockProps, any> {

    render() {
        let model = this.props.model;
        
        if(!model) {
			return null;
        }

        return  <div className="clock">
                    <div className="time">
                        <div className="digital">
                            <span className="hour">{ model.getFormatted("HH") }</span>
                            <span>:</span>
                            <span className="minute">{ model.getFormatted("mm") }</span>
                        </div>
                        <div className="analog">
                             <AnalogClock
                                hour={ parseInt(model.getFormatted("HH")) }
                                minute={ parseInt(model.getFormatted("mm")) }
                                second={ parseInt(model.getFormatted("ss")) } />
                        </div>
                    </div>
                    <div className="date">
                        <span>{ model.getFormatted("dddd, Do MMMM YYYY") }</span>
                    </div>
                </div>;
    }

}
