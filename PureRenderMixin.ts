import TReact = require("./TReact");
import _ = require("lodash");

class PureRenderMixin<P, S> extends TReact.Mixin<P, S>
{
    shouldComponentUpdate(nextProps: P, nextState: S): boolean
    {
        return !_.isEqual(this.state, nextState) || !_.isEqual(this.props, nextProps);
    }
}

export = PureRenderMixin;