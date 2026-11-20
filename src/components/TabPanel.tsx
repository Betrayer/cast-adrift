import type { ReactNode } from "react";
import styles from "./TabPanel.module.css";

export const TabPanel = ({
  id,
  children,
}: {
  id: string;
  children: ReactNode;
}) => (
  <div key={id} className={styles.panel} data-tab-panel={id}>
    {children}
  </div>
);
