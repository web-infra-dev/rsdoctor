import {
  getModuleById as getModuleByIdFromData,
  getModulesByPath,
  getModuleIssuerPath as getModuleIssuerPathFromData,
  getModuleExports as getModuleExportsFromData,
  getSideEffects,
} from '../datasource';
import { parsePositiveInt, requireArg } from '../utils';

interface ModuleMatch {
  id: number;
}

export async function getModuleById(
  moduleIdInput: string | undefined,
): Promise<{ ok: boolean; data: unknown; description: string }> {
  const moduleId = requireArg(moduleIdInput, 'id');
  const module = getModuleByIdFromData(moduleId);
  return {
    ok: true,
    data: module,
    description: 'Get module detail by id (webpack/rspack).',
  };
}

export async function getModuleByPath(
  modulePathInput: string | undefined,
): Promise<{ ok: boolean; data: unknown; description: string }> {
  const modulePath = requireArg(modulePathInput, 'path');
  const matches = (getModulesByPath(modulePath) || []) as ModuleMatch[];

  if (!matches.length) {
    throw new Error(`No module found for "${modulePath}"`);
  }
  if (matches.length > 1) {
    return {
      ok: true,
      data: {
        match: 'multiple',
        options: matches,
        note: 'Multiple modules matched. Re-run with modules:by-id using the chosen id.',
      },
      description:
        'Get module detail by name or path; if multiple match, list them.',
    };
  }

  const moduleInfo = getModuleByIdFromData(String(matches[0].id));
  return {
    ok: true,
    data: { match: 'single', module: moduleInfo },
    description:
      'Get module detail by name or path; if multiple match, list them.',
  };
}

export async function getModuleIssuerPath(
  moduleIdInput: string | undefined,
): Promise<{
  ok: boolean;
  data: { moduleId: string; issuerPath: unknown };
  description: string;
}> {
  const moduleId = requireArg(moduleIdInput, 'id');
  const issuerPath = getModuleIssuerPathFromData(moduleId);
  return {
    ok: true,
    data: { moduleId, issuerPath },
    description: 'Trace issuer/import chain for a module.',
  };
}

export async function getModuleExports(): Promise<{
  ok: boolean;
  data: unknown;
  description: string;
}> {
  const exports = getModuleExportsFromData();
  return {
    ok: true,
    data: exports,
    description: 'Get module exports information.',
  };
}

export async function getSideEffectsHandler(
  pageNumberInput?: string,
  pageSizeInput?: string,
): Promise<{ ok: boolean; data: unknown; description: string }> {
  const pageNumber =
    parsePositiveInt(pageNumberInput, 'pageNumber', { min: 1 }) ?? 1;
  const pageSize =
    parsePositiveInt(pageSizeInput, 'pageSize', { min: 1, max: 1000 }) ?? 100;

  const sideEffects = getSideEffects(pageNumber, pageSize);
  return {
    ok: true,
    data: sideEffects,
    description:
      'Get modules with side effects based on bailoutReason from rsdoctor-data.json. bailoutReason indicates why modules cannot be tree-shaken (e.g., "side effects", "dynamic import", "unknown exports"). Results are categorized by node_modules and user code, with package statistics.',
  };
}
