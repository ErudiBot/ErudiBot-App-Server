import { SlashCommandBuilder } from 'discord.js';
import { transcribeAudio } from '../external_api/whisper_api.js';
import axios from 'axios';
import fs from 'fs';

export default {
    data: new SlashCommandBuilder()
        .setName('transcribe')
        .setDescription('Upload an audio file to transcribe')
        .addAttachmentOption(option =>
            option.setName('audio')
                .setDescription('Upload an audio file')
                .setRequired(true)),

    async execute(interaction) {
        await interaction.deferReply();

        const audioFile = interaction.options.getAttachment('audio');
        if (!audioFile) {
            return interaction.editReply({ content: 'No file uploaded.' });
        }

        const allowedFormats = ['mp3', 'mp4', 'mpeg', 'mpga', 'wav', 'webm'];
        const fileExtension = audioFile.name.split('.').pop().toLowerCase();
        if (!allowedFormats.includes(fileExtension)) {
            return interaction.editReply({ content: 'Unsupported file format. Allowed formats: mp3, mp4, mpeg, mpga, wav, webm' });
        }

        const tempDir = './temp';
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }

        const filePath = `${tempDir}/${audioFile.name}`;

        try {
            const response = await axios.get(audioFile.url, { responseType: 'arraybuffer' });
            fs.writeFileSync(filePath, Buffer.from(response.data));

            const result = await transcribeAudio(filePath);
            fs.unlinkSync(filePath); // Clean up

            if (result.error) {
                return interaction.editReply({ content: result.error });
            }

            await interaction.editReply({ content: 'Transcription completed!' });
            return interaction.channel.send(`**Transcription:**\n${result.text}\n⏳ Processing time: ${result.executionTime} seconds`);

        } catch (error) {
            console.error('File download error:', error);
            return interaction.editReply({ content: 'Failed to process the file.' });
        }
    },
};