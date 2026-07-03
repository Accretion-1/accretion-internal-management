import axios from "axios";
import {
  MSG91_AUTH_KEY,
  MSG91_COUNTRY_CODE,
  MSG91_ROUTE,
  MSG91_TEMPLATE_ID,
} from "../constants.js";
import { ApiError } from "./api.util.js";
import { CUSTOM_ERROR } from "./message.util.js";

const DEFAULT_MSG91_ROUTE = "https://control.msg91.com/api/v5";

const getEnvValue = (value) => String(value || "").trim();

const normalizeMsg91BaseUrl = () => (getEnvValue(MSG91_ROUTE) || DEFAULT_MSG91_ROUTE).replace(/\/+$/, "");

const getMsg91OtpUrl = () => {
  const baseUrl = normalizeMsg91BaseUrl();
  return baseUrl.endsWith("/otp") ? baseUrl : `${baseUrl}/otp`;
};

const normalizeIndianMobileNumber = (phoneNumber) => {
  const countryCode = String(MSG91_COUNTRY_CODE || "91").replace(/\D/g, "");
  let digits = String(phoneNumber || "").replace(/\D/g, "");

  if (digits.startsWith("0") && digits.length === 11) {
    digits = digits.slice(1);
  }

  if (countryCode && digits.length === 10) {
    return `${countryCode}${digits}`;
  }

  return digits;
};

const isMsg91SuccessResponse = (responseBody) => {
  const statusValue = String(
    responseBody?.type ||
    responseBody?.status ||
    responseBody?.success ||
    "",
  ).toLowerCase();

  if (["success", "true", "sent"].includes(statusValue)) return true;
  if (["error", "failure", "failed", "false"].includes(statusValue)) return false;

  return !/error|failure|failed|invalid|unauthorized|blocked/i.test(JSON.stringify(responseBody || ""));
};

const getMsg91ErrorMessage = (responseBody) => (
  responseBody?.message ||
  responseBody?.error ||
  responseBody?.errors ||
  "MSG91 rejected the OTP request"
);

export const sendOTP = async (phoneNumber, otp) => {
  const authKey = getEnvValue(MSG91_AUTH_KEY);
  const templateId = getEnvValue(MSG91_TEMPLATE_ID);

  if (!authKey || !templateId) {
    throw new ApiError(CUSTOM_ERROR, "MSG91 auth key or template ID is missing");
  }

  const mobile = normalizeIndianMobileNumber(phoneNumber);
  if (!mobile || mobile.length < 10) {
    throw new ApiError(CUSTOM_ERROR, "Invalid phone number for MSG91 OTP");
  }

  const params = {
    template_id: templateId,
    mobile,
    authkey: authKey,
    otp: String(otp),
  };
  const body = {
    Param1: String(otp),
  };

  try {
    const response = await axios.post(getMsg91OtpUrl(), body, {
      params,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      timeout: 15000,
      validateStatus: () => true,
    });
    const responseBody = response.data;

    if (response.status < 200 || response.status >= 300 || !isMsg91SuccessResponse(responseBody)) {
      throw new Error(getMsg91ErrorMessage(responseBody));
    }

    return {
      mobile,
      request_id: responseBody?.request_id || null,
      response: responseBody,
    };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(CUSTOM_ERROR, "Failed to send OTP", error, false);
  }
};
