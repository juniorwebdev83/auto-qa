import os
from flask import Flask, request, jsonify, render_template
from werkzeug.utils import secure_filename
import time
import ElevateAI

UPLOAD_FOLDER = 'uploads/'
ALLOWED_EXTENSIONS = {'wav', 'mp3', 'm4a'}

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_PATH'] = 1000000  # 1 MB limit

ELEVATE_AI_TOKEN = '4c90d090-0115-4fed-9546-d5f446b4459b'  # Replace with your token

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/')
def index():
    return render_template('index.html')

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
    try:
        declare_resp = ElevateAI.DeclareAudioInteraction(
            'en-us', 'default', None, ELEVATE_AI_TOKEN, 'highAccuracy', True, file_name
        )
        interaction_id = declare_resp['interactionIdentifier']
    except Exception as e:
        print(f"Error in DeclareAudioInteraction: {e}")
        raise

    try:
        ElevateAI.UploadInteraction(interaction_id, ELEVATE_AI_TOKEN, file_path, file_name)
    except Exception as e:
        print(f"Error in UploadInteraction: {e}")
        raise

    start_time = time.time()
    max_wait_time = 5 * 60  # 5 minutes

    while time.time() - start_time < max_wait_time:
        try:
            status_resp = ElevateAI.GetInteractionStatus(interaction_id, ELEVATE_AI_TOKEN)
            if status_resp['status'] == 'processed':
                transcript_resp = ElevateAI.GetPuncutatedTranscript(interaction_id, ELEVATE_AI_TOKEN)
                if not transcript_resp or not transcript_resp['sentenceSegments']:
                    raise ValueError('Transcript not found in the response')
                transcript = ' '.join(segment['phrase'] for segment in transcript_resp['sentenceSegments'])
                score, breakdown = calculate_qa_score(transcript)
                return {'transcription': transcript, 'qaScore': score, 'scoreBreakdown': breakdown}
            elif status_resp['status'] == 'processingFailed':
                raise ValueError('ElevateAI processing failed')
        except Exception as e:
            print(f"Error in processing status or fetching transcript: {e}")
            raise
        time.sleep(10)

    raise TimeoutError('Processing timed out after 5 minutes')

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
