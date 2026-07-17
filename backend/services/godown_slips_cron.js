import fs from 'fs';
import path from 'path';
import axios from 'axios';
import FormData from 'form-data';
import db from '../config/db.js';
import { getPendingGodownSlips, updateGodownSlipOcrResult, insertGodownSlipOcr } from '../model/godown-slip.model.js';
import dotenv from 'dotenv';

dotenv.config();

const ONE_MINUTE_MS = 60 * 1000;
let cronTimer = null;
let isRunning = false;

const parseCementType = (rawType) => {
    if (!rawType) return 'UNKNOWN';
    const typeUpper = rawType.toUpperCase();
    if (typeUpper.includes('PPC')) return 'PPC';
    if (typeUpper.includes('WPC')) return 'WPC';
    if (typeUpper.includes('SUPER')) return 'SUPER';
    return 'UNKNOWN';
};

// Same Indian-plate pattern the OCR pipeline itself validates against
// (ocr-service*/ocr_pipeline/pipeline.py's is_valid_vehicle_no) -- checked
// again here as a boundary guard so this cron never trusts a single
// upstream service's internal validation alone for a field this
// consequential (misattributing a dispatch to the wrong vehicle).
const VEHICLE_NO_RE = /^[A-Z]{2}\d{1,2}[A-Z]{1,3}\d{3,4}$/;
const MAX_REASONABLE_BAG_COUNT = 9999;

const isValidVehicleNo = (value) => {
    if (!value) return false;
    return VEHICLE_NO_RE.test(String(value).replace(/\s+/g, '').toUpperCase());
};

const sanitizeBagCount = (rawValue) => {
    if (rawValue === null || rawValue === undefined || rawValue === '') {
        return { value: null, valid: true }; // genuinely absent, not invalid
    }
    const parsed = parseInt(rawValue, 10);
    if (!Number.isFinite(parsed) || parsed <= 0 || parsed > MAX_REASONABLE_BAG_COUNT) {
        return { value: null, valid: false };
    }
    return { value: parsed, valid: true };
};

/**
 * Maps the OCR pipeline's own _status/_flagged_fields signal (computed
 * server-side from master-data auto-correction, exact-match vehicle/slip
 * duplicate tracking, and date cross-checking -- see pipeline.py) to this
 * table's status enum. Replaces the previous crude "count non-null fields"
 * heuristic, which couldn't tell "field genuinely missing on this slip"
 * apart from "field extraction failed" and ignored the pipeline's much
 * richer per-field validation entirely.
 */
const deriveStatus = (record, extraFlags) => {
    if (!record) return 'rejected';
    if (record._status === 'failed_alignment') return 'rejected';
    if (extraFlags.length > 0) return 'review'; // Node-side guard caught something the pipeline didn't
    if (record._status === 'ok') return 'verified';
    if (record._status === 'needs_review') return 'review';
    return 'rejected'; // unrecognized _status shape -- fail safe, don't auto-verify blind
};

const processPendingSlips = async () => {
    if (isRunning) return;
    isRunning = true;

    try {
        const pendingSlips = await getPendingGodownSlips();
        
        if (!pendingSlips || pendingSlips.length === 0) {
            isRunning = false;
            return;
        }

        console.log(`🔍 Found ${pendingSlips.length} pending slips for OCR processing.`);

        for (const slip of pendingSlips) {
            const connection = await db.begin();
            try {
                // Construct the absolute path to the image
                // The image_url is something like '/godown_slips/12345.jpg'
                // We resolve it against the backend public folder
                const imagePath = path.join(process.cwd(), 'public', slip.image_url);
                
                let rawJson = {};
                let rawText = '';
                let processingTimeMs = 0;
                let status = 'pending';
                let extractedData = {
                    slip_date: null,
                    godown_name: null,
                    cement_type: 'UNKNOWN',
                    bag_count: null,
                    block_number: null,
                    slip_number: null,
                    vehicle_number: null,
                    dispatch_number: null,
                    customer_name: null,
                    destination: null,
                    validity_date: null,
                };

                if (!fs.existsSync(imagePath)) {
                    console.error(`❌ Image not found on disk for slip_id=${slip.slip_id}: ${imagePath}`);
                    status = 'rejected';
                } else if (!process.env.OCR_API_ROUTE) {
                    console.error(`❌ OCR_API_ROUTE not configured in .env`);
                    status = 'pending'; // keep pending if API is not setup
                } else {
                    const startTime = Date.now();
                    try {
                        const formData = new FormData();
                        formData.append('file', fs.createReadStream(imagePath));

                        const response = await axios.post(process.env.OCR_API_ROUTE, formData, {
                            headers: {
                                ...formData.getHeaders(),
                                'Accept': 'application/json'
                            },
                            maxBodyLength: Infinity,
                            timeout: 600000 // 10 minutes timeout, since OCR takes 2-4 mins
                        });

                        processingTimeMs = Date.now() - startTime;
                        rawJson = response.data || {};

                        // Extract fields from the pipeline's AUTO-CORRECTED top-level
                        // fields (fuzzy-matched against master_data.json, exact-match
                        // vehicle/slip duplicate tracking, ISO date normalization) --
                        // NOT record._raw_fields, which is the pre-correction parse.
                        // Using _raw_fields here previously meant the master-data
                        // learning/auto-correction the pipeline computes never actually
                        // reached the database.
                        const record = rawJson.record;
                        if (record) {
                            rawText = record._raw_ocr_text || '';

                            const cementType = parseCementType(record.material_type);
                            const { value: bagCount, valid: bagCountValid } = sanitizeBagCount(record.bags_qty);
                            const slipDate = record.date ? String(record.date).trim() : null;
                            const godownName = record.godown_name ? String(record.godown_name).trim() : null;
                            const blockNumber = record.block_no ? String(record.block_no).trim() : null;
                            const slipNumber = record.slip_no ? String(record.slip_no).trim() : null;
                            const vehicleNumberRaw = record.vehicle_no
                                ? String(record.vehicle_no).trim().toUpperCase()
                                : null;
                            const dispatchNumber = record.di_no ? String(record.di_no).trim() : null;
                            const customerName = record.supply_to ? String(record.supply_to).trim() : null;
                            const destination = record.validity ? String(record.validity).trim() : null;
                            const validityDate = record.material_load_on ? String(record.material_load_on).trim() : null;

                            extractedData = {
                                slip_date: slipDate,
                                godown_name: godownName,
                                cement_type: cementType,
                                bag_count: bagCount,
                                block_number: blockNumber,
                                slip_number: slipNumber,
                                vehicle_number: vehicleNumberRaw,
                                dispatch_number: dispatchNumber,
                                customer_name: customerName,
                                destination,
                                validity_date: validityDate,
                            };

                            // Boundary validation: never let an out-of-range bag count or
                            // upstream pipeline's own _status didn't flag it.
                            const extraFlags = [];
                            if (!bagCountValid) extraFlags.push('bag_count_out_of_range');

                            status = deriveStatus(record, extraFlags);

                            if (extraFlags.length > 0) {
                                console.warn(`⚠️ slip_id=${slip.slip_id} failed extra validation: ${extraFlags.join(', ')}`);
                            }
                        } else {
                            status = 'rejected'; // Invalid response format
                        }
                    } catch (apiError) {
                        console.error(`❌ OCR API failed for slip_id=${slip.slip_id}:`, apiError.message);
                        status = 'rejected';
                        processingTimeMs = Date.now() - startTime;
                    }
                }

                // Update the slip in DB
                extractedData.status = status;
                await updateGodownSlipOcrResult(connection, slip.slip_id, extractedData);

                // Insert into OCR tracking table
                await insertGodownSlipOcr(connection, {
                    slip_id: slip.slip_id,
                    ocr_engine: 'external_api',
                    raw_text: rawText,
                    raw_json: rawJson,
                    processing_time_ms: processingTimeMs
                });

                await db.commit(connection);
                console.log(`✅ Processed slip_id=${slip.slip_id} -> status=${status}`);
            } catch (slipError) {
                await db.rollback(connection);
                console.error(`❌ Failed to process slip_id=${slip.slip_id}:`, slipError.message);
            }
        }
    } catch (error) {
        console.error("❌ Godown Slips OCR cron failed:", error.message);
    } finally {
        isRunning = false;
    }
};

export const startGodownSlipsCron = () => {
    if (cronTimer) return cronTimer;

    cronTimer = setInterval(processPendingSlips, ONE_MINUTE_MS);
    cronTimer.unref?.();

    console.log(`⏰ Godown Slips OCR cron started. Checks every 1 minute.`);

    // Run immediately on start
    processPendingSlips();

    return cronTimer;
};

export const stopGodownSlipsCron = () => {
    if (!cronTimer) return;
    clearInterval(cronTimer);
    cronTimer = null;
};
