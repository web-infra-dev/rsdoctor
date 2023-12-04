import React from 'react';
import { Route, Routes } from 'react-router-dom';

import { OverallPage } from '@rsdoctor/components/pages';


export default function Router(): React.ReactElement {

  return (
    <Routes>
      <Route path="/" element={<OverallPage.default />} />
      <Route path={OverallPage.route} element={<OverallPage.default />} />
    </Routes>
  );
}
