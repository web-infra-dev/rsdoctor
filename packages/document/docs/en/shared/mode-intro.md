- **normal mode:** Generates a `.rsdoctor` folder in the build output directory, which contains various data files and displays code in the report page. The output directory can be configured via [reportDir](/config/options/output#reportdir).

- **brief mode:** Generates an HTML report file in the `.rsdoctor` folder within the build output directory. All build analysis data is consolidated and injected into this HTML file, which can be opened directly in a browser. See the [brief output configuration](/config/options/output#mode-brief) for details.

- **lite mode:** Based on the normal mode, this mode does not display source code and product code, only showing the information of the bundled code.
  - The top-level `mode: 'lite'` option was removed in Rsdoctor 2.x, and `features.lite` is deprecated. Use [output.reportCodeType](/config/options/output#reportcodetype) instead.
