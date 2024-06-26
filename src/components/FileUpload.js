import React, { useState } from 'react';
import { declareAudioInteraction, uploadInteraction } from '../api/elevateAI';

function FileUpload({ onFileProcessed }) {
  const [file, setFile] = useState(null);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) return;

    try {
      const declareResponse = await declareAudioInteraction();
      const interactionId = declareResponse.interactionIdentifier;
      
      await uploadInteraction(interactionId, file);
      
      onFileProcessed(interactionId);
    } catch (error) {
      console.error('Error processing file:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input type="file" onChange={handleFileChange} />
      <button type="submit">Upload and Process</button>
    </form>
  );
}

export default FileUpload;