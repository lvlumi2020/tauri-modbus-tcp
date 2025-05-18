"use client";

import { useState, useEffect } from 'react';
import { Button, Select, Space, Modal, Form, Input } from 'antd';
import { MinusCircleOutlined } from '@ant-design/icons';
import {
    modbusCreateTCPConnection,
    modbusDisconnect,
    modbusCreateSerialConnection,
    getSerialPorts
} from '@/rust-comms';

interface Connection {
    id: number;
    label: string;
}

interface ConnectionManagerProps {
    clientId: number | undefined;
    setClientId: (id: number | undefined) => void;
    isMonitoring: boolean;
    onStopMonitor: () => Promise<void>;
}

interface TCPInfo {
    ip: string;
    port: string | number;
}

interface SerialInfo {
    serialPort: string;
    slaveId: number;
    baudRate: number;
}

const ConnectionManager: React.FC<ConnectionManagerProps> = ({
    clientId,
    setClientId,
    isMonitoring,
    onStopMonitor
}) => {
    const [connections, setConnections] = useState<Connection[]>([]);
    const [isTCPModalOpen, setIsTCPModalOpen] = useState(false);
    const [isSerialModalOpen, setIsSerialModalOpen] = useState(false);
    const [connectTCPForm] = Form.useForm<TCPInfo>();
    const [connectSerialForm] = Form.useForm<SerialInfo>();
    const [serialPorts, setSerialPorts] = useState<string[]>([]);

    const handleAddConnection = async (values: TCPInfo) => {
        const port = Number(values.port);
        const newLabel = `${values.ip}:${port}`;

        if (connections.some(conn => conn.label === newLabel)) {
            Modal.error({
                title: '添加失败',
                content: '该连接已存在'
            });
            return;
        }

        const id = await modbusCreateTCPConnection(values.ip, port);
        const newConnection = { id, label: newLabel };
        setConnections(prev => [...prev, newConnection]);
        setIsTCPModalOpen(false);
        connectTCPForm.resetFields();
        setClientId(id);
    };

    const handleAddSerialConnection = async (values: SerialInfo) => {
        values.baudRate = Number(values.baudRate);
        values.slaveId = Number(values.slaveId);
        const newLabel = `${values.serialPort}:${values.baudRate}`;

        if (connections.some(conn => conn.label === newLabel)) {
            Modal.error({
                title: '添加失败',
                content: '该连接已存在'
            });
            return;
        }

        try {
            const id = await modbusCreateSerialConnection(values.serialPort, values.baudRate, values.slaveId);
            const newConnection = { id, label: newLabel };
            setConnections(prev => [...prev, newConnection]);
            setIsSerialModalOpen(false);
            connectSerialForm.resetFields();
            setClientId(id);
        } catch (error) {
            Modal.error({
                title: '连接失败',
                content: `错误信息: ${error}`
            });
        }
    };

    const handleDeleteConnection = async (id: number, e: React.MouseEvent) => {
        e.stopPropagation();
        if (clientId === id) {
            if (isMonitoring) {
                await onStopMonitor();
            }
            await modbusDisconnect(clientId);
            setClientId(undefined);
        }
        setConnections(prev => prev.filter(conn => conn.id !== id));
    };

    useEffect(() => {
        if (isSerialModalOpen) {
            getSerialPorts().then(ports => {
                setSerialPorts(ports);
            });
        }
    }, [isSerialModalOpen]);

    return (
        <div style={{ width: '100%' }}>
            <Space style={{ marginBottom: 24, width: '100%', display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                <Select
                    style={{ width: 280, height: '40px' }}
                    value={clientId}
                    size="large"
                    onChange={async (value) => {
                        if (clientId !== undefined) {
                            await onStopMonitor();
                            // await modbusDisconnect({ clientId });
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
                <Button
                    type="primary"
                    onClick={() => setIsTCPModalOpen(true)}
                    size="large"
                    style={{ borderRadius: '4px' }}
                >
                    添加TCP连接
                </Button>
                <Button
                    type="primary"
                    onClick={() => setIsSerialModalOpen(true)}
                    size="large"
                    style={{ borderRadius: '4px' }}
                >
                    添加串口连接
                </Button>
            </Space>

            {/* TCP连接配置弹窗 */}
            <Modal
                title="添加TCP新连接"
                open={isTCPModalOpen}
                onCancel={() => setIsTCPModalOpen(false)}
                footer={null}
            >
                <Form<TCPInfo>
                    form={connectTCPForm}
                    layout="vertical"
                    onFinish={handleAddConnection}
                >
                    <Form.Item<TCPInfo>
                        label="IP 地址"
                        name="ip"
                        rules={[{ required: true, message: '请输入IP地址!' }]}
                    >
                        <Input autoComplete="off" />
                    </Form.Item>
                    <Form.Item<TCPInfo>
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
                            <Button onClick={() => setIsTCPModalOpen(false)}>
                                取消
                            </Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Modal>

            {/* 串口连接配置弹窗 */}
            <Modal
                title="添加串口连接"
                open={isSerialModalOpen}
                onCancel={() => setIsSerialModalOpen(false)}
                footer={null}
            >
                <Form<SerialInfo>
                    form={connectSerialForm}
                    layout="vertical"
                    onFinish={handleAddSerialConnection}
                    initialValues={{ baudRate: 9600, slaveId: 1 }}
                >
                    <Form.Item
                        label="串口名"
                        name="serialPort"
                        rules={[{ required: true, message: '请输入串口名!' }]}
                    >
                        <Select options={serialPorts.map((v) => ({
                            label: v,
                            value: v
                        }))} />
                    </Form.Item>
                    <Form.Item
                        label="波特率"
                        name="baudRate"
                        rules={[{ required: true, message: '请输入波特率!' }]}
                    >
                        <Input type='number' />
                    </Form.Item>
                    <Form.Item
                        label="从站地址"
                        name="slaveId"
                        rules={[{ required: true, message: '请输入从站地址!' }]}
                    >
                        <Input type="number" min={1} max={255} />
                    </Form.Item>
                    <Form.Item>
                        <Space>
                            <Button type="primary" htmlType="submit">
                                确定
                            </Button>
                            <Button onClick={() => setIsSerialModalOpen(false)}>
                                取消
                            </Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default ConnectionManager;