import React from 'react';
import { Alert } from 'antd';
import { FileRelationAlertProps } from './types';

export const FileRelationAlert: React.FC<FileRelationAlertProps> = ({ data }) => {
  const { description = '', level } = data;
  return <Alert type={level === 'warn' ? 'info' : level} description={description}></Alert>;
};
