# 🦔 Quoll Classifier

Upload images to classify quolls using a FastAI model.

## Architecture

```
quollAI001/
├── backend/              # Python Flask API (loads the PKL model)
│   ├── app.py            # Flask server with /classify endpoint
│   ├── requirements.txt  # Python dependencies
│   └── quoll_classifier.pkl  # ← Place your PKL model here
└── frontend/             # Next.js app (image upload UI)
    └── src/app/page.tsx  # Drag & drop image upload + results
```

## Setup

### 1. Place your PKL model

```
cp quoll_classifier.pkl backend/
```

### 2. Start the backend (Python)

```bash
cd backend
pip install -r requirements.txt
python app.py
```

Runs on **http://localhost:5000**

### 3. Start the frontend (Next.js)

```bash
cd frontend
npm install
npm run dev
```

Runs on **http://localhost:3000**

## API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/classify` | POST | Upload an image (`multipart/form-data` with `image` field) |
| `/health` | GET | Check if the model is loaded |

## Model

- **Type**: FastAI image classifier (ResNet-based CNN)
- **Classes**: `quoll`, `not_quoll`
- **Input**: Images resized to 224×224
