export const API_ENDPOINTS = Object.freeze({
  AUTH: Object.freeze({
    LOGIN: "/user/login",
    VERIFY_OTP: "/user/verify-otp",
    RESEND_OTP: "/user/resend-otp",
  }),
  USER: Object.freeze({
    BASE: "/user",
    PROFILE: "/user/profile",
    ADD: "/user/add",
    BY_ID: (userId) => `/user/${userId}`,
    UPDATE: (userId) => `/user/update/${userId}`,
    DELETE: (userId) => `/user/delete/${userId}`,
    UPDATE_FCM_TOKEN: "/user/fcm-token",
  }),
  NOTIFICATIONS: Object.freeze({
    SEND: "/notifications/send",
  }),
  OCR: Object.freeze({
    VERIFY: "/v1/ocr/verify",
  }),
  PANELS: Object.freeze({
    BASE: "/panels",
  }),
  LOCATIONS: Object.freeze({
    BASE: "/locations",
    BY_ID: (locationId) => `/locations/${locationId}`,
  }),
  TODOS: Object.freeze({
    BASE: "/todos",
    ADD: "/todos/add-todos",
    BY_ID: (todoId) => `/todos/${todoId}`,
    UPDATE: (todoId) => `/todos/${todoId}`,
    COMPLETIONS: (todoId) => `/todos/${todoId}/completions`,
    MY: "/todos/my",
    MY_BY_ID: (todoId) => `/todos/my/${todoId}`,
    COMPLETE: (todoId) => `/todos/my/${todoId}/complete`,
    COMPLETE_FOR_LOCATION: (todoId, locationId) => `/todos/${todoId}/location/${locationId}/complete`,
    TODAY_TASKS: "/todos/today-tasks",
    TODAY_UNIQUE_TASKS: "/todos/today-unique-tasks",
    STOCK_REPORT: "/todos/reports/stock-completions",
  }),
  HOSTING: Object.freeze({}),
  SUPPORT: Object.freeze({}),
  BILLING: Object.freeze({}),
  WORKSPACES: Object.freeze({}),
  DRIVE: Object.freeze({}),
});
