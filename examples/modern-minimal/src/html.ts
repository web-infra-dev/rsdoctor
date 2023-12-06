import Parser from 'htmlparser2';

export function getHtmlText(code: string) {
  let context = '';

  const parser = new Parser.Parser({
    ontext(data) {
      context += data;
    },
  });

  parser.write(code);

  return context;
}
