const rspack = require("@rspack/core");
const ReactRefreshPlugin = require("@rspack/plugin-react-refresh");
const { RsdoctorRspackPlugin } = require('@rsdoctor/rspack-plugin');

/** @type {import('@rspack/cli').Configuration} */
const config = {
	entry: {
		main: "./src/index.tsx"
	},
	module: {
		rules: [
			{
				test: /\.less$/,
				use: "less-loader",
				type: "css"
			},
			{
				test: /\.module\.less$/,
				use: "less-loader",
				type: "css/module"
			},
			{
				test: /\.svg$/,
				use: "@svgr/webpack"
			},
			{
				test: /\.tsx$/,
				use: {
					loader: "builtin:swc-loader",
					options: {
						sourceMap: true,
						jsc: {
							parser: {
								syntax: "typescript",
								jsx: true
							},
							externalHelpers: true,
							preserveAllComments: false,
							transform: {
								react: {
									runtime: "automatic",
									throwIfNamespace: true,
									useBuiltins: false
								}
							}
						}
					}
				},
				type: "javascript/auto"
			},
			{
				test: /\.ts$/,
				use: {
					loader: "builtin:swc-loader",
					options: {
						sourceMap: true,
						jsc: {
							parser: {
								syntax: "typescript"
							},
							externalHelpers: true,
							preserveAllComments: false
						}
					}
				},
				type: "javascript/auto"
			},
			{
				test: /\.svg$/,
				type: "asset/resource"
			}
		]
	},
	optimization: {
		minimize: false // Disabling minification because it takes too long on CI
	},
	plugins: [
		new ReactRefreshPlugin(),
		new RsdoctorRspackPlugin({
      disableClientServer: process.env.ENABLE_CLIENT_SERVER === 'false',
      features: ['bundle', 'plugins', 'loader'],
    }),
		new rspack.HtmlRspackPlugin({
			template: "./index.html"
		}),
		new rspack.CopyRspackPlugin({
			patterns: [
				{
					from: "public"
				}
			]
		})
	]
};
module.exports = config;
