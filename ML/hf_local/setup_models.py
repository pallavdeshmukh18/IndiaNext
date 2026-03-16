"""
setup_models.py

One-command setup for synchronized local model weights across the team.

Default behavior:
1) Download every model listed in models.lock.json
2) Copy each model snapshot into ML/hf_local/models/<repo_id>
3) Pin lock revisions to exact commit hashes (for reproducibility)
4) Update backend/.env model paths for local offline inference

Offline behavior:
    python setup_models.py --offline
This performs local-files-only resolution and never reaches the network.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import shutil
import sys
from pathlib import Path


SHA_RE = re.compile(r"^[a-f0-9]{40}$")


def _is_sha(value: str) -> bool:
    return bool(value and SHA_RE.fullmatch(value))


def _safe_dir_name(repo_id: str) -> str:
    return repo_id.replace("/", "__")


def _sync_dir(src: Path, dst: Path) -> None:
    if dst.exists():
        shutil.rmtree(dst)
    shutil.copytree(src, dst)


def _load_lock(lock_path: Path) -> dict:
    if not lock_path.exists():
        raise FileNotFoundError(f"Lock file not found: {lock_path}")
    with lock_path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def _write_lock(lock_path: Path, lock_data: dict) -> None:
    with lock_path.open("w", encoding="utf-8") as handle:
        json.dump(lock_data, handle, indent=2)
        handle.write("\n")


def _upsert_env_file(env_path: Path, updates: dict) -> None:
    lines = []
    if env_path.exists():
        lines = env_path.read_text(encoding="utf-8").splitlines()

    consumed = set()
    output = []

    for line in lines:
        stripped = line.strip()
        if not stripped or stripped.startswith("#") or "=" not in line:
            output.append(line)
            continue

        key = line.split("=", 1)[0].strip()
        if key in updates:
            output.append(f"{key}={updates[key]}")
            consumed.add(key)
        else:
            output.append(line)

    for key, value in updates.items():
        if key not in consumed:
            output.append(f"{key}={value}")

    env_path.write_text("\n".join(output) + "\n", encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser(description="Download and pin local HF model snapshots.")
    parser.add_argument(
        "--lock-file",
        default=str(Path(__file__).resolve().parent / "models.lock.json"),
        help="Path to models.lock.json"
    )
    parser.add_argument(
        "--models-dir",
        default=str(Path(__file__).resolve().parent / "models"),
        help="Directory where offline model folders are stored"
    )
    parser.add_argument(
        "--cache-dir",
        default=str(Path(__file__).resolve().parent / "hf_cache"),
        help="Hugging Face cache directory used for snapshots"
    )
    parser.add_argument(
        "--offline",
        action="store_true",
        help="Never use network (local-files-only mode)."
    )
    parser.add_argument(
        "--no-pin-lock",
        action="store_true",
        help="Do not rewrite revisions in lock file to resolved commit hashes."
    )
    parser.add_argument(
        "--no-update-env",
        action="store_true",
        help="Do not update backend/.env with local model paths."
    )

    args = parser.parse_args()

    try:
        from huggingface_hub import snapshot_download
    except Exception as exc:
        print(
            "Missing dependency: huggingface_hub. Install requirements first:\n"
            "  pip install -r ML/hf_local/requirements.txt",
            file=sys.stderr
        )
        raise SystemExit(1) from exc

    lock_path = Path(args.lock_file).resolve()
    models_dir = Path(args.models_dir).resolve()
    cache_dir = Path(args.cache_dir).resolve()
    script_dir = Path(__file__).resolve().parent
    repo_root = script_dir.parent.parent
    backend_env = repo_root / "backend" / ".env"
    backend_env_models = repo_root / "backend" / ".env.models"

    models_dir.mkdir(parents=True, exist_ok=True)
    cache_dir.mkdir(parents=True, exist_ok=True)

    if args.offline:
        os.environ["HF_HUB_OFFLINE"] = "1"

    lock_data = _load_lock(lock_path)
    entries = lock_data.get("models", [])
    if not entries:
        raise ValueError("No model entries found in lock file.")

    env_updates = {
        "HF_INFERENCE_MODE": "local",
        "PYTHON_BIN": "python"
    }

    pin_lock = not args.no_pin_lock and not args.offline
    updated_lock = False

    print(f"[setup_models] lock: {lock_path}")
    print(f"[setup_models] models_dir: {models_dir}")
    print(f"[setup_models] cache_dir: {cache_dir}")
    print(f"[setup_models] offline: {args.offline}")

    for item in entries:
        repo_id = item.get("repo_id")
        revision = item.get("revision", "main")
        env_key = item.get("env")
        if not repo_id or not env_key:
            raise ValueError(f"Invalid lock entry: {item}")

        print(f"[setup_models] fetching {repo_id}@{revision}")
        snapshot_path = Path(
            snapshot_download(
                repo_id=repo_id,
                revision=revision,
                cache_dir=str(cache_dir),
                local_files_only=args.offline,
                resume_download=True
            )
        )

        resolved_revision = snapshot_path.name if _is_sha(snapshot_path.name) else revision
        local_model_dir = models_dir / _safe_dir_name(repo_id)
        _sync_dir(snapshot_path, local_model_dir)
        env_updates[env_key] = str(local_model_dir)

        if pin_lock and resolved_revision != revision:
            item["revision"] = resolved_revision
            updated_lock = True
            print(f"[setup_models] pinned {repo_id} -> {resolved_revision}")

    if updated_lock:
        _write_lock(lock_path, lock_data)
        print(f"[setup_models] updated lock revisions in {lock_path}")

    # Always write a generated env snippet file for easy sharing.
    backend_env_models.write_text(
        "\n".join([f"{k}={v}" for k, v in env_updates.items()]) + "\n",
        encoding="utf-8"
    )
    print(f"[setup_models] wrote backend env snippet: {backend_env_models}")

    if not args.no_update_env:
        _upsert_env_file(backend_env, env_updates)
        print(f"[setup_models] updated backend env: {backend_env}")

    print("[setup_models] complete.")


if __name__ == "__main__":
    main()
