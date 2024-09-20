import { Client, SDK } from '@rsdoctor/types';
import { ServerAPIProvider } from 'src/components/Manifest';
import { fetchManifest, useUrlQuery } from 'src/utils';
import { BundleDiffServerAPIProviderComponentCommonProps } from '../DiffContainer/types';

export const DiffServerAPIProvider = <
  T extends SDK.ServerAPI.API | SDK.ServerAPI.APIExtends,
>(
  props: BundleDiffServerAPIProviderComponentCommonProps<T>,
): JSX.Element => {
  const { api, body, children, manifests } = props;
  const query = useUrlQuery();
  const [baselineFile, currentFile] =
    query[Client.RsdoctorClientUrlQuery.BundleDiffFiles]?.split(',') || [];

  if (manifests?.length) {
    // 兼容 webpack stats 场景
    return <>{children(manifests[0].data as any, manifests[1].data as any)}</>;
  }

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
