import { OpenAI } from 'openai';
import 'dotenv/config';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export async function chatGPTMessage(text, model) {
    try {
        // Prepare the conversation context
        const conversation = [
            { role: 'system', content: 'You are ChatGPT, a helpful AI available in this bot.' },
            { role: 'user', content: text },
        ];
        let gpt_model = 'gpt-4o-mini';
        if(model){
            gpt_model = model;
        }

        // Send the conversation to OpenAI and get the response
        const response = await openai.chat.completions.create({
            model: gpt_model,
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


export async function chatGPTMessageJson(text, model) {
    try {
        // Prepare the conversation context
        const conversation = [
            { role: 'system', content: 'You are ChatGPT, a helpful AI available in this bot. You should answer in json format only' },
            { role: 'user', content: text },
        ];

        // Send the conversation to OpenAI and get the response
        let gpt_model = 'gpt-4o-mini';
        if(model){
            gpt_model = model;
        }
        const response = await openai.chat.completions.create({
            model: gpt_model,
            messages: conversation,
            response_format: { "type": "json_object" }
        });

        const promptTokens = response.usage.prompt_tokens;
        const completionTokens = response.usage.completion_tokens;
        const tokensReport = {
            "prompt_tokens":promptTokens,
            "completion_tokens": completionTokens
        }

        const responseMessage = response.choices[0].message.content;

        return JSON.stringify({ success: true, message: responseMessage, tokens: tokensReport});

    } catch (error) {
        console.error('OpenAI Error:', error);

        let errorMessage = 'An unexpected error occurred while processing your request.';
        if (error.code === 'insufficient_quota') {
            errorMessage = 'Sorry, I have exceeded my OpenAI usage limit. Please try again later.';
        } else if (error.response && error.response.status === 429) {
            errorMessage = 'The API is currently rate-limited. Please wait a moment and try again.';
        }

        return JSON.stringify({ success: false, error: errorMessage, tokens: tokensReport });
    }
}