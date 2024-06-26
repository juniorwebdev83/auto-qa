// App.js
import Client from '/Client'; // Adjust the relative path as needed

import React, { useState } from 'react';
import FileUpload from '\FileUpload.js';
import TranscriptionDisplay from './components/TranscriptionDisplay';
import ScoreDisplay from './components/ScoreDisplay';


function App() {
  const [transcription, setTranscription] = useState(null);
  const [aiResults, setAiResults] = useState(null);
  const [score, setScore] = useState(null);
  const [scoreBreakdown, setScoreBreakdown] = useState(null);
  const client = new Client("<API-TOKEN>");

  const handleFileProcessed = async (interactionId) => {
    let status;
    do {
      try {
        status = await client.status(interactionId);
        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds before checking again
      } catch (error) {
        console.error('Error while checking status:', error);
        break;
      }
    } while (status !== 'processed' && status !== 'processingFailed');

    if (status === 'processed') {
      try {
        const transcriptResponse = await client.transcripts(interactionId);
        setTranscription(transcriptResponse.transcript);

        const aiResultsResponse = await client.ai(interactionId);
        setAiResults(aiResultsResponse);

        const { totalScore, breakdown } = calculateScore(transcriptResponse.transcript, aiResultsResponse);
        setScore(totalScore);
        setScoreBreakdown(breakdown);
      } catch (error) {
        console.error('Error while fetching transcript or AI results:', error);
      }
    } else {
      console.error('Processing failed');
    }
  };

  const calculateScore = (transcript, aiResults) => {
    // Implement your scoring logic here
    return { totalScore: 0, breakdown: [] };
  };

  return (
    <div className="App">
      <h1>Call Center QA Scoring</h1>
      <FileUpload onFileProcessed={handleFileProcessed} />
      {transcription && <TranscriptionDisplay transcription={transcription} />}
      {score !== null && <ScoreDisplay score={score} breakdown={scoreBreakdown} />}
    </div>
  );
}

export default App;
