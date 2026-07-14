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
                    cement_type: 'UNKNOWN',
                    bag_count: null,
                    slip_number: null,
                    vehicle_number: null,
                    customer_name: null
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
                        
                        // Extract fields
                        if (rawJson.record && rawJson.record._raw_fields) {
                            const rawFields = rawJson.record._raw_fields;
                            rawText = rawJson.record._raw_ocr_text || '';
                            
                            const cementType = parseCementType(rawFields.material_type);
                            const bagCount = rawFields.bags_qty ? parseInt(rawFields.bags_qty, 10) : null;
                            const slipNumber = rawFields.slip_no || null;
                            const vehicleNumber = rawFields.vehicle_no || null;
                            const customerName = rawFields.supply_to || null;

                            extractedData = {
                                cement_type: cementType,
                                bag_count: isNaN(bagCount) ? null : bagCount,
                                slip_number: slipNumber,
                                vehicle_number: vehicleNumber,
                                customer_name: customerName
                            };

                            // Count present fields
                            const presentFields = [
                                extractedData.cement_type !== 'UNKNOWN',
                                extractedData.bag_count !== null,
                                extractedData.slip_number !== null,
                                extractedData.vehicle_number !== null,
                                extractedData.customer_name !== null
                            ].filter(Boolean).length;

                            if (presentFields === 5) {
                                status = 'verified';
                            } else if (presentFields > 0) {
                                status = 'review';
                            } else {
                                status = 'rejected';
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
