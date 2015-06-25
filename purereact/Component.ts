/// <reference path="../typings/tsd.d.ts"/>

import React = require("react");

interface ComponentFactory<TProp>
{
    (props?: TProp): React.ReactElement<any>;
    jsx: any;
}

var component = <TProp>(renderFn: (props: TProp) => React.ReactElement<any>, ...mixins: any[]): ComponentFactory<TProp> =>
{
    var componentObject: React.ComponentSpec<TProp, any> =
    {
        mixins: mixins,
        
        render()
        {
            return renderFn.call(this, this.props);
        }
    };

    var component = React.createClass(componentObject);
    var create:any = (props: TProp) => React.createElement<TProp>(component, props);
    
    create.jsx = component;
    
    return create;
};

export = component;