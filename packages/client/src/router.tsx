import { Skeleton } from 'antd';
import React, { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';

import { route as bundleSizeRoute } from './pages/BundleSize/constants';
import { route as loaderFilesRoute } from './pages/Loaders/Analysis/constants';
import { route as loaderTimelineRoute } from './pages/Loaders/Overall/constants';
import { route as moduleResolveRoute } from './pages/ModuleResolve/constants';
import { route as overallRoute } from './pages/Overall/constants';
import { route as pluginsAnalyzeRoute } from './pages/Plugins/constants';
import { route as bundleDiffRoute } from './pages/Resources/BundleDiff/constants';
import { route as ruleIndexRoute } from './pages/Resources/RuleIndex/constants';
import { route as treeShakingRoute } from './pages/TreeShaking/constants';
import { route as uploaderRoute } from './pages/Uploader/constants';

const OverallPage = lazy(() =>
  import('./pages/Overall').then(({ Page }) => ({ default: Page })),
);
const BundleSizePage = lazy(() =>
  import('./pages/BundleSize').then(({ Page }) => ({ default: Page })),
);
const LoaderFilesPage = lazy(() =>
  import('./pages/Loaders/Analysis').then(({ Page }) => ({ default: Page })),
);
const PluginsAnalyzePage = lazy(() =>
  import('./pages/Plugins').then(({ Page }) => ({ default: Page })),
);
const ModuleResolvePage = lazy(() =>
  import('./pages/ModuleResolve').then(({ Page }) => ({ default: Page })),
);
const LoaderTimelinePage = lazy(() =>
  import('./pages/Loaders/Overall').then(({ Page }) => ({ default: Page })),
);
const RuleIndexPage = lazy(() =>
  import('./pages/Resources/RuleIndex').then(({ Page }) => ({ default: Page })),
);
const TreeShakingPage = lazy(() =>
  import('./pages/TreeShaking').then(({ TreeShakingPage }) => ({
    default: TreeShakingPage,
  })),
);
const BundleDiffPage = lazy(() =>
  import('./pages/Resources/BundleDiff').then(({ Page }) => ({
    default: Page,
  })),
);
const UploaderPage = lazy(() =>
  import('./pages/Uploader').then(({ Page }) => ({ default: Page })),
);

export default function Router(): React.ReactElement {
  const routes = [
    {
      path: bundleSizeRoute,
      element: <BundleSizePage />,
    },
    {
      path: loaderFilesRoute,
      element: <LoaderFilesPage />,
    },
    {
      path: pluginsAnalyzeRoute,
      element: <PluginsAnalyzePage />,
    },
    {
      path: moduleResolveRoute,
      element: <ModuleResolvePage />,
    },
    {
      path: loaderTimelineRoute,
      element: <LoaderTimelinePage />,
    },
    {
      path: ruleIndexRoute,
      element: <RuleIndexPage />,
    },
    {
      path: treeShakingRoute,
      element: <TreeShakingPage />,
    },
  ];

  return (
    <Suspense fallback={<Skeleton active />}>
      <Routes>
        <Route path="/" element={<OverallPage />} />
        <Route path={overallRoute} element={<OverallPage />} />
        {routes.map((e) => (
          <Route key={e.path} path={e.path} element={e.element} />
        ))}
        <Route path={bundleDiffRoute} element={<BundleDiffPage />} />
        <Route path={uploaderRoute} element={<UploaderPage />} />
      </Routes>
    </Suspense>
  );
}
