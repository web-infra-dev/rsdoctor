import { TranslationOutlined } from '@ant-design/icons';
import { Col, Dropdown, Layout, Row } from 'antd';
import React from 'react';
import { Language } from '../../constants';
import { useI18n, useTheme } from '../../utils';
import { OverlayAlertsWithButton } from '../Alerts';
import { BuilderSelect } from './builder-select';
import { Menus } from './menus';
import { Client } from '@rsdoctor/types';
import { useNavigate } from 'react-router-dom';
import styles from './header.module.scss';
import clsx from 'clsx';

export interface HeaderProps {
  enableRoutes?: string[];
}

export const Header: React.FC<HeaderProps> = ({ enableRoutes }) => {
  const { i18n } = useI18n();

  const navigate = useNavigate();
  const { isDark } = useTheme();
  const languages = [
    { value: Language.Cn, label: '中文' },
    { value: Language.En, label: 'English' },
  ];

  return (
    <Layout.Header className={clsx(styles.root, isDark && styles.rootDark)}>
      <Row className={styles.innerRoot}>
        <Col className={styles.leftCol}>
          <div className={styles.leftColInner}>
            <img
              width="1604"
              height="380"
              src="https://assets.rspack.rs/rsdoctor/rsdoctor-title-logo.png"
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

            {/* <Col> TODO:  dark mode has some error need fix.
              <Switch
                className="header-switch"
                checkedChildren="🌛"
                unCheckedChildren="🌞"
                checked={isDark}
                onChange={(checked) => {
                  setTheme(checked ? Theme.Dark : Theme.Light);
                }}
                style={{ border: `1px solid ${isLight ? '#ddd' : '#fff'}`, background: isLight ? '#eee' : '#141414' }}
              />
            </Col> */}
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
