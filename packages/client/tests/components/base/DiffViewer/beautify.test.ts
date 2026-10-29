import { describe, expect, it } from 'rstack/test';
import { beautifyJavaScript } from 'src/components/base/DiffViewer/beautify';

describe('beautifyJavaScript', () => {
  it('expands minified JavaScript for display', () => {
    expect(
      beautifyJavaScript(
        "export const renderGreeting=(name)=>{const message='Hello '+name;return message}",
      ),
    ).toBe(
      "export const renderGreeting = (name) => {\n  const message = 'Hello ' + name;\n  return message\n}\n",
    );
  });

  it('preserves strings, template literals, and comments', () => {
    expect(
      beautifyJavaScript(
        'const message=`hello ${`user ${name}`}`;// keep {; }\nconsole.log(message)',
      ),
    ).toBe(
      'const message = `hello ${`user ${name}`}`;\n// keep {; }\nconsole.log(message)\n',
    );
  });

  it('keeps invalid input unchanged', () => {
    const source = "const message = 'unclosed";

    expect(beautifyJavaScript(source)).toBe(source);
  });
});
