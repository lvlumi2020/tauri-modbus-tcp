import { invoke } from "@tauri-apps/api/core";
import {
  CallingCommand,
  ModbusCreateTCPConnectionParam,
  ModbusCreateSerialConnectionParam,
  ModbusClientParam,
  ModbusRegisterParam,
  ModbusWriteSingleRegisterParam,
  ModbusWriteMultipleRegistersParam,
  ModbusWriteSingleCoilParam,
  PlcRegisterTaskParam,
  PlcUnregisterTaskParam,
} from "./types";

export const getSerialPorts = async () => {
  return await invoke<string[]>(CallingCommand.GetSerialPorts);
};

export const modbusCreateTCPConnection = async (
  param: ModbusCreateTCPConnectionParam
) => {
  return await invoke<number>(CallingCommand.ModbusCreateTCPConnection, {
    ...param,
  });
};

export const modbusCreateSerialConnection = async (
  param: ModbusCreateSerialConnectionParam
) => {
  try {
    return await invoke<number>(CallingCommand.ModbusCreateSerialConnection, {
      ...param,
    });
  } catch (error) {
    console.error("创建Modbus连接失败:", error);
    return 0;
  }
};

export const modbusDisconnect = async (param: ModbusClientParam) => {
  try {
    return await invoke<void>(CallingCommand.ModbusDisconnect, { ...param });
  } catch (error) {
    console.error("断开Modbus连接失败:", error);
    return;
  }
};

export const modbusConnectionExists = async (param: ModbusClientParam) => {
  return await invoke<boolean>(CallingCommand.ModbusConnectionExists, {
    ...param,
  });
};

export const modbusReadHoldingRegisters = async (
  param: ModbusRegisterParam
) => {
  return await invoke<number[]>(CallingCommand.ModbusReadHoldingRegisters, {
    ...param,
  });
};

export const modbusWriteSingleRegister = async (
  param: ModbusWriteSingleRegisterParam
) => {
  return await invoke<void>(CallingCommand.ModbusWriteSingleRegister, {
    ...param,
  });
};

export const modbusWriteMultipleRegisters = async (
  param: ModbusWriteMultipleRegistersParam
) => {
  return await invoke<void>(CallingCommand.ModbusWriteMultipleRegisters, {
    ...param,
  });
};

export const modbusReadInputRegisters = async (param: ModbusRegisterParam) => {
  return await invoke<number[]>(CallingCommand.ModbusReadInputRegisters, {
    ...param,
  });
};

export const modbusReadCoils = async (param: ModbusRegisterParam) => {
  return await invoke<boolean[]>(CallingCommand.ModbusReadCoils, { ...param });
};

export const modbusWriteSingleCoil = async (
  param: ModbusWriteSingleCoilParam
) => {
  return await invoke<void>(CallingCommand.ModbusWriteSingleCoil, { ...param });
};

export const plcStart = async () => {
  return await invoke<void>(CallingCommand.PlcStart);
};

export const plcStop = async () => {
  return await invoke<void>(CallingCommand.PlcStop);
};

export const plcRegisterTask = async (param: PlcRegisterTaskParam) => {
  return await invoke<void>(CallingCommand.PlcRegisterTask, { ...param });
};

export const plcUnregisterTask = async (param: PlcUnregisterTaskParam) => {
  return await invoke<void>(CallingCommand.PlcUnregisterTask, { ...param });
};
