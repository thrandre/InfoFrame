import $ = require("jquery");
import NewsProps = require("./NewsProps");
import React = require("react/addons");
import TReact = require("../TReact");
import Tween = require("tween.js");

class NewsView extends TReact.Component<NewsProps, any>
{
    private animating = false;
    private currentArticle = 0;
    private distance = 0;

    private tween: Tween.Tween;

    shouldComponentUpdate: (nextProps: NewsProps) => boolean;

    getInitialState()
    {
        return {
            top: 0,
            translate: "translate(0,0);"
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

        var first = $(domNode).children().first();

        this.animating = true;
        this.distance = first.outerHeight();

        setInterval(() => this.scroll(domNode), 15500);
    }

    scroll(domNode: Element)
    {
        this.currentArticle++;

        if (this.tween) 
        {
            this.tween.stop();
        }

        if (this.currentArticle >= this.props.articles.length) 
        {
            this.currentArticle = 0;
        }

        var newTop = this.currentArticle * this.distance * -1;
        var tweenObj = $.extend({}, this.state);
        
        this.tween = new Tween.Tween(tweenObj).to({ top: newTop }, 500).onUpdate(() => { 
            this.setState(tweenObj);
        }).start();
    }

    render(): React.ReactElement<NewsProps>
    {
        return TReact.jsx(require("./NewsView.jsx"), this.props, this);
	}

}

var NewsViewClass = TReact.createClass(NewsView);

export = NewsViewClass;
