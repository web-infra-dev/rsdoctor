import {
  BoxPlotFilled,
  MenuOutlined,
  FundFilled,
  ApiFilled,
  NodeIndexOutlined,
} from '@ant-design/icons';
import { Manifest, SDK } from '@rsdoctor/types';
import { Menu, MenuProps } from 'antd';
import { includes } from 'lodash-es';
import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { Size } from '../../constants';
import * as OverallConstants from '../../pages/Overall/constants';
import { useI18n, hasBundle, hasCompile } from '../../utils';
import { withServerAPI } from '../Manifest';
import OverallActive from 'src/common/svg/navbar/overall-active.svg';
import OverallInActive from 'src/common/svg/navbar/overall-inactive.svg';
import CompileAnalysisActive from 'src/common/svg/navbar/compile-analysis-active.svg';
import CompileAnalysisInActive from 'src/common/svg/navbar/compile-analysis-inactive.svg';
import BundleSizeActive from 'src/common/svg/navbar/bundle-size-active.svg';
import BundleSizeInActive from 'src/common/svg/navbar/bundle-size-inactive.svg';
import {
  BundleSize,
  LoaderFiles,
  PluginsAnalyze,
  ModuleResolve,
  LoaderTimeline,
} from 'src/pages';
import { CompileName } from './constants';

const BuilderSwitchName = 'builder-switcher';

const defaultInActive = {
  overall: <OverallInActive />,
  webpack: <CompileAnalysisInActive />,
  bundle: <BundleSizeInActive />,
};
const MenusBase: React.FC<{
  style?: React.CSSProperties;
  routes: Manifest.RsdoctorManifestClientRoutes[];
}> = (props) => {
  const { t } = useI18n();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [navIcon, setNavIcon] = useState(defaultInActive);
  const { routes: enableRoutes } = props;

  useEffect(() => {
    if (pathname.includes('webpack')) {
      setNavIcon({
        ...defaultInActive,
        webpack: <CompileAnalysisActive />,
      });
    } else if (pathname.includes('overall') || pathname === '/') {
      setNavIcon({
        ...defaultInActive,
        overall: <OverallActive />,
      });
    } else if (pathname.includes('bundle')) {
      setNavIcon({
        ...defaultInActive,
        bundle: <BundleSizeActive />,
      });
    }
  }, [pathname]);

  const iconStyle: React.CSSProperties = {
    color: 'rgba(96, 102, 114)',
  };
  const items: MenuProps['items'] = [];

  if (includes(enableRoutes, Manifest.RsdoctorManifestClientRoutes.Overall)) {
    items.push({
      label: t(OverallConstants.name),
      key: OverallConstants.route,
      icon: navIcon.overall,
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
      icon: navIcon.webpack,
      children: [
        includes(
          enableRoutes,
          Manifest.RsdoctorManifestClientRoutes.WebpackLoaders,
        ) && {
          label: t(LoaderTimeline.name),
          key: LoaderTimeline.route,
          icon: <BoxPlotFilled style={iconStyle} />,
        },
        includes(
          enableRoutes,
          Manifest.RsdoctorManifestClientRoutes.WebpackLoaders,
        ) && {
          label: t(LoaderFiles.name),
          key: LoaderFiles.route,
          icon: <FundFilled style={iconStyle} />,
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
          icon: <ApiFilled style={iconStyle} />,
        },
      ].filter((e) => Boolean(e)) as MenuProps['items'],
    });
  }

  if (hasBundle(enableRoutes)) {
    items.push({
      label: t(BundleSize.name),
      key: BundleSize.name,
      icon: navIcon.bundle,
      children: [],
      onTitleClick() {
        navigate(BundleSize.route);
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
  showSkeleton: false,
});
