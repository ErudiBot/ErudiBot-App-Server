import { ContextMenuCommandBuilder, ApplicationCommandType } from 'discord.js';
import { getTaskAllocationFromSummary } from '../process/summary_task-allocation.js';
import { extractParticipants } from '../process/helper.js';

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
                const taskAllocationResult = await getTaskAllocationFromSummary(meetingSummary, userNames);

                const duration = ((Date.now() - start) / 1000).toFixed(2);

                if (taskAllocationResult.startsWith('Error') && duration < 1) {
                    return await interaction.editReply({
                        content: `Make sure you click from ErudiBot's meeting summary 🥲`,
                    });
                }
                
                const chunks = splitMessage(`${taskAllocationResult}\n\n⏱️ Processed in ${duration} seconds.`);
                for (const chunk of chunks) {
                    await interaction.followUp({ content: chunk, ephemeral: false });
                }
        
            } catch (error) {
                console.error('Error in task allocation command:', error);
                if (interaction.deferred || interaction.replied) {
                    await interaction.editReply({ content: `Make sure you click from ErudiBot's meeting summary 🥲` });
                } else {
                    await interaction.reply({ content: `Sorry, something went wrong while processing the task allocation. Make sure you click from ErudiBot's meeting summary`, ephemeral: true });
                }
            }
        }
};


function splitMessage(text, maxLength = 2000) {
    const chunks = [];
    let current = '';

    for (const line of text.split('\n')) {
        if ((current + line + '\n').length > maxLength) {
            chunks.push(current);
            current = '';
        }
        current += line + '\n';
    }
    if (current) chunks.push(current);
    return chunks;
}



