import Parser from 'htmlparser2';
import svg from "./images/file.svg";
import { createImageElement }  from './utils/utils';


export function getHtmlText(code: string) {
  let context = '';

  const parser = new Parser.Parser({
    ontext(data) {
      context += data;
    },
  });
  [svg].forEach(src => {
    createImageElement(src.split(".").pop(), src);
  });
  parser.write(code);

  return context;
}