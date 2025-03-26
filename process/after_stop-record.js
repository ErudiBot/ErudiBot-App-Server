import { transcribeAudio } from "../external_api/whisper_api.js";
import { chatGPTMessage } from "../external_api/chatgpt-api.js";
import { correctTranscriptPrompt, summarizePrompt, taskPlanningPrompt, singleTaskAgentPrompt, taskAllocationPrompt, reflectionPatternPrompt} from "./prompts.js";
import { vadProcess } from '../process/vad.js';
import fs from 'fs/promises';

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

export async function getSummaryFromTranscribedText(transcribedPaths) {
    try {
        const fileContent = await fs.readFile(transcribedPaths, 'utf-8');  // Corrected readFile usage
        const allConversations = JSON.parse(fileContent);
        const allTextConversations = JSON.stringify(allConversations);
        // console.log("Transcribed Conversations:", allTextConversations);

        //1. Correct transcription text
        const correctTextPrompt = await correctTranscriptPrompt(allTextConversations);
        const correctConversations = await chatGPTMessage(correctTextPrompt);
        // console.log("Corrected Conversations:", correctConversations);

        //2. GPT Prompt For Summary + Topic Interest
        const summaryTextPrompt = await summarizePrompt(correctConversations);
        const meetingSummary = await chatGPTMessage(summaryTextPrompt);

        return meetingSummary;

    } catch (error) {
        console.error("Error in getSummaryFromTranscribedText:", error);
        return "Error processing transcription.";
    }
}

export async function getTaskAllocationFromSummary(meetingSummary, userNames){
    try{
        const topicInterest = await extractTopic(meetingSummary, "Topic Interest")
        console.log(topicInterest)

        //3. GPT Prompt for Task Planning  
        const userNumber = userNames.length;
        const taskPlanningTextPrompt = await taskPlanningPrompt(meetingSummary, userNumber)
        const taskPlanning = await chatGPTMessage(taskPlanningTextPrompt);

        //4. Prompt GPT for Single Task Agent
        const singleAgentResults = [];
        for (const userName of userNames) {
            const singleTaskAgentTextPrompt = await singleTaskAgentPrompt(taskPlanning, userName);
            const singleAgentResponse = await chatGPTMessage(singleTaskAgentTextPrompt);
            singleAgentResults.push({ userName, response: singleAgentResponse });
        }

        //5. Prompt GPT for Task Allocation
        const combinedAgentResponses = singleAgentResults.map(agent => `${agent.userName}: ${agent.response}`).join("\n");
        const taskAllocationTextPrompt = await taskAllocationPrompt(combinedAgentResponses, topicInterest);
        const taskAllocation = await chatGPTMessage(taskAllocationTextPrompt);
        
        //6. Prompt GPT for Reflection Pattern 
        const reflectionPatternTextPrompt = await reflectionPatternPrompt(taskAllocation)
        let reflectionResult = await chatGPTMessage(reflectionPatternTextPrompt)// expect checking result and new task allocation

        let checkingResult = await extractTopicOnlyContent(reflectionResult, "Checking Result"); //expect to be true/false
        let booleanValue = JSON.parse(checkingResult);

        while(booleanValue !== true){
            reflectionResult = await chatGPTMessage(reflectionPatternTextPrompt)
            checkingResult = await extractTopicOnlyContent(reflectionResult, "Checking Result"); //expect to be true/false
            booleanValue = JSON.parse(checkingResult);
        }
        const finalTaskAllocation = await deleteTopic(reflectionResult);

        return finalTaskAllocation;
    } catch (error) {
        console.error("Error: ", error);
        return "Error processing task allocation.";
    }
}

function extractTopic(text, topicName) { //usage -> console.log(extractTopic(text, "Topic Interest"));
    if (typeof text !== "string") {
        console.error("Error: Input text is not a string");
        return `**${topicName}**\nNot found`;
    }

    const regex = new RegExp(`\\*\\*${topicName}\\*\\*([\\s\\S]*?)(?=\\n\\n|\\*\\*)`);
    const match = text.match(regex);

    if (match) {
        return `**${topicName}**\n${match[1].trim()}`;
    }
    return `**${topicName}**\nNot found`;
}

function extractTopicOnlyContent(text, topicName) {
    if (typeof text !== "string") {
        console.error("Error: Input text is not a string");
        return ""
    }

    const regex = new RegExp(`\\*\\*${topicName}\\*\\*([\\s\\S]*?)(?=\\n\\n|\\*\\*)`);
    const match = text.match(regex);

    if (match) {
        return match[1].trim()
    }
    return ""
}

function deleteTopic(text, topicName) {
    if (typeof text !== "string") {
        console.error("Error: Input text is not a string");
        return text; 
    }

    const regex = new RegExp(`\\*\\*${topicName}\\*\\*([\\s\\S]*?)(?=\\n\\n|\\*\\*)`, "g");
    const modifiedText = text.replace(regex, '');
    
    return modifiedText.trim(); 
}

async function readTextFile(textFilePath){
    try{
        const data = await fs.readFile(textFilePath, 'utf8');
        return data;
    }catch(err){
        console.error('Error reading the file:', err);
    }
}

//-----------------------------------------------------------------------------------------------------------------------------------------------------------

////--------------test summary from record------------------------------------------
// const userNames = ['ItsRitte', 'NaThatHai', 'myo']
// const resultFilePaths = ['C:/Users/Nathathai/Documents/chula_XD/ErudiBot/ErudiBot-app-server/recordings/198624703538003968_20250321T140113.wav',
//                         'C:/Users/Nathathai/Documents/chula_XD/ErudiBot/ErudiBot-app-server/recordings/860527000616042536_20250321T140113.wav',
//                         'C:/Users/Nathathai/Documents/chula_XD/ErudiBot/ErudiBot-app-server/recordings/363311465077145600_20250321T140113.wav'
// ]
// const summary = await getSummaryFromRecords(userNames, resultFilePaths)
// console.log(summary)

// //----------------test only summary from transcribed text (whisper)----------------------------
// const transcribedPaths = './test_results/transcribed.json';
// try {
//     const meetingSummary = await getSummaryFromTranscribedText(transcribedPaths);
//     console.log(meetingSummary);
// } catch (err) {
//     console.error(err);
// }

//---------------test both summarize and task allocation function------------- (didn't test this yet. if bug just stay patient)
// try {
//     const transcribedPaths = './test_results/transcribed.json';
//     const userNames = ['ItsRitte', 'NaThatHai', 'myo'];
//     const meetingSummary = await getSummaryFromTranscribedText(transcribedPaths);
//     const taskAllocation = await getTaskAllocationFromSummary(meetingSummary, userNames);
//     console.log(taskAllocation);
// } catch (err) {
//     console.error(err);
// }

//--------------example of how to use readTextFile function ------------------------

// const topicName = 'Topic Interest'
// const textFilePath = './test_results/meeting_test_sumary.txt'
// const textResult = await readTextFile(textFilePath)
// console.log(result)