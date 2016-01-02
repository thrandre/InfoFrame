// Karma configuration

module.exports = function(config) {
    config.set({
        // ... normal karma configuration
        browsers: ['Chrome'],
        frameworks: ['mocha'],
        
        files: [
            'tests/*.Tests.ts'
        ],

        preprocessors: {
            // add webpack as preprocessor
            'tests/*.Tests.ts': ['webpack']
        },
        
        reporters: ['spec'],
        
        webpack: {
            // karma watches the test entry points
            // (you don't need to specify the entry option)
            // webpack watches dependencies

            // webpack configuration
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
            },
            resolve: {
                extensions: ['', '.webpack.js', '.web.js', '.ts', '.tsx', '.js', '.less', '.css']  
            }
        },

        webpackMiddleware: {
            // webpack-dev-middleware configuration
            // i. e.
            noInfo: true
        },

        plugins: [
            require("karma-webpack"),
            require("karma-mocha"),
            require("karma-chrome-launcher"),
            require("karma-spec-reporter")
        ]

    });
};