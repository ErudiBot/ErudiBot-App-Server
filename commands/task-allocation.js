import { ContextMenuCommandBuilder, ApplicationCommandType } from 'discord.js';
import { getTaskAllocationFromSummary } from '../process/summary_task-allocation.js';
import { extractParticipants } from '../process/helper.js';

export default {
    data: new ContextMenuCommandBuilder()
        .setName('Get Task Allocation')
        .setType(ApplicationCommandType.Message), // Context menu for messages

        async execute(interaction) {
            try {
                await interaction.deferReply({ flags: 64 }); // 64 = ephemeral
                // await interaction.deferReply({ ephemeral: true }); // Acknowledge the interaction right away
        
                const message = await interaction.channel.messages.fetch(interaction.targetId);
                const meetingSummary = message.content;
                const userNames = await extractParticipants(meetingSummary);
                const taskAllocationResult = await getTaskAllocationFromSummary(meetingSummary, userNames);
        
                await interaction.editReply({ content: taskAllocationResult });
            } catch (error) {
                console.error('Error in task allocation command:', error);
                if (interaction.deferred || interaction.replied) {
                    await interaction.editReply({ content: 'Sorry, something went wrong while processing the task allocation.' });
                } else {
                    await interaction.reply({ content: 'Sorry, something went wrong while processing the task allocation.', ephemeral: true });
                }
            }
        }
};


