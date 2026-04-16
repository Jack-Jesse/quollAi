#!/usr/bin/env python3
"""
Create test images that might be confused with quolls to reproduce the issue
"""

import torch
import torch.nn.functional as F
from torchvision import transforms
from PIL import Image, ImageDraw
import os

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

def create_test_image(description, save_path):
    """Create a test image that might be confusing"""
    img = Image.new('RGB', (224, 224), 'white')
    draw = ImageDraw.Draw(img)
    
    if 'human' in description.lower():
        # Draw simple human figure
        draw.ellipse([100, 30, 124, 54], fill='pink')  # head
        draw.rectangle([110, 54, 114, 124], fill='blue')  # body
        draw.rectangle([105, 60, 109, 80], fill='blue')   # left arm
        draw.rectangle([115, 60, 119, 80], fill='blue')   # right arm
        draw.rectangle([108, 124, 112, 144], fill='black') # left leg
        draw.rectangle([116, 124, 120, 144], fill='black') # right leg
    elif 'animal' in description.lower():
        # Draw animal-like figure (could be confused with quoll)
        draw.ellipse([80, 60, 144, 124], fill='brown')  # body
        draw.ellipse([100, 30, 124, 54], fill='tan')     # head
        # Draw spots (quoll-like)
        for _ in range(5):
            x, y = torch.randint(80, 144, (2,)).tolist()
            draw.ellipse([x, y, x+8, y+8], fill='black')
    else:
        # Draw something clearly not quoll
        draw.rectangle([50, 50, 174, 174], fill='gray')  # building
        draw.rectangle([80, 80, 120, 100], fill='blue') # window
    
    img.save(save_path)
    return img

def test_confusing_images():
    """Create and test images that might be confusing"""
    print("=== Creating Test Images for Confusing Cases ===")
    
    test_cases = [
        ("Human figure", "human_test.jpg"),
        ("Spotted animal", "animal_test.jpg"),
        ("Building", "building_test.jpg")
    ]
    
    for description, filename in test_cases:
        print(f"\n--- Testing: {description} ---")
        
        # Create test image
        test_img = create_test_image(description, filename)
        
        # Test with model
        tensor = preprocess(test_img).unsqueeze(0)
        with torch.no_grad():
            out = model(tensor)
            probs = F.softmax(out, dim=1)
            pred = classes[probs.argmax().item()]
            confidence = probs.max().item()
            
        print(f"Prediction: {pred} ({confidence:.3f})")
        print(f"Probabilities: {dict(zip(classes, probs[0].tolist()))}")
        
        # Check if human is classified as quoll
        if 'human' in description.lower() and pred == 'quoll':
            print("❌ ISSUE CONFIRMED: Human classified as quoll!")
        elif 'human' in description.lower() and confidence < 0.8:
            print("⚠️  WARNING: Low confidence on human image")

if __name__ == "__main__":
    test_confusing_images()