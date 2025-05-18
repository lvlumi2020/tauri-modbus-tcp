import { invoke } from "@tauri-apps/api/core";

// 调用命令枚举
export enum CallingCommand {
  GetSerialPorts = "get_serial_ports",
  ModbusCreateTCPConnection = "modbus_create_tcp_connection",
  ModbusCreateSerialConnection = "modbus_create_serial_connection",
  ModbusDisconnect = "modbus_disconnect",
  ModbusConnectionExists = "modbus_connection_exists",
  PlcStart = "plc_start",
  PlcStop = "plc_stop",
  PlcRegisterTask = "plc_register_task",
  PlcUnregisterTask = "plc_unregister_task",
  PlcReadBool = "plc_read_bool",
  PlcReadWord = "plc_read_word",
  PlcReadDWord = "plc_read_dword",
  PlcReadFloat = "plc_read_float",
  PlcWriteBool = "plc_write_bool",
  PlcWriteWord = "plc_write_word",
  PlcWriteDWord = "plc_write_dword",
  PlcWriteFloat = "plc_write_float",
}

export const getSerialPorts = async () => {
  return await invoke<string[]>(CallingCommand.GetSerialPorts);
};

export const modbusCreateTCPConnection = async (ip: string, port: number) => {
  const clientId = await invoke<string>(
    CallingCommand.ModbusCreateTCPConnection,
    {
      ip,
      port,
    }
  );
  return Number(clientId);
};

export const modbusCreateSerialConnection = async (
  serialPort: string,
  baudRate: number,
  slaveId: number
) => {
  const clientId = await invoke<string>(
    CallingCommand.ModbusCreateSerialConnection,
    {
      serialPort,
      baudRate,
      slaveId,
    }
  );
  return Number(clientId);
};

export const modbusDisconnect = async (clientId: number) => {
  return await invoke<void>(CallingCommand.ModbusDisconnect, {
    clientId: clientId.toString(),
  });
};

export const modbusConnectionExists = async (clientId: number) => {
  return await invoke<boolean>(CallingCommand.ModbusConnectionExists, {
    clientId: clientId.toString(),
  });
};

export const plcStart = async () => {
  return await invoke<void>(CallingCommand.PlcStart);
};

export const plcStop = async () => {
  return await invoke<void>(CallingCommand.PlcStop);
};

export const plcRegisterTask = async (
  clientId: number,
  intervalMs: number,
  address: number,
  dataType: number,
  readOnly: boolean
) => {
  console.log(clientId, intervalMs, address, dataType, readOnly);
  return await invoke<void>(CallingCommand.PlcRegisterTask, {
    clientId: clientId.toString(),
    intervalMs: intervalMs.toString(),
    address,
    dataType,
    readOnly,
  });
};

export const plcUnregisterTask = async (
  clientId: number,
  address: number,
  dataType: number,
  readOnly: boolean
) => {
  return await invoke<void>(CallingCommand.PlcUnregisterTask, {
    clientId: clientId.toString(),
    address,
    dataType,
    readOnly,
  });
};

export const plcReadBool = async (clientId: number, address: number) => {
  return await invoke<boolean>(CallingCommand.PlcReadBool, {
    clientId: clientId.toString(),
    address,
  });
};

export const plcReadWord = async (
  clientId: number,
  address: number,
  readOnly: boolean
) => {
  return await invoke<number>(CallingCommand.PlcReadWord, {
    clientId: clientId.toString(),
    address,
    readOnly,
  });
};

export const plcReadDWord = async (
  clientId: number,
  address: number,
  readOnly: boolean
) => {
  return await invoke<number>(CallingCommand.PlcReadDWord, {
    clientId: clientId.toString(),
    address,
    readOnly,
  });
};

export const plcReadFloat = async (
  clientId: number,
  address: number,
  readOnly: boolean
) => {
  return await invoke<number>(CallingCommand.PlcReadFloat, {
    clientId: clientId.toString(),
    address,
    readOnly,
  });
};

export const plcWriteBool = async (
  clientId: number,
  address: number,
  value: boolean
) => {
  return await invoke<void>(CallingCommand.PlcWriteBool, {
    clientId: clientId.toString(),
    address,
    value,
  });
};

export const plcWriteWord = async (
  clientId: number,
  address: number,
  value: number
) => {
  return await invoke<void>(CallingCommand.PlcWriteWord, {
    clientId: clientId.toString(),
    address,
    value,
  });
};

export const plcWriteDWord = async (
  clientId: number,
  address: number,
  value: number
) => {
  return await invoke<void>(CallingCommand.PlcWriteDWord, {
    clientId: clientId.toString(),
    address,
    value,
  });
};

export const plcWriteFloat = async (
  clientId: number,
  address: number,
  value: number
) => {
  return await invoke<void>(CallingCommand.PlcWriteFloat, {
    clientId: clientId.toString(),
    address,
    value,
  });
};
