require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const port = process.env.PORT || 3002;

app.use(cors());
app.use(express.json());

const API_URL = 'https://api.elevateai.com/v1';
const TOKEN = process.env.ELEVATE_AI_TOKEN;

const elevateAIApi = axios.create({
  baseURL: API_URL,
  headers: {
    'X-API-TOKEN': TOKEN,
    'Content-Type': 'application/json'
  }
});

// Endpoint to declare an interaction
app.post('/api/declare-interaction', async (req, res) => {
  try {
    const response = await elevateAIApi.post('/interactions', {
      type: 'audio',
      languageTag: 'en-us',
      vertical: 'default',
      audioTranscriptionMode: 'highAccuracy',
      includeAiResults: true
    });
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Example endpoint to retrieve interaction status
app.get('/api/interaction-status/:interactionId', async (req, res) => {
  try {
    const { interactionId } = req.params;
    const response = await elevateAIApi.get(`/interactions/${interactionId}/status`);
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add more endpoints for other ElevateAI operations as needed

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
