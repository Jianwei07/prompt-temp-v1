const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const webpack = require("webpack");

module.exports = {
  mode: "development",
  entry: [
    // Entry point for your app (HMR is enabled via devServer.hot)
    "./src/index.tsx",
  ],
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "bundle.[contenthash].js",
    publicPath: "/",
    clean: true,
  },
  resolve: {
    extensions: [".ts", ".tsx", ".js", ".jsx"],
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  module: {
    rules: [
      {
        test: /\.(ts|tsx)$/,
        exclude: /node_modules/,
        use: "ts-loader",
      },
      {
        test: /\.css$/,
        use: ["style-loader", "css-loader"],
      },
      {
        test: /\.(png|jpe?g|gif|svg)$/i,
        type: "asset/resource",
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: "./public/index.html",
      favicon: "./public/favicon.ico",
    }),
    new webpack.HotModuleReplacementPlugin(),
  ],
  devServer: {
    historyApiFallback: true,
    static: {
      directory: path.join(__dirname, "public"),
      publicPath: "/",
      watch: true,
    },
    compress: true,
    port: 3000,
    hot: true, // Enable Hot Module Replacement
    liveReload: true, // Enable live reloading
    open: true, // Automatically open the browser
    client: {
      overlay: {
        errors: true,
        warnings: false,
      },
      progress: true,
      reconnect: true,
    },
    watchFiles: {
      paths: ["src/**/*.{ts,tsx,js,jsx,css}"],
      options: {
        usePolling: true,
        interval: 500,
      },
    },
    proxy: {
      "/api": {
        target: "http://localhost:8080",
        changeOrigin: true,
        secure: false,
      },
    },
  },
  performance: {
    hints: false,
  },
  devtool: "eval-cheap-module-source-map",
};
