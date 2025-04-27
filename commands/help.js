import { SlashCommandBuilder } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Get a guide on how to use ErudiBot’s commands and features.'),
    async execute(interaction) {
        console.log('help is executed')
        await interaction.deferReply();
        await interaction.editReply(
            `👋 Hi! I'm **ErudiBot**, your intelligent meeting assistant. Here's how to use me:\n\n` +
            `## 📌 Slash Commands:\n` +
            `• \`/record\` – Start recording the meeting. Make sure you're in a voice channel before using this!\n` +
            `• \`/stop\` – Stop the recording. I’ll process everything and share a summary in this text channel.\n\n` +
            `## 💫 Apps (Right-click features):\n` +
            `• **Ask GPT** – Right-click any message > Apps > Ask GPT → Ask follow-up questions based on that message.\n` +
            `• **Get Task Allocation** – Right-click on my meeting summary > Apps > Get Task Allocation → I’ll help assign tasks to participants.\n\n` +
            `Let’s make your meetings smarter! 💡`
        );
    },
};

//🧩🛸🚀🌟⚡💫📌