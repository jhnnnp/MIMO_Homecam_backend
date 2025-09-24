/*
 * Media WS smoke test
 * Usage:
 *   MEDIA_SERVER_URL=ws://<host>:4002 node backend/scripts/media-ws-test.js <CAMERA_ID> <VIEWER_ID>
 */

const WebSocket = require('ws');
const { buildCameraStreamUrl, buildLiveStreamUrl } = require('../utils/mediaUrlBuilder');

const cameraId = process.argv[2] || 'MIMO_USER_6_MAIN_CAM';
const viewerId = process.argv[3] || 'viewer_cli';

const publisherUrl = buildCameraStreamUrl(String(cameraId));
const viewerUrl = buildLiveStreamUrl(String(cameraId), String(viewerId));

console.log('[TEST] MEDIA_SERVER_URL =', process.env.MEDIA_SERVER_URL || '(default)');
console.log('[TEST] Publisher URL =', publisherUrl);
console.log('[TEST] Viewer URL    =', viewerUrl);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function awaitOpen(ws, tag) {
    return new Promise((resolve, reject) => {
        ws.on('open', () => { console.log(`[${tag}] open`); resolve(true); });
        ws.on('error', (e) => { console.log(`[${tag}] error`, e.message); reject(e); });
    });
}

async function run() {
    let receivedCount = 0;

    // 1) Publisher first
    const pubWs = new WebSocket(publisherUrl);
    await awaitOpen(pubWs, 'PUB');

    // send meta to ensure stream registration
    const meta = JSON.stringify({ type: 'meta', data: { note: 'cli-test', ts: Date.now() } });
    pubWs.send(meta);
    console.log('[PUB] meta sent');
    await sleep(300);

    // 2) Viewer after publisher registered
    const viewWs = new WebSocket(viewerUrl);
    await awaitOpen(viewWs, 'VIEW');

    viewWs.on('message', (data) => {
        receivedCount += 1;
        if (typeof data === 'string') {
            console.log('[VIEW] message(text):', data.slice(0, 60));
        } else if (Buffer.isBuffer(data)) {
            console.log('[VIEW] message(binary):', data.length, 'bytes');
        } else {
            console.log('[VIEW] message(other)');
        }
    });
    viewWs.on('close', (code, reason) => console.log('[VIEW] close', { code, reason: reason?.toString?.() }));

    // 3) Send frames
    pubWs.send(Buffer.from('FRAME_BINARY_1'));
    console.log('[PUB] binary frame 1 sent');
    await sleep(200);
    pubWs.send('FRAME_TEXT_2');
    console.log('[PUB] text frame 2 sent');

    // 4) Wait for delivery (2s)
    await sleep(2000);
    console.log('[TEST] receivedCount =', receivedCount);

    try { pubWs.close(); } catch { }
    try { viewWs.close(); } catch { }
    setTimeout(() => process.exit(receivedCount > 0 ? 0 : 2), 300);
}

run().catch((e) => {
    console.error('TEST FAILED', e);
    process.exit(1);
});


