#!/usr/bin/env python3
"""
Test the quoll classifier on sample images
"""

import torch
import torch.nn.functional as F
from torchvision import transforms
from PIL import Image
import json

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

# Test on quoll image
print("=== Testing Quoll Image ===")
quoll_img = Image.open('dataset/quoll/q_0000.jpg').convert('RGB')
tensor = preprocess(quoll_img).unsqueeze(0)

with torch.no_grad():
    output = model(tensor)
    probs = F.softmax(output, dim=1)
    pred_idx = probs.argmax().item()
    confidence = probs[0][pred_idx].item()

print(f"Prediction: {classes[pred_idx]} ({confidence:.3f})")
print(f"Probabilities: {dict(zip(classes, probs[0].tolist()))}")

# Test on not_quoll image
print("\n=== Testing Not Quoll Image ===")
not_quoll_img = Image.open('dataset/not_quoll/nq_0000.jpg').convert('RGB')
tensor = preprocess(not_quoll_img).unsqueeze(0)

with torch.no_grad():
    output = model(tensor)
    probs = F.softmax(output, dim=1)
    pred_idx = probs.argmax().item()
    confidence = probs[0][pred_idx].item()

print(f"Prediction: {classes[pred_idx]} ({confidence:.3f})")
print(f"Probabilities: {dict(zip(classes, probs[0].tolist()))}")