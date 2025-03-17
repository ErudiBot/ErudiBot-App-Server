import { SlashCommandBuilder } from 'discord.js';
import { getVoiceConnection } from '@discordjs/voice';
import fs from 'fs';
import { exec } from 'child_process';

import { recordings } from './record.js';

export default {
    data: new SlashCommandBuilder()
        .setName('stoprecord')
        .setDescription('Stops recording and disconnects the bot'),
    
    async execute(interaction) {
        const connection = getVoiceConnection(interaction.guildId);
        if (!connection) {
            return interaction.reply("I'm not in a voice channel!");
        }

        // Close all recording streams properly
        for (const userId in recordings) {
            const { audioStream, outputStream, filePath } = recordings[userId];

            audioStream.destroy();
            outputStream.end();

            console.log(`Saved recording for user: ${userId}`);

            // Convert PCM to WAV (optional)
            const wavFilePath = filePath.replace('.pcm', '.wav');
            exec(`ffmpeg -f s16le -ar 48k -ac 1 -i ${filePath} ${wavFilePath}`, (error) => {
                if (error) console.error(`Error converting ${filePath} to WAV:`, error);
                else console.log(`Converted ${filePath} to ${wavFilePath}`);
            });

            delete recordings[userId];
        }

        connection.destroy();
        await interaction.reply("Stopped recording and left the channel.");
    }
};
