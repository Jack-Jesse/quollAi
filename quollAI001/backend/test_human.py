#!/usr/bin/env python3
"""
Test the quoll classifier on human images to reproduce the reported issue
"""

import torch
import torch.nn.functional as F
from torchvision import transforms
from PIL import Image
import requests
import io

# Load model
model = torch.jit.load('quoll_classifier_traced.pt', map_location='cpu')
model.eval()

preprocess = transforms.Compose([
    transforms.Resize(256),
    transforms.CenterCrop(224),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
])

classes = ["not_quoll", "quoll"]

def test_image_from_url(url, description):
    try:
        print(f"=== Testing: {description} ===")
        
        # Download image
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        
        # Load and preprocess
        img = Image.open(io.BytesIO(response.content)).convert('RGB')
        tensor = preprocess(img).unsqueeze(0)
        
        # Predict
        with torch.no_grad():
            output = model(tensor)
            probs = F.softmax(output, dim=1)
            pred_idx = probs.argmax().item()
            confidence = probs[0][pred_idx].item()
            
        print(f"Prediction: {classes[pred_idx]} ({confidence:.3f})")
        print(f"Probabilities: {dict(zip(classes, probs[0].tolist()))}")
        
        return classes[pred_idx], confidence
        
    except Exception as e:
        print(f"Error: {e}")
        return None, None

# Test with some sample human images from Picsum
human_images = [
    ("https://picsum.photos/400/600?human", "Random human-like image 1"),
    ("https://picsum.photos/300/400?person", "Random human-like image 2"),
    ("https://picsum.photos/500/700?face", "Random human-like image 3"),
]

print("Testing model on human-like images to check for misclassification...\n")

for url, desc in human_images:
    test_image_from_url(url, desc)
    print()

# Test with a clear animal image for comparison
print("=== Testing Clear Animal Image (for comparison) ===")
animal_url = "https://picsum.photos/400/300?cat"
test_image_from_url(animal_url, "Clear animal image")