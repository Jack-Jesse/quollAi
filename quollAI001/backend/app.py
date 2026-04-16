from flask import Flask, request, jsonify
from flask_cors import CORS
import io
import traceback

import torch
import torch.nn.functional as F
from PIL import Image
from torchvision import transforms

app = Flask(__name__)
CORS(app)

MODEL_PATH = "quoll_classifier_traced.pt"
CLASSES = ["not_quoll", "quoll"]

print(f"Loading model from {MODEL_PATH}...")
model = torch.jit.load(MODEL_PATH, map_location="cpu")
model.eval()
print(f"Model loaded! Classes: {CLASSES}")

preprocess = transforms.Compose([
    transforms.Resize(256),
    transforms.CenterCrop(224),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
])


@app.route("/classify", methods=["POST"])
def classify():
    if "image" not in request.files:
        return jsonify({"error": "No image file provided"}), 400

    file = request.files["image"]
    if file.filename == "":
        return jsonify({"error": "No file selected"}), 400

    try:
        image_bytes = file.read()
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        input_tensor = preprocess(image).unsqueeze(0)

        with torch.no_grad():
            outputs = model(input_tensor)
            probs = F.softmax(outputs, dim=1).squeeze(0)

        pred_idx = probs.argmax().item()
        class_name = CLASSES[pred_idx]
        confidence = probs[pred_idx].item()
        all_probs = {CLASSES[i]: probs[i].item() for i in range(len(CLASSES))}

        return jsonify({
            "prediction": class_name,
            "confidence": round(confidence, 4),
            "probabilities": all_probs,
            "filename": file.filename
        })

    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status": "ok",
        "model": "quoll_classifier",
        "classes": CLASSES
    })


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001, debug=True)
