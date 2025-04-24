# Rsdoctor Configuration Overview

The Rsdoctor suite provides plugins for both Rspack and Webpack, namely `RsdoctorRspackPlugin` and `RsdoctorWebpackPlugin`. These plugins are designed to enhance build analysis by integrating Rsdoctor's capabilities directly into the build process.

## Key Features

- **Plugins**: Both plugins offer a range of options to customize the build analysis, including enabling or disabling specific features and modes.
- **Modes**: Users can choose between `normal`, `brief`, and `lite` modes, each offering different levels of detail and performance optimizations.
- **Features**: The plugins support a variety of features such as loader and plugin analysis, bundle analysis, and resolver analysis.
- **Output Configuration**: Options are available to configure the output directory, compress data, and select specific types of analysis data to output.
- **Support Options**: Additional support options are available for enabling compatibility with certain plugins and generating visualizations like tile graphs.

## Usage

The plugins can be configured using CommonJS or ES Module syntax, and they provide a flexible API to tailor the analysis to specific project needs. The configuration options are extensive, allowing for detailed customization of the analysis process.

For more detailed information on each option and its usage, refer to the specific sections in the `options.mdx` file.

## Detailed Configuration Options

The Rsdoctor plugins offer a comprehensive set of configuration options:

- **Brief Mode**: Allows for a simplified report with options to customize the HTML report name and decide whether to write additional data to JSON.
- **Disable Client Server**: Option to prevent automatic opening of the Rsdoctor report page.
- **Experiments**: Includes options like `enableNativePlugin` to improve build analysis efficiency by integrating Rsdoctor's native plugin into Rspack.
- **Features**: Configurable as an array or object to enable or disable specific analysis features such as loader, plugins, bundle, and resolver.
- **Mode**: Choose between `normal`, `brief`, and `lite` modes to adjust the level of detail in the build report.
- **Output**: Configure the output directory, data compression, and specific data types to include in the report.
- **Port**: Set the port for the Rsdoctor server.
- **Supports**: Enable support for detailed feature analysis capabilities, such as compatibility with BannerPlugin and generating tile graphs.

These options provide a robust framework for customizing the Rsdoctor analysis to fit the specific needs of a project, ensuring efficient and detailed build analysis.
