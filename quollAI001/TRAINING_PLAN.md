# Quoll Classifier — Training Plan (Repeatable)

This document describes the exact process used to train the quoll classifier model.
It is written to be repeatable by both a human and an LLM.

---

## Architecture Overview

```
quollAI001/
├── backend/
│   ├── app.py                        # Flask API server (loads traced model)
│   ├── train.py                      # Training script (reproduces the model)
│   ├── quoll_classifier_traced.pt     # Deployed JIT-traced model (~87MB)
│   ├── quoll_classifier.pth          # Raw state_dict checkpoint
│   └── dataset/
│       ├── quoll/                    # ~101 quoll images
│       └── not_quoll/                # ~99 not-quoll images (cats, dogs, foxes)
└── frontend/
    └── src/app/page.tsx              # Next.js upload UI → calls /classify
```

---

## Phase 1: Environment Setup

### 1.1 Python environment

The model must be trained with Python 3.10–3.13. Python 3.14 has no compatible PyTorch wheels.

```bash
# Create a virtual environment
cd backend
python3.10 -m venv venv          # or python3.13
source venv/bin/activate

# Install dependencies
pip install torch torchvision
pip install pillow
pip install ddgs                   # DuckDuckGo image search client
```

**Required packages:**
| Package | Purpose |
|---------|---------|
| `torch` | Model training and inference |
| `torchvision` | ResNet-34 architecture, image transforms |
| `Pillow` | Image loading and saving |
| `ddgs` | DuckDuckGo image search API client |

### 1.2 Key decisions

- **Architecture**: ResNet-34 with ImageNet pre-trained weights, final layer replaced with `nn.Linear(512, 2)` for 2-class classification.
- **Why ResNet-34**: Small (~21M params), fast to train, strong transfer learning from ImageNet.
- **Why NOT fastai**: The original model used fastai's `vision_learner` which creates custom layers (`AdaptiveConcatPool2d`, custom `BatchNorm1d` head) that are difficult to export for standalone inference. Standard torchvision ResNet avoids this entirely.
- **Why JIT tracing**: `torch.jit.trace` produces a single `.pt` file with no pickle dependency issues, no fastai/plum library version conflicts, and loads instantly with `torch.jit.load()`.

---

## Phase 2: Data Collection

### 2.1 Search strategy

Download images using DuckDuckGo image search. Use specific queries for each class:

**Quoll class** (target: ~100 images):
| Query | Purpose |
|-------|---------|
| `eastern quoll` | Eastern quoll species |
| `spotted quoll dasyurus maculatus` | Spotted-tailed quoll |
| `tiger quoll australia` | Tiger quoll / large quoll |

**Not-quoll class** (target: ~100 images total):
| Query | Purpose |
|-------|---------|
| `domestic cat cute` | Cats (similar size/shape to quolls) |
| `brown dog photo` | Dogs (common confusion class) |
| `red fox wild animal` | Foxes (similar spotted coat patterns) |

### 2.2 Download procedure

```python
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
```

### 2.3 Download execution

```python
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
```

### 2.4 Final dataset

| Class | Count | Source |
|-------|-------|--------|
| `quoll` | 101 | DuckDuckGo image search (3 queries) |
| `not_quoll` | 99 | DuckDuckGo image search (3 queries) |
| **Total** | **200** | |

**Directory structure:**
```
dataset/
├── quoll/
│   ├── q_0001.jpg
│   ├── q_0002.jpg
│   └── ... (101 files)
└── not_quoll/
    ├── nq_0001.jpg
    ├── nq_0002.jpg
    └── ... (99 files)
```

---

## Phase 3: Training

### 3.1 Preprocessing

**Training transforms** (applied to training set, with data augmentation):
```
RandomResizedCrop(224)       # Random crop to 224×224 with random scale
RandomHorizontalFlip()        # 50% chance horizontal flip
ColorJitter(brightness=0.4, contrast=0.4)  # Random brightness/contrast
ToTensor()                    # Convert to [0, 1] float tensor
Normalize(mean, std)          # ImageNet normalization
```

**Validation transforms** (deterministic):
```
Resize(256)                   # Resize shortest side to 256
CenterCrop(224)               # Crop center 224×224
ToTensor()
Normalize(mean, std)
```

**ImageNet normalization values** (mandatory — the model was pre-trained with these):
- Mean: `[0.485, 0.456, 0.406]`
- Std: `[0.229, 0.224, 0.225]`

### 3.2 Model architecture

```
Input (3, 224, 224)
    ↓
ResNet-34 backbone (pre-trained on ImageNet)
    ├── conv1 → bn1 → relu → maxpool
    ├── layer1: 3 × BasicBlock (64 channels)
    ├── layer2: 4 × BasicBlock (128 channels)
    ├── layer3: 6 × BasicBlock (256 channels)
    ├── layer4: 3 × BasicBlock (512 channels)
    └── avgpool → flatten
    ↓
fc: Linear(512 → 2)          ← REPLACED from original 1000-class head
    ↓
Output (2,) → softmax → [P(not_quoll), P(quoll)]
```

**Key detail**: Only the final `fc` layer is replaced. All other layers retain ImageNet pre-trained weights and are fine-tuned.

### 3.3 Training configuration

| Parameter | Value |
|-----------|-------|
| Optimizer | AdamW |
| Learning rate | 1e-3 |
| LR scheduler | CosineAnnealingLR (T_max=10) |
| Loss function | CrossEntropyLoss |
| Batch size | 32 |
| Epochs | 15 |
| Train/validation split | 80%/20% (seed=42) |
| Device | CPU (can use CUDA/MPS if available) |
| Random seed | 42 (for train/val split reproducibility) |

### 3.4 Training code

```python
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
```

### 3.5 Expected training progression

| Epoch | Train Loss | Val Accuracy | Notes |
|-------|-----------|-------------|-------|
| 1 | ~0.30 | ~0.48 | Pre-trained features already useful |
| 2 | ~0.07 | ~0.65 | Rapid improvement |
| 3 | ~0.08 | **1.00** | Converges quickly (small dataset) |
| 4–10 | 0.06→0.003 | 0.88→1.00 | Overfitting risk but val stays high |
| 11–15 | 0.004→0.001 | **1.00** | Fully converged |

**Expected final accuracy**: 95–100% on validation set.

---

## Phase 4: Export for Deployment

### 4.1 Why JIT tracing (not pickle)

The original model used `fastai.vision.all.load_learner()` which saves as a pickle file containing fastai internals (`plum._resolver.Resolver`, `fasttransform.Pipeline`, custom layers). This caused:
- `AttributeError: 'Resolver' object has no attribute '__dict__'` — version mismatch between `plum` library versions
- `TypeError: code expected at most 16 arguments, got 18` — Python version mismatch in pickle bytecode
- Broken inference when extracting the model manually (preprocessing mismatch)

**JIT tracing** eliminates all of these by producing a self-contained `.pt` file.

### 4.2 Export procedure

```python
# Load the best checkpoint
model.load_state_dict(torch.load('quoll_classifier.pth', map_location='cpu'))
model.eval()

# Trace with a dummy input
example_input = torch.randn(1, 3, 224, 224)
traced_model = torch.jit.trace(model, example_input)

# Save
traced_model.save('quoll_classifier_traced.pt')
```

### 4.3 Verify the traced model

```python
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
```

---

## Phase 5: Backend Integration

### 5.1 Flask API server

The backend loads the traced model and exposes two endpoints:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/classify` | POST | Upload image (`multipart/form-data`, field name `image`) → returns `prediction`, `confidence`, `probabilities` |
| `/health` | GET | Returns `status`, `classes` |

**Critical detail**: The preprocessing in the backend must exactly match the validation preprocessing used during training (Resize 256 → CenterCrop 224 → ToTensor → ImageNet Normalize).

### 5.2 Inference preprocessing (must match training)

```python
preprocess = transforms.Compose([
    transforms.Resize(256),          # Resize shortest side to 256px
    transforms.CenterCrop(224),       # Crop center 224×224
    transforms.ToTensor(),            # [0, 255] uint8 → [0, 1] float32
    transforms.Normalize(             # ImageNet normalization
        mean=[0.485, 0.456, 0.406],
        std=[0.229, 0.224, 0.225]
    ),
])
```

### 5.3 Response format

```json
{
    "prediction": "quoll",
    "confidence": 0.9998,
    "probabilities": {
        "not_quoll": 0.0002,
        "quoll": 0.9998
    },
    "filename": "test_image.jpg"
}
```

---

## Phase 6: Testing & Validation

### 6.1 Manual testing

```bash
# Test with a quoll image
curl -F "image=@dataset/quoll/q_0001.jpg" http://localhost:5001/classify

# Test with a not-quoll image
curl -F "image=@dataset/not_quoll/nq_0001.jpg" http://localhost:5001/classify

# Health check
curl http://localhost:5001/health
```

### 6.2 Expected results

| Input | Expected Prediction | Confidence |
|-------|-------------------|------------|
| Quoll photo | `quoll` | > 95% |
| Cat photo | `not_quoll` | > 95% |
| Dog photo | `not_quoll` | > 95% |
| Fox photo | `not_quoll` | > 90% |
| Random object | `not_quoll` | > 90% |

### 6.3 Edge cases to test

- Very small images (< 100px)
- Very large images (> 4000px)
- Non-RGB images (PNG with alpha, grayscale)
- Screenshots / illustrations (not photos)
- Similar-looking animals (mongooses, ferrets, weasels)

---

## Troubleshooting

### Problem: Everything classified as "not_quoll"

**Cause**: Preprocessing mismatch between training and inference. The model was trained with ImageNet normalization (`mean=[0.485, 0.456, 0.406]`) but inference used raw pixel values or different normalization.

**Fix**: Ensure the exact same `transforms.Compose` pipeline is used in both training validation and backend inference.

### Problem: `torch.jit.trace` produces wrong outputs

**Cause**: The model contains dynamic control flow (if/else in `forward()`). Standard ResNet-34 does NOT have this, so tracing works. If you add dynamic layers, use `torch.jit.script` instead.

### Problem: DuckDuckGo rate limiting

**Cause**: Too many requests too quickly.

**Fix**: Add `time.sleep(2)` between searches and `time.sleep(0.3)` between downloads. Use the `ddgs` package (v9+) not the older `duckduckgo_search`.

### Problem: Model accuracy is poor

**Cause**: Not enough training data or poor quality images.

**Fix**: Aim for 200+ images per class. Use diverse queries. Verify each downloaded image is actually valid (>5KB, opens with PIL). Remove duplicates and mislabeled images.

---

## Complete File Reference

### `train.py` — One-file training script

```python
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
```

---

## Quick Reference: One-Command Summary

```bash
cd backend
source venv/bin/activate
python train.py
# → Downloads ~200 images from DuckDuckGo
# → Trains ResNet-34 for 15 epochs (CPU)
# → Saves quoll_classifier_traced.pt
# → Verifies on sample images

# Then start the server:
python app.py
# → Loads quoll_classifier_traced.pt
# → Serves /classify and /health on port 5001

# And the frontend:
cd ../frontend && npm run dev
# → Upload images at http://localhost:3001
```

---

## How to Improve the Model

| Improvement | How |
|-------------|-----|
| More data | Add more search queries, use Google Images API, scrape iNaturalist |
| Better accuracy | Train for 20+ epochs, use larger batch size, add more augmentation (rotation, warp) |
| More classes | Change `model.fc = nn.Linear(512, N)` where N = number of species |
| Handle edge cases | Add validation-only images from different angles/lighting |
| Deploy to production | Use ONNX export instead of JIT trace, serve with TorchServe or FastAPI |
