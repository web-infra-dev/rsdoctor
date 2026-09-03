import { Client } from '@rsdoctor/shared/types';
import { Col, Layout, Row, Switch } from 'antd';
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Theme } from '../../constants';
import { useTheme } from '../../utils';
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
  const navigate = useNavigate();
  const { setTheme, isLight, isDark } = useTheme();

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
          </Row>
        </Col>
      </Row>
    </Layout.Header>
  );
};
