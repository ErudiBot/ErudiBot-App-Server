import { transcribeAudio } from "../external_api/whisper_api.js";
import { chatGPTMessageJson } from "../external_api/chatgpt-api.js";
import { correctTranscriptPrompt, summarizePrompt, taskPlanningPrompt, taskAllocationPrompt, reflectionPatternPrompt} from "./prompts.js";
import { vadProcess } from './vad.js';
import fs from 'fs/promises';
import * as Helper from './helper.js'

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
            // //delete original audios from resultPath
            // console.log("try to delete original audio file")
            // try {
            //     await fs.unlink(resultPath);
            //     console.log(`Deleted original audio file: ${resultPath}`);
            // } catch (deleteError) {
            //     console.error(`Error deleting original file ${resultPath}:`, deleteError);
            // }

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
    let meetingSummaryResult = await getSummaryFromTranscribed(sortedConversations, userNames)

    return meetingSummaryResult;
}

export async function getSummaryFromTranscribed(allConversationsJson, userNames, interaction, model) {
    try {
        const allConverastionsText = await Helper.TranscribedConversationJsonToText(allConversationsJson)
        console.log(allConverastionsText);

        //1. Correct transcription text
        if(interaction){
            await interaction.editReply("⏳ Step 1: Correcting transcription...");
        }
        const correctTextPrompt = await correctTranscriptPrompt(allConverastionsText);
        const correctConversations = await chatGPTMessageJson(correctTextPrompt, model);

        const correctConversationsJson = await Helper.getMessageFromJsonResponse(correctConversations)
        const step1Tokens = await Helper.getTokensFromJsonResponse(correctConversations)
        console.log("Step 1 :Correct Conversation --------------------------------------------------------------------")
        console.log(correctConversationsJson);
        console.log(`Step 1 Tokens: ${JSON.stringify(step1Tokens)}`);

        //2. GPT Prompt For Summary + Topic Interest
        if(interaction){
            await interaction.editReply("⌛ Step 2: Summarizing the meeting...");
        }
        const summaryTextPrompt = await summarizePrompt(correctConversations, userNames);
        const meetingSummary = await chatGPTMessageJson(summaryTextPrompt, model);
        //2.2. Add user names to response
        const meetingSummaryMarkdown = await Helper.jsonToMarkdownAddUsernames(meetingSummary, userNames);
        const step2Token = await Helper.getTokensFromJsonResponse(meetingSummary)
        console.log("Step 2 :Summarize Meeting --------------------------------------------------------------------")
        console.log(meetingSummaryMarkdown);
        console.log(`Step 2 Tokens: ${JSON.stringify(step2Token)}`);

        const meetingSummaryTokens = {
            "prompt_tokens": step1Tokens.prompt_tokens + step2Token.prompt_tokens,
            "completion_tokens": step1Tokens.completion_tokens + step2Token.completion_tokens
        };

        const meetingSummaryResult = {
            "markdown": meetingSummaryMarkdown,
            "tokens": meetingSummaryTokens
        }

        console.log(`\nMeeting Summary Tokens: ${JSON.stringify(meetingSummaryTokens)}`)
        console.log("\nMeeting Summary completed ✅")
        if(interaction){
            await interaction.editReply("Meeting Summary completed ✅")
        }

        return meetingSummaryResult;

    } catch (error) {
        console.error("Error in getSummaryFromTranscribedText:", error);
        return "Error processing transcription.";
    }
}

//used for test and debug
export async function getSummaryFromTranscribedTextPath(transcribedPaths, userNames) {
    try {
        const fileContent = await fs.readFile(transcribedPaths, 'utf-8');  // Corrected readFile usage
        const allConversationsJson = JSON.parse(fileContent);

        const meetingSummaryResult = await getSummaryFromTranscribed(allConversationsJson, userNames);
        return meetingSummaryResult;

    } catch (error) {
        console.error("Error in getSummaryFromTranscribedText:", error);
        return "Error processing transcription.";
    }
}

//used for test and debug
export async function getSummaryFromCorrectTranscribedTextPath(CorrectedtranscribedPaths, userNames) {
    try {
        const correctConversations = Helper.readTextFile(CorrectedtranscribedPaths);

        //2. GPT Prompt For Summary + Topic Interest
        const summaryTextPrompt = await summarizePrompt(correctConversations, userNames);
        const meetingSummary = await chatGPTMessageJson(summaryTextPrompt);
        //2.2. Add user names to response
        const meetingSummaryMarkdown = await Helper.jsonToMarkdownAddUsernames(meetingSummary, userNames);
        console.log("Step 2 :Summarize Meeting --------------------------------------------------------------------")
        return meetingSummaryMarkdown;

    } catch (error) {
        console.error("Error in getSummaryFromTranscribedText:", error);
        return "Error processing transcription.";
    }
}

export async function getTaskAllocationFromSummary(meetingSummary, userNames, interaction, model){
    try{
        let meetingSummaryJsonSring;

        try {
            meetingSummaryJsonSring = await Helper.markdownToJson(meetingSummary);
        } catch (markdownError) {
            console.error("Error in markdownToJson:", markdownError);
            return {
                error: "Invalid meeting summary format. Make sure you click from ErudiBot's meeting summary 🥲",
                details: markdownError.message
            };
        }


        const meetingSummaryJson = JSON.parse(meetingSummaryJsonSring)
        if (!meetingSummaryJson || !meetingSummaryJson["topic_interest"] || !meetingSummaryJson["task_list"]) {
            throw new Error("Invalid meeting summary format.");
        }
        const topicInterest = meetingSummaryJson["topic_interest"]
        // console.log("topic interest:")
        // console.log(topicInterest)

        let taskAllocationTokens = {
            "prompt_tokens": 0,
            "completion_tokens": 0
        }

        //3. GPT Prompt for Task Planning  
        if(interaction){
            await interaction.editReply("⏳ Step 3: Planing subtasks from tasks...");
        }
        const userNumber = userNames.length
        const taskList = meetingSummaryJson["task_list"]
        const allTasksPlan = [];
        const step3TokensList = [];
        for (const taskItem of taskList){
            const task = taskItem.task;
            const taskPlanningTextPrompt = await taskPlanningPrompt(meetingSummaryJson, task, userNumber);
            const taskPlanning = await chatGPTMessageJson(taskPlanningTextPrompt, model);
            const taskPlanJson = await Helper.getMessageFromJsonResponse(taskPlanning);
            const step3SubTokens = await Helper.getTokensFromJsonResponse(taskPlanning);
            allTasksPlan.push(taskPlanJson)
            step3TokensList.push(step3SubTokens)
            taskAllocationTokens = {
                "prompt_tokens": taskAllocationTokens.prompt_tokens + step3SubTokens.prompt_tokens,
                "completion_tokens": taskAllocationTokens.completion_tokens + step3SubTokens.completion_tokens
            };
        }
        console.log("Step 3 :All task plan------------------------------------------------------------------------------")
        console.log(allTasksPlan);
        console.log(`Step 3 Tokens: ${JSON.stringify(step3TokensList)}`);

        if (allTasksPlan.length === 0) {
            throw new Error("No tasks planned. Task list may be empty or processing failed.");
        }

        const taskAllocationTextPrompt = await taskAllocationPrompt(allTasksPlan, userNames, topicInterest);
        //4. Prompt GPT for Task Allocation
        if(interaction){
            await interaction.editReply("⌛ Step 4: Allocating subtasks...");
        }
        const taskAllocation = await chatGPTMessageJson(taskAllocationTextPrompt, model);
        let taskAllocationJson = await Helper.getMessageFromJsonResponse(taskAllocation);
        const step4Tokens = await Helper.getTokensFromJsonResponse(taskAllocation);
        taskAllocationTokens = {
            "prompt_tokens": taskAllocationTokens.prompt_tokens + step4Tokens.prompt_tokens,
            "completion_tokens": taskAllocationTokens.completion_tokens + step4Tokens.completion_tokens
        };
        

        console.log("Step 4 :All task allocation------------------------------------------------------------------------------------")
        console.log(taskAllocationJson)
        console.log(`Step 4 Tokens: ${JSON.stringify(step4Tokens)}`);
        
        //5. Prompt GPT for Reflection Pattern 
        if(interaction){
            await interaction.editReply("⏳ Step 5: Reflecting task allocation...");
        }
        let cv = await Helper.CVDistributed(taskAllocationJson)
        let isGood = cv <= 20;
        console.log("Step 5 :Reflection--------------------------------------------------------------------------------------")
        console.log("is good");
        console.log(isGood)
        let reflectionResult = taskAllocation;
        const step5TokensList = [];

        while(isGood !== true){
            let reflecTaskAllocationTextPrompt = await reflectionPatternPrompt(taskAllocationJson, cv)
            reflectionResult = await chatGPTMessageJson(reflecTaskAllocationTextPrompt, model)
            taskAllocationJson = await Helper.getMessageFromJsonResponse(reflectionResult);
            const step5SubTokens = await Helper.getTokensFromJsonResponse(reflectionResult);
            step5TokensList.push(step5SubTokens);
            taskAllocationTokens = {
                "prompt_tokens": taskAllocationTokens.prompt_tokens + step5SubTokens.prompt_tokens,
                "completion_tokens": taskAllocationTokens.completion_tokens + step5SubTokens.completion_tokens
            };

            cv = await Helper.CVDistributed(taskAllocationJson)
            isGood = cv <= 20;
            break; //i just break to see if the logic work. remove this for further development.
        }
        const taskAllocationMarkdown = await Helper.jsonToMarkdownReflection(taskAllocationJson)

        console.log(taskAllocationMarkdown);
        console.log(`Step 5 Tokens: ${JSON.stringify(step5TokensList)}`);

        const taskAllocationResult = {
            "markdown": taskAllocationMarkdown,
            "tokens": taskAllocationTokens
        }

        console.log(`\nTask Allocation Tokens: ${JSON.stringify(taskAllocationTokens)}`)
        console.log("\nTask Allocation completed ✅")
        if(interaction){
            await interaction.editReply("Task Allocation completed ✅")
        }

        return taskAllocationResult;
    } catch (error) {
        console.error("Error: ", error);
        return {
            error: "Error processing task allocation.",
            details: error.message
        };
    }
}