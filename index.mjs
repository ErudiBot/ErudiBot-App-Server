import 'dotenv/config';
import { Client } from 'discord.js'; 
import { OpenAI } from 'openai'; 
const client = new Client({
    intents: ['Guilds', 'GuildMembers', 'GuildMessages', 'MessageContent']
});
client.on('ready',()=>{
    console.log('The bot is online');
})
const IGNORE_PREFIX='!';
// const CHANNELS=['1293571052407885827', '1297575342705475696', '1297575385705218129']

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
})
client.on('messageCreate',async(message)=>{
    if(message.author.bot)return;
    if(message.content.startsWith(IGNORE_PREFIX))return;
    if (message.author.bot) return;
    if (message.content.startsWith(IGNORE_PREFIX)) return;

    await message.channel.sendTyping();
    const sendTypingInterval = setInterval(()=>{
        message.channel.sendTyping();
    },5000)

    let conversation = [];
    conversation.push({
        role:'system',
        content: 'Chat GPT is available in this bot'
    })

    let prevMessages = await message.channel.messages.fetch({limit:10});
    prevMessages.reverse()

    prevMessages.forEach((msg)=>{
        if(msg.author.bot && msg.author.id !== client.user.id)return;
        if(msg.content.startsWith(IGNORE_PREFIX)) return;
        const username = msg.author.username.replace(/\s+/g, '_').replace(/[^\w\s]/gi, '');
        if(msg.author.id === client.user.id){
            conversation.push({
                role:'assistant',
                name: username,
                content:msg.content
            })
            return
        }
        conversation.push({
            role:'user',
            name: username,
                content:msg.content
        })
    })
    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages: conversation
        });
        responseMessage = response.choices[0].message.content;
        const chunkSizeLimit = 2000;
        for (i=0;i<responseMessage.lenth; i+=chunkSizeLimit){
            const chunk = responseMessage.substring(i,i+chunkSizeLimit);
            await message.reply(chunk);
        }

        if (response && response.choices && response.choices[0]) {
            clearInterval(sendTypingInterval)
            message.reply(responseMessage);
        } else {
            clearInterval(sendTypingInterval)
            message.reply("Sorry, I couldn't process your request right now.");
        }
    } catch (error) {
        clearInterval(sendTypingInterval)
        console.error('OpenAI Error:\n', error);
        if (error.code === 'insufficient_quota') {
            message.reply('Sorry, I have exceeded my OpenAI usage limit. Please try again later.');
        } else {
            message.reply('An error occurred while processing your request.');
        }
    }
});

client.login(process.env.TOKEN);

