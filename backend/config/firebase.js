import { applicationDefault, cert, getApps, initializeApp } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";
import fs from "fs";
import path from "path";
import { FIREBASE_SERVICE_ACCOUNT_PATH, __dirname } from "../constants.js";

const getServiceAccount = () => {
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();

  if (serviceAccountJson && serviceAccountJson !== "{") {
    try {
      return JSON.parse(serviceAccountJson);
    } catch (error) {
      console.warn("Invalid FIREBASE_SERVICE_ACCOUNT_JSON. Falling back to FIREBASE_SERVICE_ACCOUNT_PATH.");
    }
  }

  if (FIREBASE_SERVICE_ACCOUNT_PATH) {
    const serviceAccountPath = path.isAbsolute(FIREBASE_SERVICE_ACCOUNT_PATH)
      ? FIREBASE_SERVICE_ACCOUNT_PATH
      : path.resolve(__dirname, FIREBASE_SERVICE_ACCOUNT_PATH);

    if (fs.existsSync(serviceAccountPath)) {
      return JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"));
    }
  }

  return null;
};

export const getFirebaseAdmin = () => {
  if (getApps().length) {
    return getApps()[0];
  }

  const serviceAccount = getServiceAccount();

  if (serviceAccount) {
    return initializeApp({
      credential: cert(serviceAccount),
    });
  }

  return initializeApp({
    credential: applicationDefault(),
  });
};

export const firebaseMessaging = () => getMessaging(getFirebaseAdmin());
