- **normal mode:** Generates a `.rsdoctor` folder in the build output directory, which contains various data files and displays code in the report page. The output directory can be configured via [reportDir](/config/options/output#reportdir).

- **brief mode:** Generates `rsdoctor-report.html` in the report output directory. This directory defaults to the build output directory and can be configured via [reportDir](/config/options/output#reportdir). All build analysis data is injected into this standalone HTML file, which can be opened directly in a browser. See [mode: 'brief'](/config/options/output#mode-brief) for the available options.

- **lite mode:** Based on the normal mode, this mode does not display source code and product code, only showing the information of the bundled code.
  - The top-level `mode: 'lite'` option was removed and is ignored in Rsdoctor 2.x. The `features` lite configurations remain supported. Use [output.reportCodeType](/config/options/output#reportcodetype) for new configurations.
