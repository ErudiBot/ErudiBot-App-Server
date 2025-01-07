import { SlashCommandBuilder } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('hello')
        .setDescription('A hello command. No input'),
    async execute(interaction) {
        console.log('hello is executed')
        await interaction.reply(`Hi! I'm ErudiBot 👋. I'm working just fine. 👍`);
    },
};
