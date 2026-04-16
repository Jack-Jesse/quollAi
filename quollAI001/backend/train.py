import os, urllib.request, io, time
from PIL import Image
from ddgs import DDGS

os.makedirs('dataset/quoll', exist_ok=True)
os.makedirs('dataset/not_quoll', exist_ok=True)

def download_and_verify(url, dest_path):
    """Download image, verify it's a valid image >5KB, save as JPEG."""
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

def search_and_download(query, dest_dir, prefix, max_results=50):
    """Search DuckDuckGo for images, download and save valid ones."""
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
        time.sleep(0.3)  # Rate limiting
    return downloaded
# Quoll images (~33 per query × 3 queries = ~100 total)
for query in ['eastern quoll', 'spotted quoll dasyurus maculatus', 'tiger quoll australia']:
    n = search_and_download(query, 'dataset/quoll', 'q', max_results=50)
    print(f'  {query}: {n} images')
    time.sleep(2)  # Delay between searches

# Not-quoll images (~33 per query × 3 queries = ~100 total)
for query in ['domestic cat cute', 'brown dog photo', 'red fox wild animal']:
    n = search_and_download(query, 'dataset/not_quoll', 'nq', max_results=50)
    print(f'  {query}: {n} images')
    time.sleep(2)
import torch
import torch.nn as nn
import torch.nn.functional as F
from torchvision import models, transforms, datasets
from torch.utils.data import DataLoader, random_split
from PIL import Image
import glob, os

# --- Model ---
model = models.resnet34(weights=models.ResNet34_Weights.IMAGENET1K_V1)
model.fc = nn.Linear(model.fc.in_features, 2)
model = model.to('cpu')

# --- Data transforms ---
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

# --- Data loaders ---
dataset = datasets.ImageFolder('dataset', transform=preprocess_train)
train_size = int(0.8 * len(dataset))
val_size = len(dataset) - train_size
train_ds, val_ds = random_split(dataset, [train_size, val_size],
                                 generator=torch.Generator().manual_seed(42))
val_ds.dataset.transform = preprocess_val  # Override for validation

train_loader = DataLoader(train_ds, batch_size=32, shuffle=True)
val_loader = DataLoader(val_ds, batch_size=32, shuffle=False)

# --- Training loop ---
criterion = nn.CrossEntropyLoss()
optimizer = torch.optim.AdamW(model.parameters(), lr=1e-3)
scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=10)

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

    # Validate
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
        torch.save(model.state_dict(), 'quoll_classifier.pth')
    print(f'Epoch {epoch+1:2d}: loss={total_loss/len(train_loader):.4f}, '
          f'acc={acc:.4f}, best={best_acc:.4f}')
# Load the best checkpoint
model.load_state_dict(torch.load('quoll_classifier.pth', map_location='cpu'))
model.eval()

# Trace with a dummy input
example_input = torch.randn(1, 3, 224, 224)
traced_model = torch.jit.trace(model, example_input)

# Save
traced_model.save('quoll_classifier_traced.pt')
import torch
import torch.nn.functional as F
from torchvision import transforms
from PIL import Image

model = torch.jit.load('quoll_classifier_traced.pt', map_location='cpu')
model.eval()

preprocess = transforms.Compose([
    transforms.Resize(256),
    transforms.CenterCrop(224),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
])

img = Image.open('dataset/quoll/q_0001.jpg').convert('RGB')
tensor = preprocess(img).unsqueeze(0)

with torch.no_grad():
    output = model(tensor)
    probs = F.softmax(output, dim=1)

classes = ['not_quoll', 'quoll']
pred = classes[probs[0].argmax().item()]
confidence = probs[0].max().item()
print(f'{pred} ({confidence:.1%})')  # Expected: quoll (100%)
preprocess = transforms.Compose([
    transforms.Resize(256),          # Resize shortest side to 256px
    transforms.CenterCrop(224),       # Crop center 224×224
    transforms.ToTensor(),            # [0, 255] uint8 → [0, 1] float32
    transforms.Normalize(             # ImageNet normalization
        mean=[0.485, 0.456, 0.406],
        std=[0.229, 0.224, 0.225]
    ),
])
"""
Train a quoll classifier: ResNet-34, 2-class (quoll / not_quoll).
Produces: quoll_classifier.pth (state_dict) and quoll_classifier_traced.pt (deployable model).
"""

import torch
import torch.nn as nn
import torch.nn.functional as F
from torchvision import models, transforms, datasets
from torch.utils.data import DataLoader, random_split
from PIL import Image
import glob, os, urllib.request, io, time

# ============================================================
# STEP 1: Download training images from DuckDuckGo
# ============================================================

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

def search_and_download(query, dest_dir, prefix, max_results=50):
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

def download_all_images():
    os.makedirs('dataset/quoll', exist_ok=True)
    os.makedirs('dataset/not_quoll', exist_ok=True)

    print('Downloading quoll images...')
    for q in ['eastern quoll', 'spotted quoll dasyurus maculatus', 'tiger quoll australia']:
        n = search_and_download(q, 'dataset/quoll', 'q', max_results=50)
        print(f'  {q}: {n} images')
        time.sleep(2)

    print('Downloading not_quoll images...')
    for q in ['domestic cat cute', 'brown dog photo', 'red fox wild animal']:
        n = search_and_download(q, 'dataset/not_quoll', 'nq', max_results=50)
        print(f'  {q}: {n} images')
        time.sleep(2)

    q_count = len(os.listdir('dataset/quoll'))
    nq_count = len(os.listdir('dataset/not_quoll'))
    print(f'\nDataset: {q_count} quoll, {nq_count} not_quoll')

# ============================================================
# STEP 2: Train the model
# ============================================================

def train():
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

    print(f'Classes: {dataset.classes}, Train: {train_size}, Val: {val_size}')
    train_loader = DataLoader(train_ds, batch_size=32, shuffle=True)
    val_loader = DataLoader(val_ds, batch_size=32, shuffle=False)

    # Model: ResNet-34 with 2-class head
    model = models.resnet34(weights=models.ResNet34_Weights.IMAGENET1K_V1)
    model.fc = nn.Linear(model.fc.in_features, 2)

    # Optimizer
    criterion = nn.CrossEntropyLoss()
    optimizer = torch.optim.AdamW(model.parameters(), lr=1e-3)
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=10)

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
            torch.save(model.state_dict(), 'quoll_classifier.pth')
        print(f'Epoch {epoch+1:2d}: loss={total_loss/len(train_loader):.4f}, '
              f'acc={acc:.4f}, best={best_acc:.4f}')

    print(f'\nBest accuracy: {best_acc:.4f} ({best_acc*100:.1f}%)')

# ============================================================
# STEP 3: Export for deployment
# ============================================================

def export():
    model = models.resnet34(weights=None)
    model.fc = nn.Linear(model.fc.in_features, 2)
    model.load_state_dict(torch.load('quoll_classifier.pth', map_location='cpu'))
    model.eval()

    # Trace and save
    example = torch.randn(1, 3, 224, 224)
    traced = torch.jit.trace(model, example)
    traced.save('quoll_classifier_traced.pt')
    print('Saved quoll_classifier_traced.pt')

# ============================================================
# STEP 4: Verify
# ============================================================

def verify():
    model = torch.jit.load('quoll_classifier_traced.pt', map_location='cpu')
    model.eval()

    preprocess = transforms.Compose([
        transforms.Resize(256), transforms.CenterCrop(224),
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
    ])
    classes = ['not_quoll', 'quoll']

    print('\n--- Quoll images ---')
    for p in sorted(glob.glob('dataset/quoll/*.jpg'))[:5]:
        img = Image.open(p).convert('RGB')
        t = preprocess(img).unsqueeze(0)
        with torch.no_grad():
            out = model(t)
            prob = F.softmax(out, dim=1)
        cls = classes[prob[0].argmax().item()]
        print(f'  {os.path.basename(p):20s} -> {cls} ({prob[0].max():.3f})')

    print('\n--- Not_quoll images ---')
    for p in sorted(glob.glob('dataset/not_quoll/*.jpg'))[:5]:
        img = Image.open(p).convert('RGB')
        t = preprocess(img).unsqueeze(0)
        with torch.no_grad():
            out = model(t)
            prob = F.softmax(out, dim=1)
        cls = classes[prob[0].argmax().item()]
        print(f'  {os.path.basename(p):20s} -> {cls} ({prob[0].max():.3f})')

# ============================================================
# MAIN
# ============================================================

if __name__ == '__main__':
    if not os.path.exists('dataset/quoll') or len(os.listdir('dataset/quoll')) < 10:
        download_all_images()
    else:
        print(f'Dataset already exists: {len(os.listdir("dataset/quoll"))} quoll, '
              f'{len(os.listdir("dataset/not_quoll"))} not_quoll')

    train()
    export()
    verify()
    print('\nDone! ✅')
