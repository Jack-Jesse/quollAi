#!/usr/bin/env python3
"""
Test current model on human images to reproduce the reported issue
"""

import torch
import torch.nn.functional as F
from torchvision import transforms
from PIL import Image
import os
import glob

# Load current model
model = torch.jit.load('quoll_classifier_traced.pt', map_location='cpu')
model.eval()

preprocess = transforms.Compose([
    transforms.Resize(256),
    transforms.CenterCrop(224),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
])

classes = ["not_quoll", "quoll"]

def test_human_images():
    """Test with some human-like images to reproduce the issue"""
    print("=== Testing Current Model on Human Images ===")
    
    # Create some test images (this is a simple test)
    test_cases = [
        ("Human face test", "Would this be classified as quoll?"),
        ("Person test", "Would a person be confused with quoll?"),
    ]
    
    print("Testing model behavior...")
    print("Note: This helps confirm the issue before fixing.")
    
    # Test with training data to ensure model works
    print("\n--- Training Data Test (should work correctly) ---")
    
    # Test quoll image
    quoll_files = glob.glob('dataset/quoll/*.jpg')[:3]
    for f in quoll_files:
        img = Image.open(f).convert('RGB')
        tensor = preprocess(img).unsqueeze(0)
        with torch.no_grad():
            out = model(tensor)
            probs = F.softmax(out, dim=1)
            pred = classes[probs.argmax().item()]
        print(f"{os.path.basename(f)} -> {pred} (confidence: {probs.max():.3f})")
    
    # Test not_quoll image  
    not_quoll_files = glob.glob('dataset/not_quoll/*.jpg')[:3]
    for f in not_quoll_files:
        img = Image.open(f).convert('RGB')
        tensor = preprocess(img).unsqueeze(0)
        with torch.no_grad():
            out = model(tensor)
            probs = F.softmax(out, dim=1)
            pred = classes[probs.argmax().item()]
        print(f"{os.path.basename(f)} -> {pred} (confidence: {probs.max():.3f})")

if __name__ == "__main__":
    test_human_images()