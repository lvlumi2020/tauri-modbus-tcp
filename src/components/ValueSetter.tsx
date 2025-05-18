"use client";

import { useState } from 'react';
import { Button, Space, Modal, Form, Input, Select } from 'antd';
import {
    plcWriteBool,
    plcWriteDWord,
    plcWriteFloat,
    plcWriteWord
} from '@/rust-comms';

interface ValueSetterProps {
    clientId: number | undefined;
}

const ValueSetter: React.FC<ValueSetterProps> = ({ clientId }) => {
    const [isSetValueModalOpen, setIsSetValueModalOpen] = useState(false);
    const [setValueForm] = Form.useForm();

    const [isBool, setIsBool] = useState<boolean>(false);

    const handleSetValue = async (values: any) => {
        if (!clientId) return;

        const { address, dataType, value } = values;
        try {
            switch (Number(dataType)) {
                case 1: // Bool
                    await plcWriteBool(clientId, Number(address), value.toLowerCase() === 'true');
                    break;
                case 2: // Word
                    await plcWriteWord(clientId, Number(address), parseInt(value));
                    break;
                case 3: // DWord
                    await plcWriteDWord(clientId, Number(address), parseInt(value));
                    break;
                case 4: // Float
                    await plcWriteFloat(clientId, Number(address), parseFloat(value));
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

    return (
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
            <div style={{ padding: '16px', backgroundColor: '#f0f7ff', borderRadius: '8px', marginBottom: '16px', width: '100%', boxSizing: 'border-box' }}>
                <p style={{ margin: 0, color: '#1677ff' }}>在此处可以设置PLC地址的值，支持多种数据类型</p>
            </div>
            <Button
                type="primary"
                onClick={() => setIsSetValueModalOpen(true)}
                disabled={!clientId}
                size="large"
                style={{ borderRadius: '4px', marginBottom: '16px' }}
            >
                设置值
            </Button>

            <Modal
                title="设置值"
                open={isSetValueModalOpen}
                onCancel={() => setIsSetValueModalOpen(false)}
                footer={null}
                width={400}
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
                        <Select onSelect={(value) => {
                            setIsBool(Number(value) == 1);
                        }}>
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
                        {isBool ?
                            <Select >
                                <Select.Option value="false">False</Select.Option>
                                <Select.Option value="true">True</Select.Option>
                            </Select>
                            : <Input autoComplete="off" placeholder="输入值" />}
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
        </div>
    );
};

export default ValueSetter;