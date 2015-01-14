import TravelProps = require("./TravelProps");
import React = require("react/addons");
import TReact = require("../TReact");
import Moment = require("moment");
import Tween = require("tween.js");
import $ = require("jquery");

class TravelView extends TReact.Component<TravelProps, any>
{
    private animating = false;
    
    getInitialState()
    {
        return {
            left: 0
        };
    }

    componentDidMount() 
    {
        this.animate(this.getDOMNode());
    }

    componentDidUpdate()
    {
        this.animate(this.getDOMNode());
    }

    getDepartureString(departure: Moment): string
    {
        var diff = departure.diff(Moment(), "seconds");
        
        if (diff < 60)
        {
            return "nå";
        }

        if (diff < 660)
        {
            return departure.diff(Moment(), "minutes") + " min";
        }

        return "ca " + departure.format("HH:mm");
    }

    tween(valueGetter: () => number, valueSetter: (val) => void, props: { endValue: number; duration?: number; easing?: (k: number) => number }, onComplete?: () => void): { start: () => void } {
        var tweenFrom = { value: valueGetter() || 0 };
        var tweenTo = { value: props.endValue || 0 };

        var tween = new Tween.Tween(tweenFrom)
            .to(tweenTo, props.duration || 0)
            .easing(props.easing || Tween.Easing.Linear.None)
            .onUpdate(() => valueSetter(tweenFrom.value))
            .onComplete(onComplete);

        return { start: () => tween.start() };
    }

    animate(domNode: Element)
    {
        if (this.animating || $(domNode).find(".entry").length === 0) {
            return;
        }

        this.animating = true;
        this.scroll();
    }

    scroll()
    {
        var domNode = $(this.getDOMNode());

        this.setState({ left: domNode.parent().width() });
        this.tween(() => this.state.left, val => this.setState({ left: val }), { endValue: domNode.get(0).scrollWidth * -1, duration: 60 * 1000 }, () => this.scroll()).start();
    }

    render(): React.ReactElement<TravelProps>
    {
        var entries = (this.props.travelEntries || []).map(e =>
        {
            return {
                line: e.line,
                destination: e.destination,
                direction: e.direction === 1 ? "Ø" : "V",
                departure: this.getDepartureString(e.departure)
            };
        });;

        return TReact.jsx(require("./TravelView.jsx"), entries, this);
	}
}

var TravelViewClass = TReact.createClass(TravelView);

export = TravelViewClass;
