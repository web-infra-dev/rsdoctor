import { containerStyle } from '@rstackjs/doc-ui/section-style';
import { ToolStack as BaseToolStack } from '@rstackjs/doc-ui/tool-stack';
import { useLang } from '@rspress/core/runtime';

export function ToolStack() {
  const lang = useLang();
  return (
    <section className={containerStyle}>
      <BaseToolStack lang={lang} />
    </section>
  );
}
