import { SlashCommandBuilder } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('hello2')
        .setDescription('A hello2 command. No input'),
    async execute(interaction) {
        console.log('hello2 is executed')
        await interaction.reply(`Hi! I'm ErudiBot 👋👋. I'm working just fine. 👍`);
    },
};
