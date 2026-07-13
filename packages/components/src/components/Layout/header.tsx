import { TranslationOutlined } from '@ant-design/icons';
import { Col, Dropdown, Layout, Row, Switch } from 'antd';
import React from 'react';
import { Language, Theme } from '../../constants';
import { useI18n, useTheme } from '../../utils';
import { OverlayAlertsWithButton } from '../Alerts';
import { BuilderSelect } from './builder-select';
import { Menus } from './menus';
import { Client } from '@rsdoctor/types';
import { useNavigate } from 'react-router-dom';
import styles from './header.module.scss';
import logoDark from './rsdoctor-title-logo-dark.png';
const logoLight = 'https://assets.rspack.rs/rsdoctor/rsdoctor-title-logo.png';

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
            <img
              width="1604"
              height="380"
              src={isLight ? logoLight : logoDark}
              className={styles.rsdoctorLogo}
              alt="logo"
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
            />
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
                className="header-switch"
                checkedChildren="🌛"
                unCheckedChildren="🌞"
                checked={isDark}
                onChange={(checked) => {
                  setTheme(checked ? Theme.Dark : Theme.Light);
                }}
                style={{
                  border: `1px solid ${isLight ? '#ddd' : '#fff'}`,
                  background: isLight ? '#eee' : '#141414',
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
                <TranslationOutlined className={styles.translationsIcon} />
              </Dropdown>
            </Col>
          </Row>
        </Col>
      </Row>
    </Layout.Header>
  );
};
