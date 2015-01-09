import Store = require("../Store");
import NewsActions = require("./NewsActions");
import NewsService = require("./NewsService");
import NewsProps = require("./NewsProps");
import RequestState = require("../RequestState");
import Timer = require("../Timer");

class NewsStore extends Store
{
    private state: NewsProps;

    constructor(private newsService: NewsService)
	{
		super();
        NewsActions.getArticleData.listen(pl =>
        {
            if (pl.state === RequestState.Success)
            {
                this.state = { articles: pl.data };
                this.trigger(this.getState());
            }
        });
        
        Timer.create(() => this.loadState()).start(5 * 60 * 1000, true);
	}

    private loadState()
    {
        this.newsService.getArticles();
    }

    getState(): NewsProps
	{
	    return this.state;
	}
}

var weatherStore = new NewsStore(new NewsService());

export = weatherStore;