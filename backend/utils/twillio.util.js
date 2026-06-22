import { MSG91_AUTH_KEY, MSG91_TEMPLATE_ID } from "../constants.js";
import { ApiError } from "./api.util.js";
import { CUSTOM_ERROR } from "./message.util.js";

export const sendOTP = async (phoneNumber, otp) => {
  if (!MSG91_AUTH_KEY || !MSG91_TEMPLATE_ID) {
    throw new ApiError(CUSTOM_ERROR, "MSG91 auth key or template ID is missing");
  }

  const query = new URLSearchParams({
    template_id: MSG91_TEMPLATE_ID,
    mobile: phoneNumber.replace(/\D/g, ""),
    otp,
  });

  try {
    const response = await fetch(`https://control.msg91.com/api/v5/otp?${query}`, {
      method: "POST",
      headers: {
        accept: "application/json",
        authkey: MSG91_AUTH_KEY,
        "content-type": "application/json",
      },
      body: JSON.stringify({}),
    });
    const responseBody = await response.text();

    if (!response.ok || /error|failure|invalid/i.test(responseBody)) {
      throw new Error(responseBody || "MSG91 rejected the request");
    }
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(CUSTOM_ERROR, "Failed to send OTP", error, false);
  }
};
