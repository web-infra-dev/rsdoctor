import React from 'react';
import { LinkRuleAlert } from './link';
import { FileRelationAlert } from './file-relation';
import { PackageRelationAlert } from './package-relation';
import { CodeChangeAlert } from './change';
import { CodeViewAlert } from './view';

import { AlertProps } from './types';

import './index.sass';

export const Alert: React.FC<AlertProps> = (props) => {
  const { data, cwd = '' } = props;

  if (data.type === 'file-relation') {
    return <FileRelationAlert data={data} />;
  }

  if (data.type === 'code-view') {
    return <CodeViewAlert data={data} cwd={cwd} />;
  }

  if (data.type === 'code-change') {
    return <CodeChangeAlert data={data} cwd={cwd} />;
  }

  // TODO: If need add emo alters.
  if (data.type === 'emo') {
    return <></>;
  }

  if (data.type === 'package-relation') {
    const { getPackageRelationContentComponent } = props;
    return (
      <PackageRelationAlert
        data={data}
        cwd={cwd}
        getPackageRelationContentComponent={getPackageRelationContentComponent}
      />
    );
  }

  return <LinkRuleAlert data={data} />;
};
