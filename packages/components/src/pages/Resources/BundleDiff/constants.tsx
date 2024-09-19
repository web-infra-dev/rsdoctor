import React from 'react';
import { Client, Manifest } from '@rsdoctor/types';

export const name = 'Bundle Diff';

export const route = Client.RsdoctorClientRoutes.BundleDiff;

export const BundleDiffContext = React.createContext({
  manifests: [] as Manifest.RsdoctorManifest[],
  setManifests(_manifests: Manifest.RsdoctorManifest[]): void {},
  loading: false,
  setLoading(_loading: boolean): void {},
  async withLoading(
    _func: (...args: unknown[]) => Promise<unknown> | unknown,
  ) {},
});
