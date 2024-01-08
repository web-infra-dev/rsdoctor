import { Col, Row, Space, Tooltip, Typography } from 'antd';
import React from 'react';
import { Rule, SDK } from '@rsdoctor/types';
import { ExceptionOutlined } from '@ant-design/icons';
import { Alerts } from '@rsdoctor/utils/common';
import { Size } from '../../constants';
import { TextDrawer, TextDrawerProps } from './index';
import {
  PackageRelationAlert,
  PackageRelationReasons,
  PackageRelationReasonsWithServer,
} from '../Alert/package-relation';
import { PackageRelationAlertProps } from '../Alert/types';
import { ServerAPIProvider } from '../Manifest';

interface DuplicatePackageDrawerContentProps extends Omit<TextDrawerProps, 'text'> {
  duplicatePackages: Rule.PackageRelationDiffRuleStoreData[];
  cwd: string;
  textStyle?: React.CSSProperties;
  children: PackageRelationAlertProps['getPackageRelationContentComponent'];
}

interface DuplicatePackageDrawerProps extends Omit<DuplicatePackageDrawerContentProps, 'children'> {
  moduleGraph: Pick<SDK.ModuleGraphData, 'dependencies' | 'modules'>;
  moduleCodeMap: SDK.ModuleCodeData;
}

const DuplicatePackageDrawerContent: React.FC<DuplicatePackageDrawerContentProps> = ({
  duplicatePackages = [],
  cwd,
  children,
  ...props
}) => {
  return (
    <TextDrawer
      {...props}
      buttonStyle={{ fontSize: 'inherit', ...props.buttonStyle }}
      buttonProps={{ type: 'text', ...props.buttonProps }}
      text={
        <Tooltip title="Click to show the details of duplicate packages">
          <Space style={{ fontSize: 'inherit' }}>
            <Typography.Text strong style={{ fontSize: 'inherit', color: 'inherit', ...props.textStyle }}>
              {duplicatePackages.length}
            </Typography.Text>
            <ExceptionOutlined />
          </Space>
        </Tooltip>
      }
      drawerProps={{ title: 'Duplicate Packages Viewer', ...props.drawerProps }}
    >
      <Row gutter={[Size.BasePadding, Size.BasePadding]}>
        {duplicatePackages.map((err, i) => {
          return (
            <Col span={24} key={i}>
              <PackageRelationAlert data={err} cwd={cwd} getPackageRelationContentComponent={children} />
            </Col>
          );
        })}
      </Row>
    </TextDrawer>
  );
};

export const DuplicatePackageDrawer: React.FC<DuplicatePackageDrawerProps> = ({ moduleGraph, ...props }) => {
  return (
    <DuplicatePackageDrawerContent {...props}>
      {(res) => {
        return (
          <ServerAPIProvider
            api={SDK.ServerAPI.API.GetModuleCodeByModuleIds}
            body={{ moduleIds: moduleGraph.modules.map((mod) => mod.id) }}
          >
            {(moduleCodes) => (
              <PackageRelationReasons
                data={Alerts.getPackageRelationAlertDetails(
                  moduleGraph.modules,
                  moduleGraph.dependencies,
                  props.cwd,
                  res.package.dependencies,
                  moduleCodes,
                )}
                cwd={props.cwd}
              />
            )}
          </ServerAPIProvider>
        );
      }}
    </DuplicatePackageDrawerContent>
  );
};

export const DuplicatePackageDrawerWithServer: React.FC<Omit<DuplicatePackageDrawerContentProps, 'children'>> = (
  props,
) => {
  return (
    <DuplicatePackageDrawerContent {...props}>
      {(res) => {
        return (
          <PackageRelationReasonsWithServer body={{ id: res.data.id, target: res.package.target }} cwd={props.cwd} />
        );
      }}
    </DuplicatePackageDrawerContent>
  );
};
