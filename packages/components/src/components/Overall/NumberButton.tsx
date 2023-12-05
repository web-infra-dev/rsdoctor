import { Button, Typography } from 'antd';
import styles from './NumberButton.module.scss';

export interface NumberButtonProps {
  theme: 'success' | 'error' | 'warning';
  number: string | number;
  onClick?: () => void;
  description: string;
  numberFontSize?: string;
}

export const NumberButton = ({ theme, number, onClick, description, numberFontSize }: NumberButtonProps) => {
  const themeClass = {
    success: {
      number: styles.successNumber,
      button: styles.successButton,
      description: styles.successText,
    },
    error: {
      number: styles.errorNumber,
      button: styles.errorButton,
      description: styles.errorText,
    },
    warning: {
      number: styles.warningNumber,
      button: styles.warningButton,
      description: styles.warningText,
    },
  };

  return (
    <Button type="text" className={themeClass[theme].button} onClick={onClick}>
      <Typography.Text className={themeClass[theme].number} style={{ fontSize: numberFontSize }}>
        {number}
      </Typography.Text>
      <div className={themeClass[theme].description}>{description}</div>
    </Button>
  );
};
