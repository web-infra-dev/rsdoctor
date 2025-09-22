import { Hero as BaseHero } from '@rstack-dev/doc-ui/hero';
import { useI18n, useNavigate } from '@rspress/core/runtime';
import { useI18nUrl } from './utils';
import './Hero.module.scss';

export function Hero() {
  const navigate = useNavigate();
  const tUrl = useI18nUrl();
  const t = useI18n<typeof import('i18n')>();
  const onClickGetStarted = () => {
    navigate(tUrl('/guide/start/quick-start'));
  };
  return (
    <BaseHero
      showStars
      onClickGetStarted={onClickGetStarted}
      title="Rsdoctor"
      subTitle={t('subtitle')}
      description={t('slogan')}
      logoUrl="https://assets.rspack.rs/rsdoctor/rsdoctor-logo-960x960.png"
      getStartedButtonText={t('quickStart')}
      githubURL="https://github.com/web-infra-dev/rsdoctor"
    />
  );
}
