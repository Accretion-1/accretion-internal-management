import axios from "axios";

const STORAGE_KEYS = ["authToken", "authUserProfile", "isAuthenticated"];

const clearStoredAuth = () => {
  STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
};

const getErrorMessage = (error) =>
  error.response?.data?.message ||
  error.response?.data?.msg ||
  error.message ||
  "Something went wrong. Please try again.";

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/",
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("authToken");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  if (config.data instanceof FormData) {
    delete config.headers["Content-Type"];
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status || 0;

    if (status === 401) {
      clearStoredAuth();
      window.dispatchEvent(new CustomEvent("auth:unauthorized"));
    }

    return Promise.reject({
      message: getErrorMessage(error),
      status,
      raw: error,
    });
  },
);

export { clearStoredAuth };
export default apiClient;
