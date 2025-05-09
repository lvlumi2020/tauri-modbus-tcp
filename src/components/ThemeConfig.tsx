"use client";

import { ConfigProvider, theme } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import React, { useEffect, useState, ReactNode, useCallback } from 'react';

interface ThemeConfigProps {
    children: ReactNode
}

const ThemeConfig: React.FC<ThemeConfigProps> = ({ children }) => {

    const [isDarkTheme, setIsDarkTheme] = useState<boolean>(false)
    const bgColor = useCallback(() => isDarkTheme ? "black" : "white", [isDarkTheme]);
    useEffect(() => {
        const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
        setIsDarkTheme(darkModeQuery.matches);
        const handler = (e: MediaQueryListEvent) => setIsDarkTheme(e.matches);
        darkModeQuery.addEventListener('change', handler);
        return () => darkModeQuery.removeEventListener('change', handler);
    }, [])

    useEffect(() => {
        process.env.DEFAULT_BACKGROUND_COLOR = bgColor();
    }, [bgColor])

    return (
        <main>
            <ConfigProvider
                locale={zhCN}
                theme={{
                    algorithm: isDarkTheme ? theme.darkAlgorithm : theme.defaultAlgorithm,
                    token: {
                        fontFamily: 'Courier New'
                    },
                    components: {
                        Form: {
                        },
                        Layout: {
                            triggerBg: bgColor(),
                            siderBg: bgColor(),
                            lightSiderBg: bgColor(),
                            lightTriggerBg: bgColor(),
                            headerBg: bgColor(),
                        }
                    }
                }} >{children}
            </ConfigProvider>
        </main>
    )
}

export default ThemeConfig;
