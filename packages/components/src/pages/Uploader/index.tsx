import { InboxOutlined } from '@ant-design/icons';
import { Common } from '@rsdoctor/types';
import { message, Spin, Upload, UploadFile } from 'antd';
import React, { useState } from 'react';
import { readJSONByFileReader } from '../../utils';
import { isRspackStats } from '../../utils/stats';
import { handleRspackStats, handleRsdoctorManifest } from './utils';

const Component: React.FC = () => {
  const [loading, setLoading] = useState(false);

  // Main file upload processing function
  const handleFileUpload = async (file: UploadFile) => {
    if (!file || !file) return;

    setLoading(true);

    try {
      const json = await readJSONByFileReader<Common.PlainObject>(file);

      if (!json || typeof json !== 'object') {
        throw new Error('Invalid JSON format');
      }

      if (isRspackStats(json)) {
        await handleRspackStats(json);
      } else {
        handleRsdoctorManifest(json);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      message.error(`Upload failed: ${errorMessage}`);
      console.error('Upload error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Spin spinning={loading} tip="uploading...">
      <Upload.Dragger
        multiple={false}
        showUploadList={false}
        accept=".json"
        onChange={({ file }) => {
          handleFileUpload(file);
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
          By default, Rsdoctor will emit the profile json(manifest.json) to the
          output folder.
        </p>
      </Upload.Dragger>
    </Spin>
  );
};

export const Page = Component;
export * from './constants';
