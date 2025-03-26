//this file store designed prompts
//return text that will be send to gpt

//1. GPT Prompt For Correct Conversation
export async function correctTranscriptPrompt(conversations){
  const prompt = `As a Discord Bot for Assistant, please review the following meeting transcript and correct any errors in grammar, punctuation,
   spelling, and clarity. Ensure that the text is concise and well-structured, with any unclear or ambiguous sections reworded for better understanding. 
   Also, highlight and correct any inconsistencies, redundancies, or misplaced information. The text should be easy to read, maintain its original meaning, 
   and be suitable for formal documentation. Please provide the corrected text in Thai. Review your summary and make sure it include only Thai (some english words is allow)`

   return prompt + "\n" + conversations;
  
}

//2. GPT Prompt For Summary + Topic Interest
export async function summarizePrompt(conversations) {
    const prompt = `You are a Discord bot that summarizes meetings concisely and clearly. Your task is to correct errors, structure information effectively, 
    and refine the summary using reflection before presenting the final output.

    ### Instructions:
    1. **Structuring:** Organize the content into well-defined sections.
    2. **Reflection:** Before finalizing, review and refine the summary to ensure completeness, clarity, and accuracy.
    3. **Language:** Make sure all the output is in Thai.
    4. **Topic Interest:** Find out what each person is interested in from the given conversation. ถ้าไม่มีข้อมูลให้ถามกลับว่าแต่ละคนสนใจอะไร.
       (ถ้าไม่ต้องถามกับถามกลับว่าอันไหนดีกว่ากัน, แต่เรื่องที่ให้คนเลือกว่าจะทำรึปล่าวอันนี้ไม่ควร)

    ### Output Format:
    **Meeting Summary:** [Meeting Name]
    
    **Meeting Topics**
    - [Main Topic 1]
      - [Subtopic]: Key discussion points, requirements, or decisions.
      - [Subtopic]: Additional important details.
    - [Main Topic 2]
      - [Subtopic]: Summary of key points discussed.

    **Task List**
    - [Task 1] – Task description (Responsible: [Person] / Unspecified)
    - [Task 2] – Task description (Responsible: [Person] / Unspecified)
    
    **Topic Interest**
    - [Person 1]: [Specific topic of interest discussed]
    - [Person 2]: [Specific topic of interest discussed]
    - [Person 3]: [Specific topic of interest discussed]

    **Brief Summary**
    A concise statement summarizing the meeting’s key outcomes.`;

    return prompt + "\n" + conversations;
}

//3. GPT Prompt for Task Planning 
export async function taskPlanningPrompt(meetingSummary, userNumber){
  const prompt = `Objective:
  Break down tasks into smaller, actionable steps based on the meeting context. Keep tasks clear, achievable, and evenly distributed. Ensure sequencing where needed but allow parallel tasks when possible. Keep the workload reasonable based on the meeting’s purpose.
  Rules:
  The total number of tasks should not exceed twice the number of participants.
  If a task depends on another, mark it as "Must be completed before Task X."
  If a task can be done alongside another, mark it as "Can be done in parallel with Task Y."
  If a task is unclear, mark it as "Flagged for Review."
  Format:
  Meeting: [Meeting Name]
  Brief Summary: [A short summary providing context for future reference.]
  Task Plan: [Category/Topic Name]
  Task 1: [Description]


  Task 2: [Description] (Must be completed before Task X, if applicable)


  Task 3: [Description] (Can be done in parallel with Task Y, if applicable)


  Task 4: [Description] (Flagged for Review – Requires Clarification)


  Task 5: [Description] (Follow-up required in the next meeting, if applicable)
  (Ensure the total number of tasks does not exceed twice the number of participants.)
  Reunion Plan (If Needed):
  Next Meeting Scheduled: [Only if follow-up is required]`

  return prompt + "\n" + meetingSummary;
}

//4. Prompt GPT for Single Task Agent
export async function singleTaskAgentPrompt(taskPlanning, userName){
  const prompt = `Estimate the time required to complete the following task based on its complexity and dependencies. Follow these guidelines:
  1. Analyze the task and assign a realistic time estimate in hours.
  2. If the task requires additional information, flag it for review instead of making assumptions.
  3. If the task depends on another, note the dependency and adjust the estimate accordingly.
  4. Provide a concise justification for the estimated time.
  
  Format the output as follows
    Task: [Task Description]
    Estimated Time: [X] hours
    Justification: [Brief reason for the estimate]
    (If flagged) Status: Flagged for Review - [Reason]
  `
  return conversations + "\n" + prompt;
}

//5. Prompt GPT for Task Allocation
export async function taskAllocationPrompt(combinedAgentResponses, topicInterest){
  const prompt = `
  `
  return conversations + "\n" + prompt;
}

//6. Prompt GPT for Reflection Pattern 
export async function reflectionPatternPrompt(conversation){
  const prompt = `
  `
  return conversations + "\n" + prompt;
}
