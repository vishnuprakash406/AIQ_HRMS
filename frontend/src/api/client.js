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
}, (error) => {
  return Promise.reject(error);
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid, determine which login page to redirect to
      const userRole = localStorage.getItem('userRole');
      
      // Clear all tokens
      localStorage.removeItem('accessToken');
      localStorage.removeItem('masterToken');
      localStorage.removeItem('companyToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('userRole');
      
      // Redirect to appropriate login based on role
      if (userRole === 'master') {
        window.location.href = '/master-login';
      } else if (userRole === 'company_admin') {
        window.location.href = '/company-login';
      } else {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
