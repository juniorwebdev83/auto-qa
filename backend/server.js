app.post('/api/process-audio', upload.single('audioFile'), async (req, res) => {
  console.log("Received audio file for processing");
  try {
    const filePath = req.file.path;
    const fileName = req.file.originalname;
    
    console.log(`Processing file: ${fileName}`);
    const transcription = await processWithElevateAI(filePath, fileName);
    console.log('Transcription received from ElevateAI:', transcription);
    
    const { score, breakdown } = calculateQAScore(transcription);
    console.log('Score calculated:', score);

    // Clean up the uploaded file
    fs.unlinkSync(filePath);
    console.log('Temporary file cleaned up');

    res.json({ transcription, qaScore: score, scoreBreakdown: breakdown });
  } catch (error) {
    console.error('Error processing audio:', error);
    res.status(500).json({ error: 'Error processing audio file' });
  }
});

async function processWithElevateAI(filePath, fileName) {
  console.log('Declaring audio interaction...');
  const declareResp = await ElevateAI.DeclareAudioInteraction(
    'en-us', 'default', null, TOKEN, 'highAccuracy', true, fileName
  );
  const interactionId = declareResp.interactionIdentifier;
  console.log(`Interaction declared. ID: ${interactionId}`);

  console.log('Uploading interaction...');
  await ElevateAI.UploadInteraction(interactionId, TOKEN, filePath, fileName);
  console.log('Interaction uploaded');

  let status;
  do {
    console.log('Checking interaction status...');
    const statusResp = await ElevateAI.GetInteractionStatus(interactionId, TOKEN);
    status = statusResp.status;
    console.log(`Current status: ${status}`);
    if (status !== 'processed' && status !== 'processingFailed') {
      console.log('Waiting 5 seconds before next status check...');
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  } while (status !== 'processed' && status !== 'processingFailed');

  if (status === 'processed') {
    console.log('Processing complete. Fetching transcript...');
    const transcriptResp = await ElevateAI.GetPuncutatedTranscript(interactionId, TOKEN);
    console.log('Transcript fetched:', transcriptResp.transcript);
    return transcriptResp.transcript;
  } else {
    throw new Error('Processing failed');
  }
}