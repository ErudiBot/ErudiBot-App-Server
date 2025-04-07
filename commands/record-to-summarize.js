import { SlashCommandBuilder } from 'discord.js';
import { joinVoiceChannel, EndBehaviorType } from '@discordjs/voice';
import fs from 'fs';
import prism from 'prism-media';

export const recordings = {};

export default {
    data: new SlashCommandBuilder()
        .setName('record-to-summarize')
        .setDescription('Records audio from the voice channel'),

    async execute(interaction) {
        const member = interaction.member;
        console.log("Interaction Member:", member); 
        const voiceChannel = member.voice.channel;
        console.log("User's Voice Channel:", voiceChannel);
        if (!voiceChannel) {
            return interaction.reply("You need to be in a voice channel to use this command!");
        }

        // Connect to voice channel
        const connection = joinVoiceChannel({
            channelId: voiceChannel.id,
            guildId: voiceChannel.guild.id,
            adapterCreator: voiceChannel.guild.voiceAdapterCreator
        });

        const timestamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0]; // YYYYMMDDTHHMMSS
        await interaction.reply("Started recording... 🎤");

        const receiver = connection.receiver;

        receiver.speaking.on('start', (userId) => {
            if (recordings[userId]) return; // Avoid duplicate streams

            console.log(`Started receiving audio from user: ${userId}`);

            const audioStream = receiver.subscribe(userId, {
                end: {
                    behavior: EndBehaviorType.Manual
                }
            });

            const opusDecoder = new prism.opus.Decoder({ frameSize: 960, channels: 1, rate: 48000 });
            const filePath = `./recordings/${userId}_${timestamp}.pcm`;
            const outputStream = fs.createWriteStream(filePath);

            audioStream.pipe(opusDecoder).pipe(outputStream);

            recordings[userId] = { audioStream, outputStream, filePath };

            audioStream.on('end', () => {
                console.log(`Stopped receiving audio from user: ${userId}`);
            });
        });
    }
};
