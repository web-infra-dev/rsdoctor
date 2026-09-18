export async function formatCode(code: string, language: string) {
  if (!['javascript', 'typescript'].includes(language)) {
    return code;
  }

  try {
    const [prettier, babel, estree, typescript] = await Promise.all([
      import('prettier/standalone'),
      import('prettier/plugins/babel'),
      import('prettier/plugins/estree'),
      import('prettier/plugins/typescript'),
    ]);

    return await prettier.format(code, {
      parser: language === 'typescript' ? 'typescript' : 'babel',
      plugins: [babel, estree, typescript],
    });
  } catch {
    return code;
  }
}
