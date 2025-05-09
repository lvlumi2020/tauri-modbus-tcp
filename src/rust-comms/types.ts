// 参数接口定义
export interface ModbusCreateTCPConnectionParam {
  ip: string;
  port: number;
}

export interface ModbusCreateSerialConnectionParam {
  serialPort: string;
  baudRate: number;
  slaveId: number;
}

export interface ModbusClientParam {
  clientId: number;
}

export interface ModbusRegisterParam extends ModbusClientParam {
  address: number;
  quantity: number;
}

export interface ModbusWriteSingleRegisterParam extends ModbusClientParam {
  address: number;
  value: number;
}

export interface ModbusWriteMultipleRegistersParam extends ModbusClientParam {
  address: number;
  values: number[];
}

export interface ModbusWriteSingleCoilParam extends ModbusClientParam {
  address: number;
  value: boolean;
}

export interface PlcRegisterTaskParam extends ModbusClientParam {
  intervalMs: number;
  address: number;
  dataType: number;
}

export interface PlcUnregisterTaskParam extends ModbusClientParam {
  address: number;
}

// 调用命令枚举
export enum CallingCommand {
  GetSerialPorts = "get_serial_ports",
  ModbusCreateTCPConnection = "modbus_create_tcp_connection",
  ModbusCreateSerialConnection = "modbus_create_serial_connection",
  ModbusDisconnect = "modbus_disconnect",
  ModbusConnectionExists = "modbus_connection_exists",
  ModbusReadHoldingRegisters = "modbus_read_holding_registers",
  ModbusWriteSingleRegister = "modbus_write_single_register",
  ModbusWriteMultipleRegisters = "modbus_write_multiple_registers",
  ModbusReadInputRegisters = "modbus_read_input_registers",
  ModbusReadCoils = "modbus_read_coils",
  ModbusWriteSingleCoil = "modbus_write_single_coil",
  PlcStart = "plc_start",
  PlcStop = "plc_stop",
  PlcRegisterTask = "plc_register_task",
  PlcUnregisterTask = "plc_unregister_task",
}

// 添加到现有的 types.ts 文件中
export interface PlcBoolUpdateValue {
  clientId: number;
  address: number;
  value: boolean;
}

export interface PlcWordUpdateValue {
  clientId: number;
  address: number;
  value: number;
}

export interface PlcDwordUpdateValue {
  clientId: number;
  address: number;
  value: number;
}

export interface PlcFloatUpdateValue {
  clientId: number;
  address: number;
  value: number;
}

// 监听命令枚举
export enum ListenerCommand {
  PlcBoolUpdate = "plc-bool-update",
  PlcWordUpdate = "plc-word-update",
  PlcDwordUpdate = "plc-dword-update",
  PlcFloatUpdate = "plc-float-update",
}
