import * as React from "react";

var polarToCartesian = (centerX:number, centerY:number, radius:number, angleInDegrees:number) =>
{
    var angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;

    return {
        x: centerX + (radius * Math.cos(angleInRadians)),
        y: centerY + (radius * Math.sin(angleInRadians))
    };
};

var describeArc = (x:number, y:number, radius:number, startAngle:number, endAngle:number) =>
{
    var start = polarToCartesian(x, y, radius, endAngle);
    var end = polarToCartesian(x, y, radius, startAngle);

    var arcSweep = endAngle - startAngle <= 180 ? "0" : "1";

    var d = [
        "M", start.x, start.y,
        "A", radius, radius, 0, arcSweep, 0, end.x, end.y
    ].join(" ");

    return d;
};

export interface AnalogClockProps {
    hour: number;
    minute: number;
    second: number;
}

export default class AnalogClock extends React.Component<AnalogClockProps, any> {

    render() {
        var hourRotation = this.props.hour > 0 ? (this.props.hour / 12) * 360 : 0;
        var minuteRotation = this.props.minute > 0 ? (this.props.minute / 60) * 360 : 0;
        var secondRotation = this.props.second > 0 ? (this.props.second / 60) * 360 : 0;

        return (
            React.createElement("figure", { id: "clock" },
                React.createElement("svg", { id: "SvgjsSvg1000", xmlns: "http://www.w3.org/2000/svg", version: "1.1", width: "100%", height: "100%" },
                    React.createElement("svg", { id: "SvgjsSvg1006", viewBox: "0 0 100 100", width: "100%", height: "100%" },
                        React.createElement("ellipse", { id: "SvgjsEllipse1007", rx: "38.5", ry: "38.5", cx: "50", cy: "50", stroke: "#ffffff", strokeWidth: "3", fillOpacity: "0" }),
                        React.createElement("rect", { id: "SvgjsRect1008", width: "5", height: "20", x: "47.5", y: "30", fill: "#ffffff", transform: "rotate( " + hourRotation + " 50 50)" }),
                        React.createElement("ellipse", { id: "SvgjsEllipse1009", rx: "3.5", ry: "3.5", cx: "50", cy: "50", fill: "#ffffff" }),
                        React.createElement("rect", { id: "SvgjsRect1010", width: "3", height: "30", x: "48.5", y: "20", fill: "#ffffff", transform: "rotate( " + minuteRotation + " 50 50)" }),
                        React.createElement("rect", { id: "SvgjsRect1011", width: "2", height: "35", x: "49", y: "15", fill: "#ffffff", transform: "rotate( " + secondRotation + " 50 50)" })
                    )
                )
            )
        );
    }

}
