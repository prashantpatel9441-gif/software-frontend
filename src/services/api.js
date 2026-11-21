export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
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

const parseResponse = async (response, fallbackMsg = 'Request failed') => {
  const text = await response.text();
  let result;
  try {
    result = text ? JSON.parse(text) : {};
  } catch (e) {
    result = { message: text || response.statusText || fallbackMsg };
  }
  if (!response.ok) {
    throw new Error(result.message || fallbackMsg);
  }
  return result;
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
      return await parseResponse(response, 'Failed to fetch data');
    } catch (error) {
      if (error.name === 'AbortError') {
        return { data: [], total: 0 };
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
    return await parseResponse(response, 'Failed to save data');
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
    return await parseResponse(response, 'Failed to update data');
  },

  delete: async (endpoint, options = {}) => {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'DELETE',
      headers: getHeaders(),
      signal: options.signal,
    });
    return await parseResponse(response, 'Failed to delete data');
  },
};
