import {
  containerStyle,
  innerContainerStyle,
} from '@rstackjs/doc-ui/section-style';
import { useI18n } from '@rspress/core/runtime';
import { HomeFeature } from '@rspress/core/theme-original';
import './Features.module.scss';

export function Features() {
  const t = useI18n<typeof import('i18n')>();
  const features = [
    {
      title: t('frameworkAgnostic'),
      details: t('frameworkAgnosticDesc'),
      icon: '🛠️',
    },
    {
      title: t('buildTime'),
      details: t('buildTimeDesc'),
      icon: '🚀',
    },
    {
      title: t('buildActions'),
      details: t('buildActionsDesc'),
      icon: '🦄',
    },
    {
      title: t('bundleAnalysis'),
      details: t('bundleAnalysisDesc'),
      icon: '🎯',
    },
    {
      title: t('bundleDiff'),
      details: t('bundleDiffDesc'),
      icon: '🎨',
    },
    {
      title: t('buildScan'),
      details: t('buildScanDesc'),
      icon: '🔍',
    },
  ];
  return (
    <section className={containerStyle}>
      <div className={innerContainerStyle}>
        <HomeFeature features={features} />
      </div>
    </section>
  );
}
