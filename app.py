from flask import Flask, render_template, request, send_file, Response, flash
import os
from elevenlabs import ElevenLabs
import tempfile
import uuid
import logging
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

app = Flask(__name__)
app.secret_key = os.urandom(24)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ElevenLabs configuration from environment variables
API_KEY = os.getenv('ELEVENLABS_API_KEY')
if not API_KEY:
    logger.error("ELEVENLABS_API_KEY environment variable is not set")
    raise ValueError("ELEVENLABS_API_KEY environment variable is required")

# Voice ID kept in the application code
VOICE_ID = 'JBFqnCBsd6RMkjVDRZzb'  # Test voice ID

@app.route('/', methods=['GET', 'POST'])
def index():
    audio_file = None
    error_message = None
    
    if request.method == 'POST':
        text = request.form['text']
        
        if text:
            try:
                # Create a unique filename for this request
                unique_id = str(uuid.uuid4())
                temp_dir = tempfile.gettempdir()
                audio_file = os.path.join(temp_dir, f"attenborofy_{unique_id}.mp3")
                
                # Initialize ElevenLabs client
                client = ElevenLabs(api_key=API_KEY)
                
                # Log the length of the text
                character_count = len(text)
                logger.info(f"Converting text of length {character_count} to speech")
                
                # Convert text to speech
                response = client.text_to_speech.convert(
                    voice_id=VOICE_ID,
                    output_format="mp3_44100_128",
                    text=text,
                    model_id="eleven_multilingual_v2",
                )
                
                # Save the audio file
                with open(audio_file, "wb") as f:
                    for chunk in response:
                        if chunk:
                            f.write(chunk)
                
                # Check if the file was created and has content
                if os.path.exists(audio_file) and os.path.getsize(audio_file) > 0:
                    # Return relative path for the template
                    audio_file = f"audio/{unique_id}"
                    logger.info(f"Successfully generated audio for text of length {character_count}")
                else:
                    # Handle the case where the file wasn't created properly
                    logger.error("Audio file was not created successfully")
                    error_message = "Failed to generate audio. Please try again."
                    audio_file = None
                
            except Exception as e:
                if "rate limit" in str(e).lower():
                    logger.error(f"Rate limit error: {str(e)}")
                    error_message = "Rate limit reached. Please try again later."
                elif "character limit" in str(e).lower() or "quota" in str(e).lower():
                    logger.error(f"Character limit error: {str(e)}")
                    error_message = "API character limit exceeded. Please try a shorter text or come back later."
                elif "api" in str(e).lower():
                    logger.error(f"ElevenLabs API error: {str(e)}")
                    error_message = f"API Error: {str(e)}"
                else:
                    logger.error(f"Unexpected error during text-to-speech conversion: {str(e)}")
                    error_message = "An unexpected error occurred. Please try again later."
    
    return render_template('index.html', audio_file=audio_file, error=error_message, text=request.form.get('text', ''))

@app.route('/audio/<unique_id>')
def serve_audio(unique_id):
    """Serve the generated audio file."""
    temp_dir = tempfile.gettempdir()
    audio_path = os.path.join(temp_dir, f"attenborofy_{unique_id}.mp3")
    
    if os.path.exists(audio_path):
        return send_file(audio_path, mimetype='audio/mpeg')
    else:
        return Response("Audio file not found", status=404)

if __name__ == '__main__':
    app.run(debug=True)
