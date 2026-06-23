export const API_ENDPOINTS = Object.freeze({
  AUTH: Object.freeze({
    LOGIN: "/user/login",
    VERIFY_OTP: "/user/verify-otp",
    RESEND_OTP: "/user/resend-otp",
  }),
  USER: Object.freeze({
    BASE: "/user",
    ADD: "/user/add",
    BY_ID: (userId) => `/user/${userId}`,
    UPDATE: (userId) => `/user/update/${userId}`,
  }),
  PANELS: Object.freeze({
    BASE: "/panels",
  }),
  LOCATIONS: Object.freeze({
    BASE: "/locations",
    BY_ID: (locationId) => `/locations/${locationId}`,
  }),
  HOSTING: Object.freeze({}),
  SUPPORT: Object.freeze({}),
  BILLING: Object.freeze({}),
  WORKSPACES: Object.freeze({}),
  DRIVE: Object.freeze({}),
});
