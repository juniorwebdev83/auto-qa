// AsyncClient.js

import axios from 'axios';

class AsyncClient {
  constructor(token, url = "https://api.elevateai.com/v1") {
    this.url = url;
    this.apiToken = token;
    this.declareUri = `${url}/interactions`;
    this.uploadUri = `${url}/interactions/%s/upload`;
    this.statusUri = `${url}/interactions/%s/status`;
    this.transcriptsUri = `${url}/interactions/%s/transcripts`;
    this.transcriptsUri2 = `${url}/interactions/%s/transcripts/punctuated`;
    this.aiUri = `${url}/interactions/%s/ai`;
    this.uploadHeader = {
      "Content-Type": "multipart/form-data",
      "X-API-TOKEN": token
    };
    this.jsonHeader = {
      "Content-Type": "application/json; charset=utf-8",
      "X-API-TOKEN": token
    };
  }

  async declare(languageTag = "en-us", vertical = "default", transcriptionMode = "highAccuracy", mediafile = null, url = null, originalFilename = null, externalIdentifier = null) {
    const data = {
      type: 'audio',
      downloadUri: url,
      languageTag: languageTag,
      vertical: vertical,
      audioTranscriptionMode: transcriptionMode,
      includeAiResults: true
    };
    if (originalFilename) {
      data.originalFilename = originalFilename;
    }
    if (externalIdentifier) {
      data.externalIdentifier = externalIdentifier;
    }

    try {
      const response = await axios.post(this.declareUri, data, { headers: this.jsonHeader });
      let interaction = response.data;
      if (mediafile) {
        await this.upload(interaction.interactionIdentifier, mediafile);
      }
      interaction.status = await this.status(interaction.interactionIdentifier);
      return interaction;
    } catch (error) {
      console.error('Error in declare:', error);
      throw error;
    }
  }

  async upload(interactionId, filepath) {
    try {
      const formData = new FormData();
      formData.append('file', filepath);
      const response = await axios.post(this.uploadUri.replace('%s', interactionId), formData, { headers: this.uploadHeader });
      return response.data;
    } catch (error) {
      console.error('Error in upload:', error);
      throw error;
    }
  }

  async status(interactionId) {
    try {
      const response = await axios.get(this.statusUri.replace('%s', interactionId), { headers: this.jsonHeader });
      return response.data.status;
    } catch (error) {
      console.error('Error in status:', error);
      throw error;
    }
  }

  async transcripts(interactionId, punctuated = true) {
    try {
      const url = punctuated ? this.transcriptsUri2.replace('%s', interactionId) : this.transcriptsUri.replace('%s', interactionId);
      const response = await axios.get(url, { headers: this.jsonHeader });
      return response.data;
    } catch (error) {
      console.error('Error in transcripts:', error);
      throw error;
    }
  }

  async ai(interactionId) {
    try {
      const response = await axios.get(this.aiUri.replace('%s', interactionId), { headers: this.jsonHeader });
      return response.data;
    } catch (error) {
      console.error('Error in ai:', error);
      throw error;
    }
  }
}

export default AsyncClient;
