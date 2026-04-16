#!/usr/bin/env python3
"""
Quick fix: Add more human and diverse images to improve model accuracy
"""

import os
import urllib.request
import io
import time
from PIL import Image

def download_and_verify(url, dest_path):
    """Download image, verify it's valid, save as JPEG"""
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

def add_diverse_images():
    """Add diverse images to improve model accuracy"""
    os.makedirs('dataset/quoll', exist_ok=True)
    os.makedirs('dataset/not_quoll', exist_ok=True)
    
    # Add diverse "not_quoll" images to fix human classification
    print('Adding diverse "not_quoll" images...')
    
    # Human-related queries (critical for fixing the issue)
    human_queries = [
        'human face portrait',
        'person walking on street',
        'crowd of people',
        'human body full',
        'family group photo'
    ]
    
    # Vehicle and building queries
    object_queries = [
        'car vehicle',
        'house building',
        'tree nature',
        'flower garden',
        'office interior'
    ]
    
    # Animal queries (but not confusing ones)
    animal_queries = [
        'domestic cat pet',
        'dog animal',
        'bird flying',
        'fish swimming',
        'rabbit animal'
    ]
    
    all_queries = human_queries + object_queries + animal_queries
    
    for i, query in enumerate(all_queries):
        print(f'  Downloading: {query}...')
        try:
            # Simple download (simplified approach)
            from ddgs import DDGS
            with DDGS() as ddgs:
                results = list(ddgs.images(query, max_results=10))
                
            for j, r in enumerate(results[:3]):  # Get 3 images per query
                url = r.get('image', '')
                if url:
                    filename = f"diverse_{i:03d}_{j:02d}.jpg"
                    dest = os.path.join('dataset/not_quoll', filename)
                    if download_and_verify(url, dest):
                        print(f'    ✓ Downloaded {filename}')
        except:
            print(f'    ⚠️  Failed to download {query}')
        time.sleep(1)  # Rate limiting
    
    # Count results
    original_count = len([f for f in os.listdir('dataset/not_quoll') if f.startswith('nq_')])
    new_count = len([f for f in os.listdir('dataset/not_quoll') if f.startswith('diverse_')])
    
    print(f'\nAdded {new_count} diverse images to not_quoll class')
    print(f'Total not_quoll images: {original_count + new_count}')
    print(f'Total quoll images: {len([f for f in os.listdir("dataset/quoll")])}')

if __name__ == '__main__':
    add_diverse_images()
    print('\n✅ Data enhancement complete!')
    print('Run: python retrain_quick.py to retrain with improved data')