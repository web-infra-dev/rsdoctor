import { Skeleton } from 'antd';
import React, { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import { route as bundleDiffRoute } from './pages/Resources/BundleDiff/constants';

const BundleDiffPage = lazy(() =>
  import('./pages/Resources/BundleDiff').then(({ Page }) => ({
    default: Page,
  })),
);

export function DiffRouter(): React.ReactElement {
  return (
    <Suspense fallback={<Skeleton active />}>
      <Routes>
        <Route path="/" element={<BundleDiffPage />} />
        <Route path={bundleDiffRoute} element={<BundleDiffPage />} />
      </Routes>
    </Suspense>
  );
}
