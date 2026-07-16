import fs from "fs";
import path from "path";
import axios from "axios";

import { __dirname } from "../constants.js";
import { getVerifiedGodownSlipsForMasterDataSync } from "../model/godown-slip.model.js";

const CHECK_INTERVAL_MS = 5 * 60 * 1000;
const SCHEDULED_SYNC_TIME_IST = "02:00";
const STATE_DIR = path.join(__dirname, ".cache");
const STATE_FILE = path.join(STATE_DIR, "ocr-master-data-sync-state.json");

let cronTimer = null;
let isRunning = false;

const normalizeText = (value) => String(value || "")
  .trim()
  .replace(/\s+/g, " ");

const normalizeMaterialType = (value) => {
  const normalized = normalizeText(value).toUpperCase();
  if (normalized === "PPC" || normalized === "WPC" || normalized === "SUPER") {
    return normalized;
  }
  return "";
};

const normalizeVehicleNumber = (value) => normalizeText(value).toUpperCase().replace(/\s+/g, "");

const normalizeSlipNumber = (value) => normalizeText(value);

const getIstDateTimeParts = () => {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(new Date());
  const getPart = (type) => parts.find((part) => part.type === type)?.value || "";

  return {
    date: `${getPart("year")}-${getPart("month")}-${getPart("day")}`,
    time: `${getPart("hour")}:${getPart("minute")}`,
  };
};

const ensureStateDir = () => {
  fs.mkdirSync(STATE_DIR, { recursive: true });
};

const readState = () => {
  try {
    if (!fs.existsSync(STATE_FILE)) {
      return { last_run_date_ist: null };
    }
    const raw = JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
    return {
      last_run_date_ist: raw.last_run_date_ist || null,
    };
  } catch (error) {
    console.warn("Unable to read OCR master-data sync state:", error?.message || error);
    return { last_run_date_ist: null };
  }
};

const writeState = (state) => {
  ensureStateDir();
  const tempPath = `${STATE_FILE}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(state, null, 2));
  fs.renameSync(tempPath, STATE_FILE);
};

const shouldRunToday = (state) => {
  const { date, time } = getIstDateTimeParts();
  return time >= SCHEDULED_SYNC_TIME_IST && state.last_run_date_ist !== date;
};

const buildMasterDataDocument = (slips) => {
  const confirmedByField = {
    godown_name: new Set(),
    supply_to: new Set(),
    material_type: new Set(),
    vehicle_no: new Set(),
    slip_no: new Set(),
  };

  for (const slip of slips) {
    const godownName = normalizeText(slip.godown_name);
    if (godownName) {
      confirmedByField.godown_name.add(godownName);
    }

    const customerName = normalizeText(slip.customer_name);
    if (customerName) {
      confirmedByField.supply_to.add(customerName);
    }

    const materialType = normalizeMaterialType(slip.cement_type);
    if (materialType) {
      confirmedByField.material_type.add(materialType);
    }

    const vehicleNumber = normalizeVehicleNumber(slip.vehicle_number);
    if (vehicleNumber) {
      confirmedByField.vehicle_no.add(vehicleNumber);
    }

    const slipNumber = normalizeSlipNumber(slip.slip_number);
    if (slipNumber) {
      confirmedByField.slip_no.add(slipNumber);
    }
  }

  const masterData = Object.fromEntries(
    Object.entries(confirmedByField)
      .map(([fieldName, values]) => [fieldName, {
        confirmed: [...values].sort((first, second) => String(first).localeCompare(String(second))),
        candidates: {},
      }])
      .filter(([, fieldPayload]) => fieldPayload.confirmed.length > 0),
  );

  if (!Object.keys(masterData).length) {
    return null;
  }

  return masterData;
};

const getMasterDataUploadUrl = () => {
  const route = String(process.env.OCR_API_ROUTE || "").trim();
  if (!route) return null;
  return `${route.replace(/\/+$/, "")}/master-data/upload`;
};

const getSyncHeaders = () => {
  const token = String(process.env.OCR_MASTER_DATA_SYNC_TOKEN || "").trim();
  return token ? { "X-OCR-SYNC-TOKEN": token } : {};
};

const uploadMasterData = async (masterData) => {
  const url = getMasterDataUploadUrl();
  if (!url || !masterData) {
    return null;
  }

  const response = await axios.post(url, {
    master_data: masterData,
  }, {
    headers: getSyncHeaders(),
    timeout: 30000,
  });

  return response.data || null;
};

export const runGodownMasterDataSyncCron = async () => {
  if (isRunning) return;

  const state = readState();
  if (!shouldRunToday(state)) {
    return;
  }

  isRunning = true;

  try {
    const verifiedSlips = await getVerifiedGodownSlipsForMasterDataSync(null);
    const { date } = getIstDateTimeParts();

    if (!verifiedSlips.length) {
      writeState({
        last_run_date_ist: date,
      });
      console.log("🧠 OCR master-data rebuild found no verified slips.");
      return;
    }

    const rebuiltMasterData = buildMasterDataDocument(verifiedSlips);
    if (rebuiltMasterData) {
      const syncResult = await uploadMasterData(rebuiltMasterData);
      console.log(
        `🧠 OCR master-data rebuild processed ${verifiedSlips.length} verified slips.`,
        syncResult?.data || syncResult || "",
      );
    } else {
      console.log(
        `🧠 OCR master-data rebuild skipped write; ${verifiedSlips.length} slips had no eligible trusted fields.`,
      );
    }

    writeState({
      last_run_date_ist: date,
    });
  } catch (error) {
    console.error("OCR master-data rebuild cron failed:", error?.response?.data || error?.message || error);
  } finally {
    isRunning = false;
  }
};

export const startGodownMasterDataSyncCron = () => {
  if (cronTimer) return cronTimer;

  cronTimer = setInterval(runGodownMasterDataSyncCron, CHECK_INTERVAL_MS);
  cronTimer.unref?.();

  console.log(
    `⏰ OCR master-data rebuild cron started. Checks every 5 minutes, rebuilds daily after ${SCHEDULED_SYNC_TIME_IST} IST.`,
  );

  runGodownMasterDataSyncCron();

  return cronTimer;
};

export const stopGodownMasterDataSyncCron = () => {
  if (!cronTimer) return;
  clearInterval(cronTimer);
  cronTimer = null;
};
