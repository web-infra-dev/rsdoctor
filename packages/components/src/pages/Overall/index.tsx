import { Col, Row } from 'antd';
import React from 'react';
import { SDK } from '@rsdoctor/types';
import { Size } from '../../constants';
import { BundleOverall, ProjectOverall, CompileOverall } from '../../components/Overall';
import { CompileAlerts, BundleAlerts } from '../../components/Alerts';
import { withServerAPI } from '../../components/Manifest';

interface Props {
  project: SDK.ServerAPI.InferResponseType<SDK.ServerAPI.API.GetProjectInfo>;
}

const Component: React.FC<Props> = ({ project }) => {
  const { summary, configs, root: cwd, envinfo, errors } = project;

  return (
    <div>
      <Row gutter={Size.BasePadding}>
        <Col span={8}>
          <ProjectOverall configs={configs} cwd={cwd} envinfo={envinfo} alerts={errors} />
        </Col>
        <Col span={8}>
          <BundleOverall errors={errors} cwd={cwd} />
        </Col>
        <Col span={8}>
          <CompileOverall summary={summary} />
        </Col>
      </Row>

      <CompileAlerts />

      <BundleAlerts />
    </div>
  );
};

export default withServerAPI({
  api: SDK.ServerAPI.API.GetProjectInfo,
  responsePropName: 'project',
  Component,
});

export * from './constants';
