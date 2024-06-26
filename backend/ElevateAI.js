// Import Axios
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const ElevateAI = require('./ElevateAI');

// DeclareAudioInteraction function
const declareAudioInteraction = async (
    language,
    vertical,
    downloadUri,
    token,
    audioTranscriptionMode,
    includeAiResults,
    originalFileName,
    externalIdentifier
) => {
    const url = 'https://api.elevateai.com/v1/interactions/';
    const payload = {
        type: 'audio',
        languageTag: language,
        vertical: vertical,
        audioTranscriptionMode: audioTranscriptionMode,
        downloadUri: downloadUri,
        includeAiResults: includeAiResults,
        originalfilename: originalFileName,
        externalidentifier: externalIdentifier
    };
    const headers = {
        'X-API-TOKEN': token,
        'Content-Type': 'application/json'
    };

    try {
        const response = await axios.post(url, payload, { headers });
        return response.data;
    } catch (error) {
        console.error('Error in declareAudioInteraction:', error);
        throw error;
    }
};

// GetInteractionStatus function
const getInteractionStatus = async (interactionId, token) => {
    const url = `https://api.elevateai.com/v1/interactions/${interactionId}/status`;
    const headers = {
        'X-API-TOKEN': token,
        'Content-Type': 'application/json'
    };

    try {
        const response = await axios.get(url, { headers });
        return response.data;
    } catch (error) {
        console.error('Error in getInteractionStatus:', error);
        throw error;
    }
};

// UploadInteraction function
const uploadInteraction = async (
    interactionId,
    token,
    localFilePath,
    fileName,
    originalFileName
) => {
    const url = `https://api.elevateai.com/v1/interactions/${interactionId}/upload`;
    const formData = new FormData();
    formData.append('file', fs.createReadStream(localFilePath), fileName);
    const headers = {
        'X-API-TOKEN': token,
        ...formData.getHeaders()
    };

    try {
        const response = await axios.post(url, formData, { headers });
        return response.data;
    } catch (error) {
        console.error('Error in uploadInteraction:', error);
        throw error;
    }
};

// GetWordByWordTranscript function
const getWordByWordTranscript = async (interactionId, token) => {
    const url = `https://api.elevateai.com/v1/interactions/${interactionId}/transcript`;
    const headers = {
        'X-API-TOKEN': token,
        'Content-Type': 'application/json'
    };

    try {
        const response = await axios.get(url, { headers });
        return response.data;
    } catch (error) {
        console.error('Error in getWordByWordTranscript:', error);
        throw error;
    }
};

// GetPuncutatedTranscript function
const getPuncutatedTranscript = async (interactionId, token) => {
    const url = `https://api.elevateai.com/v1/interactions/${interactionId}/transcripts/punctuated`;
    const headers = {
        'X-API-TOKEN': token,
        'Content-Type': 'application/json'
    };

    try {
        const response = await axios.get(url, { headers });
        return response.data;
    } catch (error) {
        console.error('Error in getPuncutatedTranscript:', error);
        throw error;
    }
};

// GetAIResults function
const getAIResults = async (interactionId, token) => {
    const url = `https://api.elevateai.com/v1/interactions/${interactionId}/ai`;
    const headers = {
        'X-API-TOKEN': token,
        'Content-Type': 'application/json'
    };

    try {
        const response = await axios.get(url, { headers });
        return response.data;
    } catch (error) {
        console.error('Error in getAIResults:', error);
        throw error;
    }
};

module.exports = {
    declareAudioInteraction,
    getInteractionStatus,
    uploadInteraction,
    getWordByWordTranscript,
    getPuncutatedTranscript,
    getAIResults
};