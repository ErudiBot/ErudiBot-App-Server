import fs from 'fs';
import { exec } from 'child_process';
import { transcribeAudio } from '../external_api/whisper_api.js';

export async function finalizeBuffer(userName, buffers) {
    if (buffers.length === 0) return null;

    const chunkData = Buffer.concat(buffers.splice(0));
    const chunkPath = `./recordings/final_chunk_${userName}_${Date.now()}.pcm`;
    fs.writeFileSync(chunkPath, chunkData);

    const wavPath = chunkPath.replace('.pcm', '.wav');
    await new Promise((res, rej) => {
        const cmd = `ffmpeg -f s16le -ar 48k -ac 1 -i "${chunkPath}" "${wavPath}"`;
        exec(cmd, (err) => {
            if (err) rej(err); else res();
        });
    });
    fs.unlinkSync(chunkPath);

    const startTime = new Date().getTime();
    const transcriptText = await transcribeAudio(wavPath);

    fs.unlinkSync(wavPath);

    if (!transcriptText) return null;

    return {
        startTime,
        userName,
        transcriptText
    };
}
