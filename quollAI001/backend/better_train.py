#!/usr/bin/env python3
"""
Retrain with more diverse "not_quoll" data including humans, vehicles, buildings, etc.
"""

import os
import torch
import torch.nn as nn
import torch.nn.functional as F
from torchvision import models, transforms, datasets
from torch.utils.data import DataLoader, random_split
from PIL import Image
import glob
import urllib.request
import io
import time

# Download functions
def download_and_verify(url, dest_path):
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        resp = urllib.request.urlopen(req, timeout=10)
        data = resp.read()
        if len(data) < 5000:
            return False
        img = Image.open(io.BytesIO(data)).convert('RGB')
        img.save(dest_path, 'JPEG', quality=90)
        return True
    except:
        return False

def search_and_download(query, dest_dir, prefix, max_results=30):
    from ddgs import DDGS
    count = len([f for f in os.listdir(dest_dir) if f.startswith(prefix)])
    with DDGS() as ddgs:
        try:
            results = list(ddgs.images(query, max_results=max_results))
        except:
            return 0
    downloaded = 0
    for r in results:
        url = r.get('image', '')
        if not url:
            continue
        dest = os.path.join(dest_dir, f'{prefix}_{count + downloaded:04d}.jpg')
        if download_and_verify(url, dest):
            downloaded += 1
        time.sleep(0.3)
    return downloaded

def create_better_dataset():
    """Create more diverse dataset with better separation between classes"""
    os.makedirs('dataset/quoll', exist_ok=True)
    os.makedirs('dataset/not_quoll', exist_ok=True)
    
    # Quoll queries (keep as is)
    print('Downloading quoll images...')
    quoll_queries = [
        'eastern quoll',
        'spotted quoll dasyurus maculatus', 
        'tiger quoll australia'
    ]
    for q in quoll_queries:
        n = search_and_download(q, 'dataset/quoll', 'q', max_results=40)
        print(f'  {q}: {n} images')
        time.sleep(2)
    
    # Expanded not_quoll queries with more diversity
    print('Downloading diverse not_quoll images...')
    not_quoll_queries = [
        # Human-related (important!)
        'human face',
        'person walking', 
        'human body',
        'people crowd',
        
        # Vehicles
        'car vehicle',
        'truck transportation', 
        'bicycle bike',
        'motorcycle',
        
        # Buildings/Objects
        'building architecture',
        'house home',
        'tree nature',
        'flower plant',
        
        # Other animals (but different from quolls)
        'domestic cat',
        'dog pet',
        'bird flying',
        'wild rabbit',
        'deer animal',
        'elephant zoo'
    ]
    
    for q in not_quoll_queries:
        n = search_and_download(q, 'dataset/not_quoll', 'nq', max_results=25)
        print(f'  {q}: {n} images')
        time.sleep(2)
    
    # Count images
    q_count = len(os.listdir('dataset/quoll'))
    nq_count = len(os.listdir('dataset/not_quoll'))
    print(f'\nNew dataset: {q_count} quoll, {nq_count} not_quoll')
    
    # Balance classes
    if q_count < nq_count:
        print(f'⚠️  Keeping only {q_count} not_quoll images to balance classes...')
        not_quoll_files = sorted(os.listdir('dataset/not_quoll'))
        for f in not_quoll_files[q_count:]:
            os.remove(os.path.join('dataset/not_quoll', f))
        nq_count = q_count
        print(f'Balanced: {q_count} quoll, {nq_count} not_quoll')

def train_improved():
    """Train with improved data"""
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
    
    # Check class distribution in training
    train_labels = [label for _, label in train_ds]
    val_labels = [label for _, label in val_ds]
    print(f'Train distribution: quoll={train_labels.count(1)}, not_quoll={train_labels.count(0)}')
    print(f'Val distribution: quoll={val_labels.count(1)}, not_quoll={val_labels.count(0)}')

    train_loader = DataLoader(train_ds, batch_size=32, shuffle=True)
    val_loader = DataLoader(val_ds, batch_size=32, shuffle=False)

    # Model
    model = models.resnet34(weights=models.ResNet34_Weights.IMAGENET1K_V1)
    model.fc = nn.Linear(model.fc.in_features, 2)

    # Training with better settings
    criterion = nn.CrossEntropyLoss(weight=torch.tensor([1.0, 1.0]))  # Balanced
    optimizer = torch.optim.AdamW(model.parameters(), lr=1e-3)
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=15)

    # Training loop
    best_acc = 0
    for epoch in range(15):
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

    print(f'\nBest accuracy: {best_acc:.4f} ({best_acc*100:.1f}%)')

def export_improved():
    """Export improved model"""
    model = models.resnet34(weights=None)
    model.fc = nn.Linear(model.fc.in_features, 2)
    model.load_state_dict(torch.load('quoll_classifier_improved.pth', map_location='cpu'))
    model.eval()

    # Trace and save
    example = torch.randn(1, 3, 224, 224)
    traced = torch.jit.trace(model, example)
    traced.save('quoll_classifier_improved.pt')
    print('Saved quoll_classifier_improved.pt')

if __name__ == '__main__':
    print("Creating improved dataset...")
    create_better_dataset()
    
    print("\nTraining improved model...")
    train_improved()
    
    print("\nExporting improved model...")
    export_improved()
    
    print("\nDone! Improved model ready.")