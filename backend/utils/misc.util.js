import fs from "fs";
import { FILE_PATH, JWT_EXPIRY, JWT_SECRET } from "../constants.js";
import path from 'path';
import jwt from 'jsonwebtoken';

export const CustomImagePath = (fileName) => {
  if (!fileName) return null;
  if (/^https?:\/\//i.test(fileName)) return fileName;

  const basePath = FILE_PATH || "";
  if (!basePath) return fileName;

  return `${basePath.replace(/\/?$/, "/")}${String(fileName).replace(/^\/+/, "")}`;
}

export const isEmpty = (value) =>
  value === null ||
  value === undefined ||
  (Array.isArray(value) && value.length === 0) ||
  (typeof value === "string" && value.trim().length === 0) ||
  (typeof value === "object" &&
    Object.values(value).every((val) => isEmpty(val)));

export const generateID = (IDlength = 12) => {
  const numbers = "123456789";
  let uid = "";
  for (let i = 0; i < IDlength; i++) {
    uid += numbers.charAt(Math.floor(Math.random() * numbers.length));
  }
  return parseInt(uid, 10);
};

export const round = (value, digits) => {
  return parseFloat(value.toFixed(digits));
};

export const split = (value) => {
  let splits = 3;
  if (value.length > 3 && value.length <= 8) {
    splits = 2;
  } else if (value.length <= 3) {
    splits = 1;
  }

  const partLength = Math.ceil(value.length / splits);
  const result = [];

  for (let i = 0; i < value.length; i += partLength) {
    result.push(value.slice(i, i + partLength));
  }

  return result;
};

export const setDate = (days) => {
  const date = new Date();
  if (!isEmpty(days)) {
    date.setDate(date.getDate() + days);
  }
  return date.toISOString().substring(0, 10);
};

export const getCurrentDateTime = () => {
  const date = new Date();
  return date.toISOString();
};

export const applyFloor = (obj) => {
  if (Array.isArray(obj)) {
    return obj.map((element) => applyFloor(element));
  } else if (typeof obj === "object" && obj !== null) {
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        obj[key] = applyFloor(obj[key]);
      }
    }
    return obj;
  } else if (typeof obj === "number") {
    return Math.floor(obj);
  } else {
    return obj;
  }
};

export const createBatches = (array, batchSize) => {
  const batches = [];
  for (let i = 0; i < array.length; i += batchSize) {
    batches.push(array.slice(i, i + batchSize));
  }
  return batches;
};


export const formatImagePath = (path) =>
  !path ? null : path.startsWith('http') ? path : `${APP_URL}/${path}`;

export const deleteImage = (fileName) => {
  return new Promise((resolve, reject) => {
    const filePath = path.join('backend/public', fileName);

    fs.unlink(filePath, (err) => {
      if (err) {
        if (err.code === 'ENOENT') {
          // File doesn't exist
          console.warn(`File not found: ${filePath}`);
          return resolve();
        }
        return reject(err);
      }
      resolve();
    });
  });
};


export const  generateUnique5Digit = () => {
  // Get current timestamp in milliseconds
  const timestamp = Date.now(); // e.g., 1691923456789

  // Combine with a random number to avoid collisions in the same ms
  const uniqueNum = timestamp.toString() + Math.floor(Math.random() * 1000);

  // Take the last 5 digits
  return uniqueNum.slice(-5);
}

export const generateOTPCode = () => {
 return Math.floor(100000 + Math.random() * 900000).toString();
};

export const generateJWTToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET, {expiresIn:  JWT_EXPIRY });
}

export const verifyJWTToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

export const getMessageByLang = (language = "en", enMsg, esMsg) => {
  return language == "en" ? enMsg : esMsg;
};

export const getFileType = (mimetype) => {
  if (mimetype.startsWith("image/")) return "Image";
  if (mimetype.startsWith("video/")) return "Video";
  return Image;
};
