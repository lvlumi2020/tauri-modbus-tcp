import { invoke } from '@tauri-apps/api/core';
import {
    CallingCommand,
    ModbusCreateConnectionParam,
    ModbusClientParam,
    ModbusRegisterParam,
    ModbusWriteSingleRegisterParam,
    ModbusWriteMultipleRegistersParam,
    ModbusWriteSingleCoilParam,
    PlcRegisterTaskParam,
    PlcUnregisterTaskParam
} from './types';

export const modbusCreateConnection = async (param: ModbusCreateConnectionParam) => {
    return await invoke<number>(CallingCommand.ModbusCreateConnection, { ...param });
};

export const modbusDisconnect = async (param: ModbusClientParam) => {
    return await invoke<void>(CallingCommand.ModbusDisconnect, { ...param });
};

export const modbusConnectionExists = async (param: ModbusClientParam) => {
    return await invoke<boolean>(CallingCommand.ModbusConnectionExists, { ...param });
};

export const modbusReadHoldingRegisters = async (param: ModbusRegisterParam) => {
    return await invoke<number[]>(CallingCommand.ModbusReadHoldingRegisters, { ...param });
};

export const modbusWriteSingleRegister = async (param: ModbusWriteSingleRegisterParam) => {
    return await invoke<void>(CallingCommand.ModbusWriteSingleRegister, { ...param });
};

export const modbusWriteMultipleRegisters = async (param: ModbusWriteMultipleRegistersParam) => {
    return await invoke<void>(CallingCommand.ModbusWriteMultipleRegisters, { ...param });
};

export const modbusReadInputRegisters = async (param: ModbusRegisterParam) => {
    return await invoke<number[]>(CallingCommand.ModbusReadInputRegisters, { ...param });
};

export const modbusReadCoils = async (param: ModbusRegisterParam) => {
    return await invoke<boolean[]>(CallingCommand.ModbusReadCoils, { ...param });
};

export const modbusWriteSingleCoil = async (param: ModbusWriteSingleCoilParam) => {
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