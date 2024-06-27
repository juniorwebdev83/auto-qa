// ElevateAI.js
const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');

const API_URL = 'https://api.elevateai.com/v1';

const ElevateAI = {
  DeclareAudioInteraction: async (languageTag, vertical, downloadUri, token, audioTranscriptionMode, includeAiResults, originalFileName) => {
    const response = await axios.post(`${API_URL}/interactions`, {
      type: 'audio',
      languageTag,
      vertical,
      downloadUri,
      audioTranscriptionMode,
      includeAiResults,
      originalFileName
    }, {
      headers: {
        'X-API-TOKEN': token,
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  },

  UploadInteraction: async (interactionId, token, filePath, fileName) => {
    const formData = new FormData();
    formData.append('file', fs.createReadStream(filePath), fileName);
    
    const response = await axios.post(`${API_URL}/interactions/${interactionId}/upload`, formData, {
      headers: {
        'X-API-TOKEN': token,
        ...formData.getHeaders()
      }
    });
    return response.data;
  },

  GetInteractionStatus: async (interactionId, token) => {
    const response = await axios.get(`${API_URL}/interactions/${interactionId}/status`, {
      headers: {
        'X-API-TOKEN': token
      }
    });
    return response.data;
  },

  GetPuncutatedTranscript: async (interactionId, token) => {
    const response = await axios.get(`${API_URL}/interactions/${interactionId}/transcripts/punctuated`, {
      headers: {
        'X-API-TOKEN': token
      }
    });
    return response.data;
  }
};

module.exports = ElevateAI;