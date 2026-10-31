import axios from 'axios';
export const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1', withCredentials: true, headers: { 'Content-Type': 'application/json' } });
export async function initializeCsrf() { const { data } = await api.get('/auth/csrf'); api.defaults.headers.common['X-CSRF-Token'] = data.data.csrfToken; }
export const unwrap = (response) => response.data.data;
export const errorMessage = (error) => error.response?.data?.error?.message || 'Something went wrong. Please try again.';

let refreshInFlight;
api.interceptors.response.use((response) => response, async (error) => {
  const request = error.config;
  const isAuthRequest = request?.url?.startsWith('/auth/');
  if (error.response?.status !== 401 || request?._retried || isAuthRequest) return Promise.reject(error);
  request._retried = true;
  try {
    refreshInFlight ||= api.post('/auth/refresh').finally(() => { refreshInFlight = undefined; });
    await refreshInFlight;
    return api(request);
  } catch (refreshError) {
    window.dispatchEvent(new Event('brightloop:session-expired'));
    return Promise.reject(refreshError);
  }
});
