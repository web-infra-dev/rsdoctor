import React from 'react';
import { Route, Routes } from 'react-router-dom';
import { BundleDiff } from '@rsdoctor/components/pages';

export function DiffRouter(): React.ReactElement {
  return (
    <Routes>
      <Route path="/" element={<BundleDiff.Page />} />
      <Route path={BundleDiff.route} element={<BundleDiff.Page />} />
    </Routes>
  );
}
