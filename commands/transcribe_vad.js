import { SlashCommandBuilder } from 'discord.js';
import { transcribeAudio } from '../external_api/whisper_api.js';
import axios from 'axios';
import fs from 'fs';
import ffmpeg from 'fluent-ffmpeg';
import Vad from 'node-vad';

export default {
    data: new SlashCommandBuilder()
        .setName('transcribe_vad')
        .setDescription('Upload an audio file to transcribe')
        .addAttachmentOption(option =>
            option.setName('audio')
                .setDescription('Upload an audio file')
                .setRequired(true)),

    async execute(interaction) {
        await interaction.deferReply();
        console.log("Command received, processing...");

        const audioFile = interaction.options.getAttachment('audio');
        if (!audioFile) {
            console.log("No file uploaded.");
            return interaction.editReply({ content: 'No file uploaded.' });
        }

        const allowedFormats = ['mp3', 'mp4', 'mpeg', 'mpga', 'wav', 'webm'];
        const fileExtension = audioFile.name.split('.').pop().toLowerCase();
        if (!allowedFormats.includes(fileExtension)) {
            console.log(`Unsupported format: ${fileExtension}`);
            return interaction.editReply({ content: 'Unsupported file format. Allowed formats: mp3, mp4, mpeg, mpga, wav, webm' });
        }

        const tempDir = './temp';
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }

        const filePath = `${tempDir}/${audioFile.name}`;
        const processedFilePath = `${tempDir}/processed_${audioFile.name}`;

        try {
            console.log("Downloading audio file...");
            const response = await axios.get(audioFile.url, { responseType: 'arraybuffer' });
            fs.writeFileSync(filePath, Buffer.from(response.data));
            console.log("File downloaded.");

            // Convert to WAV
            console.log("Converting audio to WAV...");
            await new Promise((resolve, reject) => {
                ffmpeg(filePath)
                    .toFormat('wav')
                    .audioFrequency(16000)  // 16kHz for better VAD processing
                    .on('end', () => {
                        console.log("Conversion complete.");
                        resolve();
                    })
                    .on('error', (err) => {
                        console.error("FFmpeg conversion error:", err);
                        reject(err);
                    })
                    .save(processedFilePath);
            });

            // Apply VAD
            console.log("Applying VAD...");
            const vad = new Vad(Vad.Mode.NORMAL);
            const buffer = fs.readFileSync(processedFilePath);
            const frameSize = 160; // 10ms frame at 16kHz
            const speechFrames = [];

            const vadPromises = [];
            for (let i = 0; i < buffer.length; i += frameSize) {
                const frame = buffer.slice(i, i + frameSize);
                vadPromises.push(new Promise(resolve => {
                    vad.processAudio(frame, 16000, (result) => {
                        if (result === Vad.Event.VOICE) {
                            speechFrames.push(frame);
                        }
                        resolve();
                    });
                }));
            }

            await Promise.all(vadPromises);
            console.log(`VAD detected ${speechFrames.length} speech frames.`);

            if (speechFrames.length === 0) {
                return interaction.editReply({ content: 'No speech detected in the file.' });
            }

            fs.writeFileSync(processedFilePath, Buffer.concat(speechFrames));
            console.log("Speech-only audio saved.");

            // Transcribe
            console.log("Sending audio for transcription...");
            const result = await transcribeAudio(processedFilePath);
            console.log("Transcription completed.");

            // Clean up
            fs.unlinkSync(filePath);
            fs.unlinkSync(processedFilePath);

            if (result.error) {
                return interaction.editReply({ content: result.error });
            }

            await interaction.editReply({ content: 'Transcription completed!' });
            return interaction.channel.send(`**Transcription:**\n${result.text}\n⏳ Processing time: ${result.executionTime} seconds`);

        } catch (error) {
            console.error("Error during processing:", error);
            return interaction.editReply({ content: 'Failed to process the file.' });
        }
    },
};
