import axios from 'axios';

const api = axios.create({
    // Dynamic host enables LAN devices (Computer 2) to connect automatically
    baseURL: `http://${window.location.hostname}:8000/api`, 
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    }
});

// Request interceptor to attach token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

export default api;
