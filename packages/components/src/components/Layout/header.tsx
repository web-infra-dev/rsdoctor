import { TranslationOutlined } from '@ant-design/icons';
import { Col, Dropdown, Layout, Row, Typography } from 'antd';
import React from 'react';
import { Language, Size } from '../../constants';
import { useI18n, useTheme } from '../../utils';
import { OverlayAlertsWithButton } from '../Alerts';
import { BuilderSelect } from './builder-select';
import { Menus } from './menus';
import './header.sass';

export const Header: React.FC = () => {
  const { i18n } = useI18n();

  const { isLight } = useTheme();
  const iconStyle: React.CSSProperties = {
    display: 'inline-block',
    fontSize: 20,
    textAlign: 'center',
    verticalAlign: 'middle',
    cursor: 'pointer',
    width: 30,
    transition: 'all 0.3s ease',
  };
  const languages = [
    { value: Language.Cn, label: '中文' },
    { value: Language.En, label: 'English' },
  ];

  return (
    <Layout.Header
      style={{
        height: Size.NavBarHeight,
        padding: 0,
        paddingLeft: Size.BasePadding,
        paddingRight: Size.BasePadding,
        position: 'fixed',
        zIndex: 999,
        width: '100%',
        backgroundColor: isLight ? '#fff' : '#141414',
        transition: 'none',
      }}
    >
      <Row
        justify="space-between"
        align="middle"
        style={{ height: Size.NavBarHeight }}
        wrap={false}
      >
        <Col
          style={{
            height: Size.NavBarHeight,
            lineHeight: `${Size.NavBarHeight + 2}px`,
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              height: '100%',
            }}
          >
            <img
              style={{ height: 30 }}
              src={
                'https://assets.rspack.dev/rsdoctor/rsdoctor-logo-960x960.png'
              }
              className="rsdoctor-logo"
              alt="logo"
            />
            <Typography.Text
              style={{
                color: 'inherit',
                fontSize: 18,
                marginLeft: 4,
                marginTop: 8,
              }}
            >
              Rsdoctor
            </Typography.Text>
            <BuilderSelect />
          </div>
        </Col>
        <Col flex={1}>
          <Row
            align="middle"
            justify="end"
            style={{ height: Size.NavBarHeight }}
            wrap={false}
            gutter={[Size.BasePadding / 3, 0]}
          >
            <Col>
              <OverlayAlertsWithButton />
            </Col>
            <Menus style={{ transition: 'none' }} />

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
                <TranslationOutlined
                  className="header-icon"
                  style={iconStyle}
                />
              </Dropdown>
            </Col>
          </Row>
        </Col>
      </Row>
    </Layout.Header>
  );
};
