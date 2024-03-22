import { formatSize } from '@rsdoctor/components/utils';
import { Client } from '@rsdoctor/types';
import { Typography } from 'antd';
import { Color } from 'src/constants';

export const formatDiffSize = (
  bSize: number,
  cSize: number,
  state: Client.RsdoctorClientDiffState,
  propsStyle?: Record<string, string | number>,
) => {
  return (
    <>
      {cSize - bSize === 0 ? (
        <></>
      ) : (
        <Typography.Text
          strong
          style={{
            color:
              state === Client.RsdoctorClientDiffState.Up
                ? Color.Red
                : Color.Green,
            ...propsStyle,
          }}
        >
          {state === Client.RsdoctorClientDiffState.Up ? '+' : '-'}
          {formatSize(Math.abs(cSize - bSize))}
        </Typography.Text>
      )}
    </>
  );
};
