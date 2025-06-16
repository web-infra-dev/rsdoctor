import React, { useState } from 'react';
import { message, Spin, Upload } from 'antd';
import { InboxOutlined } from '@ant-design/icons';
import { Manifest } from '@rsdoctor/types';
import { getSharingUrl, readJSONByFileReader } from '@rsdoctor/components';
import { isWebpackStats, loadWebpackStats } from '../BundleDiff/Uploader';

export * from './constants';

const Component: React.FC = () => {
  const [loading, setLoading] = useState(false);

  return (
    <Spin spinning={loading} tip="uploading...">
      <Upload.Dragger
        multiple={false}
        showUploadList={false}
        accept=".json"
        onChange={({ file }) => {
          setLoading(true);
          readJSONByFileReader<Manifest.RsdoctorManifestWithShardingFiles>(file)
            .then(async (json) => {
              if (json.cloudManifestUrl) {
                location.href = getSharingUrl(json.cloudManifestUrl);
              } else if (isWebpackStats(json)) {
                const manifestJson = await loadWebpackStats([json])
                  .then((manifests) => {
                    return manifests[0];
                  })
                  .catch((err: Error) => {
                    message.error(`load json error: ${err.message}`);
                    throw err;
                  });
                if (manifestJson) {
                  location.href = getSharingUrl(
                    manifestJson?.cloudManifestUrl || '',
                  );
                } else {
                  message.error('json is invalid');
                }
              } else {
                message.error('json is invalid');
                console.warn('json is invalid: ', json);
              }
            })
            .finally(() => {
              setLoading(false);
            });
        }}
        style={{ width: '100%' }}
        beforeUpload={() => false}
      >
        <p className="ant-upload-drag-icon">
          <InboxOutlined />
        </p>
        <p className="ant-upload-text">
          Click or drag json file to this area to upload and analyze your
          profile json
        </p>
        <p className="ant-upload-hint">
          By default, Web Doctor will emit the profile json(manifest.json) to
          the output folder.
        </p>
      </Upload.Dragger>
    </Spin>
  );
};
export const Page: React.FC = () => {
  return <Component />;
};
