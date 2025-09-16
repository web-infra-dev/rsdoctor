- **normal mode:** Generates a `.rsdoctor` folder in the build output directory, which contains various data files and displays code in the report page. The output directory can be configured via [reportDir](/config/options/options#reportdir).

- **brief mode:** Generates an HTML report file in the `.rsdoctor` folder within the build output directory. All build analysis data will be consolidated and injected into this HTML file, which can be viewed by opening it in a browser. Brief mode also has additional configuration options, detailed at: [brief](/config/options/options#brief).

- **lite mode:** Based on the normal mode, this mode does not display source code and product code, only showing the information of the bundled code.
  - lite mode will be deprecated in V2, refer to [lite mode deprecation notice](/config/options/options-v2#lite).
