import React, { useState } from 'react';
import { message, Spin, Upload } from 'antd';
import { InboxOutlined } from '@ant-design/icons';
import { Constants, Client, Common } from '@rsdoctor/types';
import { isWebpackStats, loadWebpackStats } from '../../utils/stats';
import { getSharingUrl, readJSONByFileReader } from '../../utils';

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
          readJSONByFileReader<Common.PlainObject>(file)
            .then(async (json) => {
              // Check if it's a valid JSON object
              if (json && typeof json === 'object') {
                try {
                  // Mount the JSON data to window object for HTML page to use
                  window[Constants.WINDOW_RSDOCTOR_TAG] = json.data;
                  window[Constants.WINDOW_RSDOCTOR_TAG].enableRoutes =
                    json.clientRoutes;

                  // Redirect to the analysis page with enableRoutes in query
                  const enableRoutes = json.clientRoutes;
                  const baseUrl = `http://${location.host}/#/overall`;
                  const queryParams =
                    enableRoutes && enableRoutes.length > 0
                      ? `?${Client.RsdoctorClientUrlQuery.EnableRoutes}=${encodeURIComponent(JSON.stringify(enableRoutes))}`
                      : '';
                  location.href = `${baseUrl}${queryParams}`;

                  message.success('JSON data loaded successfully!');
                } catch (err) {
                  message.error(
                    `Failed to load JSON data: ${(err as Error).message}`,
                  );
                  console.error('Failed to load JSON data:', err);
                }
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
                message.error('Invalid JSON format');
                console.warn('Invalid JSON format:', json);
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

export const Page = Component;
export * from './constants';
