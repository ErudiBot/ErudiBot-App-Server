import { ApplicationCommandOptionType, REST, Routes } from 'discord.js';
import 'dotenv/config';

const commands = [
    // {
    //     name:'add',
    //     description:'add two numbers',
    //     options: [
    //         {
    //             name: 'first-number',
    //             description: 'The first number',
    //             type: ApplicationCommandOptionType.Number,
    //             required: true,
    //         },
    //         {
    //             name: 'second-number',
    //             description: 'The second number',
    //             type: ApplicationCommandOptionType.Number,
    //             required: true,
    //         }
    //     ]
    // }
];

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

(async () => {
    try{
        console.log("Registering slash commands...")
        await rest.put(
            Routes.applicationGuildCommands(process.env.BOT_ID, process.env.PRAE_GUILD_ID),
        {
            body: commands
        })
        console.log("Slash commands were registried successfully")
    }catch(error){
        console.log(`There was an error: ${error}`);
    }
})();