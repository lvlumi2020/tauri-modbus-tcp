"use client";

import styles from './page.module.css'
import { ThemeConfig } from '@/components'
import { Form, Input, Button, Select, Space, Table, Modal, Divider } from 'antd';
import { useState } from 'react';
import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons';
import {
  modbusCreateConnection,
  ModbusCreateConnectionParam,
  modbusDisconnect,
  modbusWriteMultipleRegisters,
  modbusWriteSingleCoil,
  modbusWriteSingleRegister,
  plcRegisterTask,
  plcUnregisterTask,
  plcStart,
  plcBoolUpdateEventListener,
  plcWordUpdateEventListener,
  plcDwordUpdateEventListener,
  plcFloatUpdateEventListener
} from '@/rust-comms';
import { ColumnProps, ColumnsType } from 'antd/lib/table';

interface MonitorValue {
  address: number;
  value: boolean | number;
  dataType: number;
}

interface Connection {
  id: number;
  label: string;
}

export default function Home() {
  // 连接相关状态
  const [clientId, setClientId] = useState<number | undefined>(undefined);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [connectForm] = Form.useForm<ModbusCreateConnectionParam>();

  // 监控相关状态
  const [isMonitorModalOpen, setIsMonitorModalOpen] = useState(false);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [monitorForm] = Form.useForm();
  const [monitorValues, setMonitorValues] = useState<Record<number, MonitorValue>>({});
  const [listeners, setListeners] = useState<Promise<() => void>[]>([]);


  // 添加设置值相关状态
  const [isSetValueModalOpen, setIsSetValueModalOpen] = useState(false);
  const [setValueForm] = Form.useForm();


  // 添加设置值处理函数
  const handleSetValue = async (values: any) => {
    const { address, dataType, value } = values;
    try {
      switch (Number(dataType)) {
        case 1: // Bool
          await modbusWriteSingleCoil({
            clientId: clientId!,
            address: Number(address),
            value: value.toLowerCase() === 'true'
          });
          break;
        case 2: // Word
          await modbusWriteSingleRegister({
            clientId: clientId!,
            address: Number(address),
            value: parseInt(value)
          });
          break;
        case 3: // DWord
          const dwordValue = parseInt(value);
          await modbusWriteMultipleRegisters({
            clientId: clientId!,
            address: Number(address),
            values: [
              (dwordValue >> 16) & 0xFFFF, // 低16位
              dwordValue & 0xFFFF,      // 高16位
            ]
          });
          break;
        case 4: // Float
          const floatBuffer = new ArrayBuffer(4);
          new DataView(floatBuffer).setFloat32(0, parseFloat(value), true); // true表示小端序
          await modbusWriteMultipleRegisters({
            clientId: clientId!,
            address: Number(address),
            values: [
              new DataView(floatBuffer).getUint16(2, true),   // 低16位
              new DataView(floatBuffer).getUint16(0, true),   // 高16位
            ]
          });
          break;
      }
      setIsSetValueModalOpen(false);
      setValueForm.resetFields();
      Modal.success({
        title: '设置成功',
        content: `已将地址 ${address} 的值设置为 ${value}`
      });
    } catch (error) {
      Modal.error({
        title: '设置失败',
        content: `错误信息: ${error}`
      });
    }
  };

  // 表格列定义
  const tableColumns: ColumnsType = [
    { title: '地址', dataIndex: 'address', key: 'address' },
    {
      title: '数据类型', dataIndex: 'dataType', key: 'dataType',
      render: (type: number) => ['', 'Bool', 'Word', 'DWord', 'Float'][type]
    },
    {
      title: '值', dataIndex: 'value', key: 'value',
      render: (v) => <span>{`${v}`}</span>
    }
  ];

  // 连接管理相关函数
  const handleAddConnection = async (values: ModbusCreateConnectionParam) => {
    values.port = Number(values.port);
    const newLabel = `${values.ip}:${values.port}`;

    if (connections.some(conn => conn.label === newLabel)) {
      Modal.error({
        title: '添加失败',
        content: '该连接已存在'
      });
      return;
    }

    const id = await modbusCreateConnection(values);
    const newConnection = { id, label: newLabel };
    setConnections(prev => [...prev, newConnection]);
    setIsModalOpen(false);
    connectForm.resetFields();
    setClientId(id);
  };

  const handleDeleteConnection = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (clientId === id) {
      if (isMonitoring) {
        await handleStopMonitor();
      }
      await modbusDisconnect({ clientId: id });
      setClientId(undefined);
    }
    setConnections(prev => prev.filter(conn => conn.id !== id));
  };

  // 监控相关函数
  const setupListeners = async () => {
    const newListeners = [
      plcBoolUpdateEventListener((data) => {
        setMonitorValues(prev => ({
          ...prev,
          [data.address]: { address: data.address, value: data.value, dataType: 1 }
        }));
      }),
      plcWordUpdateEventListener((data) => {
        setMonitorValues(prev => ({
          ...prev,
          [data.address]: { address: data.address, value: data.value, dataType: 2 }
        }));
      }),
      plcDwordUpdateEventListener((data) => {
        setMonitorValues(prev => ({
          ...prev,
          [data.address]: { address: data.address, value: data.value, dataType: 3 }
        }));
      }),
      plcFloatUpdateEventListener((data) => {
        setMonitorValues(prev => ({
          ...prev,
          [data.address]: { address: data.address, value: data.value, dataType: 4 }
        }));
      })
    ];
    setListeners(newListeners);
    plcStart();
  };

  const cleanupListeners = async () => {
    for (const listener of listeners) {
      const unlisten = await listener;
      unlisten();
    }
    setListeners([]);
    setMonitorValues({});
  };

  const handleStartMonitor = async (values: any) => {
    for (const item of values.items || []) {
      await plcRegisterTask({
        clientId: clientId!,
        address: Number(item.address),
        intervalMs: 1000,
        dataType: Number(item.dataType)
      });
    }
    await setupListeners();
    setIsMonitoring(true);
    setIsMonitorModalOpen(false);
  };

  const handleStopMonitor = async () => {
    await cleanupListeners();
    setIsMonitoring(false);
  };

  return (
    <main className={styles.main}>
      <ThemeConfig>
        {/* 连接配置区域 */}
        <div style={{ marginBottom: 24 }}>
          <Space style={{ marginBottom: 16 }}>
            <Select
              style={{ width: 200 }}
              value={clientId}
              onChange={async (value) => {
                if (clientId !== undefined) {
                  if (isMonitoring) {
                    await handleStopMonitor();
                  }
                  await modbusDisconnect({ clientId });
                }
                setClientId(value);
              }}
              options={connections.map(conn => ({
                label: (
                  <Space>
                    <span>{conn.label}</span>
                    <MinusCircleOutlined
                      onClick={(e) => handleDeleteConnection(conn.id, e)}
                      style={{ color: '#ff4d4f' }}
                    />
                  </Space>
                ),
                value: conn.id
              }))}
              placeholder="选择连接"
            />
            <Button type="primary" onClick={() => setIsModalOpen(true)}>
              添加连接
            </Button>
          </Space>
        </div>

        <Divider />

        {/* 监控配置区域 */}
        <div style={{ paddingTop: 24 }}>
          {clientId && (
            <Space>
              <Button type="primary" onClick={() => setIsMonitorModalOpen(true)}>
                配置监控
              </Button>
              {isMonitoring && (
                <Button danger onClick={handleStopMonitor}>
                  停止监控
                </Button>
              )}

              <Button type="primary" onClick={() => setIsSetValueModalOpen(true)}>
                设置值
              </Button>
            </Space>
          )}

          {isMonitoring && Object.keys(monitorValues).length > 0 && (
            <div style={{ marginTop: 16 }}>
              <Table
                dataSource={Object.values(monitorValues)}
                columns={tableColumns}
                rowKey="address"
              />
            </div>
          )}
        </div>

        {/* 连接配置弹窗 */}
        <Modal
          title="添加新连接"
          open={isModalOpen}
          onCancel={() => setIsModalOpen(false)}
          footer={null}
        >
          <Form<ModbusCreateConnectionParam>
            form={connectForm}
            layout="vertical"
            onFinish={handleAddConnection}
          >
            <Form.Item<ModbusCreateConnectionParam>
              label="IP 地址"
              name="ip"
              rules={[{ required: true, message: '请输入IP地址!' }]}
            >
              <Input autoComplete="off" />
            </Form.Item>
            <Form.Item<ModbusCreateConnectionParam>
              label="端口"
              name="port"
              rules={[{ required: true, message: '请输入端口号!' }]}
            >
              <Input type="number" />
            </Form.Item>
            <Form.Item>
              <Space>
                <Button type="primary" htmlType="submit">
                  确定
                </Button>
                <Button onClick={() => setIsModalOpen(false)}>
                  取消
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Modal>

        {/* 监控配置弹窗 */}
        <Modal
          title="配置监控地址"
          open={isMonitorModalOpen}
          onCancel={() => setIsMonitorModalOpen(false)}
          footer={null}
        >
          <Form
            form={monitorForm}
            name="monitor_form"
            onFinish={handleStartMonitor}
          >
            <Form.List name="items">
              {(fields, { add, remove }) => (
                <>
                  {fields.map(({ key, name, ...restField }) => (
                    <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                      <Form.Item
                        {...restField}
                        name={[name, 'address']}
                        rules={[{ required: true, message: '请输入地址' }]}
                      >
                        <Input type="number" placeholder="地址" />
                      </Form.Item>
                      <Form.Item
                        {...restField}
                        name={[name, 'dataType']}
                        rules={[{ required: true, message: '请选择数据类型' }]}
                      >
                        <Select style={{ width: 120 }}>
                          <Select.Option value="1">Bool</Select.Option>
                          <Select.Option value="2">Word</Select.Option>
                          <Select.Option value="3">DWord</Select.Option>
                          <Select.Option value="4">Float</Select.Option>
                        </Select>
                      </Form.Item>
                      <MinusCircleOutlined onClick={async () => {
                        const address = monitorForm.getFieldValue(['items', name, 'address']);
                        if (address) {
                          await plcUnregisterTask({ clientId: clientId!, address: Number(address) })
                        }
                        remove(name);
                      }} />
                    </Space>
                  ))}
                  <Form.Item>
                    <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                      添加监控地址
                    </Button>
                  </Form.Item>
                </>
              )}
            </Form.List>
            <Form.Item>
              <Space>
                <Button type="primary" htmlType="submit">
                  开始监控
                </Button>
                <Button onClick={() => setIsMonitorModalOpen(false)}>
                  取消
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Modal>

        <Modal
          title="设置值"
          open={isSetValueModalOpen}
          onCancel={() => setIsSetValueModalOpen(false)}
          footer={null}
        >
          <Form
            form={setValueForm}
            layout="vertical"
            onFinish={handleSetValue}
          >
            <Form.Item
              label="地址"
              name="address"
              rules={[{ required: true, message: '请输入地址!' }]}
            >
              <Input type="number" />
            </Form.Item>
            <Form.Item
              label="数据类型"
              name="dataType"
              rules={[{ required: true, message: '请选择数据类型!' }]}
            >
              <Select>
                <Select.Option value="1">Bool</Select.Option>
                <Select.Option value="2">Word</Select.Option>
                <Select.Option value="3">DWord</Select.Option>
                <Select.Option value="4">Float</Select.Option>
              </Select>
            </Form.Item>
            <Form.Item
              label="值"
              name="value"
              rules={[{ required: true, message: '请输入值!' }]}
            >
              <Input autoComplete="off" placeholder="布尔值输入 true/false，数值直接输入" />
            </Form.Item>
            <Form.Item>
              <Space>
                <Button type="primary" htmlType="submit">
                  确定
                </Button>
                <Button onClick={() => setIsSetValueModalOpen(false)}>
                  取消
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Modal>
      </ThemeConfig>
    </main>
  );
}
