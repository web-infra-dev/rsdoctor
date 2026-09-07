import { BlogBackground } from '@rstackjs/doc-ui/blog-background';
import { BlogList as BaseBlogList } from '@rstackjs/doc-ui/blog-list';
import { useSyncExternalStore } from 'react';
import { posts } from './posts';
import styles from './index.module.scss';

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
      <BaseBlogList
        className={styles.list}
        lang={lang}
        interactive={!reducedMotion}
        hideDocLayoutSidebarAndOutline={false}
        posts={posts.map((post) => ({
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
              <h2 className={styles.title}>{post[lang].title}</h2>
            </>
          ),
          description: post[lang].description,
        }))}
      />
    </>
  );
}
