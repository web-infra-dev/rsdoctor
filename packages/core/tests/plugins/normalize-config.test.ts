import { describe, it, expect } from '@rstest/core';
import {
  processModeConfigurations,
  processBriefHtmlModeConfig,
} from '@/inner-plugins/utils/normalize-config';
import { Config } from '@rsdoctor/shared/types';

describe('test src/inner-plugins/utils/normalize-config.ts', () => {
  describe('processModeConfigurations', () => {
    it('should process brief mode with default configuration', () => {
      const output: Config.BriefModeConfig = {
        mode: 'brief',
        options: {
          type: ['html'],
        },
      };
      const brief: Config.BriefConfig = {
        reportHtmlName: 'test.html',
      };

      const result = processModeConfigurations('brief', output, brief);

      expect(result.finalBrief).toEqual({
        type: ['html'],
        htmlOptions: {
          reportHtmlName: 'test.html',
        },
        jsonOptions: {},
      });
      expect(result.finalNormalOptions).toEqual({});
    });

    it('should process brief mode with JSON type', () => {
      const output: Config.BriefModeConfig = {
        mode: 'brief',
        options: {
          type: ['json'],
          jsonOptions: {
            sections: {
              moduleGraph: true,
              chunkGraph: false,
              rules: true,
            },
          },
        },
      };

      const result = processModeConfigurations('brief', output, undefined);

      expect(result.finalBrief).toEqual({
        type: ['json'],
        htmlOptions: {
          reportHtmlName: undefined,
        },
        jsonOptions: {
          sections: {
            moduleGraph: true,
            chunkGraph: false,
            rules: true,
          },
        },
      });
    });

    it('should process brief mode with both HTML and JSON types', () => {
      const output: Config.BriefModeConfig = {
        mode: 'brief',
        options: {
          type: ['html', 'json'],
          htmlOptions: {
            reportHtmlName: 'custom.html',
          },
          jsonOptions: {
            sections: {
              moduleGraph: true,
              chunkGraph: true,
              rules: false,
            },
          },
        },
      };

      const result = processModeConfigurations('brief', output, undefined);

      expect(result.finalBrief).toEqual({
        type: ['html', 'json'],
        htmlOptions: {
          reportHtmlName: 'custom.html',
        },
        jsonOptions: {
          sections: {
            moduleGraph: true,
            chunkGraph: true,
            rules: false,
          },
        },
      });
    });

    it('should process normal mode', () => {
      const output = {
        mode: 'normal' as const,
      };

      const result = processModeConfigurations('normal', output, undefined);

      expect(result.finalBrief).toEqual({});
      expect(result.finalNormalOptions).toEqual({});
    });
  });

  describe('processBriefHtmlModeConfig', () => {
    it('should handle default HTML mode configuration', () => {
      const output: Config.BriefModeConfig = {
        options: {},
      };

      const result = processBriefHtmlModeConfig(output, undefined);

      expect(result).toEqual({
        type: ['html'],
        htmlOptions: {
          reportHtmlName: undefined,
        },
        jsonOptions: {},
      });
    });

    it('should handle JSON type with default sections', () => {
      const output: Config.BriefModeConfig = {
        options: {
          type: ['json'],
        },
      };

      const result = processBriefHtmlModeConfig(output, undefined);

      expect(result).toEqual({
        type: ['json'],
        htmlOptions: {
          reportHtmlName: undefined,
        },
        jsonOptions: {
          fileName: 'rsdoctor-data.json',
          sections: {
            moduleGraph: true,
            chunkGraph: true,
            rules: true,
          },
        },
      });
    });

    it('should handle JSON type with custom sections', () => {
      const output: Config.BriefModeConfig = {
        options: {
          type: ['json'],
          jsonOptions: {
            sections: {
              moduleGraph: false,
              chunkGraph: true,
              rules: false,
            },
          },
        },
      };

      const result = processBriefHtmlModeConfig(output, undefined);

      expect(result).toEqual({
        type: ['json'],
        htmlOptions: {
          reportHtmlName: undefined,
        },
        jsonOptions: {
          sections: {
            moduleGraph: false,
            chunkGraph: true,
            rules: false,
          },
        },
      });
    });

    it('should handle both HTML and JSON types', () => {
      const output: Config.BriefModeConfig = {
        options: {
          type: ['html', 'json'],
          htmlOptions: {
            reportHtmlName: 'report.html',
          },
          jsonOptions: {
            sections: {
              moduleGraph: true,
              chunkGraph: true,
              rules: true,
            },
          },
        },
      };
      const brief: Config.BriefConfig = {
        reportHtmlName: 'fallback.html',
      };

      const result = processBriefHtmlModeConfig(output, brief);

      expect(result).toEqual({
        type: ['html', 'json'],
        htmlOptions: {
          reportHtmlName: 'report.html', // Should use output.options.htmlOptions first
        },
        jsonOptions: {
          sections: {
            moduleGraph: true,
            chunkGraph: true,
            rules: true,
          },
        },
      });
    });

    it('should prioritize output.options over brief parameter', () => {
      const output: Config.BriefModeConfig = {
        options: {
          type: ['html'],
          htmlOptions: {
            reportHtmlName: 'priority.html',
          },
        },
      };
      const brief: Config.BriefConfig = {
        reportHtmlName: 'fallback.html',
      };

      const result = processBriefHtmlModeConfig(output, brief);

      expect(result.htmlOptions?.reportHtmlName).toBe('priority.html');
    });

    it('should fallback to brief parameter when output.options is not provided', () => {
      const output: Config.BriefModeConfig = {
        options: {
          type: ['html'],
        },
      };
      const brief: Config.BriefConfig = {
        reportHtmlName: 'fallback.html',
      };

      const result = processBriefHtmlModeConfig(output, brief);

      expect(result.htmlOptions?.reportHtmlName).toBe('fallback.html');
    });
  });
});
