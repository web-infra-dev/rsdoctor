import { TranslationOutlined } from '@ant-design/icons';
import { Client } from '@rsdoctor/shared/types';
import { Button, Col, Dropdown, Layout, Row, Switch } from 'antd';
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Language, Theme } from '../../constants';
import { useI18n, useTheme } from '../../utils';
import { OverlayAlertsWithButton } from '../Alerts';
import { BuilderSelect } from './builder-select';
import { Menus } from './menus';
import styles from './header.module.scss';

const logoLight = 'https://assets.rspack.rs/rsdoctor/rsdoctor-title-logo.png';
const logoDark = 'https://assets.rspack.rs/rsdoctor/rsdoctor-logo-dark.png';

export interface HeaderProps {
  enableRoutes?: string[];
}

export const Header: React.FC<HeaderProps> = ({ enableRoutes }) => {
  const { i18n } = useI18n();

  const navigate = useNavigate();
  const { setTheme, isLight, isDark } = useTheme();
  const languages = [
    { value: Language.Cn, label: '中文' },
    { value: Language.En, label: 'English' },
  ];

  return (
    <Layout.Header className={styles.root}>
      <Row className={styles.innerRoot}>
        <Col className={styles.leftCol}>
          <div className={styles.leftColInner}>
            <button
              type="button"
              className={styles.logoButton}
              aria-label="Go to Rsdoctor home"
              onClick={() => {
                if (
                  location.hash.includes(
                    Client.RsdoctorClientRoutes.Uploader,
                  ) &&
                  location.pathname.includes('/preview')
                ) {
                  location.href = 'http://rsdoctor.rs';
                } else {
                  navigate(Client.RsdoctorClientRoutes.Home);
                }
              }}
            >
              <img
                width="1604"
                height="380"
                src={isLight ? logoLight : logoDark}
                className={styles.rsdoctorLogo}
                alt="Rsdoctor"
                draggable={false}
              />
            </button>
            <BuilderSelect />
          </div>
        </Col>
        <Menus
          key={enableRoutes ? JSON.stringify(enableRoutes) : 'default'}
          style={{ transition: 'none' }}
        />

        <Col className={styles.rightCol}>
          <Row className={styles.rightColInner}>
            <Col>
              <OverlayAlertsWithButton />
            </Col>

            <Col>
              <Switch
                className={styles.themeSwitch}
                aria-label={isDark ? 'Use light theme' : 'Use dark theme'}
                checkedChildren="🌛"
                unCheckedChildren="🌞"
                checked={isDark}
                onChange={(checked) => {
                  setTheme(checked ? Theme.Dark : Theme.Light);
                }}
              />
            </Col>
            <Col>
              <Dropdown
                overlayStyle={{ zIndex: 1000 }}
                menu={{
                  items: languages.map((e) => ({
                    label: e.label,
                    key: e.value,
                    onClick() {
                      i18n.changeLanguage(e.value);
                    },
                  })),
                  selectedKeys: [i18n.language],
                }}
              >
                <Button
                  type="text"
                  className={styles.utilityButton}
                  aria-label="Change language"
                  icon={<TranslationOutlined />}
                />
              </Dropdown>
            </Col>
          </Row>
        </Col>
      </Row>
    </Layout.Header>
  );
};
