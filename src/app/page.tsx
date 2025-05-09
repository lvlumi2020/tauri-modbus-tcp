"use client";

import styles from './page.module.css'
import { ThemeConfig, ConnectionManager, MonitorManager, ValueSetter } from '@/components'
import { Divider, Space } from 'antd';
import { useState } from 'react';

export default function Home() {
  // 连接相关状态
  const [clientId, setClientId] = useState<number | undefined>(undefined);
  const [isMonitoring, setIsMonitoring] = useState(false);

  // 监控停止处理函数
  const handleStopMonitor = async () => {
    // 这个函数会被传递给ConnectionManager和MonitorManager组件
    // 在ConnectionManager中，当切换连接时需要停止监控
    // 在MonitorManager中，当点击停止监控按钮时需要停止监控
    setIsMonitoring(false);
  };

  return (
    <main className={styles.main}>
      <ThemeConfig>
        {/* 连接配置区域 */}
        <div className={styles.container}>
          <h2 className={styles.title}>连接管理</h2>
          <ConnectionManager
            clientId={clientId}
            setClientId={setClientId}
            isMonitoring={isMonitoring}
            onStopMonitor={handleStopMonitor}
          />
        </div>

        {/* 监控和设置值区域 */}
        {clientId && (
          <div className={styles.container}>
            <h2 className={styles.title}>数据监控与控制</h2>
            <div className={styles.monitoringArea}>
              <MonitorManager clientId={clientId} />
              <ValueSetter clientId={clientId} />
            </div>
          </div>
        )}
      </ThemeConfig>
    </main>
  );
}
