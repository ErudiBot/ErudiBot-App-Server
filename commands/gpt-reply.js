import {
    ContextMenuCommandBuilder,
    ApplicationCommandType,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder,
    InteractionType,
} from 'discord.js';
import { OpenAI } from 'openai';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export default {
    data: new ContextMenuCommandBuilder()
        .setName('gpt-reply')
        .setType(ApplicationCommandType.Message),

    async execute(interaction) {
        const oldMessage = interaction.targetMessage.content;


        // Show a modal to ask follow-up question
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

        // Save the message content in the interaction client cache to use it later
        interaction.client.cachedMessages ??= new Map();
        interaction.client.cachedMessages.set(`gpt_modal_${interaction.id}`, oldMessage);

        await interaction.showModal(modal);
    },
};