//this file store designed prompts
//return text that will be send to gpt

//1. GPT Prompt For Correct Conversation
export async function correctTranscriptPrompt(conversations){
  return `As a Discord Bot for Assistant, please review the following meeting transcript and correct any errors in grammar, punctuation,
   spelling, and clarity. Ensure that the text is concise and well-structured, with any unclear or ambiguous sections reworded for better understanding. 
   Also, highlight and correct any inconsistencies, redundancies, or misplaced information. The text should be easy to read, maintain its original meaning, 
   and be suitable for formal documentation. Please provide the corrected text in Thai. Review your summary and make sure it include only Thai (some english words are allowed).
   You should correct the conversations and output in the JSON format 
   This is an example of how you should output:
    {
      correct_conversations:[
          { "speaker_name": "user name here", "text": "Corrected speech here" },
          { "speaker_name": "user name here", "text": "Corrected speech here" }
          ...
      ]
    }
    Now correct the following conversation and return the JSON output:\n${conversations}`;
}

// 2. GPT Prompt For Summary + Topic Interest
export async function summarizePrompt(conversations, userNames) {
  return `You are a Discord bot summarizing meetings. Ensure all output is in Thai. Return the structured summary in JSON format with this structure:  
{
  "meeting_summary": "A detailed overall summary of the meeting (must cover everything discussed, agreed upon, and mention the next meeting if scheduled)",
  "topics": [
    {
      "main_topic": "Main topic",
      "subtopics": [
        { "name": "Subtopic", "details": "Key discussion points, requirements, or decisions and ddditional important details." }
      ]
    }
  ],
  "task_list": [
    { "task": "Details of the task that needs to be done", "responsible": "Responsible person's name or 'ไม่ระบุ' (not specified)" }
  ],
  "topic_interest": [
    { "speaker_name": "Speaker's name", "interest": "Topic of interest" }
  ]
}

Note:
1.All output must be written in Thai language.
2.Try to infer the "main topics" and "subtopics" based on the conversation.
3.task_list must include the tasks discussed and assigned during the meeting.
4.If no specific tasks were mentioned, suggest possible tasks or advise the user to review the meeting plan.
5.Keep all names exactly as used in the conversation (speaker_name) ${userNames}. If other people were mentioned, ignore them.
6.If other people were mentioned during the meeting, ignore them.
7.If a next meeting or follow-up is mentioned, it must be included in the meeting_summary.

Additional Rules:
1.The meeting summary must be long, detailed, and comprehensive, covering points discussed, agreements made, and next meeting arrangements if applicable.
2.Do not separate the next meeting into a different field; it must be part of the meeting_summary.
3.Always return the summary in the given JSON structure — no additional text or formats.
4.Avoid vague or generic summaries like "General discussions."

Now summarize the following conversation and return the JSON output:\n${conversations}`;
}

//3. GPT Prompt for Task Planning 
export async function taskPlanningPrompt(meetingSummary, taskName, userNumber){
  const totalTaskLimit = userNumber * 2;

  return `Objective:
  Break down tasks into smaller, actionable steps based on the meeting context. Keep tasks clear, achievable, and evenly distributed. Ensure sequencing where needed but allow parallel tasks when possible. Keep the workload reasonable based on the meeting’s purpose.
  Rules:
  The total number of tasks should not exceed twice the number of participants which is ${totalTaskLimit}.
  Return the structured task plan in JSON format with this structure:  
  {
      "task": "Task description", 
      "responsible": "Person or Unspecified",
      "subtasks": [
          {
              "subtask_name": "Name of subtask",
              "description": "Description of subtask",
              "steps": [
                  { "name": "step name", "details": "detail to process this step" }
              ]
          }
      ]
  }
  Now plan the task ${taskName} from the following meeting summary and return the JSON output:\n${meetingSummary}`
}

//4. Prompt GPT for Single Task Agent
// export async function singleTaskAgentPrompt(allTaskPlan, userNames, topicInterest){
//   const prompt = `Estimate the time required to complete the following task based on its complexity and dependencies. Follow these guidelines:
//   1. Analyze the task and assign a realistic time estimate in hours.
//   2. If the task requires additional information, flag it for review instead of making assumptions.
//   3. If the task depends on another, note the dependency and adjust the estimate accordingly.
//   4. Provide a concise justification for the estimated time.
  
//   Format the output as follows
//     Task: [Task Description]
//     Estimated Time: [X] hours
//     Justification: [Brief reason for the estimate]
//     (If flagged) Status: Flagged for Review - [Reason]
//   `
//   return conversations + "\n" + prompt;
// }

//5. Prompt GPT for Task Allocation
export async function taskAllocationPrompt(allTasksPlan, userNames, topicInterest) {
  return `Objective:
  Assign each subtask to a participant based on their expertise and interest while ensuring fair workload distribution. Include an estimated time to complete each subtask.
  
  Rules:
  - Each subtask should be assigned to a participant whose interests match the topic.
  - If multiple participants match, distribute tasks evenly.
  - If no match is found, assign to an available participant.
  - Provide a reasonable estimated completion time in hours.
  
  Return the structured task allocation in JSON format with this structure:
  {
      "tasks": 
            [
              {
                "task": "Task description",
                "subtasks": [
                    {
                        "subtask_name": "Name of subtask",
                        "assigned_to": "Username",
                        "estimated_time_hours": X,
                        "description": "Description of subtask"
                    }
                  ]
              }
            ]
  }
  
  Now allocate the following tasks based on the participants: 
  Participants: ${JSON.stringify(userNames)}
  Interests: ${JSON.stringify(topicInterest)}
  
  Tasks to allocate:
  ${JSON.stringify(allTasksPlan)}`;
}

//6. Prompt GPT for Reflection Pattern 
export async function reflectionPatternPrompt(taskAllocation, currentCV) {
  return `
  Objective:
  Adjust the task allocation so that the workload distribution is fair among all assigned users. 
  Ensure that the Coefficient of Variation (CV) of estimated work hours across users does not exceed 20%. 
  The current CV is ${currentCV}%, which is too high.

  Constraints:
  - Maintain logical dependencies between tasks.
  - Ensure all tasks remain assigned.
  - The CV of estimated work hours across users must be <= 20%.
  - Make sure the outcome is in thai language.

  Instructions:
  - Reassign tasks if necessary to balance workload.
  - Modify estimated hours to achieve fair distribution while keeping reasonable estimations.
  - Ensure each subtask retains a responsible user.
  - Provide the output in the JSON format below.

  Format:
  "tasks": 
            [
              {
                "task": "Task description",
                "subtasks": [
                    {
                        "subtask_name": "Name of subtask",
                        "assigned_to": "Username",
                        "estimated_time_hours": X,
                        "description": "Description of subtask"
                    }
                  ]
              }
            ]
  }

  Current Task Allocation (with CV = ${currentCV}%):
  ${JSON.stringify(taskAllocation, null, 2)}

  Now, return the corrected task allocation in JSON format:
  `;
}