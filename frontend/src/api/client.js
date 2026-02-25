import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000/api/v1',
  headers: {
    'Content-Type': 'application/json'
  }
});

api.interceptors.request.use((config) => {
  // Check for different token types based on user role
  const masterToken = localStorage.getItem('masterToken');
  const companyToken = localStorage.getItem('companyToken');
  const accessToken = localStorage.getItem('accessToken');
  
  const token = masterToken || companyToken || accessToken;
  
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
