import NewsProps = require("./NewsProps");
import React = require("react/addons");
import Component = require("../purereact/Component");
import ImmCursor = require("../purereact/ImmCursor");

var NewsView = Component<ImmCursor<NewsProps>>("News", (props) =>
{
    var articles = <any>props.wrapped.get(x => x.articles).deref();

    if (!articles) {
        return null;
    }

    var style = {
        transform: "translate(0, " + 0 + "px)",
        "-webkit-transform": "translate(0, " + 0 + "px)"
    };

    return (
        React.createElement("div", { className: "articles", style: style },
            articles.toJS().map(article => 
                React.createElement("div", { key: article.id, className: "article" },
                React.createElement("div", { className: "time" }, article.updated.format("dddd HH:mm")),
                React.createElement("div", { className: "title" }, article.title),
                React.createElement("div", { className: "summary" }, article.summary)
            ))
        )
    );
});

export = NewsView;
