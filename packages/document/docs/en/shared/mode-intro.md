- **normal mode:** Generates a `.rsdoctor` folder in the build output directory, which contains various data files and displays code in the report page. The output directory can be configured via [reportDir](/config/options/output#reportdir).

- **brief mode:** Generates `rsdoctor-report.html` in the build output directory. All build analysis data is consolidated and injected into this standalone HTML file, which can be opened directly in a browser. Brief mode also has additional configuration options, detailed at: [brief](/config/options/brief).

- **lite mode:** Based on the normal mode, this mode does not display source code and product code, only showing the information of the bundled code.
  - Lite mode is deprecated in Rsdoctor 2.x and retained for backward compatibility. Use [output.reportCodeType](/config/options/output#reportcodetype) instead.
