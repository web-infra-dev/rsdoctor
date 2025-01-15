import z from 'zod';

export const SizeSchema = z.object({
  sourceSize: z.number(),
  transformedSize: z.number(),
  parsedSize: z.number(),
});

export const DependenciesSchema = z.object({
  name: z.string(),
  root: z.string(),
  version: z.string(),
  size: SizeSchema,
});
