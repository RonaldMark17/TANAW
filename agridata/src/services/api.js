// import axios from 'axios';

// const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001/api'|| 'http://192.168.254.104:5001/api ';

// const api = axios.create({
//   baseURL: API_URL,
//   // Removed explicit 'Content-Type' to allow Axios to set boundaries for file uploads automatically
//   timeout: 15000, 
// });

// // --- REQUEST INTERCEPTOR ---
// // Automatically attaches the JWT token to every outgoing request
// api.interceptors.request.use(
//   (config) => {
//     const token = localStorage.getItem('access_token');
//     if (token) {
//       config.headers.Authorization = `Bearer ${token}`;
//     }
//     return config;
//   },
//   (error) => Promise.reject(error)
// );

// // --- RESPONSE INTERCEPTOR ---
// // Handles 401 errors by attempting to refresh the token automatically
// api.interceptors.response.use(
//   (response) => response,
//   async (error) => {
//     const originalRequest = error.config;

//     // Safety check: ensure url exists before checking includes
//     const isRefreshPath = originalRequest.url && originalRequest.url.includes('/auth/refresh');

//     // We check if the error is 401 and ensure we aren't already retrying 
//     // or trying to refresh the refresh token itself.
//     if (error.response?.status === 401 && !originalRequest._retry && !isRefreshPath) {
//       originalRequest._retry = true;

//       try {
//         const refreshToken = localStorage.getItem('refresh_token');
//         if (!refreshToken) throw new Error("No refresh token stored");

//         // Use a clean axios instance to avoid interceptor recursion
//         const response = await axios.post(`${API_URL}/auth/refresh`, {}, {
//           headers: { Authorization: `Bearer ${refreshToken}` }
//         });

//         const { access_token } = response.data;
//         localStorage.setItem('access_token', access_token);

//         // Update the failed request and retry it
//         originalRequest.headers.Authorization = `Bearer ${access_token}`;
//         return api(originalRequest);
//       } catch (refreshError) {
//         // If refresh fails, clear everything and force re-login
//         localStorage.clear(); 
//         window.location.href = '/login';
//         return Promise.reject(refreshError);
//       }
//     }
//     return Promise.reject(error);
//   }
// );

// // ============ API MODULES ============

// // Auth API
// export const authAPI = {
//   login: (credentials) => api.post('/auth/login', credentials),
//   register: (userData) => api.post('/auth/register', userData),
//   getCurrentUser: () => api.get('/auth/me'),
  
//   // Password Reset Flow
//   requestOtp: (email) => api.post('/auth/forgot-password', { email }),
//   verifyOtpReset: (data) => api.post('/auth/verify-otp-reset', data), 
//   resetPassword: (data) => api.post('/auth/reset-password', data),
  
//   // Login OTP Verification
//   verifyOtp: (data) => api.post('/auth/verify-otp', data), 
//   toggleOtp: (enable) => api.post('/auth/toggle-otp', { enable }),
// };

// // Dashboard API
// export const dashboardAPI = {
//   getStats: (params) => api.get('/dashboard/stats', { params }),
// };

// // Farmers API
// export const farmersAPI = {
//   getAll: (params) => api.get('/farmers', { params }),
//   getById: (id) => api.get(`/farmers/${id}`),
//   create: (data) => api.post('/farmers', data),
//   update: (id, data) => api.put(`/farmers/${id}`, data),
//   delete: (id) => api.delete(`/farmers/${id}`),

//   addProduct: (farmerId, data) => api.post(`/farmers/${farmerId}/products`, data),
//   addChild: (farmerId, data) => api.post(`/farmers/${farmerId}/children`, data),
//   exportData: () => api.get('/export/farmers', { responseType: 'blob' }),
  
//   updateChild: (farmerId, childId, data) => 
//         api.put(`/farmers/${farmerId}/children/${childId}`, data),

//   deleteChild: (farmerId, childId) => 
//         api.delete(`/farmers/${farmerId}/children/${childId}`),
// };

// // Experiences API
// export const experiencesAPI = {
//   getAll: (params) => api.get('/experiences', { params }),
//   create: (data) => api.post('/experiences', data),
//   // Used for toggling comment sections (locking discussions)
//   update: (id, data) => api.put(`/experiences/${id}`, data),
//   toggleLike: (id) => api.post(`/experiences/${id}/like`),
  
//   // Comment Management
//   addComment: (id, data) => api.post(`/experiences/${id}/comments`, data),
//   updateComment: (expId, commentId, data) => api.put(`/experiences/${expId}/comments/${commentId}`, data),
//   deleteComment: (expId, commentId) => api.delete(`/experiences/${expId}/comments/${commentId}`),
//   toggleCommentLike: (expId, commentId) => api.post(`/experiences/${expId}/comments/${commentId}/like`),
// };

// // Projects API
// export const projectsAPI = {
//   getAll: (params) => api.get('/projects', { params }),
//   create: (data) => api.post('/projects', data),
// };

// // Barangays API
// export const barangaysAPI = {
//   getAll: () => api.get('/barangays'),
//   create: (data) => api.post('/barangays', data),
// };

// // Mapping API
// export const mappingAPI = {
//   getDemographics: () => api.get('/mapping/demographics'),
// };

// // Products API
// export const productsAPI = {
//   getAll: () => api.get('/products'),
//   create: (data) => api.post('/products', data),
//   update: (id, data) => api.put(`/products/${id}`, data),
//   delete: (id) => api.delete(`/products/${id}`),
// };

// // Organizations API
// export const organizationsAPI = {
//   getAll: () => api.get('/organizations'),
//   create: (data) => api.post('/organizations', data),
//   update: (id, data) => api.put(`/organizations/${id}`, data),
//   delete: (id) => api.delete(`/organizations/${id}`),
// };

// // Users API
// export const usersAPI = {
//   getAll: () => api.get('/users'),
//   update: (id, data) => api.put(`/users/${id}`, data),
//   delete: (id) => api.delete(`/users/${id}`), 
// };

// // Activity Logs API
// export const activityLogsAPI = {
//   getAll: (params) => api.get('/activity-logs', { params }),
// };

// // Surveys API
// export const surveysAPI = {
//   getAll: () => api.get('/surveys'),
//   create: (data) => api.post('/surveys', data),
//   update: (id, data) => api.put(`/surveys/${id}`, data),
//   delete: (id) => api.delete(`/surveys/${id}`),
// };

// // Notifications API
// export const notificationsAPI = {
//   getAll: () => api.get('/notifications'),
//   markAsRead: (id) => api.put(`/notifications/${id}/read`),
//   markAllRead: () => api.put('/notifications/read-all'),
//   deleteAll: () => api.delete('/notifications')
// };

// export default api;


import axios from 'axios';

// Set this to your exact ngrok URL. Do not include trailing slashes.
// Make sure to append /api so the routes map correctly.
// const API_URL = 'https://TANAW-backend-7cmk.onrender.com/api';
const API_URL = 'https://cecile-unchipped-shea.ngrok-free.dev/api' || 'http://127.0.0.1:8080/api';
//const API_URL = 'http://192.168.254.104:8080/api' || 'http://127.0.0.1:8080/api' || 'http://172.20.10.11:8080/api';
//const API_URL = 'http://127.0.0.1:8080/api';

const api = axios.create({
  baseURL: API_URL,
  timeout: 15000, 
  // Required to bypass the ngrok warning page for API calls
  headers: {
    "ngrok-skip-browser-warning": "true"
  }
});

// --- REQUEST INTERCEPTOR ---
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// --- RESPONSE INTERCEPTOR ---
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    const isRefreshPath = originalRequest.url && originalRequest.url.includes('/auth/refresh');

    if (error.response?.status === 401 && !originalRequest._retry && !isRefreshPath) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refresh_token');
        if (!refreshToken) throw new Error("No refresh token stored");

        const response = await axios.post(`${API_URL}/auth/refresh`, {}, {
          headers: { 
            Authorization: `Bearer ${refreshToken}`,
            "ngrok-skip-browser-warning": "true" 
          }
        });

        const { access_token } = response.data;
        localStorage.setItem('access_token', access_token);

        originalRequest.headers.Authorization = `Bearer ${access_token}`;
        return api(originalRequest);
      } catch (refreshError) {
        localStorage.clear(); 
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

// ============ API MODULES ============

// Auth API
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  getCurrentUser: () => api.get('/auth/me'),
  requestOtp: (email) => api.post('/auth/forgot-password', { email }),
  verifyOtpReset: (data) => api.post('/auth/verify-otp-reset', data), 
  resetPassword: (data) => api.post('/auth/reset-password', data),
  verifyOtp: (data) => api.post('/auth/verify-otp', data), 
  toggleOtp: (enable) => api.post('/auth/toggle-otp', { enable }),
};

// Dashboard API
export const dashboardAPI = {
  getStats: (params) => api.get('/dashboard/stats', { params }),
};

// Farmers API
export const farmersAPI = {
  getAll: (params) => api.get('/farmers', { params }),
  getById: (id) => api.get(`/farmers/${id}`),
  create: (data) => api.post('/farmers', data),
  update: (id, data) => api.put(`/farmers/${id}`, data),
  delete: (id) => api.delete(`/farmers/${id}`),
  addProduct: (farmerId, data) => api.post(`/farmers/${farmerId}/products`, data),
  addChild: (farmerId, data) => api.post(`/farmers/${farmerId}/children`, data),
  exportData: () => api.get('/export/farmers', { responseType: 'blob' }),
  updateChild: (farmerId, childId, data) => api.put(`/farmers/${farmerId}/children/${childId}`, data),
  deleteChild: (farmerId, childId) => api.delete(`/farmers/${farmerId}/children/${childId}`),
};

// Experiences API
export const experiencesAPI = {
  getAll: (params) => api.get('/experiences', { params }),
  create: (data) => api.post('/experiences', data),
  
  toggleLike: (id) => api.post(`/experiences/${id}/like`),
  addComment: (id, data) => api.post(`/experiences/${id}/comments`, data),
  updateComment: (expId, commentId, data) => api.put(`/experiences/${expId}/comments/${commentId}`, data),
  deleteComment: (expId, commentId) => api.delete(`/experiences/${expId}/comments/${commentId}`),
  toggleCommentLike: (expId, commentId) => api.post(`/experiences/${expId}/comments/${commentId}/like`),
  update: (id, data) => api.put(`/experiences/${id}`, data), 
  delete: (id) => api.delete(`/experiences/${id}`),
};

// Projects API
export const projectsAPI = {
  getAll: (params) => api.get('/projects', { params }),
  create: (data) => api.post('/projects', data),
};

// Barangays API
export const barangaysAPI = {
  getAll: () => api.get('/barangays'),
  create: (data) => api.post('/barangays', data),
};

// Mapping API
export const mappingAPI = {
  getDemographics: () => api.get('/mapping/demographics'),
};

// Products API
export const productsAPI = {
  getAll: () => api.get('/products'),
  create: (data) => api.post('/products', data),
  update: (id, data) => api.put(`/products/${id}`, data),
  delete: (id) => api.delete(`/products/${id}`),
};

// Organizations API
export const organizationsAPI = {
  getAll: () => api.get('/organizations'),
  create: (data) => api.post('/organizations', data),
  update: (id, data) => api.put(`/organizations/${id}`, data),
  delete: (id) => api.delete(`/organizations/${id}`),
};

// Users API
export const usersAPI = {
  getAll: () => api.get('/users'),
  update: (id, data) => api.put(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`), 
};

// Activity Logs API
export const activityLogsAPI = {
  getAll: (params) => api.get('/activity-logs', { params }),
};

// Surveys API
export const surveysAPI = {
  getAll: () => api.get('/surveys'),
  create: (data) => api.post('/surveys', data),
  update: (id, data) => api.put(`/surveys/${id}`, data),
  delete: (id) => api.delete(`/surveys/${id}`),
};

// Notifications API
export const notificationsAPI = {
  getAll: () => api.get('/notifications'),
  markAsRead: (id) => api.put(`/notifications/${id}/read`),
  markAllRead: () => api.put('/notifications/read-all'),
  deleteAll: () => api.delete('/notifications')
};

export default api;