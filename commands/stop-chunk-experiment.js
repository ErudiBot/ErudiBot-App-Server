import { SlashCommandBuilder } from 'discord.js';
import { getVoiceConnection } from '@discordjs/voice';
import { chunkRecordings } from '../process/chunk_record.js';
import { getSummaryFromTranscribed } from '../process/summary_task-allocation.js';

export default {
    data: new SlashCommandBuilder()
        .setName('stop-chunk-experiment')
        .setDescription('Stops chunk-based recording and summarizes  (Moderators will not be recorded)'),

    async execute(interaction) {
        const startTime = Date.now();

        const connection = getVoiceConnection(interaction.guildId);
        if (!connection) return interaction.reply("Bot is not in a voice channel!");

        await interaction.deferReply();

        const allTranscripts = {};
        const userNames = [];

        for (const userId in chunkRecordings) {
            const { audioStream, interval, transcripts } = chunkRecordings[userId];

            clearInterval(interval);
            audioStream.destroy();

            try {
                const member = await interaction.guild.members.fetch(userId);
                allTranscripts[member.user.username] = transcripts;
                userNames.push(member.user.username)
            } catch {
                allTranscripts[`Unknown-${userId}`] = transcripts;
                userNames.push(`Unknown-${userId}`);
            }

            delete chunkRecordings[userId];
        }

        connection.destroy();

        const sortedConversations = {};
        let t = 0;
        for (const [name, chunks] of Object.entries(allTranscripts)) {
            for (const chunk of chunks) {
                sortedConversations[t++] = [name, chunk];
            }
        }

        try {
            const summary = await getSummaryFromTranscribed(sortedConversations, userNames);
            const timeTaken = ((Date.now() - startTime) / 1000).toFixed(2);
            await interaction.editReply(`${summary}\n\n⏱️ Took ${timeTaken} seconds.`);

            await interaction.editReply(summary);
        } catch (error) {
            console.error(error);
            const timeTaken = ((Date.now() - startTime) / 1000).toFixed(2);
            await interaction.editReply(`Error summarizing the meeting. ⏱️ Took ${timeTaken} seconds.`);
        }
    }
};
