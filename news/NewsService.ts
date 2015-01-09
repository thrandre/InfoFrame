import $ = require("jquery");
import Moment = require("moment");
import ArticleData = require("./ArticleData");
import NewsActions = require("./NewsActions");
import RequestState = require("../RequestState");

class NewsService
{
	private parseArticleData(data: any): ArticleData
	{
	    var entry = $(data);
        
        return {
            id: entry.find("id").text(),
            title: entry.find("title").text(),
            summary: entry.find("summary").text(),
            updated: Moment(entry.find("updated").text())
        };
	}

	private getApiUrl(): string
	{
        return "http://www.vg.no/rss/feed/?categories=1075,1068,1072,1107,1074&keywords=&limit=25&format=atom";
	}

	getArticles(): Thenable<ArticleData[]>
	{
        NewsActions.getArticleData.trigger({ state: RequestState.Pending });
        return $.get(this.getApiUrl()).then((data: any) => NewsActions.getArticleData.trigger({ data: $(data).find("entry").map((i, e) => this.parseArticleData(e)).toArray(), state: RequestState.Success}));
	}
}

export = NewsService;