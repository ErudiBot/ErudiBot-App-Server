import 'dotenv/config';
import { ApplicationCommandPermissionType, Client, Collection, GatewayIntentBits, IntentsBitField, REST, Routes } from 'discord.js';
import fs from 'fs';
import path from 'path';
import { chatGPTMessage } from './external_api/chatgpt-api.js';

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMembers,
        IntentsBitField.Flags.Guilds,
        IntentsBitField.Flags.GuildMembers,
        IntentsBitField.Flags.GuildMessages,
        IntentsBitField.Flags.MessageContent,
    ],
});

// Initialize the commands collection
client.commands = new Collection();


// Load commands dynamically------------------------------------------------------------------
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));
const commands = [];


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
        // await rest.put(
        //     // Routes.applicationCommands(process.env.APP_ID),
        //     Routes.applicationGuildCommands(process.env.APP_ID, process.env.GUILD_ID),
        // {
        //     body: []
        // })
        // console.log('Delete old commands 🗑️');

        ////register in a server. Limit = 1 request per second. 
        await rest.put(
            Routes.applicationGuildCommands(process.env.APP_ID, process.env.GUILD_ID),
            { body: commands }
          );


        console.log('Successfully reloaded application (/) commands.');
        console.log('Loaded commands:', commands.map(cmd => cmd.name).join(', '));

    } catch (error) {
        console.error('Error refreshing commands:', error);
    }

    // Once commands are loaded, login the client
    client.login(process.env.TOKEN);
})();


//------------------------------------------------------------------------------------
// Once the bot is ready
client.once('ready', async(c) => {
    console.log(`✅ ${c.user.tag} is online!`);
});

// listen to users' message
client.on('messageCreate',(message)=>{
    // console.log(message);
    if(message.content === 'erudibot'){
        message.reply("Hi! I'm ErudiBot. 👋")
    }
})

// Handle interactions (e.g., slash commands)
client.on('interactionCreate', async (interaction) => {
    console.log("call command")
    if (!interaction.isCommand()) return;

    const command = client.commands.get(interaction.commandName);
    // console.log(command)
    if (!command) {
        console.error(`No command matching ${interaction.commandName} was found.`);
        return;
    }

    try {
        await command.execute(interaction);
    } catch (error) {
        console.error('Error executing command:', error);
        await interaction.reply({ content: 'There was an error executing that command.', ephemeral: true });
    }
});


//app -> gpt-reply
client.on('interactionCreate', async interaction => {
    if (interaction.isModalSubmit()) {
        if (interaction.customId.startsWith('gpt_modal_')) {
            const followUp = interaction.fields.getTextInputValue('follow_up');
            const originalMessage = interaction.client.cachedMessages?.get(interaction.customId);

            if (!originalMessage) {
                return await interaction.reply({
                    content: '❌ Could not retrieve the original message.',
                    ephemeral: true,
                });
            }

            await interaction.deferReply();

            try {
                // Call the chatGPTMessage function with both original message and follow-up
                const gptResponse = await chatGPTMessage(`Original message: "${originalMessage}" Follow-up question: "${followUp}"`);

                // Send response from GPT-4 in chunks if too long
                const chunkSize = 2000;
                for (let i = 0; i < gptResponse.length; i += chunkSize) {
                    const chunk = gptResponse.substring(i, i + chunkSize);
                    await interaction.followUp({ content: chunk });
                }
            } catch (error) {
                console.error('Error during GPT call:', error);
                await interaction.followUp('⚠️ Something went wrong while communicating with GPT.');
            }
        }
    }
});