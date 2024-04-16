import {
  ApiOutlined,
  BarChartOutlined,
  FolderViewOutlined,
  MenuOutlined,
  MonitorOutlined,
  NodeIndexOutlined,
  ToolOutlined,
} from '@ant-design/icons';
import { Manifest, SDK } from '@rsdoctor/types';
import { Col, Menu, MenuProps, Typography } from 'antd';
import { includes } from 'lodash-es';
import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import WebpackIcon from 'src/common/imgs/webpack.svg';
import { Size } from '../../constants';
import * as OverallConstants from '../../pages/Overall/constants';
import { useI18n, hasBundle, hasCompile } from '../../utils';
import { withServerAPI } from '../Manifest';
import {
  BundleSize,
  LoaderFiles,
  PluginsAnalyze,
  ModuleResolve,
  LoaderTimeline,
} from 'src/pages';
import { CompileName } from './constants';

const BuilderSwitchName = 'builder-switcher';

const MenusBase: React.FC<{
  style?: React.CSSProperties;
  routes: Manifest.RsdoctorManifestClientRoutes[];
}> = (props) => {
  const { t } = useI18n();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { routes: enableRoutes } = props;

  const iconStyle: React.CSSProperties = {
    fontSize: 16,
  };
  const customIconStyle: React.CSSProperties = {
    ...iconStyle,
    transform: 'translateY(-2px)',
  };

  const items: MenuProps['items'] = [];

  console.log('enableRoutes: ', enableRoutes);

  if (includes(enableRoutes, Manifest.RsdoctorManifestClientRoutes.Overall)) {
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

  if (hasCompile(enableRoutes)) {
    items.push({
      label: t(CompileName),
      key: CompileName,
      icon: <ToolOutlined style={iconStyle} />,
      children: [
        includes(
          enableRoutes,
          Manifest.RsdoctorManifestClientRoutes.WebpackLoaders,
        ) && {
          label: (
            <Typography.Text style={{ marginRight: 8 }}>
              {t(LoaderFiles.name)}
            </Typography.Text>
          ),
          key: LoaderFiles.route,
          icon: (
            <img src={WebpackIcon} alt="" style={{ ...iconStyle, width: 16 }} />
          ),
          children: [
            {
              label: t(LoaderTimeline.name),
              key: LoaderTimeline.route,
              icon: <BarChartOutlined style={iconStyle} />,
            },
            {
              label: t(LoaderFiles.name),
              key: LoaderFiles.route,
              icon: <MonitorOutlined style={iconStyle} />,
            },
          ],
        },
        includes(
          enableRoutes,
          Manifest.RsdoctorManifestClientRoutes.ModuleResolve,
        ) && {
          label: t(ModuleResolve.name),
          key: ModuleResolve.route,
          icon: <NodeIndexOutlined style={iconStyle} />,
        },
        includes(
          enableRoutes,
          Manifest.RsdoctorManifestClientRoutes.WebpackPlugins,
        ) && {
          label: t(PluginsAnalyze.name),
          key: PluginsAnalyze.route,
          icon: <ApiOutlined style={iconStyle} />,
        },
      ].filter((e) => Boolean(e)) as MenuProps['items'],
    });
  }

  if (hasBundle(enableRoutes)) {
    items.push({
      label: t(BundleSize.name),
      key: BundleSize.name,
      icon: <span style={customIconStyle}>📦</span>,
      children: [
        includes(
          enableRoutes,
          Manifest.RsdoctorManifestClientRoutes.BundleSize,
        ) && {
          label: t(BundleSize.name),
          key: BundleSize.route,
          icon: <FolderViewOutlined style={iconStyle} />,
        },
      ].filter((e) => Boolean(e)) as MenuProps['items'],
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
      style={{
        height: Size.NavBarHeight,
        lineHeight: `${Size.NavBarHeight}px`,
        minWidth: 0,
        justifyContent: 'flex-end',
        ...props.style,
      }}
      selectedKeys={[pathname === '/' ? OverallConstants.route : pathname]}
    />
  );

  return (
    <Col
      xs={{ span: 3 }}
      md={{ span: 6 }}
      lg={{ span: 10 }}
      xl={{ span: 11 }}
      xxl={{ span: 12 }}
    >
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
