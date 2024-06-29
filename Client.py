"""Class to use when interacting with ElevateAI."""

import requests
import json


class Client:
    """Base class."""

    def __init__(self, url="https://api.elevateai.com/v1", token=None):
        """Initialize."""
        self.url = url
        self.api_token = token
        self.declareUri = f"{url}/interactions"
        self.uploadUri = f"{url}/interactions/%s/upload"
        self.statusUri = f"{url}/interactions/%s/status"
        self.transcriptsUri = f"{url}/interactions/%s/transcripts"
        self.transcriptsUri2 = f"{url}/interactions/%s/transcripts/punctuated"
        self.aiUri = f"{url}/interactions/%s/ai"
        self.uploadHeader = {"X-API-TOKEN": token}
        self.jsonHeader = {
            "Content-Type": "application/json; charset=utf-8",
            "X-API-TOKEN": token,
        }
        self.session = requests.session()
        self.session.headers.update(self.jsonHeader)

    def declare(self, languageTag="en-us", vertical="default", transcriptionMode="highAccuracy", mediafile=None, url=None):
        """First step is to declare the interaction."""
        data = {
            "type": "audio",
            "downloadUrl": url,
            "languageTag": languageTag,
            "vertical": vertical,
            "audioTranscriptionMode": transcriptionMode,
            "includeAiResults": True,
        }
        rsp = self.session.post(self.declareUri, data=json.dumps(data))
        rsp.raise_for_status()
        i = rsp.json()
        if mediafile:
            self.upload(i, mediafile)
        i["status"] = self.status(i)
        return i

    def upload(self, i, f):
        """Second step is to upload the file."""
        if isinstance(i, dict):
            i = i["interactionIdentifier"]
        files = {"file": (f, open(f, "rb"), "application/octet-stream")}
        rsp = requests.post(self.uploadUri % i, headers=self.uploadHeader, files=files)
        rsp.raise_for_status()
        return rsp.json()

    def status(self, interaction):
        """Check the status of the interaction."""
        if isinstance(interaction, dict):
            interaction = interaction["interactionIdentifier"]
        rsp = self.session.get(self.statusUri % interaction)
        rsp.raise_for_status()
        return rsp.json()["status"]

    def transcripts(self, interaction, punctuated=True):
        """Get the transcriptions."""
        if isinstance(interaction, dict):
            interaction = interaction["interactionIdentifier"]
        url = self.transcriptsUri2 if punctuated else self.transcriptsUri
        rsp = self.session.get(url % interaction)
        rsp.raise_for_status()
        return rsp.json()

    def ai(self, interaction):
        """Get the JSON AI results."""
        if isinstance(interaction, dict):
            interaction = interaction["interactionIdentifier"]
        rsp = self.session.get(self.aiUri % interaction)
        rsp.raise_for_status()
        return rsp.json()
