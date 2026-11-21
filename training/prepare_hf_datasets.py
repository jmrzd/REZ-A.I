#!/usr/bin/env python3
"""Prepare the REZ curated metadata using the Apache-2.0 Hugging Face Datasets library.

This loads *source metadata*, RSS feed URLs and 360 *unanswered questions*.
No copyrighted web pages or invented answers are downloaded/generated.
The questions can be used to train a small intent classifier and for manual
evaluation, but NOT as supervised question->answer LLM fine-tuning data.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path
from urllib.parse import urlsplit

from datasets import Dataset, DatasetDict


def valid_public_link(url: str) -> bool:
    try:
        info = urlsplit(url)
        return info.scheme == "https" and bool(info.hostname) and not (info.username or info.password)
    except (TypeError, ValueError):
        return False


def prepare(catalog_path: Path, output_dir: Path) -> dict:
    package = json.loads(catalog_path.read_text(encoding="utf-8"))
    sources = package.get("fontes", [])
    feeds = package.get("feeds", [])
    prompts = package.get("perguntas_teste", [])
    if len(sources) != 440 or len(feeds) != 23 or len(prompts) != 360:
        raise ValueError("Unexpected catalog counts: expected 440 sources, 23 feeds, 360 prompts.")
    if not all(valid_public_link(s.get("url", "")) for s in sources):
        raise ValueError("At least one source has an unsafe or non-HTTPS URL.")
    if not all(valid_public_link(f.get("feed", "")) for f in feeds):
        raise ValueError("At least one RSS feed has an unsafe or non-HTTPS URL.")
    if len({s["url"] for s in sources}) != len(sources):
        raise ValueError("Duplicated source URL.")
    if any("resposta" in p or "answer" in p for p in prompts):
        raise ValueError("This question-only set must never be described as answer-labelled data.")

    rows = [
        {
            "categoria": s["categoria"], "nome": s["nome"], "url": s["url"],
            "idioma": s.get("idioma", "mul"),
            "conteudo_lido": False,
        }
        for s in sources
    ]
    questions = [
        {"categoria": q["categoria"], "pergunta": q["pergunta"].strip(), "rotulo_resposta": False}
        for q in prompts
    ]
    questions_ds = Dataset.from_list(questions).class_encode_column("categoria")
    first = questions_ds.train_test_split(
        test_size=0.2, seed=42, stratify_by_column="categoria"
    )
    second = first["train"].train_test_split(
        test_size=0.125, seed=42, stratify_by_column="categoria"
    )
    splits = DatasetDict({
        "train": second["train"],
        "validation": second["test"],
        "test": first["test"],
    })
    out = output_dir.resolve()
    out.mkdir(parents=True, exist_ok=True)
    splits.save_to_disk(str(out / "questions-hf"))
    Dataset.from_list(rows).to_json(
        str(out / "sources-metadata.jsonl"), orient="records", lines=True, force_ascii=False
    )
    Dataset.from_list([
        {"categoria": f["categoria"], "nome": f["nome"], "feed": f["feed"],
         "idioma": f.get("idioma", "mul"), "conteudo_lido": False}
        for f in feeds
    ]).to_json(str(out / "feeds-metadata.jsonl"), orient="records", lines=True, force_ascii=False)
    manifest = {
        "catalog": str(catalog_path),
        "library": "huggingface/datasets",
        "library_license": "Apache-2.0",
        "source_metadata_count": len(rows),
        "rss_metadata_count": len(feeds),
        "question_only_count": len(questions),
        "intent_split_sizes": {key: len(value) for key, value in splits.items()},
        "source_content_downloaded": False,
        "labelled_question_answer_pairs": 0,
        "language_model_fine_tuned": False,
        "note": "Metadata and question categories only. Curator must verify dataset licenses and accuracy before any fine-tuning.",
    }
    (out / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return manifest


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, default=Path("knowledge/data/rez-knowledge-full.json"))
    parser.add_argument("--output", type=Path, default=Path("training/build"))
    args = parser.parse_args()
    print(json.dumps(prepare(args.input, args.output), ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
