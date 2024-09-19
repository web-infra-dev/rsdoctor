import React from 'react';
import { DiffContainer } from './DiffContainer';

export * from './constants';

export const Page: React.FC = () => {
  return <DiffContainer manifests={[]} />;
};
