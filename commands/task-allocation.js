import { ContextMenuCommandBuilder, ApplicationCommandType } from 'discord.js';
import { getTaskAllocationFromSummary } from '../process/summary_task-allocation.js';
import { extractParticipants, splitMessage, displayResult} from '../process/helper.js';

export default {
    data: new ContextMenuCommandBuilder()
        .setName('Get Task Allocation')
        .setType(ApplicationCommandType.Message), // Context menu for messages

        async execute(interaction) {
            const start = Date.now();
            try {
                await interaction.deferReply({ ephemeral: false }); 
        
                const message = await interaction.channel.messages.fetch(interaction.targetId);
                const meetingSummary = message.content;
                const userNames = await extractParticipants(meetingSummary);
                const taskAllocationResult = await getTaskAllocationFromSummary(meetingSummary, userNames, interaction);

                
                if (taskAllocationResult.error) {
                    return await interaction.editReply({
                        content: `${taskAllocationResult.error}\n${taskAllocationResult.details}`,
                    });
                }

                const timeTaken = ((Date.now() - start) / 1000).toFixed(2);


                const displayMarkdown = await displayResult(taskAllocationResult, timeTaken);
                
                const chunks = splitMessage(displayMarkdown);
                for (const chunk of chunks) {
                    await interaction.followUp({ content: chunk, ephemeral: false });
                }
        
            } catch (error) {
                console.error('Error in task allocation command:', error);
                if (interaction.deferred || interaction.replied) {
                    await interaction.editReply({ content: `Sorry, something went wrong while processing the task allocation.` });
                } else {
                    await interaction.reply({ content: `Sorry, something went wrong while processing the task allocation.`, ephemeral: true });
                }
            }
        }
};



