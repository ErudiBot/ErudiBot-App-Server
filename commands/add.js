import { SlashCommandBuilder } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('add')
        .setDescription('Adds two numbers together.')
        .addNumberOption(option =>
            option
                .setName('first-number')
                .setDescription('The first number to add.')
                .setRequired(true)
        )
        .addNumberOption(option =>
            option
                .setName('second-number')
                .setDescription('The second number to add.')
                .setRequired(true)
        ),
    async execute(interaction) {
        // Get the numbers from the options
        const num1 = interaction.options.getNumber('first-number');
        const num2 = interaction.options.getNumber('second-number');

        // Calculate the sum
        const sum = num1 + num2;

        // Reply with the result
        await interaction.reply(`The sum of ${num1} and ${num2} is ${sum}.`);
    },
};
