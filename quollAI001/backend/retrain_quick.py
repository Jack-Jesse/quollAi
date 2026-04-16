#!/usr/bin/env python3
"""
Quick retraining with improved data diversity
"""

import torch
import torch.nn as nn
import torch.nn.functional as F
from torchvision import models, transforms, datasets
from torch.utils.data import DataLoader, random_split
from PIL import Image
import os
import glob

def train_improved():
    """Train with improved, more diverse dataset"""
    print("=== Training Improved Quoll Classifier ===")
    
    # Transforms
    preprocess_train = transforms.Compose([
        transforms.RandomResizedCrop(224),
        transforms.RandomHorizontalFlip(),
        transforms.ColorJitter(brightness=0.4, contrast=0.4),
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
    ])
    preprocess_val = transforms.Compose([
        transforms.Resize(256),
        transforms.CenterCrop(224),
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
    ])

    # Data
    dataset = datasets.ImageFolder('dataset', transform=preprocess_train)
    train_size = int(0.8 * len(dataset))
    val_size = len(dataset) - train_size
    train_ds, val_ds = random_split(dataset, [train_size, val_size],
                                     generator=torch.Generator().manual_seed(42))
    val_ds.dataset.transform = preprocess_val

    print(f'Classes: {dataset.classes}')
    print(f'Train: {train_size}, Val: {val_size}')
    
    # Check class distribution
    train_labels = [label for _, label in train_ds]
    val_labels = [label for _, label in val_ds]
    print(f'Train balance: not_quoll={train_labels.count(0)}, quoll={train_labels.count(1)}')
    print(f'Val balance: not_quoll={val_labels.count(0)}, quoll={val_labels.count(1)}')

    train_loader = DataLoader(train_ds, batch_size=32, shuffle=True)
    val_loader = DataLoader(val_ds, batch_size=32, shuffle=False)

    # Model
    model = models.resnet34(weights=models.ResNet34_Weights.IMAGENET1K_V1)
    model.fc = nn.Linear(model.fc.in_features, 2)

    # Optimizer
    criterion = nn.CrossEntropyLoss()
    optimizer = torch.optim.AdamW(model.parameters(), lr=1e-3)
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=12)

    # Training
    best_acc = 0
    print("Starting training...")
    for epoch in range(12):
        model.train()
        total_loss = 0
        for imgs, labels in train_loader:
            optimizer.zero_grad()
            out = model(imgs)
            loss = criterion(out, labels)
            loss.backward()
            optimizer.step()
            total_loss += loss.item()
        scheduler.step()

        model.eval()
        correct, total = 0, 0
        with torch.no_grad():
            for imgs, labels in val_loader:
                out = model(imgs)
                pred = out.argmax(dim=1)
                correct += (pred == labels).sum().item()
                total += labels.size(0)
        acc = correct / total
        if acc > best_acc:
            best_acc = acc
            torch.save(model.state_dict(), 'quoll_classifier_improved.pth')
        print(f'Epoch {epoch+1:2d}: loss={total_loss/len(train_loader):.4f}, acc={acc:.4f}, best={best_acc:.4f}')

    print(f'\n🎉 Best accuracy: {best_acc:.4f} ({best_acc*100:.1f}%)')

def export_improved():
    """Export improved model"""
    print("Exporting improved model...")
    model = models.resnet34(weights=None)
    model.fc = nn.Linear(model.fc.in_features, 2)
    model.load_state_dict(torch.load('quoll_classifier_improved.pth', map_location='cpu'))
    model.eval()

    # Trace and save
    example = torch.randn(1, 3, 224, 224)
    traced = torch.jit.trace(model, example)
    traced.save('quoll_classifier_improved.pt')
    print('✅ Saved: quoll_classifier_improved.pt')

def test_improved():
    """Test the improved model"""
    print("Testing improved model...")
    
    model = torch.jit.load('quoll_classifier_improved.pt', map_location='cpu')
    model.eval()

    preprocess = transforms.Compose([
        transforms.Resize(256), transforms.CenterCrop(224),
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
    ])

    classes = ["not_quoll", "quoll"]

    # Test on some human-like images
    print("\n--- Testing on human-like images ---")
    test_cases = ["diverse_000_00.jpg", "diverse_000_01.jpg", "diverse_000_02.jpg"]
    
    for filename in test_cases:
        try:
            path = os.path.join('dataset/not_quoll', filename)
            if os.path.exists(path):
                img = Image.open(path).convert('RGB')
                tensor = preprocess(img).unsqueeze(0)
                with torch.no_grad():
                    out = model(tensor)
                    probs = F.softmax(out, dim=1)
                    pred = classes[probs.argmax().item()]
                    confidence = probs.max().item()
                print(f'{filename}: {pred} ({confidence:.3f})')
        except:
            print(f'{filename}: Not found')

if __name__ == '__main__':
    train_improved()
    export_improved()
    test_improved()
    print('\n🚀 Improved training complete!')