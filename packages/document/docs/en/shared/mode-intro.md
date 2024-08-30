- **normal:** Normal mode, which generates a `.rsdoctor` folder in the build output directory. It contains different data files and the report page displays code. The output directory can be configured using [reportDir](/config/options/options#reportdir).

- **brief:** Brief mode, which generates an HTML report file in the `.rsdoctor` folder of the build output directory. All the build analysis data will be integrated and injected into this HTML file. You can open this HTML file in a browser to view the report. Brief mode also has additional configuration options, see [brief](/config/options/options#brief).
- **lite:** Lite mode, which is a mode based on normal mode that does not display source code and bundles codes. It only displays information about the built codes.
