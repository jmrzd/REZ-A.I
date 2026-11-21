#!/usr/bin/env python3
"""Train a *small question category classifier* on curated prompts (NOT the LLM).

The Hugging Face Datasets package loads source metadata and intent-labelled
questions. scikit-learn trains a lightweight classifier with no GPU, API key,
downloaded model weights or calls to commercial services.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

import joblib
from datasets import load_from_disk
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, classification_report
from sklearn.pipeline import make_pipeline


def train(input_dir: Path, output_dir: Path) -> dict:
    splits = load_from_disk(str(input_dir / "questions-hf"))
    train_rows = splits["train"]
    test_rows = splits["test"]
    model = make_pipeline(
        TfidfVectorizer(analyzer="char", ngram_range=(2, 4), max_features=5000, strip_accents="unicode"),
        LogisticRegression(max_iter=500, class_weight="balanced"),
    )
    model.fit(train_rows["pergunta"], train_rows["categoria"])
    predictions = model.predict(test_rows["pergunta"])
    accuracy = float(accuracy_score(test_rows["categoria"], predictions))
    output_dir.mkdir(parents=True, exist_ok=True)
    joblib.dump(model, output_dir / "rez-intent-router.joblib")
    result = {
        "task": "intent classification, not language-model training",
        "examples_train": len(train_rows),
        "examples_test": len(test_rows),
        "accuracy_heldout": accuracy,
        "labels": len(set(train_rows["categoria"])),
        "report": classification_report(
            test_rows["categoria"], predictions, output_dict=True, zero_division=0,
        ),
        "loaded_into_production_chat": False,
        "warning": "Only 360 human-curated questions. Small holdout accuracy is not a production guarantee.",
    }
    (output_dir / "router-evaluation.json").write_text(
        json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    return {k: v for k, v in result.items() if k != "report"}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, default=Path("training/build"))
    parser.add_argument("--output", type=Path, default=Path("training/build/models"))
    args = parser.parse_args()
    print(json.dumps(train(args.input, args.output), ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
