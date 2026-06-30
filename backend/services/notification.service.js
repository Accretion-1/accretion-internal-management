import { firebaseMessaging } from "../config/firebase.js";

const FCM_TOKEN_MIN_LENGTH = 40;

export const isUnregisteredTokenError = (error) => {
  const code = error?.code || error?.errorInfo?.code;
  return [
    "messaging/registration-token-not-registered",
    "messaging/invalid-registration-token",
    "messaging/invalid-argument",
  ].includes(code);
};

const removeEmptyValues = (payload = {}) => Object.fromEntries(
  Object.entries(payload).filter(([, value]) => value !== undefined && value !== null),
);

const normalizeToken = (token) => String(token || "").trim();

const assertValidToken = (token) => {
  const normalizedToken = normalizeToken(token);

  if (normalizedToken.length < FCM_TOKEN_MIN_LENGTH) {
    throw new Error("Invalid or missing FCM token");
  }

  return normalizedToken;
};

const normalizeDataPayload = (data = {}) => Object.fromEntries(
  Object.entries(removeEmptyValues(data)).map(([key, value]) => [key, String(value)]),
);

export const sendNotification = async (token, title, body, options = {}) => {
  if (process.env.NODE_ENV === "test") {
    return { messageId: "mock-message-id" };
  }
  const normalizedToken = assertValidToken(token);
  const message = {
    token: normalizedToken,
    notification: removeEmptyValues({ title, body }),
    data: options.data ? normalizeDataPayload(options.data) : undefined,
    webpush: {
      notification: removeEmptyValues({
        title,
        body,
        icon: options.icon,
        badge: options.badge,
      }),
      fcmOptions: removeEmptyValues({
        link: options.link,
      }),
    },
  };

  return firebaseMessaging().send(message);
};

export const sendDataNotification = async (token, data = {}) => (
  firebaseMessaging().send({
    token: assertValidToken(token),
    data: normalizeDataPayload(data),
  })
);

export const sendMulticast = async (tokens = [], payload = {}) => {
  const validTokens = tokens.map(normalizeToken).filter((token) => token.length >= FCM_TOKEN_MIN_LENGTH);

  if (!validTokens.length) {
    return { successCount: 0, failureCount: 0, responses: [] };
  }

  return firebaseMessaging().sendEachForMulticast({
    tokens: validTokens,
    notification: payload.notification,
    data: payload.data ? normalizeDataPayload(payload.data) : undefined,
    webpush: payload.webpush,
  });
};

export const sendTopicNotification = async (topic, title, body, options = {}) => (
  firebaseMessaging().send({
    topic,
    notification: removeEmptyValues({ title, body }),
    data: options.data ? normalizeDataPayload(options.data) : undefined,
    webpush: {
      notification: removeEmptyValues({
        title,
        body,
        icon: options.icon,
        badge: options.badge,
      }),
      fcmOptions: removeEmptyValues({
        link: options.link,
      }),
    },
  })
);
