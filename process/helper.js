import fs from 'fs/promises';

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
        return data;
    } catch (error) {
        throw new Error("Failed to parse JSON: " + error.message);
    }
}

export async function getTokensFromJsonResponse(jsonResponseText){
    const jsonResponse = JSON.parse(jsonResponseText);
    if (!jsonResponse || !jsonResponse.tokens) {
        throw new Error("Invalid input: 'tokens' property is missing.");
    }
    return jsonResponse.tokens
}

export async function jsonToMarkdownReflection(data) {
    let markdown = '';
  
    data.tasks.forEach((task, taskIndex) => {
      markdown += `## 🌟 Task ${taskIndex + 1}: ${task.task}\n\n`;
  
      task.subtasks.forEach((subtask, subIndex) => {
        markdown += `### Subtask ${subIndex + 1}: ${subtask.subtask_name}\n`;
        markdown += `- Assigned To: **${subtask.assigned_to.trim()}**\n`;
        markdown += `- Estimated Time: ${subtask.estimated_time_hours} hours\n`;
        markdown += `- Description: ${subtask.description}\n`;
      });
  
    //   markdown += `\n`;
    });
  
    return markdown;
}

export async function jsonToMarkdown(jsonResponse) {
    const data = jsonResponse['message'];
    let markdownOutput = "";

    Object.entries(data).forEach(([key, value]) => {
        const sectionName = key.replace(/_/g, " ");
        markdownOutput += `# ${sectionName}\n`;

        if (key === "meeting_summary" || typeof value === "string") {
            // Simple string value
            markdownOutput += value + "\n\n";
        } else if (key === "topics") {
            markdownOutput += formatTopicsSection(value);
        } else if (key === "task_list") {
            markdownOutput += formatTaskListSection(value);
        } else if (key === "topic_interest") {
            markdownOutput += formatTopicInterestSection(value);
        } else if (key === "participants") {
            markdownOutput += formatParticipantsSection(value);
        } else if (Array.isArray(value)) {
            // Default array handling
            value.forEach(item => {
                if (typeof item === "string") {
                    markdownOutput += `- ${item}\n`;
                } else {
                    // Object in array
                    markdownOutput += `- ${formatObjectAsInline(item)}\n`;
                }
            });
            markdownOutput += "\n";
        } else if (typeof value === "object" && value !== null) {
            // Default object handling
            markdownOutput += formatObjectAsInline(value) + "\n\n";
        }
    });

    return markdownOutput.trim();
}

export async function displayResult(result, timeTaken){
    const promptTokens = result.tokens.prompt_tokens
    const completionTokens = result.tokens.completion_tokens
    const tokenText = `🧩 Token usage: ${promptTokens} prompt tokens and ${completionTokens} completion tokens`

    return `${result.markdown}\n\n⏱️ Processed in ${timeTaken} seconds.\n${tokenText}`
}

// Format the topics section with main topic and subtopics
function formatTopicsSection(topics) {
    let output = "";
    
    for (const topic of topics) {
        output += `**${topic.main_topic}**\n`;
        
        if (topic.subtopics && Array.isArray(topic.subtopics)) {
            for (const subtopic of topic.subtopics) {
                output += `* ${subtopic.name}: ${subtopic.details}\n`;
            }
        }
    }
    
    return output + "\n";
}

// Format the task list section
function formatTaskListSection(tasks) {
    let output = "";
    
    for (const task of tasks) {
        const responsible = task.responsible ? `(responsible: ${task.responsible})` : "";
        output += `* ${task.task} ${responsible}\n`;
    }
    
    return output + "\n";
}

// Format the topic interest section
function formatTopicInterestSection(interests) {
    let output = "";
    
    for (const interest of interests) {
        output += `* ${interest.speaker_name} interested in ${interest.interest}\n`;
    }
    
    return output + "\n";
}

// Format the participants section
function formatParticipantsSection(participants) {
    let output = "";
    
    for (const participant of participants) {
        output += `- ${participant}\n`;
    }
    
    return output + "\n";
}

// Helper function to format objects inline
function formatObjectAsInline(obj) {
    return Object.entries(obj)
        .map(([key, value]) => {
            const formattedKey = key.replace(/_/g, " ");
            return `**${formattedKey}:** ${value}`;
        })
        .join(" ");
}

export async function jsonToMarkdownAddUsernames(jsonResponseText, userNames) {
    let data = await getMessageFromJsonResponse(jsonResponseText);
    data['participants'] = userNames;
    return jsonToMarkdown({ message: data });
}

export async function markdownToJson(noteString) {
    const jsonResult = {
      meeting_summary: "",
      topics: [],
      task_list: [],
      topic_interest: [],
      participants: []
    };
  
    const summaryMatch = noteString.match(/# meeting summary\n([\s\S]*?)\n# topics/);
    if (!summaryMatch) {
      throw new Error("Missing section: # meeting summary");
    }
    jsonResult.meeting_summary = summaryMatch[1].trim();
  
    const topicsMatch = noteString.match(/# topics\n([\s\S]*?)\n# task list/);
    if (!topicsMatch) {
      throw new Error("Missing section: # topics");
    }
    const topicLines = topicsMatch[1].trim().split('\n');
    let currentTopic = null;
  
    topicLines.forEach(line => {
      if (line.startsWith('**') && line.endsWith('**')) {
        if (currentTopic) {
          jsonResult.topics.push(currentTopic);
        }
        currentTopic = {
          main_topic: line.replace(/\*\*/g, '').trim(),
          subtopics: []
        };
      } else if (line.startsWith('*')) {
        const [name, details] = line.replace('*', '').split(':').map(str => str.trim());
        currentTopic.subtopics.push({ name, details });
      }
    });
  
    if (currentTopic) {
      jsonResult.topics.push(currentTopic);
    }
  
    const tasksMatch = noteString.match(/# task list\n([\s\S]*?)\n# topic interest/);
    if (!tasksMatch) {
      throw new Error("Missing section: # task list");
    }
    const taskLines = tasksMatch[1].trim().split('\n');
    taskLines.forEach(line => {
      const match = line.match(/\* (.+) \(responsible: (.+)\)/);
      if (match) {
        jsonResult.task_list.push({
          task: match[1].trim(),
          responsible: match[2].trim()
        });
      }
    });
  
    const interestMatch = noteString.match(/# topic interest\n([\s\S]*?)\n# participants/);
    if (!interestMatch) {
      throw new Error("Missing section: # topic interest");
    }
    const interestLines = interestMatch[1].trim().split('\n');
    interestLines.forEach(line => {
      const match = line.match(/\* (.+) interested in (.+)/);
      if (match) {
        jsonResult.topic_interest.push({
          speaker_name: match[1].trim(),
          interest: match[2].trim()
        });
      }
    });
  
    const participantsMatch = noteString.match(/# participants\n([\s\S]*)/);
    if (!participantsMatch) {
      throw new Error("Missing section: # participants");
    }
    const lines = participantsMatch[1].trim().split('\n');
    jsonResult.participants = lines.map(line => line.replace('-', '').trim());
  
    return JSON.stringify(jsonResult, null, 2);
  }
  

export async function readTextFile(textFilePath){
    try{
        const data = await fs.readFile(textFilePath, 'utf8');
        return data;
    }catch(err){
        console.error('Error reading the file:', err);
    }
}

export function CVDistributed(taskAllocationJson) {
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

export async function TranscribedConversationJsonToText(jsonConversation){

    const result = Object.entries(jsonConversation)
        .sort((a, b) => parseFloat(a[0]) - parseFloat(b[0]))
        .map(([_, [speaker, data]]) => `${speaker}: ${data.text}`)
        .join('\n');
    return result;
}

export function extractParticipants(meetingSummary) {
    const lines = meetingSummary.split('\n');
    const participants = [];

    let isInParticipantsSection = false;

    for (let line of lines) {
        line = line.trim();

        if (line.toLowerCase().startsWith('# participants')) {
            isInParticipantsSection = true;
            continue;
        }

        if (isInParticipantsSection) {
            // Stop if a new header starts
            if (line.startsWith('#')) break;

            // Collect participant lines that start with "- "
            if (line.startsWith('- ')) {
                const name = line.substring(2).trim();
                if (name) participants.push(name);
            }
        }
    }

    if (participants.length === 0) {
        console.error("User names not found in the meeting summary.");
        return [];
    }

    return participants;
}


export function splitMessage(text, maxLength = 2000) {
    const chunks = [];
    let current = '';

    for (const line of text.split('\n')) {
        if ((current + line + '\n').length > maxLength) {
            chunks.push(current);
            current = '';
        }
        current += line + '\n';
    }
    if (current) chunks.push(current);
    return chunks;
}