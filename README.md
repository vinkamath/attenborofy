# Attenborofy

A web application that converts text to speech in the style of Sir David Attenborough's voice using ElevenLabs API.

## Features

- Simple web interface for text input
- Text-to-speech conversion using David Attenborough's voice
- Example phrases for inspiration
- Responsive design

## Setup

1. Clone this repository
2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Set up environment variables:
   - Copy `.env.example` to `.env`
   - Get an API key from [ElevenLabs](https://elevenlabs.io/)
   - Update the `.env` file with your API key

4. Run the application:
```bash
python app.py
```

5. Open your browser and navigate to `http://127.0.0.1:5000`

## Usage

1. Enter text in the provided text area or select one of the example phrases
2. Click "Generate Audio" to convert the text to speech
3. The audio will play automatically once generated
4. You can replay the audio using the audio controls

## Notes

- This application uses the ElevenLabs API for text-to-speech conversion
- An API key is required for the ElevenLabs service
- The application is for demonstration purposes only

## License

This project is provided as-is without any warranty.