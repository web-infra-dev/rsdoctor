import { Rule } from '@rsdoctor/types';
import React from 'react';

import type { CheckSyntax } from '@rsbuild/plugin-check-syntax';

export interface AlertProps extends Omit<PackageRelationAlertProps, 'data'> {
  data: Rule.RuleStoreDataItem;
  cwd: string;
}

export interface PackageRelationAlertProps {
  data: Rule.PackageRelationDiffRuleStoreData;
  getPackageRelationContentComponent: React.FC<{
    data: Rule.PackageRelationDiffRuleStoreData;
    package: Rule.PackageRelationData;
  }>;
  cwd: string;
}

export interface FileRelationAlertProps {
  data: Rule.FileRelationRuleStoreData;
}

export interface CodeChangeAlertProps {
  data: Rule.CodeChangeRuleStoreData;
  cwd: string;
}

export interface CodeViewAlertProps {
  data: Rule.CodeViewRuleStoreData;
  cwd: string;
}

type CheckSyntaxError =
  CheckSyntax['errors'] extends Array<infer T> ? T : false;
export interface LinkAlertProps {
  data: (Rule.RuleStoreDataItem & {
    error?: CheckSyntaxError;
  })[];
}
