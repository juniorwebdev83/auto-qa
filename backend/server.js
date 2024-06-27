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
    const result = await processWithElevateAI(filePath, fileName);

    // Clean up the uploaded file
    fs.unlink(filePath, (err) => {
      if (err) console.error('Error deleting temporary file:', err);
      else console.log('Temporary file cleaned up');
    });

    if (result.transcription) {
      console.log('Full response being sent to client:', JSON.stringify(result, null, 2));
      res.json(result);
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
    console.log('Declaring audio interaction...');
    const declareResp = await ElevateAI.DeclareAudioInteraction(
      'en-us', 'default', null, TOKEN, 'highAccuracy', true, fileName
    );
    console.log('Declare response:', declareResp);
    const interactionId = declareResp.interactionIdentifier;

    console.log('Uploading audio file...');
    const uploadResp = await ElevateAI.UploadInteraction(interactionId, TOKEN, filePath, fileName);
    console.log('Upload response:', uploadResp);

    console.log('Waiting for processing to complete (max 5 minutes)...');
    const startTime = Date.now();
    const maxWaitTime = 5 * 60 * 1000; // 5 minutes in milliseconds

    while (Date.now() - startTime < maxWaitTime) {
      const statusResp = await ElevateAI.GetInteractionStatus(interactionId, TOKEN);
      console.log('Current status:', statusResp.status);

      if (statusResp.status === 'processed') {
        console.log('Processing completed. Fetching transcript...');
        const transcriptResp = await ElevateAI.GetPuncutatedTranscript(interactionId, TOKEN);
        console.log('Transcript response:', transcriptResp);

        if (!transcriptResp || !transcriptResp.sentenceSegments) {
          throw new Error('Transcript not found in the response');
        }

        // Concatenate the phrases to form the full transcript
        const transcript = transcriptResp.sentenceSegments.map(segment => segment.phrase).join(' ');

        console.log('Transcript received. Length:', transcript.length);

        console.log('Calculating QA score...');
        const { score, breakdown } = calculateQAScore(transcript);
        console.log('Score calculated:', score);

        return {
          transcription: transcript,
          qaScore: score,
          scoreBreakdown: breakdown
        };
      } else if (statusResp.status === 'processingFailed') {
        throw new Error('ElevateAI processing failed');
      }

      // Wait for 10 seconds before checking again
      await new Promise(resolve => setTimeout(resolve, 10000));
    }

    throw new Error('Processing timed out after 5 minutes');
  } catch (error) {
    console.error('Error in processWithElevateAI:', error);
    throw error;
  }
}


function calculateQAScore(transcription) {
  if (!transcription) {
    console.log('No transcription provided to calculateQAScore');
    return { score: 0, breakdown: [] };
  }

  const lowercaseTranscript = transcription.toLowerCase();

  // Define criteria with regular expressions
  const criteria = [
    { points: 2, criterion: "Agent readiness", check: () => true },
    { points: 4, criterion: "Correct introduction", check: () => /(?:my name is|i'm)\s+[a-z]+/i.test(lowercaseTranscript) },
    { points: 4, criterion: "Acknowledge request", check: () => /how may i help you/i.test(lowercaseTranscript) },
    { points: 10, criterion: "Confirm information", check: () => /(?:name|itinerary|hotel|dates)/i.test(lowercaseTranscript) },
    { points: 10, criterion: "Call efficiency", check: () => /hold/i.test(lowercaseTranscript) && /update/i.test(lowercaseTranscript) },
    { points: 15, criterion: "Agent control", check: () => /it is my pleasure to help you/i.test(lowercaseTranscript) && /(?:alternative|solution)/i.test(lowercaseTranscript) },
    { points: 15, criterion: "Clear communication", check: () => /(?:mr\.|ms\.|mrs\.|sir|ma'am)/i.test(lowercaseTranscript) }
  ];

  // Calculate score and breakdown
  const breakdown = criteria.map(criterion => ({
    criterion: criterion.criterion,
    score: criterion.check() ? criterion.points : 0
  }));

  const score = breakdown.reduce((total, item) => total + item.score, 0);

  return { score, breakdown };
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
