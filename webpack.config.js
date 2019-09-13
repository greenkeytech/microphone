const path = require('path');

module.exports = {
  entry: './src/Microphone.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'Microphone.js',
    library: 'Microphone',
    libraryExport: ['default'],
    libraryTarget: 'umd'
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader'
        }
      }
    ]
  }
};
