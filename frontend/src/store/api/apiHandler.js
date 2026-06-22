import toast from "react-hot-toast";
import apiClient from "./apiClient";

const MUTATION_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

const normalizeMethod = (method) => String(method || "GET").toUpperCase();

const normalizeHandlerError = (error, fallbackMessage) => {
  const responseData = error.raw?.response?.data || {};
  const message =
    responseData.message ||
    responseData.msg ||
    error.message ||
    fallbackMessage ||
    "Something went wrong. Please try again.";

  return {
    message,
    status: error.status || error.raw?.response?.status || 0,
    code: responseData.code || error.status || 0,
    description: responseData.description || responseData.error || message,
    raw: error.raw || error,
  };
};

export const apiHandler = async ({
  method = "GET",
  url,
  data,
  params,
  headers,
  showNotification,
  successMessage,
  errorMessage,
}) => {
  const requestMethod = normalizeMethod(method);
  const shouldNotify = showNotification ?? MUTATION_METHODS.has(requestMethod);

  try {
    const response = await apiClient.request({
      method: requestMethod,
      url,
      data,
      params,
      headers,
    });

    if (shouldNotify) {
      const message =
        response.data?.message ||
        response.data?.msg ||
        successMessage ||
        "Operation successful.";
      toast.success(message);
    }

    return response.data;
  } catch (error) {
    const normalizedError = normalizeHandlerError(error, errorMessage);

    if (shouldNotify) {
      toast.error(normalizedError.message);
    }

    throw normalizedError;
  }
};

export default apiHandler;
