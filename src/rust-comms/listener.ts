import { listen } from "@tauri-apps/api/event";

// 事件值接口定义
export interface PlcBoolUpdateValue {
  clientId: number;
  address: number;
  value: boolean;
}

export interface PlcWordUpdateValue {
  clientId: number;
  address: number;
  readOnly: boolean;
  value: number;
}

export interface PlcDwordUpdateValue {
  clientId: number;
  address: number;
  readOnly: boolean;
  value: number;
}

export interface PlcFloatUpdateValue {
  clientId: number;
  address: number;
  readOnly: boolean;
  value: number;
}

// 事件名称枚举
export enum PlcEventName {
  BoolUpdate = "plc-bool-update",
  WordUpdate = "plc-word-update",
  DwordUpdate = "plc-dword-update",
  FloatUpdate = "plc-float-update",
}

// 事件监听函数
export const listenPlcBoolUpdate = async (
  callback: (value: PlcBoolUpdateValue) => void
) => {
  return await listen<PlcBoolUpdateValue>(PlcEventName.BoolUpdate, (event) => {
    callback(event.payload);
  });
};

export const listenPlcWordUpdate = async (
  callback: (value: PlcWordUpdateValue) => void
) => {
  return await listen<PlcWordUpdateValue>(PlcEventName.WordUpdate, (event) => {
    callback(event.payload);
  });
};

export const listenPlcDwordUpdate = async (
  callback: (value: PlcDwordUpdateValue) => void
) => {
  return await listen<PlcDwordUpdateValue>(
    PlcEventName.DwordUpdate,
    (event) => {
      callback(event.payload);
    }
  );
};

export const listenPlcFloatUpdate = async (
  callback: (value: PlcFloatUpdateValue) => void
) => {
  return await listen<PlcFloatUpdateValue>(
    PlcEventName.FloatUpdate,
    (event) => {
      callback(event.payload);
    }
  );
};
