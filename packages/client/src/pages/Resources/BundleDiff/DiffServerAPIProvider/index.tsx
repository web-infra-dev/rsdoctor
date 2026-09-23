import { Client, SDK, Constants } from '@rsdoctor/shared/types';
import { ServerAPIProvider } from 'src/components/Manifest';
import { fetchManifest, parseManifest, useUrlQuery } from 'src/utils';
import { Algorithm } from '@rsdoctor/shared/common-browser';
import { BundleDiffServerAPIProviderComponentCommonProps } from '../DiffContainer/types';

async function loadBundleDiffManifest(url: string) {
  const manifest = await fetchManifest(url);

  // A local Rsdoctor server resolves its own manifest data through APIs. Only
  // cloud manifests need their sharded data hydrated in the browser.
  return manifest.cloudData ? parseManifest(manifest) : manifest;
}

export const DiffServerAPIProvider = <
  T extends SDK.ServerAPI.API | SDK.ServerAPI.APIExtends,
>(
  props: BundleDiffServerAPIProviderComponentCommonProps<T>,
): React.JSX.Element => {
  const { api, body, children, manifests } = props;
  const query = useUrlQuery();

  const windowData = (window as any)[Constants.WINDOW_RSDOCTOR_TAG];
  if (windowData?.baseline && windowData?.current) {
    const baseline = JSON.parse(Algorithm.decompressText(windowData.baseline));
    const current = JSON.parse(Algorithm.decompressText(windowData.current));
    return <>{children(baseline, current)}</>;
  }

  if (manifests?.length) {
    return <>{children(manifests[0].data as any, manifests[1].data as any)}</>;
  }

  const [baselineFile, currentFile] =
    query[Client.RsdoctorClientUrlQuery.BundleDiffFiles]?.split(',') || [];

  return (
    <ServerAPIProvider
      api={api}
      body={body}
      manifestLoader={
        baselineFile ? () => loadBundleDiffManifest(baselineFile) : undefined
      }
    >
      {(baseline) => {
        return (
          <ServerAPIProvider
            api={api}
            body={body}
            manifestLoader={
              currentFile ? () => loadBundleDiffManifest(currentFile) : undefined
            }
          >
            {(current) => {
              return children(baseline, current);
            }}
          </ServerAPIProvider>
        );
      }}
    </ServerAPIProvider>
  );
};
