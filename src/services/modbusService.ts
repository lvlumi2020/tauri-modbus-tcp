import {
  modbusCreateTCPConnection,
  modbusDisconnect,
  modbusConnectionExists,
  plcStart,
  plcStop,
  plcRegisterTask,
  plcUnregisterTask,
} from "../rust-comms/calling";

/**
 * ModbusTCP服务单例类
 * 提供对Modbus TCP通信的封装，确保应用中只有一个实例
 */
export class ModbusService {
  private static instance: ModbusService;
  private activeConnections: Map<number, { ip: string; port: number }>;

  /**
   * 私有构造函数，防止外部直接创建实例
   */
  private constructor() {
    this.activeConnections = new Map();
  }

  /**
   * 获取ModbusTCPService单例实例
   * @returns ModbusTCPService实例
   */
  public static getInstance(): ModbusService {
    if (!ModbusService.instance) {
      ModbusService.instance = new ModbusService();
    }
    return ModbusService.instance;
  }

  /**
   * 创建Modbus TCP连接
   * @param param 连接参数，包含IP和端口
   * @returns 连接ID
   */
  public async createConnection(param: {
    ip: string;
    port: number;
  }): Promise<number> {
    try {
      const clientId = await modbusCreateTCPConnection(param.ip, param.port);
      this.activeConnections.set(clientId, { ip: param.ip, port: param.port });
      return clientId;
    } catch (error) {
      console.error("创建Modbus连接失败:", error);
      throw error;
    }
  }

  /**
   * 断开Modbus TCP连接
   * @param param 客户端参数，包含客户端ID
   */
  public async disconnect(clientId: number): Promise<void> {
    try {
      await modbusDisconnect(clientId);
      this.activeConnections.delete(clientId);
    } catch (error) {
      console.error("断开Modbus连接失败:", error);
      throw error;
    }
  }

  /**
   * 检查Modbus TCP连接是否存在
   * @param param 客户端参数，包含客户端ID
   * @returns 连接是否存在
   */
  public async connectionExists(clientId: number): Promise<boolean> {
    try {
      return await modbusConnectionExists(clientId);
    } catch (error) {
      console.error("检查Modbus连接失败:", error);
      throw error;
    }
  }

  /**
   * 启动PLC任务
   */
  public async startPLC(): Promise<void> {
    try {
      await plcStart();
    } catch (error) {
      console.error("启动PLC失败:", error);
      throw error;
    }
  }

  /**
   * 停止PLC任务
   */
  public async stopPLC(): Promise<void> {
    try {
      await plcStop();
    } catch (error) {
      console.error("停止PLC失败:", error);
      throw error;
    }
  }

  /**
   * 注册PLC任务
   * @param param 任务参数
   */
  public async registerPLCTask(
    clientId: number,
    intervalMs: number,
    address: number,
    dataType: number,
    readOnly: boolean
  ): Promise<void> {
    try {
      await plcRegisterTask(clientId, intervalMs, address, dataType, readOnly);
    } catch (error) {
      console.error("注册PLC任务失败:", error);
      throw error;
    }
  }

  /**
   * 注销PLC任务
   * @param param 任务参数
   */
  public async unregisterPLCTask(
    clientId: number,
    address: number,
    dataType: number,
    readOnly: boolean
  ): Promise<void> {
    try {
      await plcUnregisterTask(clientId, address, dataType, readOnly);
    } catch (error) {
      console.error("注销PLC任务失败:", error);
      throw error;
    }
  }

  /**
   * 获取所有活动连接
   * @returns 活动连接Map
   */
  public getActiveConnections(): Map<number, { ip: string; port: number }> {
    return new Map(this.activeConnections);
  }

  /**
   * 断开所有连接
   */
  public async disconnectAll(): Promise<void> {
    const connectionIds = Array.from(this.activeConnections.keys());
    for (const clientId of connectionIds) {
      await this.disconnect(clientId);
    }
  }
}

// 导出单例获取方法，方便使用
export const getModbusTCPInstance = ModbusService.getInstance;
