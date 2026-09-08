import { BlogBackground } from '@rstackjs/doc-ui/blog-background';
import { BlogList as BaseBlogList } from '@rstackjs/doc-ui/blog-list';
import { useSyncExternalStore } from 'react';
import { posts } from './posts';
import styles from './index.module.scss';

const sections = [
  { path: 'release/', en: 'Release Notes', zh: 'Release 公告' },
  { path: 'topic/', en: 'Topics', zh: '专题' },
];

const reducedMotionQuery = '(prefers-reduced-motion: reduce)';
const subscribeToMotionPreference = (onChange: () => void) => {
  const media = window.matchMedia(reducedMotionQuery);
  media.addEventListener('change', onChange);
  return () => media.removeEventListener('change', onChange);
};
const getReducedMotion = () => window.matchMedia(reducedMotionQuery).matches;
const getServerReducedMotion = () => true;

export function BlogList({ lang }: { lang: 'en' | 'zh' }) {
  const reducedMotion = useSyncExternalStore(
    subscribeToMotionPreference,
    getReducedMotion,
    getServerReducedMotion,
  );
  const dateFormatter = (date: string) =>
    new Intl.DateTimeFormat(lang === 'zh' ? 'zh-CN' : 'en-US', {
      year: 'numeric',
      month: 'long',
      ...(date.length > 7 ? { day: 'numeric' as const } : {}),
      timeZone: 'UTC',
    }).format(new Date(date));

  return (
    <>
      <BlogBackground showBackground={!reducedMotion} />
      {sections.map((section) => (
        <section key={section.path} className={styles.section}>
          <h2>{section[lang]}</h2>
          <BaseBlogList
            className={styles.list}
            lang={lang}
            interactive={!reducedMotion}
            hideDocLayoutSidebarAndOutline={false}
            posts={posts
              .filter((post) => post.path.startsWith(section.path))
              .map((post) => ({
                id: post.path,
                authors: post.authors,
                href: `${lang === 'zh' ? '/zh' : ''}/blog/${post.path}`,
                title: (
                  <>
                    {post.date ? (
                      <time className={styles.meta} dateTime={post.date}>
                        {dateFormatter(post.date)}
                      </time>
                    ) : (
                      <span className={styles.meta}>
                        {lang === 'zh' ? '专题' : 'Topic'}
                      </span>
                    )}
                    <h3 className={styles.title}>{post[lang].title}</h3>
                  </>
                ),
                description: post[lang].description,
              }))}
          />
        </section>
      ))}
    </>
  );
}
