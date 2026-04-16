#!/usr/bin/env python3
"""
Analyze the training data to understand potential issues
"""

import os
from pathlib import Path

def analyze_dataset():
    dataset_dir = Path("dataset")
    
    print("=== Dataset Analysis ===")
    
    for class_name in ["quoll", "not_quoll"]:
        class_dir = dataset_dir / class_name
        image_files = list(class_dir.glob("*.jpg")) + list(class_dir.glob("*.png")) + list(class_dir.glob("*.jpeg"))
        
        print(f"\n{class_name.upper()} class:")
        print(f"  Total images: {len(image_files)}")
        
        # Sample some filenames to understand the data
        print("  Sample filenames:")
        for i, f in enumerate(image_files[:10]):
            print(f"    {f.name}")
        
        if len(image_files) > 10:
            print(f"    ... and {len(image_files) - 10} more")
    
    # Check for potential issues
    print("\n=== Potential Issues Analysis ===")
    
    # Check data balance
    quoll_count = len(list((dataset_dir / "quoll").glob("*.*")))
    not_quoll_count = len(list((dataset_dir / "not_quoll").glob("*.*")))
    
    print(f"Class balance: {quoll_count} quoll vs {not_quoll_count} not_quoll")
    
    if abs(quoll_count - not_quoll_count) > 200:
        print("⚠️  Imbalanced dataset - this could affect performance")
    
    # Check if "not_quoll" might contain confusing images
    print("\nChecking 'not_quoll' directory for potentially confusing filenames...")
    not_quoll_files = list((dataset_dir / "not_quoll").glob("*.*"))
    confusing_patterns = []
    
    for f in not_quoll_files[:50]:  # Check first 50
        name = f.name.lower()
        # Look for potentially confusing patterns
        if any(word in name for word in ['quoll', 'marsupial', 'wild', 'animal']):
            confusing_patterns.append(f.name)
    
    if confusing_patterns:
        print(f"⚠️  Found potentially confusing filenames in 'not_quoll':")
        for name in confusing_patterns[:10]:
            print(f"    {name}")
    else:
        print("✅ No obviously confusing filenames found")

if __name__ == "__main__":
    analyze_dataset()