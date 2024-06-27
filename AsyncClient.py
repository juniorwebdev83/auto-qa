"""Async version of SDK."""

import aiohttp
import json


class AsyncClient:
    """Base class."""

    BOUNDARY = "_____123456789_____"

    def __init__(self, token, url="https://api.elevateai.com/v1"):
        """Initialize."""
        self.url = url
        self.api_token = token
        self.declareUri = f"{url}/interactions"
        self.uploadUri = f"{url}/interactions/%s/upload"
        self.statusUri = f"{url}/interactions/%s/status"
        self.transcriptsUri = f"{url}/interactions/%s/transcripts"
        self.transcriptsUri2 = f"{url}/interactions/%s/transcripts/punctuated"
        self.aiUri = f"{url}/interactions/%s/ai"
        self.uploadHeader = {
            "Content-Type": f"multipart/form-data; boundary={self.BOUNDARY}",
            "X-API-TOKEN": token,
        }
        self.jsonHeader = {
            "Content-Type": "application/json; charset=utf-8",
            "X-API-TOKEN": token,
        }

    async def declare(
        self,
        languageTag="en-us",
        vertical="default",
        transcriptionMode="highAccuracy",
        mediafile=None,
        url=None,
        originalFilename=None,
        externalIdentifier=None,
    ):
        """First step is to declare the interaction."""
        data = {
            "type": "audio",
            "downloadUri": url,
            "languageTag": languageTag,
            "vertical": vertical,
            "audioTranscriptionMode": transcriptionMode,
            "includeAiResults": True,
        }
        if originalFilename:
            data["originalFilename"] = originalFilename
        if externalIdentifier:
            data["externalIdentifier"] = externalIdentifier

        async with aiohttp.ClientSession() as asess:
            async with asess.post(
                self.declareUri, headers=self.jsonHeader, json=data
            ) as rsp:
                if rsp.status == 401:  # If status code is Unauthorized
                    print("Declare:Received 401, check if token is correct.")

                raw_response = await rsp.text()

                if raw_response:
                    try:
                        i = json.loads(raw_response)
                    except json.JSONDecodeError:
                        print("Declare: Failed to parse response as JSON.")
                        return None
                else:
                    print("Declare: Empty response received.")
                    return None

        """If a filepath was passed in, go ahead and upload the file."""
        if mediafile:
            await self.upload(i, mediafile)
        i["status"] = await self.status(i)
        return i

    async def upload(self, i, f):
        """Second step is to upload the file."""
        if isinstance(i, dict):
            i = i["interactionIdentifier"]
        async with aiohttp.ClientSession() as asess:
            with aiohttp.MultipartWriter("form-data", boundary=self.BOUNDARY) as dw:
                fp = dw.append(open(f, "rb"), headers={"Content-Type": "application/octet-stream"})
                fp.set_content_disposition("form-data", filename=f)
                async with asess.post(self.uploadUri % i, headers=self.uploadHeader, data=dw) as rsp:
                    if rsp.status != 200:
                        print(f"Upload failed with status code {rsp.status}")
                    return rsp.ok

    async def status(self, interaction):
        """Check status of interaction."""
        if isinstance(interaction, dict):
            interaction = interaction["interactionIdentifier"]

        async with aiohttp.ClientSession() as asess:
            async with asess.get(self.statusUri % interaction, headers=self.jsonHeader) as rsp:
                raw_response = await rsp.text()

                if raw_response:
                    try:
                        j = json.loads(raw_response)
                        return j["status"]
                    except json.JSONDecodeError:
                        print("Status: Failed to parse response as JSON.")
                        return None
                else:
                    print("Status: Empty status response received.")
                    return None

    async def transcripts(self, interaction, punctuated=True):
        """Get the transcriptions."""
        if isinstance(interaction, dict):
            interaction = interaction["interactionIdentifier"]
        url = self.transcriptsUri2 if punctuated else self.transcriptsUri
        async with aiohttp.ClientSession() as asess:
            async with asess.get(url % interaction, headers=self.jsonHeader) as rsp:
                if rsp.status != 200:
                    print(f"Transcripts request failed with status code {rsp.status}")
                return await rsp.json()

    async def ai(self, interaction):
        """Get the JSON AI results."""
        if isinstance(interaction, dict):
            interaction = interaction["interactionIdentifier"]
        async with aiohttp.ClientSession() as asess:
            async with asess.get(self.aiUri % interaction, headers=self.jsonHeader) as rsp:
                if rsp.status != 200:
                    print(f"AI request failed with status code {rsp.status}")
                return await rsp.json()
