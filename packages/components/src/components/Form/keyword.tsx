import React, { useEffect, useRef, useState } from 'react';
import { Button, Input, InputRef, Typography } from 'antd';

interface KeywordProps {
  style?: React.CSSProperties;
  labelStyle?: React.CSSProperties;
  icon?: React.ReactNode;
  label?: string;
  placeholder?: string;
  delay?: number;
  className?: string;
  width?: number;
  onChange: (keyword: string) => void;
}

export const KeywordInput: React.FC<KeywordProps> = ({
  icon: Icon,
  label,
  labelStyle: ls = {},
  placeholder,
  onChange,
  style,
  className,
  width,
  delay = 300,
}) => {
  const labelWidth = 120;
  const [filename, setFilename] = useState('');
  const labelStyle: React.CSSProperties = { width: labelWidth, ...ls };

  const ref = useRef<InputRef>(null);

  let timer: NodeJS.Timeout;

  useEffect(() => {
    onChange(filename);
  }, [filename]);

  return (
    <Input.Group compact style={style} className={className}>
      {label || Icon ? (
        <Button
          style={labelStyle}
          onClick={() => {
            if (ref && ref.current) {
              ref.current.focus();
            }
          }}
        >
          {Icon || null}
          <Typography.Text>{label}</Typography.Text>
        </Button>
      ) : null}
      <Input
        ref={ref}
        allowClear
        defaultValue={filename}
        style={{ width: width ? width - labelWidth : 250 }}
        placeholder={placeholder}
        onChange={(e) => {
          clearTimeout(timer);
          const v = e.target.value.trim();
          setTimeout(() => {
            setFilename(v);
          }, delay);
        }}
      />
    </Input.Group>
  );
};
