import {
  ApiOutlined,
  FolderViewOutlined,
  MenuOutlined,
  MonitorOutlined,
  NodeIndexOutlined,
} from '@ant-design/icons';
import { Manifest, SDK } from '@rsdoctor/types';
import { Menu, MenuProps } from 'antd';
import { includes } from 'lodash-es';
import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import CompileIcon from './compile-icon.svg';
import BundleSizeIcon from './bundle-size-icon.svg';
import OverallIcon from './overall-icon.svg';
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
  TreeShaking,
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
  const items: MenuProps['items'] = [];

  if (includes(enableRoutes, Manifest.RsdoctorManifestClientRoutes.Overall)) {
    items.push({
      label: t(OverallConstants.name),
      key: OverallConstants.route,
      icon: <OverallIcon />,
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
      icon: <CompileIcon />,
      children: [
        includes(
          enableRoutes,
          Manifest.RsdoctorManifestClientRoutes.WebpackLoaders,
        ) && {
          label: t(LoaderTimeline.name),
          key: LoaderTimeline.route,
          icon: <CompileIcon />,
        },
        includes(
          enableRoutes,
          Manifest.RsdoctorManifestClientRoutes.WebpackLoaders,
        ) && {
          label: t(LoaderFiles.name),
          key: LoaderFiles.route,
          icon: <MonitorOutlined style={iconStyle} />,
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
      icon: <BundleSizeIcon />,
      children: [
        includes(
          enableRoutes,
          Manifest.RsdoctorManifestClientRoutes.BundleSize,
        ) && {
          label: t(BundleSize.name),
          key: BundleSize.route,
          icon: <FolderViewOutlined style={iconStyle} />,
        },
        includes(
          enableRoutes,
          Manifest.RsdoctorManifestClientRoutes.TreeShaking,
        ) && {
          label: t(TreeShaking.name),
          key: TreeShaking.route,
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

  return <div style={{ marginLeft: '30px' }}>{MenuComponent}</div>;
};

export const Menus = withServerAPI({
  api: SDK.ServerAPI.API.GetClientRoutes,
  responsePropName: 'routes',
  Component: MenusBase,
  fallbackComponent: () => null,
});
