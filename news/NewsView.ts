import $ = require("jquery");
import NewsProps = require("./NewsProps");
import React = require("react/addons");
import TReact = require("../TReact");
import Tween = require("tween.js");

class NewsView extends TReact.Component<NewsProps, any>
{
    private animating = false;
    private currentArticle = 0;

    shouldComponentUpdate: (nextProps: NewsProps) => boolean;

    getInitialState()
    {
        return {
            top: 0
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

    animate(domNode: Element)
    {
        if (this.animating || !domNode) 
        {
            return;
        }

        this.animating = true;

        var scrollDistance = $(domNode).children().first().outerHeight(true);

        setInterval(() => this.scroll(domNode, scrollDistance), 15500);
    }

    scroll(domNode: Element, scrollDistance: number)
    {
        this.currentArticle++;

        if (this.currentArticle >= this.props.articles.length) 
        {
            this.currentArticle = 0;
        }

        var offset = this.currentArticle * scrollDistance * -1;

        this.setState({ top: offset });
    }

    tween(valueGetter: () => number, valueSetter: (val) => void, props: { endValue: number; duration?: number; easing?: (k: number) => number }): { start: () => void }
    {
        var tweenFrom = { value: valueGetter() || 0 };
        var tweenTo = { value: props.endValue || 0 };
        
        var tween = new Tween.Tween(tweenFrom)
            .to(tweenTo, props.duration || 0)
            .easing(props.easing || Tween.Easing.Linear.None)
            .onUpdate(() => valueSetter(tweenFrom.value));

        return { start: () => tween.start() };
    }

    render(): React.ReactElement<NewsProps>
    {
        return TReact.jsx(require("./NewsView.jsx"), this.props, this);
	}

}

var NewsViewClass = TReact.createClass(NewsView);

export = NewsViewClass;
