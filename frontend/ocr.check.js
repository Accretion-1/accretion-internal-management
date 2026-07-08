import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import process from 'node:process';
import { chromium } from 'playwright';

const currentFilePath = fileURLToPath(import.meta.url);
const currentDirectory = path.dirname(currentFilePath);
const devServerUrl = 'http://127.0.0.1:3000';

const isServerReady = async () => {
    try {
        const response = await fetch(devServerUrl, { method: 'GET' });
        return response.ok;
    } catch {
        return false;
    }
};

const waitForServer = async (timeoutMs = 30000) => {
    const startedAt = Date.now();
    while (Date.now() - startedAt < timeoutMs) {
        if (await isServerReady()) return true;
        await delay(500);
    }
    throw new Error('Vite dev server did not become ready in time.');
};

const startViteDevServer = async () => {
    if (await isServerReady()) {
        return null;
    }

    const child = spawn('npm', ['run', 'dev'], {
        cwd: currentDirectory,
        stdio: 'ignore',
        detached: false,
        env: process.env,
    });

    await waitForServer();
    return child;
};

const launchBrowser = async () => {
    const launchOptions = {
        headless: true,
    };

    try {
        return await chromium.launch({ ...launchOptions, channel: 'chrome' });
    } catch {
        const chromePaths = [
            '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
            '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary',
        ];

        for (const executablePath of chromePaths) {
            try {
                return await chromium.launch({
                    ...launchOptions,
                    executablePath,
                });
            } catch {
                // try next path
            }
        }

        return chromium.launch(launchOptions);
    }
};

const run = async () => {
    const viteProcess = await startViteDevServer();
    const browser = await launchBrowser();

    try {
        const page = await browser.newPage();
        await page.goto(devServerUrl, { waitUntil: 'networkidle' });

        const result = await page.evaluate(async () => {
            const { runLocalProjectImageOcr } = await import('/src/scripts/ocr-check.browser.js');
            return runLocalProjectImageOcr();
        });

        console.log(JSON.stringify(result, null, 2));
    } finally {
        await browser.close();
        if (viteProcess) {
            viteProcess.kill('SIGTERM');
        }
    }
};

run().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
