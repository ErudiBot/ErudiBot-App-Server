import { transcribeAudio } from "../external_api/whisper_api.js";
import { chatGPTMessage } from "../external_api/chatgpt-api.js";
import { summarizePrompt,  correctTranscriptPrompt} from "./prompts.js";
import { vadProcess } from '../process/vad.js';
import fs from 'fs';

export async function getSummaryFromRecords(userNames, resultFilePaths) {
    const allConversations = {};

    await Promise.all(userNames.map(async (userName, i) => {
        const resultPath = resultFilePaths[i];

        try {
            const userConversationsDict = await vadProcess(resultPath);
            for (const [key, value] of Object.entries(userConversationsDict)) {
                const transcribedText = await transcribeAudio(value);
                allConversations[key] = [userName, transcribedText];

                //delete audio from value which is audio path
                console.log("try to delete vad processed file")
                try {
                    await fs.unlink(value);
                    console.log(`Deleted audio file: ${value}`);
                } catch (deleteError) {
                    console.error(`Error deleting file ${value}:`, deleteError);
                }
            }
            //delete original audios from resultPath
            console.log("try to delete original audio file")
            try {
                await fs.unlink(resultPath);
                console.log(`Deleted original audio file: ${resultPath}`);
            } catch (deleteError) {
                console.error(`Error deleting original file ${resultPath}:`, deleteError);
            }

        } catch (error) {
            console.error(`Error processing ${userName}:`, error);
        }
    }));

    if (Object.keys(allConversations).length === 0) {
        console.error("No conversations were transcribed!");
        return "Sorry, no speech was detected.";
    }

    const sortedConversations = Object.fromEntries(
        Object.entries(allConversations).sort(([keyA], [keyB]) => parseFloat(keyA) - parseFloat(keyB))
    );

    const allTextConversations = JSON.stringify(sortedConversations);
    console.log("Transcribed Conversations:", allTextConversations);

    // Correct transcription text
    const correctTextPrompt = await correctTranscriptPrompt(allTextConversations);
    const correctConversations = await chatGPTMessage(correctTextPrompt);
    
    console.log("Corrected Conversations:", correctConversations);

    // Generate summary
    const summaryTextPrompt = await summarizePrompt(correctConversations);
    const meetingSummary = await chatGPTMessage(summaryTextPrompt);

    console.log("Final Meeting Summary:", meetingSummary);
    return meetingSummary;
}


//test 
const userNames = ['nathathai']
const resultFilePaths = ['C:/Users/Nathathai/Documents/chula_XD/ErudiBot/ErudiBot-app-server/recordings/860527000616042536_20250318T163422.wav']
const summary = await getSummaryFromRecords(userNames, resultFilePaths)
console.log(summary)