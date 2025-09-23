import { Client, Common, Constants, Manifest } from '@rsdoctor/types';
import { message } from 'antd';
import { loadRspackStats } from '../../utils/stats';

// Default enabled routes
const defaultEnableRoutes = [
  Manifest.RsdoctorManifestClientRoutes.Overall,
  Manifest.RsdoctorManifestClientRoutes.BundleSize,
];

// Build redirect URL
const buildRedirectUrl = (enableRoutes: string[]) => {
  const baseUrl = `http://${location.host}${location.pathname}#/overall`;
  const queryParams =
    enableRoutes && enableRoutes.length > 0
      ? `?${Client.RsdoctorClientUrlQuery.EnableRoutes}=${encodeURIComponent(JSON.stringify(enableRoutes))}`
      : '';
  return `${baseUrl}${queryParams}`;
};

// Set window data and redirect
const setWindowDataAndRedirect = (data: any, enableRoutes: string[]) => {
  window[Constants.WINDOW_RSDOCTOR_TAG] = data;
  window[Constants.WINDOW_RSDOCTOR_TAG].enableRoutes = enableRoutes;

  const redirectUrl = buildRedirectUrl(enableRoutes);
  location.href = redirectUrl;

  message.success('JSON data loaded successfully!');
};

// Handle Rspack Stats data
export const handleRspackStats = async (json: Common.PlainObject) => {
  try {
    const manifestJson = await loadRspackStats([json]);
    if (manifestJson && manifestJson[0]) {
      setWindowDataAndRedirect(manifestJson[0].data, defaultEnableRoutes);
    } else {
      throw new Error('Invalid manifest data');
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    message.error(`Failed to load Rspack stats: ${errorMessage}`);
    throw err;
  }
};

// Handle Rsdoctor Manifest data
export const handleRsdoctorManifest = (json: Common.PlainObject) => {
  try {
    const enableRoutes = json.clientRoutes || defaultEnableRoutes;
    setWindowDataAndRedirect(json.data, enableRoutes);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    message.error(`Failed to load manifest data: ${errorMessage}`);
    console.error('Failed to load manifest data:', err);
  }
};
