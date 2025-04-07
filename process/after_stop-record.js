import { transcribeAudio } from "../external_api/whisper_api.js";
import { chatGPTMessage, chatGPTMessageJson } from "../external_api/chatgpt-api.js";
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
        const allConversationsJson = JSON.parse(fileContent);

        const allConverastionsText = await TranscribedConversationJsonToText(allConversationsJson)
        console.log(allConverastionsText);

        //1. Correct transcription text
        const correctTextPrompt = await correctTranscriptPrompt(allConverastionsText);
        const correctConversations = await chatGPTMessageJson(correctTextPrompt);
        console.log("Corrected Conversations:", correctConversations);

        //2. GPT Prompt For Summary + Topic Interest
        const summaryTextPrompt = await summarizePrompt(correctConversations);
        const meetingSummary = await chatGPTMessageJson(summaryTextPrompt);

        return meetingSummary;

    } catch (error) {
        console.error("Error in getSummaryFromTranscribedText:", error);
        return "Error processing transcription.";
    }
}

export async function getTaskAllocationFromSummary(meetingSummary, userNames){
    try{
        const meetingSummaryJson = await getMessageFromJsonResponse(meetingSummary);
        if (!meetingSummaryJson || !meetingSummaryJson["topic_interest"] || !meetingSummaryJson["task_list"]) {
            throw new Error("Invalid meeting summary format.");
        }
        const topicInterest = meetingSummaryJson["topic_interest"]
        console.log("topic interest:")
        console.log(topicInterest)

        //3&4. GPT Prompt for Task Planning  
        const userNumber = userNames.length
        const taskList = meetingSummaryJson["task_list"]
        const allTasksPlan = []
        for (const taskItem of taskList){
            const task = taskItem.task;
            const taskPlanningTextPrompt = await taskPlanningPrompt(meetingSummaryJson, task, userNumber);
            const taskPlanning = await chatGPTMessageJson(taskPlanningTextPrompt);
            const taskPlanJson = await getMessageFromJsonResponse(taskPlanning);
            allTasksPlan.push(taskPlanJson)
        }
        console.log("All task plan: ")
        console.log(allTasksPlan);

        if (allTasksPlan.length === 0) {
            throw new Error("No tasks planned. Task list may be empty or processing failed.");
        }

        //5. Prompt GPT for Task Allocation
        const taskAllocationTextPrompt = await taskAllocationPrompt(allTasksPlan, userNames, topicInterest);
        const taskAllocation = await chatGPTMessageJson(taskAllocationTextPrompt);
        let taskAllocationJson = await getMessageFromJsonResponse(taskAllocation);
        console.log("task allocation: ");
        console.log(taskAllocationJson)
        
        // //6. Prompt GPT for Reflection Pattern 
        let cv = await CVDistributed(taskAllocationJson)
        let isGood = cv <= 20;
        console.log("is good");
        console.log(isGood)
        let reflectionResult = taskAllocation;

        while(isGood !== true){
            let reflecTaskAllocationTextPrompt = await reflectionPatternPrompt(taskAllocationJson, cv)
            reflectionResult = await chatGPTMessageJson(reflecTaskAllocationTextPrompt)
            taskAllocationJson = await getMessageFromJsonResponse(reflectionResult);
            cv = await CVDistributed(taskAllocationJson)
            isGood = cv <= 20;
            break; //i just break to see if the logic work. remove this for further development.
        }
        const taskAllocationResult = await jsonToMarkdown(reflectionResult)

        return taskAllocationResult;
    } catch (error) {
        console.error("Error: ", error);
        return "Error processing task allocation.";
    }
}

export async function getMessageFromJsonResponse(jsonResponseText) {
    const jsonResponse = JSON.parse(jsonResponseText);
    if (!jsonResponse || !jsonResponse.message) {
        throw new Error("Invalid input: 'message' property is missing.");
    }

    // Extract JSON from Markdown block (if present)
    const jsonString = jsonResponse.message.startsWith("```json")
        ? jsonResponse.message.replace(/^```json\n/, '').replace(/\n```$/, '')
        : jsonResponse.message;

    // Parse JSON string
    let data;
    try {
        data = JSON.parse(jsonString);
        return data
    } catch (error) {
        throw new Error("Failed to parse JSON: " + error.message);
    }
}

export async function jsonToMarkdown(jsonResponseText) {
    const data = await getMessageFromJsonResponse(jsonResponseText);
    // console.log("message: ");
    // console.log(data);

    function formatValue(value, indent = "") {
        if (Array.isArray(value)) {
            return value.map(item => `\n${indent}- ${typeof item === 'object' ? formatValue(item, indent + "  ") : item}`).join("");
        } else if (typeof value === 'object' && value !== null) {
            return Object.entries(value)
                .map(([subKey, subValue]) => `\n${indent}**${subKey}:** ${formatValue(subValue, indent + "  ")}`)
                .join("");
        }
        return value;
    }

    return Object.entries(data)
        .map(([key, value]) => `# ${key}\n${formatValue(value)}`)
        .join("\n\n");
}

async function readTextFile(textFilePath){
    try{
        const data = await fs.readFile(textFilePath, 'utf8');
        return data;
    }catch(err){
        console.error('Error reading the file:', err);
    }
}

function CVDistributed(taskAllocationJson) {
    const userWorkload = {};

    // Collect total estimated time per user
    for (const task of taskAllocationJson['tasks']) {
        for (const subtask of task.subtasks) {
            const user = subtask.assigned_to;
            const estimatedTime = parseFloat(subtask.estimated_time); // Ensure number

            if (!userWorkload[user]) {
                userWorkload[user] = 0;
            }
            userWorkload[user] += estimatedTime;
        }
    }

    const workHours = Object.values(userWorkload);
    if (workHours.length <= 1) return true; // Only one user, no variation

    // Calculate mean (µ)
    const mean = workHours.reduce((sum, val) => sum + val, 0) / workHours.length;

    // Calculate standard deviation (σ)
    const squaredDiffs = workHours.map(val => Math.pow(val - mean, 2));
    const stdDev = Math.sqrt(squaredDiffs.reduce((sum, val) => sum + val, 0) / workHours.length);

    // Calculate CV (%)
    const cv = (stdDev / mean) * 100;

    return cv 
}

async function TranscribedConversationJsonToText(jsonConversation){

    const result = Object.entries(jsonConversation)
        .sort((a, b) => parseFloat(a[0]) - parseFloat(b[0]))
        .map(([_, [speaker, data]]) => `${speaker}: ${data.text}`)
        .join('\n');
    return result;
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
//     // console.log(meetingSummary);

//     const meetingSummaryMarkdown = await jsonToMarkdown(meetingSummary);
//     console.log(meetingSummaryMarkdown)
// } catch (err) {
//     console.error(err);
// }

//---------------test both summarize and task allocation function------------- (didn't test this yet. if bug just stay patient)
try {
    const transcribedPaths = './test_results/transcribed.json';
    const userNames = ['ItsRitte', 'NaThatHai', 'myo'];
    const meetingSummary = await getSummaryFromTranscribedText(transcribedPaths);
    const taskAllocation = await getTaskAllocationFromSummary(meetingSummary, userNames);
    console.log(taskAllocation);
} catch (err) {
    console.error(err);
}

//--------------example of how to use readTextFile function ------------------------

// const topicName = 'Topic Interest'
// const textFilePath = './test_results/meeting_test_sumary.txt'
// const textResult = await readTextFile(textFilePath)
// console.log(result)