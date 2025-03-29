const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");

module.exports = {
  entry: "./src/index.tsx",
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
  ],
  devServer: {
    historyApiFallback: true,
    static: {
      directory: path.join(__dirname, "public"),
      publicPath: "/",
      watch: true, // Add this to watch static files
    },
    compress: true,
    port: 3000,
    hot: true, // Enable Hot Module Replacement
    liveReload: true, // Enable live reloading
    open: true, // Automatically open browser
    client: {
      overlay: {
        errors: true,
        warnings: false,
      }, // Show errors in browser overlay
      progress: true, // Show compilation progress
      reconnect: true, // Automatically reconnect
    },
    watchFiles: {
      paths: ["src/**/*.{ts,tsx,js,jsx,css}"], // Watch these files for changes
      options: {
        usePolling: true, // Useful for some file systems
        interval: 500, // Check for changes every 500ms
      },
    },
  },
  performance: {
    hints: false,
  },
  // Add this for better source maps (helps with debugging)
  devtool: "eval-cheap-module-source-map",
};
