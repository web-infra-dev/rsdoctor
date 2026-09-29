import { useEffect } from 'react';
import { loadReportManifest } from './load-report';
import { isWebMCPAvailable, registerReportTools } from './report-tools';

export function ReportTools(): null {
  useEffect(() => {
    const controller = new AbortController();
    let registrationStarted = false;

    const registerTools = () => {
      if (registrationStarted || !isWebMCPAvailable()) return;
      registrationStarted = true;

      void loadReportManifest()
        .then((manifest) => {
          if (!controller.signal.aborted) {
            return registerReportTools(manifest, controller.signal);
          }
        })
        .catch((error: unknown) => {
          if (!controller.signal.aborted) {
            console.warn(
              '[WebMCP] Failed to register Rsdoctor report tools.',
              error,
            );
          }
        });
    };

    registerTools();
    const retryId = window.setTimeout(registerTools);

    return () => {
      window.clearTimeout(retryId);
      controller.abort();
    };
  }, []);

  return null;
}
