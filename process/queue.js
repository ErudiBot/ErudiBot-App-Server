import { vadProcess } from '../process/vad.js';
import { transcribeAudio } from '../external_api/whisper_api.js';
import fs from 'fs/promises';

const chunkQueue = [];
export const userTranscripts = {}; // { userId: [{ timestamp, text }] }

let processing = false;

export function addToQueue(userId, filePath) {
    chunkQueue.push({ userId, filePath });
    if (!processing) processNext();
}

async function processNext() {
    if (chunkQueue.length === 0) {
        processing = false;
        return;
    }

    processing = true;

    const { userId, filePath } = chunkQueue.shift();
    console.log(`🎙️ Processing: ${filePath}`);

    try {
        const vadSegments = await vadProcess(filePath);

        for (const [timestamp, segmentPath] of Object.entries(vadSegments)) {
            try {
                const transcript = await transcribeAudio(segmentPath);
                if (!userTranscripts[userId]) userTranscripts[userId] = [];
                userTranscripts[userId].push({ timestamp, text: transcript });

                await fs.unlink(segmentPath);
                console.log(`🧹 Deleted VAD segment: ${segmentPath}`);
            } catch (err) {
                console.error(`❌ Whisper error for segment ${segmentPath}:`, err);
            }
        }

        await fs.unlink(filePath);
        console.log(`🧹 Deleted original chunk: ${filePath}`);
    } catch (err) {
        console.error(`❌ Error during VAD/transcription:`, err);
    }

    processNext();
}
