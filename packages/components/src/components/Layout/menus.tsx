import {
  BarChartOutlined,
  MenuOutlined
} from '@ant-design/icons';
import { Manifest, SDK } from '@rsdoctor/types';
import { Col, Grid, Menu, MenuProps } from 'antd';
import { includes } from 'lodash-es';
import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Size } from '../../constants';
import * as OverallConstants from '../../pages/Overall/constants';
import { useI18n } from '../../utils';
import { withServerAPI } from '../Manifest';

const BuilderSwitchName = 'builder-switcher';

const MenusBase: React.FC<{ style?: React.CSSProperties; routes: Manifest.DoctorManifestClientRoutes[] }> = (
  props,
) => {
  const { t } = useI18n();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { routes: enableRoutes } = props;
  const iconStyle: React.CSSProperties = {
    fontSize: 16,
  };

  const items: MenuProps['items'] = [];

  const { xxl } = Grid.useBreakpoint();

  console.log('enableRoutes: ', enableRoutes);

  if (includes(enableRoutes, Manifest.DoctorManifestClientRoutes.Overall)) {
    items.push({
      label: t(OverallConstants.name),
      key: OverallConstants.route,
      icon: <BarChartOutlined style={iconStyle} />,
      children: [],
      onTitleClick(e) {
        navigate(e.key);
      },
    });
  }

  const MenuComponent = (
    <Menu
      items={items}
      mode="horizontal"
      key={enableRoutes.join('')}
      onClick={(e) => {
        if (!e.keyPath.includes(BuilderSwitchName)) {
          navigate(e.key);
        }
      }}
      overflowedIndicator={<MenuOutlined />}
      style={{ height: Size.NavBarHeight, lineHeight: `${Size.NavBarHeight}px`, ...props.style }}
      // defaultSelectedKeys={[pathname === '/' ? OverallConstants.route : pathname]}
      selectedKeys={[pathname === '/' ? OverallConstants.route : pathname]}
    />
  );

  if (items.length <= 2) {
    return <Col>{MenuComponent}</Col>;
  }

  if (xxl) {
    return <Col>{MenuComponent}</Col>;
  }

  return (
    <Col xs={{ span: 3 }} md={{ span: 6 }} lg={{ span: 10 }} xl={{ span: 11 }}>
      {MenuComponent}
    </Col>
  );
};

export const Menus = withServerAPI({
  api: SDK.ServerAPI.API.GetClientRoutes,
  responsePropName: 'routes',
  Component: MenusBase,
  fallbackComponent: () => null,
});
