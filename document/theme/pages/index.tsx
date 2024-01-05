import { Hero, HomeHero } from '../components/HomeHero';
import { HomeFeature, Feature } from '../components/HomeFeatures';
import {  usePageData } from 'rspress/runtime';
import { HomeFooter } from 'theme/components/HomeFooter';


export function HomeLayout() {
  const { page } = usePageData();
  const { frontmatter } = page;
  return (
    <div>
      {/* Landing Page */}
      <div
        className="relative dark:border-dark-50"
        style={{
          background: 'var(--rp-home-bg)',
          minHeight: 'calc(40rem - var(--rp-nav-height))',
          paddingBottom: '24px',
        }}
      >
        <div className="pt-14 pb-12">
          <HomeHero hero={frontmatter.hero as Hero} />
          <HomeFeature features={frontmatter.features as Feature[]} />
        </div>
      </div>
      <HomeFooter />
    </div>
  );
}
