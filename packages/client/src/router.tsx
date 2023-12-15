import React from 'react';
import { Route, Routes } from 'react-router-dom';
import { Overall, BundleSize, LoaderFiles, PluginsAnalyze, ModuleResolve, LoaderTimeline } from '@rsdoctor/components/pages';


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
  ].filter((e) => Boolean(e)) as { path: string; element: JSX.Element }[];

  return (
    <Routes>
      <Route path="/" element={<Overall.Page />} />
      <Route path={Overall.route} element={<Overall.Page />} />
      {routes.map((e) => (
        <Route key={e.path} path={e.path} element={e.element} />
      ))}
    </Routes>
  );
}
