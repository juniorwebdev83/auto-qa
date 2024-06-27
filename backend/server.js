// server.js
require('dotenv').config();
const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const ElevateAI = require('./ElevateAI');

const app = express();
const upload = multer({ dest: 'uploads/' });

app.use(cors());

const TOKEN = process.env.ELEVATE_AI_TOKEN;

app.post('/api/process-audio', upload.single('audioFile'), async (req, res) => {
  console.log("Received audio file for processing");
  try {
    const filePath = req.file.path;
    const fileName = req.file.originalname;
    
    console.log(`Processing file: ${fileName}`);
    const transcription = await processWithElevateAI(filePath, fileName);
    
    if (transcription) {
      console.log('Transcription received from ElevateAI:', transcription);
      console.log('Transcription type:', typeof transcription);
      console.log('Transcription length:', transcription.length);

      const { score, breakdown } = calculateQAScore(transcription);
      console.log('Score calculated:', score);

      // Clean up the uploaded file
      fs.unlinkSync(filePath);
      console.log('Temporary file cleaned up');

      const response = { transcription, qaScore: score, scoreBreakdown: breakdown };
      console.log('Full response being sent to client:', JSON.stringify(response, null, 2));
      res.json(response);
    } else {
      console.log('No transcription received from ElevateAI');
      res.status(500).json({ error: 'Failed to obtain transcription' });
    }
  } catch (error) {
    console.error('Error processing audio:', error);
    res.status(500).json({ error: 'Error processing audio file', details: error.message });
  }
});

async function processWithElevateAI(filePath, fileName) {
  try {
    const declareResp = await ElevateAI.DeclareAudioInteraction(
      'en-us', 'default', null, TOKEN, 'highAccuracy', true, fileName
    );
    console.log('Declare response:', declareResp);
    const interactionId = declareResp.interactionIdentifier;

    const uploadResp = await ElevateAI.UploadInteraction(interactionId, TOKEN, filePath, fileName);
    console.log('Upload response:', uploadResp);

    let status;
    let attempts = 0;
    const maxAttempts = 60; // 5 minutes maximum wait time
    do {
      const statusResp = await ElevateAI.GetInteractionStatus(interactionId, TOKEN);
      status = statusResp.status;
      console.log(`Current status (attempt ${attempts + 1}/${maxAttempts}):`, status);
      if (status !== 'processed' && status !== 'processingFailed') {
        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds between checks
      }
      attempts++;
    } while (status !== 'processed' && status !== 'processingFailed' && attempts < maxAttempts);

    if (status === 'processed') {
      console.log('Processing completed. Fetching transcript...');
      const transcriptResp = await ElevateAI.GetPuncutatedTranscript(interactionId, TOKEN);
      console.log('Transcript response:', transcriptResp);
      return transcriptResp.transcript;
    } else if (status === 'processingFailed') {
      throw new Error('Processing failed');
    } else {
      throw new Error('Processing timed out');
    }
  } catch (error) {
    console.error('Error in processWithElevateAI:', error);
    return null;
  }
}

function calculateQAScore(transcription) {
  if (!transcription) {
    console.log('No transcription provided to calculateQAScore');
    return { score: 0, breakdown: [] };
  }
  
  const lowercaseTranscript = transcription.toLowerCase();
  const criteria = [
    { points: 2, criterion: "Agent readiness", check: () => true },
    { points: 4, criterion: "Correct introduction", check: () => /thank you for calling hotel reservations, my name is/i.test(lowercaseTranscript) },
    { points: 4, criterion: "Acknowledge request", check: () => /how may i assist you/i.test(lowercaseTranscript) },
    { points: 10, criterion: "Confirm information", check: () => /(name|itinerary|hotel|dates)/i.test(lowercaseTranscript) },
    { points: 10, criterion: "Call efficiency", check: () => /hold/i.test(lowercaseTranscript) && /update/i.test(lowercaseTranscript) },
    { points: 15, criterion: "Agent control", check: () => /it is my pleasure to help you/i.test(lowercaseTranscript) && /(alternative|solution)/i.test(lowercaseTranscript) },
    { points: 15, criterion: "Clear communication", check: () => /(mr\.|ms\.|mrs\.|sir|ma'am)/i.test(lowercaseTranscript) }
  ];

  const breakdown = criteria.map(c => ({
    criterion: c.criterion,
    score: c.check() ? c.points : 0
  }));

  const score = breakdown.reduce((total, item) => total + item.score, 0);

  return { score, breakdown };
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));