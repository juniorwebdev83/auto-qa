import os
import time
import requests
from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
from werkzeug.utils import secure_filename
import ElevateAI

UPLOAD_FOLDER = 'uploads/'
ALLOWED_EXTENSIONS = {'wav', 'mp3', 'm4a'}

app = Flask(__name__)
CORS(app)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_PATH'] = 1000000  # 1 MB limit

ELEVATE_AI_TOKEN = '4c90d090-0115-4fed-9546-d5f446b4459b'  # Your ElevateAI token

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/results')
def results():
    return render_template('results.html')

@app.route('/api/process-audio', methods=['POST'])
def process_audio():
    if 'audioFile' not in request.files:
        return jsonify({'error': 'No audio file part'}), 400

    file = request.files['audioFile']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400

    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(file_path)

        try:
            result = process_with_elevateai(file_path, filename)
            os.remove(file_path)
            return jsonify(result)
        except Exception as e:
            print(f"Error: {e}")
            return jsonify({'error': str(e)}), 500
    else:
        return jsonify({'error': 'Invalid file format'}), 400

def process_with_elevateai(file_path, file_name):
    token = ELEVATE_AI_TOKEN
    langaugeTag = "en-us"
    vert = "default"
    transcriptionMode = "highAccuracy"

    # Step 2: Declare interaction
    declareResp = ElevateAI.DeclareAudioInteraction(langaugeTag, vert, None, token, transcriptionMode, False)
    declareJson = declareResp
    interactionId = declareJson["interactionIdentifier"]

    # Step 3: Upload interaction
    ElevateAI.UploadInteraction(interactionId, token, file_path, file_name)

    # Step 4: Check status until processed
    while True:
        getInteractionStatusResponse = ElevateAI.GetInteractionStatus(interactionId, token)
        getInteractionStatusResponseJson = getInteractionStatusResponse
        if getInteractionStatusResponseJson["status"] == "processed":
            break
        time.sleep(30)

    # Step 5: Retrieve results
    getPuncutatedTranscriptResponse = ElevateAI.GetPuncutatedTranscript(interactionId, token)
    transcript_resp = getPuncutatedTranscriptResponse
    if not transcript_resp or not transcript_resp['sentenceSegments']:
        raise ValueError('Transcript not found in the response')
    transcript = '\n'.join(segment['phrase'] for segment in transcript_resp['sentenceSegments'])

    getAIResultsResponse = ElevateAI.GetAIResults(interactionId, token)
    ai_results_resp = getAIResultsResponse
    sentiment = ai_results_resp.get('sentiment', 'Unknown')
    summary = ai_results_resp.get('summary', 'No summary available')

    score, breakdown = calculate_qa_score(transcript)

    result = {
        'transcription': transcript,
        'qaScore': score,
        'scoreBreakdown': breakdown,
        'sentiment': sentiment,
        'summary': summary
    }

    return result

def calculate_qa_score(transcription):
    criteria = [
        {'points': 2, 'criterion': "Agent readiness", 'check': lambda: True},
        {'points': 4, 'criterion': "Correct introduction", 'check': lambda: "my name is" in transcription.lower() or "i'm" in transcription.lower()},
        {'points': 4, 'criterion': "Acknowledge request", 'check': lambda: "how may i help you" in transcription.lower()},
        {'points': 10, 'criterion': "Confirm information", 'check': lambda: any(word in transcription.lower() for word in ["name", "itinerary", "hotel", "dates"])},
        {'points': 10, 'criterion': "Call efficiency", 'check': lambda: "hold" in transcription.lower() and "update" in transcription.lower()},
        {'points': 15, 'criterion': "Agent control", 'check': lambda: "it is my pleasure to help you" in transcription.lower() and any(word in transcription.lower() for word in ["alternative", "solution"])},
        {'points': 15, 'criterion': "Clear communication", 'check': lambda: any(title in transcription.lower() for title in ["mr.", "ms.", "mrs.", "sir", "ma'am"])},
    ]
    breakdown = [{'criterion': c['criterion'], 'score': c['check']() and c['points'] or 0} for c in criteria]
    score = sum(item['score'] for item in breakdown)
    return score, breakdown

if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

if __name__ == '__main__':
    app.run(port=3001, debug=True)
