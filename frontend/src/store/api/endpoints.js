export const API_ENDPOINTS = Object.freeze({
  AUTH: Object.freeze({
    LOGIN: "/user/login",
    VERIFY_OTP: "/user/verify-otp",
    RESEND_OTP: "/user/resend-otp",
  }),
  USER: Object.freeze({}),
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
