"""
Retrain the quoll classifier with real quoll + non-quoll images.
Uses fastai's vision learner with a ResNet-34 backbone pre-trained on ImageNet.
"""

import os
import random
import shutil
from pathlib import Path

import plum._resolver as _pr
class _PickleCompatResolver:
    def __init__(self): pass
    def __repr__(self): return 'Resolver()'
_pr.Resolver = _PickleCompatResolver

from fastai.vision.all import *
from duckduckgo_search import DDGS

DATASET_DIR = Path("dataset")
MODEL_PATH = "quoll_classifier.pkl"


def search_images(query, max_results=150):
    """Search for images using DuckDuckGo."""
    with DDGS() as ddgs:
        results = ddgs.images(query, max_results=max_results)
        return [r["image"] for r in results if "image" in r]


def create_dataset(num_per_class=150):
    """Build a training dataset by downloading images."""
    DATASET_DIR.mkdir(exist_ok=True)
    (DATASET_DIR / "quoll").mkdir(exist_ok=True)
    (DATASET_DIR / "not_quoll").mkdir(exist_ok=True)

    searches = {
        "quoll": [
            "eastern quoll photo",
            "spotted-tailed quoll photo",
            "tiger quoll dasyurus",
            "quoll wild australia",
        ],
        "not_quoll": [
            "domestic cat photo",
            "dog photo",
            "fox wild animal",
            "possum australia animal",
        ],
    }

    for label, queries in searches.items():
        urls = []
        for q in queries:
            print(f"  🔍 {q}...")
            try:
                found = search_images(q, max_results=num_per_class // len(queries) + 20)
                urls.extend(found)
            except Exception as e:
                print(f"    ⚠️  Search failed: {e}")

        urls = list(set(urls))[:num_per_class]
        print(f"  📥 Downloading {len(urls)} {label} images...")
        download_images(DATASET_DIR / label, urls=urls)
        # Resize to save space
        resize_images(DATASET_DIR / label, max_size=400)

    # Remove corrupt images
    failed = verify_images(get_image_files(DATASET_DIR))
    print(f"  🧹 Removed {len(failed)} corrupt images")

    for label in ["quoll", "not_quoll"]:
        count = len(list((DATASET_DIR / label).iterdir()))
        print(f"  📊 {label}: {count} images")


def train_model(epochs=6):
    """Train the quoll classifier."""
    print(f"\n🏋️ Training for {epochs} epochs...")

    dls = ImageDataLoaders.from_folder(
        DATASET_DIR,
        valid_pct=0.2,
        seed=42,
        item_tfms=Resize(224, method="crop"),
        batch_tfms=[
            IntToFloatTensor(div=255.0),
            *aug_transforms(
                max_rotate=20,
                max_zoom=1.1,
                max_lighting=0.4,
                max_warp=0.2,
                p_affine=0.75,
                p_lighting=0.75,
            ),
        ],
        bs=32,
    )

    print(f"Classes: {dls.vocab}")
    print(f"Training: {len(dls.train_ds)}, Validation: {len(dls.valid_ds)}")

    learn = vision_learner(dls, resnet34, metrics=accuracy)
    learn.fine_tune(epochs, base_lr=1e-3)

    acc = learn.validate()[1]
    print(f"\n📈 Validation accuracy: {acc:.4f} ({acc * 100:.1f}%)")

    # Export
    print(f"\n💾 Saving model to {MODEL_PATH}...")
    learn.export(MODEL_PATH)
    print("✅ Done!")
    return learn


if __name__ == "__main__":
    if DATASET_DIR.exists():
        existing = len(list(DATASET_DIR.rglob("*.*")))
        if existing > 10:
            print(f"📁 Dataset already exists ({existing} images). Reusing.")
        else:
            shutil.rmtree(DATASET_DIR)
            create_dataset()
    else:
        create_dataset()

    train_model(epochs=6)
