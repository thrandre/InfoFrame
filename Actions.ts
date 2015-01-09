import Action = require("./Action");

class Actions
{
	fooAction = new Action<number>();
}

var actions = new Actions();

export = actions;