const packageJSON = require('./package.json');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const { ModuleFederationPlugin } = require('webpack').container;
const path = require('path');

module.exports = {
  devtool: 'eval-source-map',
  mode: 'production',
  // mode: 'development',
  module: {
    rules: [
      {
        test: /\.jsx?$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
        },
      },
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js', 'jsx'],
    modules: ['node_modules', 'src'],
    fallback: {
      recoil: false,
      'recoil-nexus': false,
      '@hummhive/api-react-utils': false,
      '@hummhive/constants': false,
      '@hummhive/ui-elements': false,
      '@hummhive/state': false,
      inversify: false,
      react: false,
      'react-dom': false,
      'react-router': false,
      'styled-components': false,
      tweetnacl: false,
      'tweetnacl-util': false,
    },
  },
  plugins: [
    new CleanWebpackPlugin(),
    new ModuleFederationPlugin({
      name: packageJSON.name,
      library: { type: 'umd', name: packageJSON.name },
      filename: 'remoteEntry.js',
      exposes: {
        './api': './src/api',
      },
      shared: {
        recoil: {
          requiredVersion: false,
        },
        'recoil-nexus': {
          requiredVersion: false,
        },
        '@hummhive/api-react-utils': {
          requiredVersion: false,
        },
        '@hummhive/constants': {
          requiredVersion: false,
        },
        '@hummhive/ui-elements': {
          requiredVersion: false,
        },
        '@hummhive/state/group': {
          requiredVersion: false,
        },
        '@hummhive/state/hive': {
          requiredVersion: false,
        },
        '@hummhive/state/invite': {
          requiredVersion: false,
        },
        '@hummhive/state/member': {
          requiredVersion: false,
        },
        '@hummhive/state/connection': {
          requiredVersion: false,
        },
        '@hummhive/state/ui': {
          requiredVersion: false,
        },
        inversify: {
          requiredVersion: false,
        },
        react: {
          singleton: true,
          requiredVersion: false,
        },
        'react-dom': {
          singleton: true,
          requiredVersion: false,
        },
        'react-router': {
          singleton: true,
          requiredVersion: false,
        },
        'styled-components': {
          singleton: true,
          requiredVersion: false,
        },
        tweetnacl: {
          requiredVersion: false,
        },
        'tweetnacl-util': {
          requiredVersion: false,
        },
      },
    }),
  ],
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
    library: packageJSON.name,
    libraryTarget: 'umd',
    globalObject: 'this',
    umdNamedDefine: true,
  },
};
