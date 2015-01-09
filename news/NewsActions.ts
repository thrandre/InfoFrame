import Actions = require("../Actions");
import RequestAction = require("../RequestAction");
import ArticleData = require("./ArticleData");

class NewsActions extends Actions {
    getArticleData = new RequestAction<ArticleData[]>();
}

var newsActions = new NewsActions();

export = newsActions;