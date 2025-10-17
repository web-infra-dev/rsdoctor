import React from 'react';
import { DiffRouter } from './DiffRouter';
import BaseApp from './components/BaseApp';

const DiffApp: React.FC = (): React.ReactElement => {
  return <BaseApp router={<DiffRouter />} />;
};

export default DiffApp;
