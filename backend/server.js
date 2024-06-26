const express = require('express');
const multer = require('multer');
const cors = require('cors');
const ElevateAI = require('./ElevateAI');
const fs = require('fs');

const app = express();
const upload = multer({ dest: 'uploads/' });

app.use(cors());

const TOKEN = '4c90d090-0115-4fed-9546-d5f446b4459b';

app.post('/api/process-audio', upload.single('audioFile'), async (req, res) => {
  try {
    const filePath = req.file.path;
    const fileName = req.file.originalname;
    
    const transcription = await processWithElevateAI(filePath, fileName);
    const { score, breakdown } = calculateQAScore(transcription);

    // Clean up the uploaded file
    fs.unlinkSync(filePath);

    res.json({ transcription, qaScore: score, scoreBreakdown: breakdown });
  } catch (error) {
    console.error('Error processing audio:', error);
    res.status(500).json({ error: 'Error processing audio file' });
  }
});

async function processWithElevateAI(filePath, fileName) {
  const declareResp = await ElevateAI.declareAudioInteraction(
    'en-us', 'default', null, TOKEN, 'highAccuracy', true, fileName
  );
  const interactionId = declareResp.interactionIdentifier;

  await ElevateAI.uploadInteraction(interactionId, TOKEN, filePath, fileName);

  let status;
  do {
    const statusResp = await ElevateAI.getInteractionStatus(interactionId, TOKEN);
    status = statusResp.status;
    if (status !== 'processed' && status !== 'processingFailed') {
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  } while (status !== 'processed' && status !== 'processingFailed');

  if (status === 'processed') {
    const transcriptResp = await ElevateAI.getPuncutatedTranscript(interactionId, TOKEN);
    return transcriptResp.transcript;
  } else {
    throw new Error('Processing failed');
  }
}

function calculateQAScore(transcription) {
  const criteria = [
    { points: 2, criterion: "Agent readiness", check: () => true },
    { points: 4, criterion: "Correct introduction", check: () => /thank you for calling hotel reservations, my name is/i.test(transcription) },
    { points: 4, criterion: "Acknowledge request", check: () => /how may i assist you/i.test(transcription) },
    { points: 10, criterion: "Confirm information", check: () => /(name|itinerary|hotel|dates)/i.test(transcription) },
    { points: 10, criterion: "Call efficiency", check: () => /hold/i.test(transcription) && /update/i.test(transcription) },
    { points: 15, criterion: "Agent control", check: () => /it is my pleasure to help you/i.test(transcription) && /(alternative|solution)/i.test(transcription) },
    { points: 15, criterion: "Clear communication", check: () => /(mr\.|ms\.|mrs\.|sir|ma'am)/i.test(transcription) }
  ];

  const breakdown = criteria.map(c => ({
    criterion: c.criterion,
    score: c.check() ? c.points : 0
  }));

  const score = breakdown.reduce((total, item) => total + item.score, 0);

  return { score, breakdown };
}

app.listen(3001, () => console.log('Server running on port 3001'));