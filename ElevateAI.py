"""ElevateAI functions to get transcriptions."""

import requests
import json

def log_response(response):
    print(f"Status Code: {response.status_code}")
    print(f"Response Text: {response.text}")
    print(f"Headers: {response.headers}")

def DeclareAudioInteraction(
    language,
    verticle,
    downloadUri,
    token,
    audioTranscriptionMode,
    includeAiResults: bool,
    originalFileName=None,
    externalIdentifier=None,
):
    """1st step in processing an interaction is to declare the interaction."""
    url = "https://api.elevateai.com/v1/interactions/"

    payload = {
        "type": "audio",
        "languageTag": language,
        "vertical": verticle,
        "audioTranscriptionMode": audioTranscriptionMode,
        "downloadUri": downloadUri,
        "includeAiResults": includeAiResults,
        "originalfilename": originalFileName,
        "externalidentifier": externalIdentifier,
    }

    headers = {"X-API-TOKEN": token, "Content-Type": "application/json"}

    response = requests.post(url, headers=headers, json=payload)
    log_response(response)
    response.raise_for_status()
    try:
        return response.json()
    except json.JSONDecodeError as e:
        print(f"JSONDecodeError in DeclareAudioInteraction: {e}")
        raise

def GetInteractionStatus(interactionId, token):
    """Check if interaction has been processed."""
    url = f"https://api.elevateai.com/v1/interactions/{interactionId}/status"

    headers = {"X-API-TOKEN": token, "Content-Type": "application/json"}

    response = requests.get(url, headers=headers)
    log_response(response)
    response.raise_for_status()
    try:
        return response.json()
    except json.JSONDecodeError as e:
        print(f"JSONDecodeError in GetInteractionStatus: {e}")
        raise

def UploadInteraction(interactionId, token, localFilePath, fileName, originalFileName=None):
    """Upload file to ElevateAI."""
    url = f"https://api.elevateai.com/v1/interactions/{interactionId}/upload"

    files = {"file": (fileName, open(localFilePath, "rb"), "application/octet-stream")}
    headers = {"X-API-TOKEN": token}

    response = requests.post(url, headers=headers, files=files)
    log_response(response)
    response.raise_for_status()
    try:
        # Handle empty response body
        if response.text:
            return response.json()
        else:
            return {}
    except json.JSONDecodeError as e:
        print(f"JSONDecodeError in UploadInteraction: {e}")
        raise

def GetWordByWordTranscript(interactionId, token):
    """Get the word by word transcription of the interaction."""
    url = f"https://api.elevateai.com/v1/interactions/{interactionId}/transcript"

    headers = {"X-API-TOKEN": token, "Content-Type": "application/json"}

    response = requests.get(url, headers=headers)
    log_response(response)
    response.raise_for_status()
    try:
        return response.json()
    except json.JSONDecodeError as e:
        print(f"JSONDecodeError in GetWordByWordTranscript: {e}")
        raise

def GetPuncutatedTranscript(interactionId, token):
    """Get the punctuated version of the transcription."""
    url = f"https://api.elevateai.com/v1/interactions/{interactionId}/transcripts/punctuated"

    headers = {"X-API-TOKEN": token, "Content-Type": "application/json"}

    response = requests.get(url, headers=headers)
    log_response(response)
    response.raise_for_status()
    try:
        return response.json()
    except json.JSONDecodeError as e:
        print(f"JSONDecodeError in GetPuncutatedTranscript: {e}")
        raise

def GetAIResults(interactionId, token):
    """Get JSON with AI results."""
    url = f"https://api.elevateai.com/v1/interactions/{interactionId}/ai"

    headers = {"X-API-TOKEN": token, "Content-Type": "application/json"}

    response = requests.get(url, headers=headers)
    log_response(response)
    response.raise_for_status()
    try:
        return response.json()
    except json.JSONDecodeError as e:
        print(f"JSONDecodeError in GetAIResults: {e}")
        raise
