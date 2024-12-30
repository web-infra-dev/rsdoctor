// define function callings
export const getDependencyVersionsFromManifest = {
  type: 'function' as const,
  function: {
    name: 'get_dependency_versions_from_manifest',
    description:
      'Search and return the dependencies and their versions from the manifest file',
    parameters: {
      type: 'object',
      properties: {
        name: {
          description: 'Dependency name you get from manifest file',
          type: 'string',
        },
        versions: {
          description:
            'All version numbers of the name dependency obtained in the manifest.',
          type: 'array',
          items: {
            type: 'string',
          },
        },
      },
      required: ['name', 'versions'],
      additionalProperties: false,
    },
  },
};

export const findDependencyImportFilePath = {
  type: 'function' as const,
  function: {
    name: 'find_dependency_import_file_path',
    description:
      'Search and return the dependencies and their be imported path from the manifest file',
    parameters: {
      type: 'object',
      properties: {
        name: {
          description: 'Dependency name you get from manifest file',
          type: 'string',
        },
        paths: {
          description:
            'All import paths of the name dependency obtained in the manifest.',
          type: 'array',
          items: {
            type: 'string',
          },
        },
      },
      required: ['name', 'paths'],
      additionalProperties: false,
    },
  },
};
