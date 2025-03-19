import { OpenAI } from 'openai';
import 'dotenv/config';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export async function chatGPTMessage(text) {
    try {
        // Prepare the conversation context
        const conversation = [
            { role: 'system', content: 'You are ChatGPT, a helpful AI available in this bot.' },
            { role: 'user', content: text },
        ];

        // Send the conversation to OpenAI and get the response
        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: conversation,
        });

        const responseMessage = response.choices[0].message.content;

        return responseMessage

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
}
