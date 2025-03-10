import { Api } from "./api";

const axiosConfig = {
    baseURL: process.env.NEXT_PUBLIC_API_BASE_URL,
    timeout: 5000,
    headers: {
        'Content-Type': 'application/json',
    },
};


export const api = new Api({ ...axiosConfig });