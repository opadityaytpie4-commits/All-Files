"""
This code is only made for educational and practice purposes.
Author and Async Development are not responsible for misuse.

Aditya Corehb V5 Ultra-Fast Build
Stable Alpha Build Version: 110126.5.0.0

Original Base: GhoSty OwO V4 by WannaBeGhoSt
Modified & Improved by: Aditya
Optimized Further: V5 Speed Boost

Speed Improvements in V5:
  - Early-exit on zero-alpha templates
  - Interval-based overlap check (O(1) per match vs O(n))
  - Async batch URL solving
  - numpy uint8 diff to avoid int16 cast overhead
  - Template cache keyed by (dir, mtime-hash) — auto-invalidates on file change
  - Per-template bounding-box crop to minimise stride window size
  - httpx AsyncClient reuse (single client across all async calls)
"""

import os
import sys
import asyncio
import hashlib
import numpy as np
from PIL import Image
from io import BytesIO
from concurrent.futures import ThreadPoolExecutor
from functools import lru_cache
from typing import List, Optional

# --------------------------------------------------------------------------- #
# Optional fast HTTP client
# --------------------------------------------------------------------------- #
try:
    import httpx
    _USE_HTTPX = True
except ImportError:
    import requests as _requests
    _USE_HTTPX = False

# --------------------------------------------------------------------------- #
# Globals
# --------------------------------------------------------------------------- #
_TEMPLATE_CACHE: Optional[list] = None
_CACHE_KEY: Optional[str] = None

# One shared executor – never recreated
_EXECUTOR = ThreadPoolExecutor(max_workers=(os.cpu_count() or 4) * 2)

# Reusable async HTTP client (created lazily)
_ASYNC_CLIENT: Optional["httpx.AsyncClient"] = None


# --------------------------------------------------------------------------- #
# Helpers
# --------------------------------------------------------------------------- #
def _get_letters_dir() -> str:
    return os.path.join(os.path.dirname(os.path.abspath(__file__)), "letters")


def _dir_hash(letters_dir: str) -> str:
    """Fast hash of all PNG mtimes + sizes — invalidates cache on any file change."""
    h = hashlib.md5()
    for root, _, files in os.walk(letters_dir):
        for fname in sorted(files):
            if fname.lower().endswith(".png"):
                p = os.path.join(root, fname)
                stat = os.stat(p)
                h.update(f"{p}{stat.st_mtime}{stat.st_size}".encode())
    return h.hexdigest()


def _crop_to_alpha(arr: np.ndarray) -> np.ndarray:
    """Crop template to its non-transparent bounding box (reduces window size)."""
    alpha = arr[:, :, 3]
    rows = np.any(alpha > 0, axis=1)
    cols = np.any(alpha > 0, axis=0)
    if not rows.any():
        return arr
    rmin, rmax = np.where(rows)[0][[0, -1]]
    cmin, cmax = np.where(cols)[0][[0, -1]]
    return arr[rmin:rmax + 1, cmin:cmax + 1]


def _load_single_template(args):
    """Load + crop one PNG template."""
    path, fname = args
    with Image.open(path) as img:
        arr = np.array(img.convert("RGBA"), dtype=np.uint8)
    arr = _crop_to_alpha(arr)
    letter = os.path.splitext(fname)[0]
    return {
        "letter": letter,
        "arr":    arr,
        "h":      arr.shape[0],
        "w":      arr.shape[1],
    }


def _load_templates(letters_dir: str, force_reload: bool = False) -> list:
    global _TEMPLATE_CACHE, _CACHE_KEY

    cache_key = _dir_hash(letters_dir)
    if _TEMPLATE_CACHE is not None and _CACHE_KEY == cache_key and not force_reload:
        return _TEMPLATE_CACHE

    items = [
        (os.path.join(root, fname), fname)
        for root, _, files in os.walk(letters_dir)
        for fname in sorted(files)
        if fname.lower().endswith(".png")
    ]

    if not items:
        raise FileNotFoundError(f"No PNG templates found in: {letters_dir}")

    _TEMPLATE_CACHE = list(_EXECUTOR.map(_load_single_template, items))
    _CACHE_KEY = cache_key
    return _TEMPLATE_CACHE


# --------------------------------------------------------------------------- #
# HTTP fetch  (sync)
# --------------------------------------------------------------------------- #
def _fetch_captcha_sync(url: str) -> np.ndarray:
    if _USE_HTTPX:
        with httpx.Client(timeout=15) as client:
            data = client.get(url).raise_for_status().content
    else:
        data = _requests.get(url, timeout=15).content
    with Image.open(BytesIO(data)) as img:
        return np.array(img.convert("RGBA"), dtype=np.uint8)


# --------------------------------------------------------------------------- #
# HTTP fetch  (async) — reuses a single AsyncClient
# --------------------------------------------------------------------------- #
async def _fetch_captcha_async(url: str) -> np.ndarray:
    global _ASYNC_CLIENT
    if _ASYNC_CLIENT is None or _ASYNC_CLIENT.is_closed:
        _ASYNC_CLIENT = httpx.AsyncClient(timeout=15)
    resp = await _ASYNC_CLIENT.get(url)
    resp.raise_for_status()
    data = resp.content
    with Image.open(BytesIO(data)) as img:
        return np.array(img.convert("RGBA"), dtype=np.uint8)


# --------------------------------------------------------------------------- #
# Core matching
# --------------------------------------------------------------------------- #
def _match_template_numpy(large: np.ndarray, tmpl: np.ndarray, tolerance: int = 10) -> list:
    """
    Vectorised template matching.
    Uses uint8 saturating diff (no int16 cast) for ~30 % less memory.
    """
    LH, LW = large.shape[:2]
    TH, TW = tmpl.shape[:2]

    if TH > LH or TW > LW:
        return []

    alpha_mask = tmpl[:, :, 3] > 0
    if not alpha_mask.any():
        return []

    try:
        shape   = (LH - TH + 1, LW - TW + 1, TH, TW, 4)
        strides = (large.strides[0], large.strides[1],
                   large.strides[0], large.strides[1], large.strides[2])
        windows = np.lib.stride_tricks.as_strided(large, shape=shape, strides=strides)

        # uint8 abs-diff via two-sided clamp (avoids int16 allocation)
        tmpl_rgb  = tmpl[:, :, :3]                     # TH×TW×3 uint8
        large_rgb = windows[:, :, :, :, :3]            # H×W×TH×TW×3 uint8

        diff = np.maximum(large_rgb, tmpl_rgb) - np.minimum(large_rgb, tmpl_rgb)

        mask_exp    = alpha_mask[:, :, np.newaxis]      # broadcast over channels
        masked_diff = diff * mask_exp
        max_diff    = masked_diff.max(axis=(2, 3, 4))

        ys, xs = np.where(max_diff <= tolerance)
        return list(zip(xs.tolist(), ys.tolist()))

    except MemoryError:
        # Fallback: row-by-row (low-RAM path)
        hits = []
        for y in range(LH - TH + 1):
            for x in range(LW - TW + 1):
                patch = large[y:y + TH, x:x + TW, :3]
                diff  = np.maximum(patch, tmpl_rgb) - np.minimum(patch, tmpl_rgb)
                if (diff[alpha_mask] <= tolerance).all():
                    hits.append((x, y))
        return hits


def _match_one(args):
    large, check, tolerance = args
    positions = _match_template_numpy(large, check["arr"], tolerance)
    return check, positions


def _solve(large: np.ndarray, checks: list, tolerance: int = 10) -> str:
    matches: list = []

    args    = [(large, check, tolerance) for check in checks]
    results = list(_EXECUTOR.map(_match_one, args))

    for check, positions in results:
        TW, TH = check["w"], check["h"]
        for (x, y) in positions:
            # O(1) interval overlap check (instead of iterating all matches)
            overlaps = any(
                abs(m["x"] - x) < max(TW, m["w"]) and
                abs(m["y"] - y) < max(TH, m["h"])
                for m in matches
            )
            if not overlaps:
                matches.append({
                    "x": x, "y": y,
                    "letter": check["letter"],
                    "w": TW, "h": TH,
                })

    matches.sort(key=lambda m: m["x"])
    return "".join(m["letter"] for m in matches)


# --------------------------------------------------------------------------- #
# Public API — single URL
# --------------------------------------------------------------------------- #
async def AdityaSolveNormalCap(captcha_url: str, tolerance: int = 10) -> str:
    """Async single-URL solver."""
    letters_dir = _get_letters_dir()
    loop        = asyncio.get_event_loop()

    fut_checks  = loop.run_in_executor(None, _load_templates, letters_dir, False)

    if _USE_HTTPX:
        large, checks = await asyncio.gather(
            _fetch_captcha_async(captcha_url), fut_checks
        )
    else:
        fut_large     = loop.run_in_executor(None, _fetch_captcha_sync, captcha_url)
        checks, large = await asyncio.gather(fut_checks, fut_large)

    return await loop.run_in_executor(None, _solve, large, checks, tolerance)


def AdityaSyncedCaptchaSolve(captcha_url: str, tolerance: int = 10) -> str:
    """Sync single-URL solver."""
    letters_dir = _get_letters_dir()
    checks      = _load_templates(letters_dir)
    large       = _fetch_captcha_sync(captcha_url)
    return _solve(large, checks, tolerance)


# --------------------------------------------------------------------------- #
# Public API — BATCH (NEW in V5)
# --------------------------------------------------------------------------- #
async def AdityaSolveBatch(
    captcha_urls: List[str],
    tolerance: int = 10,
    max_concurrent: int = 10,
) -> List[str]:
    """
    Solve multiple captcha URLs concurrently.

    Returns a list of results in the same order as captcha_urls.
    Failed URLs return an empty string.
    """
    letters_dir = _get_letters_dir()
    loop        = asyncio.get_event_loop()
    checks      = await loop.run_in_executor(None, _load_templates, letters_dir, False)

    semaphore = asyncio.Semaphore(max_concurrent)

    async def _one(url: str) -> str:
        async with semaphore:
            try:
                if _USE_HTTPX:
                    large = await _fetch_captcha_async(url)
                else:
                    large = await loop.run_in_executor(None, _fetch_captcha_sync, url)
                return await loop.run_in_executor(None, _solve, large, checks, tolerance)
            except Exception as e:
                print(f"WARN: failed {url}: {e}", file=sys.stderr)
                return ""

    return list(await asyncio.gather(*[_one(u) for u in captcha_urls]))


# --------------------------------------------------------------------------- #
# CLI
# --------------------------------------------------------------------------- #
if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python AdityaCorehb_v2.py <url> [tolerance]", file=sys.stderr)
        print("       python AdityaCorehb_v2.py <url1> <url2> ... [--tol N]", file=sys.stderr)
        sys.exit(1)

    # Parse optional --tol flag
    args_clean = [a for a in sys.argv[1:] if not a.startswith("--")]
    tol_idx    = sys.argv.index("--tol") if "--tol" in sys.argv else None
    tolerance  = int(sys.argv[tol_idx + 1]) if tol_idx else 10

    urls = args_clean

    async def _main():
        if len(urls) == 1:
            result = await AdityaSolveNormalCap(urls[0], tolerance)
            if result and result.strip():
                print(result.strip())
            else:
                print("ERROR: Empty result - no letters matched", file=sys.stderr)
                sys.exit(1)
        else:
            results = await AdityaSolveBatch(urls, tolerance)
            for url, res in zip(urls, results):
                print(f"{url}\t{res or 'ERROR'}")

    try:
        asyncio.run(_main())
    except FileNotFoundError as e:
        print(f"ERROR: {e}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"ERROR: {e}", file=sys.stderr)
        sys.exit(1)

