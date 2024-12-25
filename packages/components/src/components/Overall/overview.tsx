import styles from './overview.module.scss';

interface OverviewProps {
  title?: string | React.ReactNode;
  description?: string | React.ReactNode;
  icon?: React.ReactNode;
  style?: React.CSSProperties;
}

export const Overview = (props: OverviewProps) => {
  const { title, description, icon, style } = props;
  return (
    <div className={styles.container} style={style}>
      <div>
        <div className={styles.title}>{title}</div>
        <div className={styles.description}>{description}</div>
      </div>
      {icon}
    </div>
  );
};

export default Overview;
