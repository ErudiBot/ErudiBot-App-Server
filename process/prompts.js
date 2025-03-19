//this file store designed prompts
//return text that will be send to gpt

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

    return conversations + "\n" + prompt;
}

export async function correctTranscriptPrompt(conversations){
    const prompt = `As a Discord Bot for Assistant, please review the following meeting transcript and correct any errors in grammar, punctuation,
     spelling, and clarity. Ensure that the text is concise and well-structured, with any unclear or ambiguous sections reworded for better understanding. 
     Also, highlight and correct any inconsistencies, redundancies, or misplaced information. The text should be easy to read, maintain its original meaning, 
     and be suitable for formal documentation. Please provide the corrected text in Thai. Review your summary and make sure it include only Thai (some english words is allow)`

     return conversations + "\n" + prompt;
    
}
