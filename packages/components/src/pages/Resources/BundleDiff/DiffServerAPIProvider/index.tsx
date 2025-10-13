import { Client, SDK, Constants } from '@rsdoctor/types';
import { ServerAPIProvider } from 'src/components/Manifest';
import { fetchManifest, useUrlQuery } from 'src/utils';
import { Algorithm } from '@rsdoctor/utils/common';
import { BundleDiffServerAPIProviderComponentCommonProps } from '../DiffContainer/types';

export const DiffServerAPIProvider = <
  T extends SDK.ServerAPI.API | SDK.ServerAPI.APIExtends,
>(
  props: BundleDiffServerAPIProviderComponentCommonProps<T>,
): JSX.Element => {
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
        baselineFile ? () => fetchManifest(baselineFile) : undefined
      }
    >
      {(baseline) => {
        return (
          <ServerAPIProvider
            api={api}
            body={body}
            manifestLoader={
              currentFile ? () => fetchManifest(currentFile) : undefined
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
