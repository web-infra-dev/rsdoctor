import { DevToolError } from '@/error';

const ECMA_VERSION_CHECK_CODE = 'E1004';
const MAX_DISPLAYED_LOCATIONS = 3;

interface SyntaxLocation {
  path?: string;
  line?: number;
  column?: number;
}

function formatLocation(error: DevToolError): string | undefined {
  const syntaxError = error.detail?.error;
  const location = (syntaxError?.output ?? syntaxError?.source) as
    SyntaxLocation | undefined;

  if (!location?.path) {
    return undefined;
  }

  const position = [location.line, location.column]
    .filter((value) => typeof value === 'number')
    .join(':');

  return position ? `${location.path}:${position}` : location.path;
}

function createEcmaVersionWarningSummary(
  warnings: DevToolError[],
): DevToolError {
  const firstWarning = warnings[0];
  const target = firstWarning.message.match(/"([^"]+)"/)?.[1];
  const issueCount = warnings.length;
  const locations = [
    ...new Set(warnings.map(formatLocation).filter(Boolean) as string[]),
  ];
  const displayedLocations = locations.slice(0, MAX_DISPLAYED_LOCATIONS);
  const remainingIssueCount = issueCount - displayedLocations.length;
  const message = [
    `Found ${issueCount} incompatible syntax ${
      issueCount === 1 ? 'issue' : 'issues'
    }${target ? ` for "${target}"` : ''}.`,
    displayedLocations.length
      ? `Affected outputs: ${displayedLocations.join(', ')}${
          remainingIssueCount > 0
            ? `, ... (+${remainingIssueCount} more ${
                remainingIssueCount === 1 ? 'issue' : 'issues'
              })`
            : ''
        }`
      : undefined,
    'View the Rsdoctor report for source-level details.',
  ]
    .filter(Boolean)
    .join('\n');

  return new DevToolError(firstWarning.title, message, {
    category: firstWarning.category,
    code: firstWarning.code,
    controller: {
      noColor: true,
    },
    detail: firstWarning.detail,
    level: firstWarning.level,
  });
}

export function summarizeRuleWarnings(
  warnings: DevToolError[],
): DevToolError[] {
  const ecmaVersionWarnings = warnings.filter(
    ({ code }) => code === ECMA_VERSION_CHECK_CODE,
  );

  if (!ecmaVersionWarnings.length) {
    return warnings;
  }

  const summary = createEcmaVersionWarningSummary(ecmaVersionWarnings);
  let summaryAdded = false;

  return warnings.flatMap((warning) => {
    if (warning.code !== ECMA_VERSION_CHECK_CODE) {
      return [warning];
    }

    if (summaryAdded) {
      return [];
    }

    summaryAdded = true;
    return [summary];
  });
}
