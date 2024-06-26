import axios from 'axios';

const API_URL = 'https://api.elevateai.com/v1';
const TOKEN = process.env.REACT_APP_ELEVATE_AI_TOKEN; // Assuming you set this in your .env file

const headers = {
  'X-API-TOKEN': TOKEN,
  'Content-Type': 'application/json'
};

const api = axios.create({
  baseURL: API_URL,
  headers: headers
});

export const declareAudioInteraction = async () => {
  try {
    const response = await api.post('/interactions', {
      type: 'audio',
      languageTag: 'en-us',
      vertical: 'default',
      audioTranscriptionMode: 'highAccuracy',
      includeAiResults: true
    });
    return response.data;
  } catch (error) {
    throw new Error(`Failed to declare audio interaction: ${error.message}`);
  }
};

// Add more functions for other ElevateAI operations...

export const getInteractionStatus = async (interactionId) => {
  try {
    const response = await api.get(`/interactions/${interactionId}/status`);
    return response.data;
  } catch (error) {
    throw new Error(`Failed to get interaction status: ${error.message}`);
  }
};

export const getTranscript = async (interactionId) => {
  try {
    const response = await api.get(`/interactions/${interactionId}/transcript`);
    return response.data;
  } catch (error) {
    throw new Error(`Failed to get transcript: ${error.message}`);
  }
};

export const getAIResults = async (interactionId) => {
  try {
    const response = await api.get(`/interactions/${interactionId}/ai`);
    return response.data;
  } catch (error) {
    throw new Error(`Failed to get AI results: ${error.message}`);
  }
};
