/// <reference path="./typings/tsd.d.ts" />

class TestConstruct {
	constructor(protected func: (done?: any) => any) {}
	
	getTestParams(testFunc) {
		const STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg;
		const ARGUMENT_NAMES = /([^\s,]+)/g;
		var getParamNames = f => {
  			var fnStr = f.toString().replace(STRIP_COMMENTS, '');
  			var result = fnStr.slice(fnStr.indexOf('(')+1, fnStr.indexOf(')')).match(ARGUMENT_NAMES);
  			return result || [];
		};
		
		return getParamNames(testFunc);
	}
	
	execute(done) {		
		this.func(done);
		return this.getTestParams(this.func).length === 0;
	}
}

class Context extends TestConstruct {
	constructor(func: () => any) {
		super(func);
	}
}

class When extends TestConstruct {
	constructor(func: () => any) {
		super(func);
	}
}

class Expect extends TestConstruct {
	constructor(func: (done?: any) => any) {
		super(func);
	}
}

var DoneHandler = function(expectedCalls, doneCb) {
	var currentCalls = 0;
	return () => {
		currentCalls++;
		return currentCalls === expectedCalls && doneCb();
	};
};

var HumanTextTransform = function(str: string, cap?: boolean, suffix?:string) {
	var text = str.split('_').join(' ');
	return [(cap ? text.substr(0, 1).toUpperCase() : text.substr(0, 1)), text.substr(1), suffix].join('');
};

export var foo = "";

export var MochaAdapter = function(testNamespace: any, testCollectionName: string): any {
	return ((describe, it, beforeAll) => {
		describe(`${HumanTextTransform(testCollectionName, true, ".")}`, () => {
			Object.keys(testNamespace).forEach(suiteName => {
				var testSuite = new testNamespace[suiteName]();
				
				describe(HumanTextTransform(suiteName, true, "..."), () => {
					
					var suiteKeys = Object.keys(testSuite),
						establishes = suiteKeys.filter(k => testSuite[k] instanceof Context),
						ofs = suiteKeys.filter(k => testSuite[k] instanceof When),
						expects = suiteKeys.filter(k => testSuite[k] instanceof Array && testSuite[k].every(t => t instanceof Expect));
					
					beforeAll(done => {
						var handler = DoneHandler(establishes.length + ofs.length, done);
						establishes.forEach(key => testSuite[key].execute(handler) && handler(), this);
						ofs.forEach(key => testSuite[key].execute(handler) && handler(), this);
					});
					
					expects.forEach(key => {
						it(HumanTextTransform(key, true, "."), done => {
							var asserts = testSuite[key],
								handler = DoneHandler(asserts.length, done);
							
							asserts.forEach(e => e.execute(handler) && handler());
						});
					}, this);
				});
			});
		});
	})(describe, it, before);
};

export var context = (func: () => any) => new Context(func);
export var when = (func: () => any) => new When(func);
export var expect = (...funcs: ((done) => any)[]) => funcs.map(f => new Expect(f));