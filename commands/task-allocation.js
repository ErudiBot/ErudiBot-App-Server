import { ContextMenuCommandBuilder, ApplicationCommandType } from 'discord.js';
import { getTaskAllocationFromSummary } from '../process/summary_task-allocation.js';
import { extractParticipants } from '../process/helper.js';

export default {
    data: new ContextMenuCommandBuilder()
        .setName('Get Task Allocation')
        .setType(ApplicationCommandType.Message), // Context menu for messages

    async execute(interaction) {
        try {
            const message = await interaction.channel.messages.fetch(interaction.targetId);
            const meetingSummary = message.content;
            const userNames = await extractParticipants(meetingSummary);
            const taskAllocationResult = await getTaskAllocationFromSummary(meetingSummary, userNames);
            await interaction.reply({ content: taskAllocationResult, ephemeral: true });
        } catch (error) {
            console.error('Error in task allocation command:', error);
            await interaction.reply({ content: 'Sorry, something went wrong while processing the task allocation.', ephemeral: true });
        }
    },
};