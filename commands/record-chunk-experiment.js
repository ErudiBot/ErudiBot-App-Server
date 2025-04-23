import { SlashCommandBuilder } from 'discord.js';
import { joinVoiceChannel, EndBehaviorType } from '@discordjs/voice';
import fs from 'fs';
import prism from 'prism-media';
import { transcribeAudio } from '../external_api/whisper_api.js';
import { chunkRecordings } from '../process/chunk_record.js';
import { exec } from 'child_process';

const CHUNK_DURATION_MS = 30_000; // 30 seconds


export default {
    data: new SlashCommandBuilder()
        .setName('record-chunk-experiment')
        .setDescription('Records in chunks and processes audio during the meeting (Moderators will not be recorded)'),

    async execute(interaction) {
        const member = interaction.member;
        const voiceChannel = member.voice.channel;

        if (!voiceChannel) return interaction.reply("You must be in a voice channel!");

        const connection = joinVoiceChannel({
            channelId: voiceChannel.id,
            guildId: voiceChannel.guild.id,
            adapterCreator: voiceChannel.guild.voiceAdapterCreator,
        });

        const receiver = connection.receiver;
        await interaction.reply("Started chunk-based recording... 🎧");

        receiver.speaking.on('start', async (userId) => {
            const guild_member = await interaction.guild.members.fetch(userId);
            const userName = guild_member.user.username;

            if (chunkRecordings[userName]) return;
        
            const user = await interaction.guild.members.fetch(userId).catch(() => null);
            if (!user) return;
        
            const hasModeratorRole = user.roles.cache.some(role => role.name === 'Moderator');
            if (hasModeratorRole) {
                console.log(`Skipping recording for Moderator: ${user.user.tag}`);
                return;
            }
        
            const audioStream = receiver.subscribe(userId, {
                end: { behavior: EndBehaviorType.Manual }
            });
        
            const decoder = new prism.opus.Decoder({ frameSize: 960, channels: 1, rate: 48000 });
            const pcmStream = audioStream.pipe(decoder);
        
            const buffers = [];
            pcmStream.on('data', chunk => buffers.push(chunk));
        
            let all_user_conversations = {};
        
            const interval = setInterval(async () => {
                if (buffers.length === 0) return; 
        
                const chunkData = Buffer.concat(buffers.splice(0));
                const chunkPath = `./recordings/chunk_${userName}_${Date.now()}.pcm`;
                fs.writeFileSync(chunkPath, chunkData);
        
                const wavPath = chunkPath.replace('.pcm', '.wav');
                await new Promise((res, rej) => {
                    const cmd = `ffmpeg -f s16le -ar 48k -ac 1 -i "${chunkPath}" "${wavPath}"`;
                    exec(cmd, (err) => {
                        if (err) rej(err); else res();
                    });
                });
                fs.unlinkSync(chunkPath);
        
                const startTime = new Date().getTime();
                const transcriptText = await transcribeAudio(wavPath);

                all_user_conversations[startTime] = [
                    userName,
                    transcriptText
                ];

                fs.unlinkSync(wavPath);
            }, CHUNK_DURATION_MS);
        
            chunkRecordings[userName] = {
                audioStream,
                decoder,
                buffers,
                interval,
                all_user_conversations
            };
        
            audioStream.on('end', () => console.log(`Stopped receiving from ${userName}`));
        });
        
    }
};