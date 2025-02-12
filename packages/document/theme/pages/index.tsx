import { BackgroundImage } from '@rstack-dev/doc-ui/background-image';
import { CopyRight } from '../components/Copyright';
import { Hero } from '../components/Hero';
import { Features } from '../components/Features';
import { ToolStack } from '../components/ToolStack';

export function HomeLayout() {
  return (
    <div style={{ position: 'relative' }}>
      <BackgroundImage />
      <Hero />
      <Features />
      <ToolStack />
      <CopyRight />
    </div>
  );
}
