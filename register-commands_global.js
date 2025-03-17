import 'dotenv/config';
import { ApplicationCommandPermissionType, Client, Collection, GatewayIntentBits, IntentsBitField, REST, Routes } from 'discord.js';
import fs from 'fs';

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        IntentsBitField.Flags.Guilds,
        IntentsBitField.Flags.GuildMembers,
        IntentsBitField.Flags.GuildMessages,
        IntentsBitField.Flags.MessageContent,
    ],
});


(async () => {
    for (const file of commandFiles) {
        try {
            const command = await import(`./commands/${file}`);
            if (command?.default?.data) {
                // Add the command to the client.commands collection
                client.commands.set(command.default.data.name, command.default);
                commands.push(command.default.data.toJSON());
            } else {
                console.error(`Command file "${file}" is missing a proper export.`);
            }
        } catch (error) {
            console.error(`Error loading command file "${file}":`, error);
        }
    }

    // console.log('Loaded commands:', commands);

    // Register commands with Discord's API
    const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

    try {
        console.log('Refreshing application (/) commands...');
        //global register can take up to 1 hour to process by discord. Discord limits this request to 1 request per 5 minutes
        await rest.put(
            Routes.applicationCommands(process.env.APP_ID),
        {
            body: commands
        })

        console.log('Successfully reloaded application (/) commands globally.');
        console.log('Loaded commands:', commands.map(cmd => cmd.name).join(', '));

    } catch (error) {
        console.error('Error refreshing commands:', error);
    }

    // Once commands are loaded, login the client
    client.login(process.env.TOKEN);
})();
