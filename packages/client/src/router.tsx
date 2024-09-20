import React from 'react';
import { Route, Routes } from 'react-router-dom';
import {
  Overall,
  BundleSize,
  LoaderFiles,
  PluginsAnalyze,
  ModuleResolve,
  LoaderTimeline,
  RuleIndex,
  TreeShaking,
  BundleDiff,
} from '@rsdoctor/components/pages';

export default function Router(): React.ReactElement {
  const routes = [
    {
      path: BundleSize.route,
      element: <BundleSize.Page />,
    },
    {
      path: LoaderFiles.route,
      element: <LoaderFiles.Page />,
    },
    {
      path: PluginsAnalyze.route,
      element: <PluginsAnalyze.Page />,
    },
    {
      path: ModuleResolve.route,
      element: <ModuleResolve.Page />,
    },
    {
      path: LoaderTimeline.route,
      element: <LoaderTimeline.Page />,
    },
    {
      path: RuleIndex.route,
      element: <RuleIndex.Page />,
    },
    {
      path: TreeShaking.route,
      element: <TreeShaking.TreeShakingPage />,
    },
  ].filter((e) => Boolean(e)) as { path: string; element: JSX.Element }[];

  return (
    <Routes>
      <Route path="/" element={<Overall.Page />} />
      <Route path={Overall.route} element={<Overall.Page />} />
      {routes.map((e) => (
        <Route key={e.path} path={e.path} element={e.element} />
      ))}
      <Route path={BundleDiff.route} element={<BundleDiff.Page />} />
      {/* <Route path="*" element={<NotFound />} /> TODO:: add page NotFound */}
    </Routes>
  );
}
