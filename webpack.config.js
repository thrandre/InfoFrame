var path = require('path');

module.exports = {
    entry: path.resolve(__dirname, 'App.tsx'),
    output: {
        path: path.resolve(__dirname, 'build'),
        filename: 'bundle.js',
        publicPath: 'build/'
    },
    devtool: 'source-map',
    resolve: {
        extensions: ['', '.webpack.js', '.web.js', '.ts', '.tsx', '.js', '.less', '.css']  
    },
    devServer: {
        contentBase: './',
        noInfo: true, //  --no-info option
        hot: true,
        inline: true
    },
    plugins: [],
    module: {
        loaders: [
            { 
                test: /\.tsx?$/, 
                loader: 'ts-loader' 
            },
            {
                test: /\.less$/,
                loader: "style!css!less"
            }
        ]
    }
};
