import fs from "fs";
import axios from "axios";
import FormData from "form-data";
import dotenv from "dotenv";
import { performance } from "perf_hooks";

dotenv.config();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY
//supported audio format: .mp3, .mp4, .mpeg, .mpga, .wav, .webm

export async function transcribeAudio(filePath) {
    try {
        const startTime = performance.now(); // Start timing
    
        const formData = new FormData();
        formData.append("file", fs.createReadStream(filePath));
        formData.append("model", "whisper-1");
        formData.append("language", "th");
  
        const response = await axios.post("https://api.openai.com/v1/audio/transcriptions", formData, {
            headers: {
            ...formData.getHeaders(),
            Authorization: `Bearer ${OPENAI_API_KEY}`,
            },
        });
  
        const endTime = performance.now(); 
        const executionTime = (endTime - startTime) / 1000; // Convert ms to seconds

        console.log("Transcription:\n", response.data.text);
        console.log(`\n\nExecution Time:\n ${executionTime.toFixed(2)} seconds`); 

        const resultText = {
            "text":response.data.text, 
            "executionTime": `${executionTime.toFixed(2)} seconds`,
        }
        return resultText
  } catch (error) {
    console.error("Error:", error.response ? error.response.data : error.message);
  }
}

// const filePath = "C:/Users/Nathathai/Documents/chula_XD/ErudiBot/stt-try/Xd-test1.wav"; 
//transcribeAudio(filePath);
