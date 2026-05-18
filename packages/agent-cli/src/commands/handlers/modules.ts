import {
  getModuleById as getModuleByIdFromData,
  getModulesByPath,
  getModuleIssuerPath as getModuleIssuerPathFromData,
  getModuleExports as getModuleExportsFromData,
  getSideEffects,
  getSideEffectsByCategory,
  sideEffectsCategories,
} from '../datasource';
import type { SideEffectsCategory } from '../datasource';
import { parsePositiveInt, requireArg } from '../utils';

interface ModuleMatch {
  id: number;
}

function buildCategoryAnswer(category: SideEffectsCategory, total: number) {
  if (total === 0) {
    return `No modules were not tree-shaken because of ${category}.`;
  }
  const noun = total === 1 ? 'module was' : 'modules were';
  return `${total} ${noun} not tree-shaken because of ${category}. See data.modules for details.`;
}

export async function getModuleById(
  moduleIdInput: string | undefined,
): Promise<{ ok: boolean; data: unknown; description: string }> {
  const moduleId = requireArg(moduleIdInput, 'id');
  const module = getModuleByIdFromData(moduleId);
  return {
    ok: true,
    data: module,
    description: 'Get module detail by id (Rspack).',
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
  categoryInput?: string | true,
): Promise<{ ok: boolean; data: unknown; description: string }> {
  const pageNumber =
    parsePositiveInt(pageNumberInput, 'pageNumber', { min: 1 }) ?? 1;
  const pageSize =
    parsePositiveInt(pageSizeInput, 'pageSize', { min: 1, max: 1000 }) ?? 100;

  if (categoryInput !== undefined && categoryInput !== true) {
    if (!sideEffectsCategories.includes(categoryInput as SideEffectsCategory)) {
      throw new Error(
        `Invalid category: ${categoryInput}. Expected one of: ${sideEffectsCategories.join(
          ', ',
        )}.`,
      );
    }
    const sideEffects = getSideEffectsByCategory(
      categoryInput as SideEffectsCategory,
      pageNumber,
      pageSize,
    );
    return {
      ok: true,
      data: {
        ...sideEffects,
        question: `Which modules were not tree-shaken because of ${categoryInput}?`,
        answer: buildCategoryAnswer(
          categoryInput as SideEffectsCategory,
          sideEffects.total,
        ),
      },
      description: `Direct answer for modules that were not tree-shaken because of ${categoryInput}.`,
    };
  }

  const sideEffects = getSideEffects(pageNumber, pageSize);
  return {
    ok: true,
    data: sideEffects,
    description:
      'Get modules with side effects based on bailoutReason from rsdoctor-data.json. bailoutReason indicates why modules cannot be tree-shaken (e.g., "side effects", "dynamic import", "unknown exports"). Results are categorized by node_modules and user code, with package statistics.',
  };
}
