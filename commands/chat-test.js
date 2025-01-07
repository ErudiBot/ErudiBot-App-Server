import { SlashCommandBuilder } from 'discord.js';
import { OpenAI } from 'openai';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export default {
    data: new SlashCommandBuilder()
        .setName('chat-test')
        .setDescription('Interact with GPT-4 for a conversation')
        .addStringOption(option =>
            option
                .setName('message')
                .setDescription('The message to send to GPT-3.5-turbo')
                .setRequired(true)
        ),

    async execute(interaction) {
        try {
            await interaction.deferReply(); // Send typing indicator and defer reply

            // Retrieve the user's message input
            const userMessage = interaction.options.getString('message');

            // Prepare the conversation context
            const conversation = [
                { role: 'system', content: 'You are ChatGPT, a helpful AI available in this bot.' },
                { role: 'user', content: userMessage },
            ];

            // Send the conversation to OpenAI and get the response
            const response = await openai.chat.completions.create({
                model: 'gpt-3.5-turbo',
                messages: conversation,
            });

            const responseMessage = response.choices[0].message.content;

            // Split the response into chunks if it exceeds Discord's character limit (2000)
            const chunkSizeLimit = 2000;
            for (let i = 0; i < responseMessage.length; i += chunkSizeLimit) {
                const chunk = responseMessage.substring(i, i + chunkSizeLimit);
                await interaction.followUp({ content: chunk });
            }

        } catch (error) {
            console.error('OpenAI Error:', error);
            if (error.code === 'insufficient_quota') {
                await interaction.followUp('Sorry, I have exceeded my OpenAI usage limit. Please try again later.');
            } else if (error.response && error.response.status === 429) {
                await interaction.followUp('The API is currently rate-limited. Please wait a moment and try again.');
            } else {
                await interaction.followUp('An unexpected error occurred while processing your request.');
            }
        }
    },
};
