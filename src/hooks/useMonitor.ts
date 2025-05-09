import { useState } from "react";
import {
  plcRegisterTask,
  plcUnregisterTask,
  plcStart,
  plcBoolUpdateEventListener,
  plcWordUpdateEventListener,
  plcDwordUpdateEventListener,
  plcFloatUpdateEventListener,
} from "@/rust-comms";

interface MonitorValue {
  address: number;
  value: boolean | number;
  dataType: number;
}

/**
 * 自定义钩子，用于管理Modbus监控状态
 * @param clientId 当前连接的客户端ID
 */
export const useMonitor = (clientId: number | undefined) => {
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [monitorValues, setMonitorValues] = useState<
    Record<number, MonitorValue>
  >({});
  const [listeners, setListeners] = useState<Promise<() => void>[]>([]);
  const [unregisters, setUnregisters] = useState<(() => Promise<void>)[]>([]);

  // 设置监听器
  const setupListeners = async () => {
    const newListeners = [
      plcBoolUpdateEventListener((data) => {
        setMonitorValues((prev) => ({
          ...prev,
          [data.address]: {
            address: data.address,
            value: data.value,
            dataType: 1,
          },
        }));
      }),
      plcWordUpdateEventListener((data) => {
        setMonitorValues((prev) => ({
          ...prev,
          [data.address]: {
            address: data.address,
            value: data.value,
            dataType: 2,
          },
        }));
      }),
      plcDwordUpdateEventListener((data) => {
        setMonitorValues((prev) => ({
          ...prev,
          [data.address]: {
            address: data.address,
            value: data.value,
            dataType: 3,
          },
        }));
      }),
      plcFloatUpdateEventListener((data) => {
        setMonitorValues((prev) => ({
          ...prev,
          [data.address]: {
            address: data.address,
            value: data.value,
            dataType: 4,
          },
        }));
      }),
    ];
    setListeners(newListeners);
    plcStart();
  };

  // 清理监听器
  const cleanupListeners = async () => {
    for (const listener of listeners) {
      const unlisten = await listener;
      unlisten();
    }
    for (const unregister of unregisters) {
      await unregister();
    }
    setListeners([]);
    setMonitorValues({});
  };

  // 开始监控
  const startMonitor = async (
    items: { address: string; dataType: string }[]
  ) => {
    if (!clientId) return;

    let newUnregisters: (() => Promise<void>)[] = [];
    for (const item of items || []) {
      await plcRegisterTask({
        clientId: clientId,
        address: Number(item.address),
        intervalMs: 1000,
        dataType: Number(item.dataType),
      });
      newUnregisters.push(() =>
        plcUnregisterTask({ clientId: clientId, address: Number(item.address) })
      );
    }
    setUnregisters(newUnregisters);
    await setupListeners();
    setIsMonitoring(true);
  };

  // 停止监控
  const stopMonitor = async () => {
    await cleanupListeners();
    setIsMonitoring(false);
  };

  // 注销单个监控项
  const unregisterItem = async (address: number) => {
    if (!clientId) return;
    await plcUnregisterTask({ clientId, address });
  };

  return {
    isMonitoring,
    monitorValues,
    startMonitor,
    stopMonitor,
    unregisterItem,
  };
};

export default useMonitor;
