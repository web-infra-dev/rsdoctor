import styles from './Copyright.module.scss';

export const CopyRight = () => {
  return (
    <footer className={styles.copyRight}>
      <div className={styles.copyRightInner}>
        <div className={styles.copyRightText}>
          <p className="mb-2">
            Rsdoctor is free and open source software released under the MIT
            license.
          </p>
          <p>© 2024-present ByteDance Inc.</p>
        </div>
      </div>
    </footer>
  );
};
