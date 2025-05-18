import { useState } from "react";
import {
  plcRegisterTask,
  plcUnregisterTask,
  plcStart,
  listenPlcBoolUpdate,
  listenPlcDwordUpdate,
  listenPlcFloatUpdate,
  listenPlcWordUpdate,
} from "@/rust-comms";

export type MonitorValue = [
  Record<number, boolean>,
  [Record<number, number>, Record<number, number>],
];

/**
 * 自定义钩子，用于管理Modbus监控状态
 * @param currentClientId 当前连接的客户端ID
 */
export const useMonitor = (currentClientId: number | undefined) => {
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [monitorValues, setMonitorValues] = useState<MonitorValue>([
    {},
    [{}, {}],
  ]);
  const [listeners, setListeners] = useState<Promise<() => void>[]>([]);
  const [unregisters, setUnregisters] = useState<(() => Promise<void>)[]>([]);
  const [monitorItems, setMonitorItems] = useState<
    Set<[number, number, boolean]>
  >(new Set());

  // 设置监听器
  const setupListeners = async () => {
    const newListeners = [
      listenPlcBoolUpdate(({ clientId, address, value }) => {
        if (clientId != currentClientId) return;
        setMonitorValues((prev) => [
          {
            ...prev[0],
            [address]: value,
          },
          [{ ...prev[1][0] }, { ...prev[1][1] }],
        ]);
      }),
      listenPlcDwordUpdate(({ clientId, address, readOnly, value }) => {
        if (clientId != currentClientId) return;
        setMonitorValues((prev) => [
          {
            ...prev[0],
          },
          readOnly
            ? [{ ...prev[1][0], [address]: value }, { ...prev[1][1] }]
            : [{ ...prev[1][0] }, { ...prev[1][1], [address]: value }],
        ]);
      }),
      listenPlcFloatUpdate(({ clientId, address, readOnly, value }) => {
        if (clientId != currentClientId) return;
        setMonitorValues((prev) => [
          {
            ...prev[0],
          },
          readOnly
            ? [{ ...prev[1][0], [address]: value }, { ...prev[1][1] }]
            : [{ ...prev[1][0] }, { ...prev[1][1], [address]: value }],
        ]);
      }),
      listenPlcWordUpdate(({ clientId, address, readOnly, value }) => {
        if (clientId != currentClientId) return;
        setMonitorValues((prev) => [
          {
            ...prev[0],
          },
          readOnly
            ? [{ ...prev[1][0], [address]: value }, { ...prev[1][1] }]
            : [{ ...prev[1][0] }, { ...prev[1][1], [address]: value }],
        ]);
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
    setMonitorValues([{}, [{}, {}]]);
  };

  // 开始监控
  const startMonitor = async (
    items: {
      address: string | number;
      dataType: string | number;
      readOnly: boolean;
    }[]
  ) => {
    if (!currentClientId) return;

    let newUnregisters: (() => Promise<void>)[] = [];
    let set = new Set<[number, number, boolean]>();
    for (const item of items || []) {
      const { address, dataType, readOnly } = item;
      await plcRegisterTask(
        currentClientId,
        1000,
        Number(address),
        Number(dataType),
        readOnly
      );
      set.add([Number(address), Number(dataType), readOnly]);

      newUnregisters.push(() =>
        plcUnregisterTask(
          currentClientId,
          Number(address),
          Number(dataType),
          readOnly
        )
      );
    }
    setMonitorItems(set);
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
  const unregisterItem = async (
    address: string | number,
    dataType: string | number,
    readOnly: boolean
  ) => {
    if (!currentClientId) return;
    await plcUnregisterTask(
      currentClientId,
      Number(address),
      Number(dataType),
      readOnly
    );
  };

  return {
    isMonitoring,
    monitorItems,
    monitorValues,
    startMonitor,
    stopMonitor,
    unregisterItem,
  };
};

export default useMonitor;
