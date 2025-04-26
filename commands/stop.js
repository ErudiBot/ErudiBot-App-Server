import { SlashCommandBuilder } from 'discord.js';
import { getVoiceConnection } from '@discordjs/voice';
import { chunkRecordings } from '../process/chunk_record.js';
import { getSummaryFromTranscribed } from '../process/summary_task-allocation.js';
import { splitMessage, displayResult } from '../process/helper.js';

export default {
    data: new SlashCommandBuilder()
        .setName('stop')
        .setDescription('Stops the recording and summarizes the meeting (Moderators will not be recorded)'),

    async execute(interaction) {
        console.log('stop is executed')
        const startTime = Date.now();

        const connection = getVoiceConnection(interaction.guildId);
        if (!connection) return interaction.reply("Bot is not in a voice channel!");

        await interaction.deferReply();

        let all_meeting_conversations = {};
        const userNames = [];

        for (const userName in chunkRecordings) {
            const { audioStream, interval, all_user_conversations } = chunkRecordings[userName];

            clearInterval(interval);
            audioStream.destroy();

            try{ 
                all_meeting_conversations = {
                  ...all_meeting_conversations,
                  ...all_user_conversations
                };
                userNames.push(userName)
            } catch {
                console.log("Warning: can't add a conversation")
            }

            delete chunkRecordings[userName];
        }

        connection.destroy();

        const sortedConversationJson = Object.fromEntries(
            Object.entries(all_meeting_conversations).sort((a, b) => parseFloat(a[0]) - parseFloat(b[0]))
        );

        console.log(sortedConversationJson);

        try {
            const summary = await getSummaryFromTranscribed(sortedConversationJson, userNames, interaction);
            const timeTaken = ((Date.now() - startTime) / 1000).toFixed(2);
            const displayMarkdown = await displayResult(summary, timeTaken)

            const chunks = splitMessage(displayMarkdown);
                for (const chunk of chunks) {
                    await interaction.followUp({ content: chunk, ephemeral: false });
                }

        } catch (error) {
            console.error(error);
            const timeTaken = ((Date.now() - startTime) / 1000).toFixed(2);
            await interaction.editReply(`Error summarizing the meeting. ⏱️ Processed in ${timeTaken} seconds.`);
        }
    }
};

