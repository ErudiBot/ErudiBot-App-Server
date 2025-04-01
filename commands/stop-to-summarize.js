import { SlashCommandBuilder } from 'discord.js';
import { getVoiceConnection } from '@discordjs/voice';
import fs from 'fs';
import { exec } from 'child_process';
import { recordings } from './record.js';
import { getSummaryFromRecords } from '../process/after_stop-record.js';

export default {
    data: new SlashCommandBuilder()
        .setName('stop-to-summarize')
        .setDescription('Stops recording and disconnects the bot'),
    
    async execute(interaction) {
        const connection = getVoiceConnection(interaction.guildId);
        if (!connection) {
            return interaction.reply("I'm not in a voice channel!");
        }

        // Close all recording streams properly 
        const userNames = [];
        const resultFilePaths = [];
        for (const userId in recordings) {
            const { audioStream, outputStream, filePath } = recordings[userId];

            audioStream.destroy();
            outputStream.end();

            try {
                const member = await interaction.guild.members.fetch(userId);
                userNames.push(member.user.username)
            } catch (error) {
                console.error(`Error fetching username for ${userId}:`, error);
                userNames.push(`Unknown-${userId}`);
            }

            console.log(`Saved recording for user: ${userId}`);

            // Convert PCM to WAV
            const wavFilePath = filePath.replace('.pcm', '.wav');
            exec(`ffmpeg -f s16le -ar 48k -ac 1 -i "${filePath}" "${wavFilePath}"`, (error, stdout, stderr) => {
                if (error) {
                    console.error(`Error converting ${filePath} to WAV:`, error);
                }
                if (stderr) {
                    console.error(`ffmpeg stderr:`, stderr);
                }
                if (stdout) {
                    console.log(`ffmpeg stdout:`, stdout);
                } else {
                    console.log(`Converted ${filePath} to ${wavFilePath}`);
                    
                    // Delete the original .pcm file
                    fs.unlink(filePath, (unlinkError) => {
                        if (unlinkError) {
                            console.error(`Error deleting ${filePath}:`, unlinkError);
                        } else {
                            console.log(`Deleted ${filePath}`);
                        }
                    });
                }
            });

            resultFilePaths.push(wavFilePath);
            delete recordings[userId];
        }
        await interaction.deferReply();

        connection.destroy();
        //await interaction.reply("Stopped recording and left the channel.\nMeeting summary will take some time please be patient 🤗");
        //call summary process 
        try {
            const summaryText = await getSummaryFromRecords(userNames, resultFilePaths);
            await interaction.editReply(summaryText);
        } catch (error) {
            console.error("Error generating summary:", error);
            await interaction.editReply("Sorry, something went wrong while generating the summary.");
        }

    }
};



