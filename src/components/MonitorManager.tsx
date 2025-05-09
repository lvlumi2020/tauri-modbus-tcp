"use client";

import { useState } from 'react';
import { Button, Space, Modal, Form, Input, Select, Table } from 'antd';
import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons';
import { ColumnsType } from 'antd/lib/table';
import { useMonitor } from '@/hooks';

interface MonitorManagerProps {
    clientId: number | undefined;
}

const MonitorManager: React.FC<MonitorManagerProps> = ({ clientId }) => {
    const [isMonitorModalOpen, setIsMonitorModalOpen] = useState(false);
    const [monitorForm] = Form.useForm();

    // 使用自定义钩子管理监控状态
    const { isMonitoring, monitorValues, startMonitor, stopMonitor, unregisterItem } = useMonitor(clientId);

    // 表格列定义
    const tableColumns: ColumnsType = [
        { title: '地址', dataIndex: 'address', key: 'address', width: 100 },
        {
            title: '数据类型', dataIndex: 'dataType', key: 'dataType',
            width: 120,
            render: (type: number) => ['', 'Bool', 'Word', 'DWord', 'Float'][type]
        },
        {
            title: '值', dataIndex: 'value', key: 'value',
            render: (v) => <span style={{ fontWeight: 'bold' }}>{`${v}`}</span>
        }
    ];

    const handleStartMonitor = async (values: any) => {
        if (!clientId) return;
        await startMonitor(values.items || []);
        setIsMonitorModalOpen(false);
    };

    return (
        <div style={{ width: '100%' }}>
            <div style={{ padding: '16px', backgroundColor: '#f0f7ff', borderRadius: '8px', marginBottom: '16px', width: '100%', boxSizing: 'border-box' }}>
                <p style={{ margin: 0, color: '#1677ff' }}>在此处可以配置需要监控的PLC地址，实时查看数据变化</p>
            </div>
            <Space style={{ marginBottom: 16 }}>
                <Button
                    type="primary"
                    onClick={() => setIsMonitorModalOpen(true)}
                    disabled={!clientId}
                    size="large"
                    style={{ borderRadius: '4px' }}
                >
                    配置监控
                </Button>
                {isMonitoring && (
                    <Button
                        danger
                        onClick={stopMonitor}
                        size="large"
                        style={{ borderRadius: '4px' }}
                    >
                        停止监控
                    </Button>
                )}
            </Space>

            {isMonitoring && Object.keys(monitorValues).length > 0 && (
                <div style={{ marginTop: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.1)', borderRadius: '8px', overflow: 'hidden' }}>
                    <Table
                        dataSource={Object.values(monitorValues)}
                        columns={tableColumns}
                        rowKey="address"
                        pagination={false}
                        bordered
                        style={{ background: 'white' }}
                    />
                </div>
            )}

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
                                            if (!clientId) return;
                                            const address = monitorForm.getFieldValue(['items', name, 'address']);
                                            if (address) {
                                                await unregisterItem(Number(address));
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
        </div>
    );
};

export default MonitorManager;