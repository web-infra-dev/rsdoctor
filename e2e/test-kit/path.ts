import { resolve } from 'path';

export function getFixtures(name: string) {
  return resolve(__dirname, '../fixtures', name);
}

export function getRsdoctorManifestPath() {
  const testManifestUrl = getFixtures('.rsdoctor/manifest.json');
  return testManifestUrl;
}
