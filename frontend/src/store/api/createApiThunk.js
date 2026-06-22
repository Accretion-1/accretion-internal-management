import { createAsyncThunk } from "@reduxjs/toolkit";
import apiHandler from "./apiHandler";

const resolveOption = (option, payload, thunkApi) =>
  typeof option === "function" ? option(payload, thunkApi) : option;

const toRejectedPayload = (error) => ({
  message: error?.message || "Something went wrong. Please try again.",
  status: error?.status || 0,
  code: error?.code || error?.status || 0,
  description: error?.description || error?.message || "Request failed",
});

export const createApiThunk = (typePrefix, requestConfig) =>
  createAsyncThunk(typePrefix, async (payload, thunkApi) => {
    try {
      const method = resolveOption(requestConfig.method, payload, thunkApi) || "GET";
      const requestData = Object.hasOwn(requestConfig, "data")
        ? resolveOption(requestConfig.data, payload, thunkApi)
        : String(method).toUpperCase() === "GET"
          ? undefined
          : payload;

      return await apiHandler({
        method,
        url: resolveOption(requestConfig.url, payload, thunkApi),
        data: requestData,
        params: resolveOption(requestConfig.params, payload, thunkApi),
        headers: resolveOption(requestConfig.headers, payload, thunkApi),
        showNotification: resolveOption(requestConfig.showNotification, payload, thunkApi),
        successMessage: resolveOption(requestConfig.successMessage, payload, thunkApi),
        errorMessage: resolveOption(requestConfig.errorMessage, payload, thunkApi),
      });
    } catch (error) {
      return thunkApi.rejectWithValue(toRejectedPayload(error));
    }
  });

export default createApiThunk;
