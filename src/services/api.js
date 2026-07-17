export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
export const BASE_URL = API_URL.replace('/api', '');

let getRequestController = new AbortController();

export const cancelPendingGetRequests = () => {
  getRequestController.abort();
  getRequestController = new AbortController();
};

const getHeaders = () => {
  const token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

export const api = {
  get: async (endpoint, options = {}) => {
    try {
      let finalEndpoint = endpoint;
      if (options.params) {
        const queryParams = new URLSearchParams();
        Object.entries(options.params).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            queryParams.append(key, value);
          }
        });
        const queryString = queryParams.toString();
        if (queryString) {
          finalEndpoint += (endpoint.includes('?') ? '&' : '?') + queryString;
        }
      }

      const signal = options.signal || getRequestController.signal;

      const response = await fetch(`${API_URL}${finalEndpoint}`, {
        method: 'GET',
        headers: getHeaders(),
        signal,
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Failed to fetch data');
      return result;
    } catch (error) {
      if (error.name === 'AbortError') {
        // Return a promise that never resolves so subsequent code is skipped
        return new Promise(() => {});
      }
      throw error;
    }
  },

  post: async (endpoint, data, options = {}) => {
    const isFormData = data instanceof FormData;
    const headers = getHeaders();
    if (isFormData) {
      delete headers['Content-Type'];
    }
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers,
      body: isFormData ? data : JSON.stringify(data),
      signal: options.signal,
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || 'Failed to save data');
    return result;
  },

  put: async (endpoint, data, options = {}) => {
    const isFormData = data instanceof FormData;
    const headers = getHeaders();
    if (isFormData) {
      delete headers['Content-Type'];
    }
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'PUT',
      headers,
      body: isFormData ? data : JSON.stringify(data),
      signal: options.signal,
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || 'Failed to update data');
    return result;
  },

  delete: async (endpoint, options = {}) => {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'DELETE',
      headers: getHeaders(),
      signal: options.signal,
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || 'Failed to delete data');
    return result;
  },
};
