import {
    ContextMenuCommandBuilder,
    ApplicationCommandType,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder,
} from 'discord.js';
import { OpenAI } from 'openai';
import { splitMessage } from '../process/helper.js';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export default {
    data: new ContextMenuCommandBuilder()
        .setName('Ask GPT')
        .setType(ApplicationCommandType.Message),

    async execute(interaction) {
        const oldMessage = interaction.targetMessage.content;

        const modal = new ModalBuilder()
            .setCustomId(`gpt_modal_${interaction.id}`)
            .setTitle('Ask GPT About This Message');

        const input = new TextInputBuilder()
            .setCustomId('follow_up')
            .setLabel('Your question or message to GPT')
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder('e.g., Can you explain this message?')
            .setRequired(true);

        const row = new ActionRowBuilder().addComponents(input);
        modal.addComponents(row);

        interaction.client.cachedMessages ??= new Map();
        interaction.client.cachedMessages.set(`gpt_modal_${interaction.id}`, oldMessage);

        await interaction.showModal(modal);
    },

    // Handle modal submission here
    async handleModalSubmit(interaction) {
        if (!interaction.isModalSubmit()) return;
        if (!interaction.customId.startsWith('gpt_modal_')) return;

        const followUp = interaction.fields.getTextInputValue('follow_up');
        const oldMessage = interaction.client.cachedMessages?.get(interaction.customId);

        if (!oldMessage) {
            await interaction.reply({ content: 'Original message not found.', ephemeral: true });
            return;
        }

        await interaction.deferReply();

        try {
            const startTime = Date.now();

            const completion = await openai.chat.completions.create({
                model: 'gpt-4.1-nano', // GPT-4.1
                messages: [
                    { role: 'system', content: 'You are a helpful assistant in Discord.' },
                    { role: 'user', content: `Original message: "${oldMessage}"\n\nFollow-up: ${followUp}` },
                ],
                temperature: 0.7,
            });

            console.log(completion)

            const reply = completion.choices[0].message.content || 'No response received.';
            const timeTaken = ((Date.now() - startTime) / 1000).toFixed(2);


            const chunks = splitMessage(reply);
            for (const chunk of chunks) {
                await interaction.followUp(chunk);
            }

            await interaction.followUp(`⏱️ Processed in ${timeTaken} seconds.`);//the time is not printed out

        } catch (error) {
            console.error('OpenAI Error:', error);
            await interaction.followUp('Something went wrong while talking to GPT.');
        }
    }
};
