import React from 'react';
import { Route, Routes } from 'react-router-dom';
import { Overall, BundleSize } from '@rsdoctor/components/pages';


export default function Router(): React.ReactElement {
  const routes = [
    /** bundle routes */
    {
      path: BundleSize.route,
      element: <BundleSize.Page />,
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
