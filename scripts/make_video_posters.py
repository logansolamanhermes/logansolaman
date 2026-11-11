#!/usr/bin/env python3
"""Regenerate hero poster frames for storefronts whose <video> frame 0 is black.

Helium Watches ships a solid-black frame-0 poster for its hero video, so a
paused-video screenshot is just a black rectangle. This extracts a real frame
from the same CDN MP4 and writes assets/cases/hero-posters/helium.jpg, which
scripts/capture_stores.py injects as a data URI during capture.

Requires ffmpeg. Run only when the storefront's hero video changes.
"""
import subprocess, sys, os
from urllib.request import Request, urlopen

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "assets/cases/hero-posters/helium.jpg")
PAGE = "https://www.heliumwatches.com/"
TMP_MP4 = "/tmp/helium_hero.mp4"

import re


def main():
    html = urlopen(Request(PAGE, headers={"User-Agent": "Mozilla/5.0"}), timeout=30).read().decode("utf-8", "ignore")
    m = re.search(r'<source src="(//[^"]+\.mp4[^"]*)"', html)
    if not m:
        sys.exit("no hero mp4 found in page HTML")
    video = "https:" + m.group(1).replace("&amp;", "&")
    # First 9 MB is enough to contain the opening seconds of a Shopify hero clip.
    req = Request(video, headers={"User-Agent": "Mozilla/5.0", "Range": "bytes=0-9000000"})
    with urlopen(req, timeout=60) as r, open(TMP_MP4, "wb") as f:
        f.write(r.read())
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    subprocess.run(["ffmpeg", "-y", "-ss", "2", "-i", TMP_MP4, "-frames:v", "1",
                    "-vf", "scale=1200:-1", "-q:v", "3", OUT],
                   check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    os.remove(TMP_MP4)
    print("wrote", OUT, os.path.getsize(OUT), "bytes")


if __name__ == "__main__":
    main()
