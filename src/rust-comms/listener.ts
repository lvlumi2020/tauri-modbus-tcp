import { listen } from '@tauri-apps/api/event';
import { 
    ListenerCommand, 
    PlcBoolUpdateValue, 
    PlcWordUpdateValue,
    PlcDwordUpdateValue,
    PlcFloatUpdateValue 
} from './types';

// 添加事件监听
export const plcBoolUpdateEventListener = async (func: (value: PlcBoolUpdateValue) => void) => {
    return await listen<PlcBoolUpdateValue>(ListenerCommand.PlcBoolUpdate, (event) => {
        func(event.payload);
    });
};

export const plcWordUpdateEventListener = async (func: (value: PlcWordUpdateValue) => void) => {
    return await listen<PlcWordUpdateValue>(ListenerCommand.PlcWordUpdate, (event) => {
        func(event.payload);
    });
};

export const plcDwordUpdateEventListener = async (func: (value: PlcDwordUpdateValue) => void) => {
    return await listen<PlcDwordUpdateValue>(ListenerCommand.PlcDwordUpdate, (event) => {
        func(event.payload);
    });
};

export const plcFloatUpdateEventListener = async (func: (value: PlcFloatUpdateValue) => void) => {
    return await listen<PlcFloatUpdateValue>(ListenerCommand.PlcFloatUpdate, (event) => {
        func(event.payload);
    });
};