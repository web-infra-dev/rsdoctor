type TokenKind = 'comment' | 'literal' | 'punctuation' | 'word';

interface Token {
  kind: TokenKind;
  value: string;
}

const controlWords = new Set(['catch', 'for', 'if', 'switch', 'while', 'with']);
const regexPrefixWords = new Set([
  'case',
  'delete',
  'do',
  'else',
  'in',
  'instanceof',
  'new',
  'of',
  'return',
  'throw',
  'typeof',
  'void',
  'yield',
]);
const regexPrefixPunctuation = new Set([
  '!',
  '!=',
  '!==',
  '%',
  '%=',
  '&',
  '&&',
  '&&=',
  '(',
  '*',
  '**',
  '**=',
  '*=',
  '+',
  '+=',
  ',',
  '-',
  '-=',
  ':',
  ';',
  '<',
  '<<',
  '<<=',
  '<=',
  '=',
  '==',
  '===',
  '=>',
  '>',
  '>=',
  '>>',
  '>>=',
  '>>>',
  '>>>=',
  '?',
  '??',
  '??=',
  '[',
  '^',
  '^=',
  '{',
  '|',
  '||',
  '||=',
  '|=',
  '~',
]);
const operatorsWithSpaces = new Set([
  '!=',
  '!==',
  '%',
  '%=',
  '&',
  '&&',
  '&&=',
  '*',
  '**',
  '**=',
  '*=',
  '+',
  '+=',
  '-',
  '-=',
  '/',
  '/=',
  '<',
  '<<',
  '<<=',
  '<=',
  '=',
  '==',
  '===',
  '=>',
  '>',
  '>=',
  '>>',
  '>>=',
  '>>>',
  '>>>=',
  '?',
  '??',
  '??=',
  '^',
  '^=',
  '|',
  '||',
  '||=',
  '|=',
]);
const punctuation = [
  '>>>=',
  '===',
  '!==',
  '>>>',
  '**=',
  '&&=',
  '||=',
  '??=',
  '<<=',
  '>>=',
  '...',
  '=>',
  '==',
  '!=',
  '<=',
  '>=',
  '++',
  '--',
  '&&',
  '||',
  '??',
  '+=',
  '-=',
  '*=',
  '/=',
  '%=',
  '&=',
  '|=',
  '^=',
  '**',
  '<<',
  '>>',
  '?.',
];

function isIdentifierStart(char: string) {
  return /[A-Za-z_$]/.test(char);
}

function isIdentifierPart(char: string) {
  return /[A-Za-z0-9_$]/.test(char);
}

function readQuotedString(source: string, start: number) {
  const quote = source[start];
  let index = start + 1;

  while (index < source.length) {
    if (source[index] === '\\') {
      index += 2;
    } else if (source[index] === quote) {
      return index + 1;
    } else if (source[index] === '\n' || source[index] === '\r') {
      return undefined;
    } else {
      index += 1;
    }
  }
}

function readTemplateLiteral(source: string, start: number) {
  let index = start + 1;

  while (index < source.length) {
    if (source[index] === '\\') {
      index += 2;
    } else if (source[index] === '`') {
      return index + 1;
    } else if (source[index] === '$' && source[index + 1] === '{') {
      const end = readTemplateExpression(source, index + 2);
      if (!end) return undefined;
      index = end;
    } else {
      index += 1;
    }
  }
}

function readTemplateExpression(source: string, start: number) {
  let braces = 1;
  let index = start;

  while (index < source.length) {
    const char = source[index];

    if (char === '"' || char === "'") {
      const end = readQuotedString(source, index);
      if (!end) return undefined;
      index = end;
    } else if (char === '`') {
      const end = readTemplateLiteral(source, index);
      if (!end) return undefined;
      index = end;
    } else if (char === '/' && source[index + 1] === '/') {
      const end = source.indexOf('\n', index);
      index = end === -1 ? source.length : end;
    } else if (char === '/' && source[index + 1] === '*') {
      const end = source.indexOf('*/', index + 2);
      if (end === -1) return undefined;
      index = end + 2;
    } else if (char === '{') {
      braces += 1;
      index += 1;
    } else if (char === '}') {
      braces -= 1;
      index += 1;
      if (braces === 0) return index;
    } else {
      index += 1;
    }
  }
}

function readRegexLiteral(source: string, start: number) {
  let index = start + 1;
  let inCharacterClass = false;

  while (index < source.length) {
    const char = source[index];

    if (char === '\\') {
      index += 2;
    } else if (char === '[') {
      inCharacterClass = true;
      index += 1;
    } else if (char === ']') {
      inCharacterClass = false;
      index += 1;
    } else if (char === '/' && !inCharacterClass) {
      index += 1;
      while (/[A-Za-z]/.test(source[index] || '')) index += 1;
      return index;
    } else if (char === '\n' || char === '\r') {
      return undefined;
    } else {
      index += 1;
    }
  }
}

function canStartRegex(previous?: Token) {
  if (!previous) return true;
  if (previous.kind === 'word') return regexPrefixWords.has(previous.value);
  return (
    previous.kind === 'punctuation' &&
    regexPrefixPunctuation.has(previous.value)
  );
}

function tokenize(source: string): Token[] | undefined {
  const tokens: Token[] = [];
  const push = (kind: TokenKind, value: string) => tokens.push({ kind, value });
  let index = 0;

  while (index < source.length) {
    const char = source[index];

    if (/\s/.test(char)) {
      index += 1;
      continue;
    }

    if (char === '"' || char === "'") {
      const end = readQuotedString(source, index);
      if (!end) return undefined;
      push('literal', source.slice(index, end));
      index = end;
      continue;
    }

    if (char === '`') {
      const end = readTemplateLiteral(source, index);
      if (!end) return undefined;
      push('literal', source.slice(index, end));
      index = end;
      continue;
    }

    if (char === '/' && source[index + 1] === '/') {
      const end = source.indexOf('\n', index);
      const commentEnd = end === -1 ? source.length : end;
      push('comment', source.slice(index, commentEnd));
      index = commentEnd;
      continue;
    }

    if (char === '/' && source[index + 1] === '*') {
      const end = source.indexOf('*/', index + 2);
      if (end === -1) return undefined;
      push('comment', source.slice(index, end + 2));
      index = end + 2;
      continue;
    }

    if (char === '/' && canStartRegex(tokens.at(-1))) {
      const end = readRegexLiteral(source, index);
      if (!end) return undefined;
      push('literal', source.slice(index, end));
      index = end;
      continue;
    }

    if (isIdentifierStart(char)) {
      const start = index;
      index += 1;
      while (isIdentifierPart(source[index] || '')) index += 1;
      push('word', source.slice(start, index));
      continue;
    }

    if (/\d/.test(char)) {
      const start = index;
      index += 1;
      while (/[\w.]/.test(source[index] || '')) index += 1;
      push('literal', source.slice(start, index));
      continue;
    }

    const token = punctuation.find((value) => source.startsWith(value, index));
    push('punctuation', token || char);
    index += (token || char).length;
  }

  const pairs: Record<string, string> = { '(': ')', '[': ']', '{': '}' };
  const stack: string[] = [];
  for (const token of tokens) {
    if (pairs[token.value]) stack.push(token.value);
    if (Object.values(pairs).includes(token.value)) {
      const opening = stack.pop();
      if (!opening || pairs[opening] !== token.value) return undefined;
    }
  }

  return stack.length === 0 ? tokens : undefined;
}

function print(tokens: Token[]) {
  let indent = 0;
  let parenDepth = 0;
  let atLineStart = true;
  let output = '';

  const write = (value: string) => {
    if (atLineStart) {
      output += '  '.repeat(indent);
      atLineStart = false;
    }
    output += value;
  };
  const space = () => {
    if (!atLineStart && !/\s$/.test(output)) output += ' ';
  };
  const newLine = () => {
    output = output.trimEnd();
    if (!atLineStart) output += '\n';
    atLineStart = true;
  };
  const previous = (index: number) => tokens[index - 1];
  const next = (index: number) => tokens[index + 1];

  tokens.forEach((token, index) => {
    const previousToken = previous(index);

    if (token.kind === 'comment') {
      if (!atLineStart) space();
      write(token.value);
      newLine();
      return;
    }

    if (token.kind === 'word' || token.kind === 'literal') {
      if (
        previousToken &&
        (previousToken.kind === 'word' || previousToken.kind === 'literal')
      ) {
        space();
      }
      write(token.value);
      return;
    }

    switch (token.value) {
      case '{':
        if (
          previousToken &&
          !['(', '[', '.', '?.'].includes(previousToken.value)
        ) {
          space();
        }
        write(token.value);
        indent += 1;
        newLine();
        break;
      case '}': {
        indent -= 1;
        newLine();
        write(token.value);
        const nextToken = next(index);
        if (nextToken?.value === 'else' || nextToken?.value === 'catch') {
          space();
        } else if (
          ![')', ']', ',', ';', '}'].includes(nextToken?.value || '')
        ) {
          newLine();
        }
        break;
      }
      case ';':
        write(token.value);
        newLine();
        break;
      case ',':
        write(token.value);
        if (parenDepth > 0) space();
        else newLine();
        break;
      case '(':
        if (
          previousToken?.kind === 'word' &&
          controlWords.has(previousToken.value)
        ) {
          space();
        }
        write(token.value);
        parenDepth += 1;
        break;
      case ')':
        write(token.value);
        parenDepth -= 1;
        break;
      case '[':
      case ']':
      case '.':
      case '?.':
      case '...':
      case '!':
      case '~':
      case '++':
      case '--':
        write(token.value);
        break;
      case ':':
        write(token.value);
        space();
        break;
      default:
        if (operatorsWithSpaces.has(token.value)) {
          space();
          write(token.value);
          space();
        } else {
          write(token.value);
        }
    }
  });

  return `${output.trimEnd()}\n`;
}

/**
 * Expands minified JavaScript for display without parsing or rewriting tokens.
 * Invalid or unsupported input is returned unchanged.
 */
export function beautifyJavaScript(source: string) {
  const tokens = tokenize(source);
  return tokens ? print(tokens) : source;
}
