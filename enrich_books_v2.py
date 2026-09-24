#!/usr/bin/env python3
"""
enrich_books.py — v2
"""
from __future__ import annotations

import argparse
import concurrent.futures
import difflib
import json
import logging
import random
import re
import sys
import threading
import time
from pathlib import Path
from urllib.parse import quote

import requests
from bs4 import BeautifulSoup

# --------------------------------------------------------------------------
# Config
# --------------------------------------------------------------------------

SCRIPT_DIR = Path(__file__).resolve().parent

UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36")

API_HEADERS = {"User-Agent": "library-app-enrichment/2.0 (personal use)"}
BROWSER_HEADERS = {
    "User-Agent": UA,
    "Accept-Language": "en-IN,en;q=0.9",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
}

# Fields this script is allowed to touch.
ENRICH_FIELDS = {
    "description", "photoUrl", "coverFile", "authorDescription",
    "originalLanguage", "launchYear", "countryOfOrigin",
}

MIN_MATCH_GOOGLE = 0.50
MIN_MATCH_OPENLIB = 0.50
MIN_MATCH_CROSSWORD = 0.45

LANG_2_TO_3 = {
    "en": "eng", "fr": "fre", "de": "ger", "es": "spa", "it": "ita",
    "pt": "por", "ru": "rus", "zh": "chi", "ja": "jpn", "ko": "kor",
    "ar": "ara", "hi": "hin", "ur": "urd", "bn": "ben", "nl": "dut",
    "pl": "pol", "tr": "tur", "he": "heb", "vi": "vie", "uk": "ukr",
    "el": "gre", "ro": "rum", "hu": "hun", "cs": "cze", "sv": "swe",
    "fi": "fin", "da": "dan", "no": "nor", "th": "tha", "id": "ind",
    "fa": "per", "gu": "guj", "ta": "tam", "te": "tel", "mr": "mar",
    "pa": "pan", "ml": "mal", "kn": "kan", "la": "lat", "gl": "glg",
}

NATIONALITY_TO_COUNTRY = {
    "american": "United States", "british": "United Kingdom",
    "english": "United Kingdom", "scottish": "United Kingdom",
    "welsh": "United Kingdom", "irish": "Ireland", "indian": "India",
    "french": "France", "german": "Germany", "russian": "Russia",
    "italian": "Italy", "spanish": "Spain", "brazilian": "Brazil",
    "chinese": "China", "japanese": "Japan", "canadian": "Canada",
    "australian": "Australia", "south african": "South Africa",
    "lebanese": "Lebanon", "pakistani": "Pakistan", "bengali": "India",
    "swiss": "Switzerland", "austrian": "Austria", "dutch": "Netherlands",
    "polish": "Poland", "czech": "Czech Republic", "swedish": "Sweden",
    "norwegian": "Norway", "danish": "Denmark", "israeli": "Israel",
    "turkish": "Turkey", "greek": "Greece", "portuguese": "Portugal",
    "mexican": "Mexico", "argentine": "Argentina", "colombian": "Colombia",
    "trinidadian": "Trinidad and Tobago", "nigerian": "Nigeria",
    "kenyan": "Kenya", "egyptian": "Egypt", "korean": "South Korea",
    "vietnamese": "Vietnam", "iranian": "Iran", "ukrainian": "Ukraine",
    "belgian": "Belgium", "romanian": "Romania", "hungarian": "Hungary",
}

DEFAULT_INPUT = SCRIPT_DIR / "data" / "books.json"
DEFAULT_COVERS_DIR = SCRIPT_DIR / "public" / "covers"
DEFAULT_CACHE = SCRIPT_DIR / "data" / ".enrich_cache.json"
DEFAULT_REPORT = SCRIPT_DIR / "data" / "enrich_report.json"

log = logging.getLogger("enrich")


# --------------------------------------------------------------------------
# small utilities
# --------------------------------------------------------------------------

def normalize(s: str) -> str:
    s = (s or "").lower()
    s = re.sub(r"[^a-z0-9]+", " ", s)
    return re.sub(r"\s+", " ", s).strip()


def similarity(a: str, b: str) -> float:
    if not a or not b:
        return 0.0
    return difflib.SequenceMatcher(None, normalize(a), normalize(b)).ratio()


def clean_html(html: str) -> str:
    if not html:
        return ""
    text = BeautifulSoup(html, "html.parser").get_text(separator=" ")
    return re.sub(r"\s+", " ", text).strip()


class RateLimiter:
    """Politeness delay per host so we don't hammer any one domain."""

    def __init__(self, min_interval: float = 0.6):
        self.min_interval = min_interval
        self._last: dict[str, float] = {}
        self._lock = threading.Lock()

    def wait(self, host: str):
        with self._lock:
            now = time.time()
            last = self._last.get(host, 0.0)
            start = max(now, last)
            self._last[host] = start + self.min_interval
            delay = start - now
        if delay > 0:
            time.sleep(delay + random.uniform(0, 0.3))


RATE = RateLimiter()


def http_get(url, params=None, headers=None, timeout=10, retries=3, host_key=None):
    """requests.get with retry/backoff/rate-limit. Returns a Response or None."""
    host_key = host_key or url.split("/")[2]
    resp = None
    for attempt in range(1, retries + 1):
        RATE.wait(host_key)
        try:
            resp = requests.get(url, params=params, headers=headers or API_HEADERS,
                                 timeout=timeout)
        except requests.RequestException as e:
            log.debug("  request error (%s/%s) %s: %s", attempt, retries, url, e)
            time.sleep(1.5 * attempt)
            continue
        if resp.status_code == 429:
            wait_s = (2 ** attempt) + random.uniform(0, 1)
            log.warning("  429 rate-limited on %s, sleeping %.1fs", host_key, wait_s)
            time.sleep(wait_s)
            continue
        if resp.status_code >= 500:
            time.sleep(1.5 * attempt)
            continue
        return resp
    return resp


def http_get_json(url, params=None, headers=None, timeout=10, host_key=None):
    resp = http_get(url, params=params, headers=headers, timeout=timeout, host_key=host_key)
    if resp is None or resp.status_code != 200:
        return None
    try:
        return resp.json()
    except ValueError:
        return None


# --------------------------------------------------------------------------
# Source: Google Books
# --------------------------------------------------------------------------

def fetch_google_books(title, author):
    candidates = []
    for q in (f'intitle:"{title}" inauthor:"{author}"', f"{title} {author}"):
        data = http_get_json(
            "https://www.googleapis.com/books/v1/volumes",
            params={"q": q, "maxResults": 5},
            host_key="www.googleapis.com",
        )
        if data and data.get("items"):
            candidates = data["items"]
            break

    best, best_score = None, 0.0
    for item in candidates:
        vi = item.get("volumeInfo", {})
        t_score = similarity(vi.get("title", ""), title)
        a_score = max((similarity(a, author) for a in vi.get("authors", [""])), default=0.0)
        score = (t_score * 0.6) + (a_score * 0.4)
        if score > best_score:
            best_score, best = score, vi

    if not best or best_score < MIN_MATCH_GOOGLE:
        return None

    images = best.get("imageLinks", {})
    cover = (images.get("thumbnail") or images.get("smallThumbnail") or "").replace("http://", "https://")

    isbn = ""
    for ident in best.get("industryIdentifiers", []):
        if ident.get("type") in ("ISBN_13", "ISBN_10"):
            isbn = ident["identifier"]
            if ident["type"] == "ISBN_13":
                break

    year = ""
    m = re.match(r"(\d{4})", best.get("publishedDate", "") or "")
    if m:
        year = m.group(1)

    return {
        "description": clean_html(best.get("description", "")),
        "photoUrl": cover,
        "isbn": isbn,
        "launchYear": year,
        "language2": best.get("language", ""),
        "score": best_score,
    }


# --------------------------------------------------------------------------
# Source: Open Library (best source for original-language / first-publish-year)
# --------------------------------------------------------------------------

def fetch_open_library(title, author):
    data = http_get_json(
        "https://openlibrary.org/search.json",
        params={"title": title, "author": author, "limit": 5},
        host_key="openlibrary.org",
    )
    docs = (data or {}).get("docs", [])
    best, best_score = None, 0.0
    for doc in docs:
        t_score = similarity(doc.get("title", ""), title)
        a_score = max((similarity(a, author) for a in doc.get("author_name", [""])), default=0.0)
        score = (t_score * 0.6) + (a_score * 0.4)
        if score > best_score:
            best_score, best = score, doc

    if not best or best_score < MIN_MATCH_OPENLIB:
        return None

    langs = best.get("language") or []
    isbns = best.get("isbn") or []
    return {
        "launchYear": str(best.get("first_publish_year") or ""),
        "originalLanguage": langs[0] if langs else "",
        "isbn": isbns[0] if isbns else "",
        "olid": (best.get("edition_key") or [""])[0],
        "score": best_score,
    }


def open_library_cover_url(isbn=None, olid=None):
    if isbn:
        base = f"https://covers.openlibrary.org/b/isbn/{isbn}-L.jpg"
    elif olid:
        base = f"https://covers.openlibrary.org/b/olid/{olid}-L.jpg"
    else:
        return ""
    resp = http_get(base, params={"default": "false"}, headers=BROWSER_HEADERS,
                     host_key="covers.openlibrary.org", retries=1)
    if resp is not None and resp.status_code == 200 and len(resp.content) > 2000:
        return base
    return ""


# --------------------------------------------------------------------------
# Source: Wikipedia (author bios + a rough nationality -> country guess)
# --------------------------------------------------------------------------

def fetch_wikipedia_summary(query, _depth=0):
    if _depth > 1 or not query:
        return None
    url = f"https://en.wikipedia.org/api/rest_v1/page/summary/{quote(query.replace(' ', '_'))}"
    resp = http_get(url, headers=API_HEADERS, host_key="en.wikipedia.org", retries=2)
    if resp is None or resp.status_code != 200:
        return None
    try:
        data = resp.json()
    except ValueError:
        return None

    if data.get("type") == "disambiguation":
        search = http_get_json(
            "https://en.wikipedia.org/w/api.php",
            params={"action": "query", "list": "search",
                    "srsearch": f"{query} writer OR author OR poet", "format": "json"},
            host_key="en.wikipedia.org",
        )
        hits = ((search or {}).get("query", {}) or {}).get("search", [])
        if hits:
            return fetch_wikipedia_summary(hits[0]["title"], _depth + 1)
        return None

    if data.get("type") not in ("standard", None):
        return None
    return data


def infer_country(text):
    if not text:
        return ""
    t = text.lower()
    for key, country in NATIONALITY_TO_COUNTRY.items():
        if re.search(rf"\b{re.escape(key)}\b", t):
            return country
    return ""


# --------------------------------------------------------------------------
# Source: Crossword.in — it's a Shopify store, so we use Shopify's public
# predictive-search + product-JSON endpoints instead of scraping HTML.
# --------------------------------------------------------------------------

def crossword_search(title, author):
    data = http_get_json(
        "https://www.crossword.in/search/suggest.json",
        params={"q": f"{title} {author}", "resources[type]": "product", "resources[limit]": 5},
        headers=BROWSER_HEADERS, host_key="www.crossword.in",
    )
    if not data:
        return None
    products = (((data.get("resources") or {}).get("results") or {}).get("products") or [])
    best, best_score = None, 0.0
    for p in products:
        score = similarity(p.get("title", ""), title)
        if score > best_score:
            best_score, best = score, p
    if not best or best_score < MIN_MATCH_CROSSWORD:
        return None
    return best.get("url")


def crossword_product_json(handle_url):
    if not handle_url:
        return None
    url = handle_url if handle_url.startswith("http") else f"https://www.crossword.in{handle_url}"
    url = url.split("?")[0] + ".json"
    data = http_get_json(url, headers=BROWSER_HEADERS, host_key="www.crossword.in")
    return (data or {}).get("product")


def fetch_crossword(title, author):
    handle_url = crossword_search(title, author)
    if not handle_url:
        return None
    product = crossword_product_json(handle_url)
    if not product:
        return None

    desc = clean_html(product.get("body_html", ""))
    images = product.get("images") or []
    cover = images[0]["src"] if images else ""
    if cover.startswith("//"):
        cover = "https:" + cover

    isbn = ""
    for v in product.get("variants", []):
        barcode = v.get("barcode") or ""
        if re.match(r"^\d{9,13}$", barcode):
            isbn = barcode
            break

    return {"description": desc, "photoUrl": cover, "isbn": isbn}


# --------------------------------------------------------------------------
# Source: Amazon — best-effort only, OFF BY DEFAULT.
# --------------------------------------------------------------------------

def fetch_amazon(title, author):
    q = f"{title} {author} book"
    search_url = f"https://www.amazon.in/s?k={quote(q)}&i=stripbooks"
    resp = http_get(search_url, headers=BROWSER_HEADERS, host_key="www.amazon.in",
                     retries=1, timeout=12)
    if resp is None or resp.status_code != 200 or "captcha" in resp.text.lower():
        return None

    soup = BeautifulSoup(resp.text, "html.parser")
    link_el = (soup.select_one("div[data-component-type='s-search-result'] h2 a")
               or soup.select_one("div.s-result-item h2 a"))
    if not link_el or not link_el.get("href"):
        return None
    product_url = "https://www.amazon.in" + link_el["href"].split("?")[0]

    time.sleep(random.uniform(2, 4))
    presp = http_get(product_url, headers=BROWSER_HEADERS, host_key="www.amazon.in",
                      retries=1, timeout=12)
    if presp is None or presp.status_code != 200:
        return None
    psoup = BeautifulSoup(presp.text, "html.parser")

    desc = ""
    desc_el = (psoup.select_one("#bookDescription_feature_div .a-expander-content")
               or psoup.select_one("#productDescription"))
    if desc_el:
        desc = desc_el.get_text(" ", strip=True)
    if not desc:
        meta = psoup.select_one("meta[name='description']")
        if meta:
            desc = meta.get("content", "")

    cover = ""
    img_el = psoup.select_one("#imgBlkFront") or psoup.select_one("#landingImage")
    if img_el is not None:
        cover = img_el.get("data-old-hires") or img_el.get("src") or ""

    if not desc and not cover:
        return None
    return {"description": clean_html(desc), "photoUrl": cover}


# --------------------------------------------------------------------------
# Cover download
# --------------------------------------------------------------------------

def download_cover(url, book_id, covers_dir: Path):
    if not url:
        return ""
    resp = http_get(url, headers=BROWSER_HEADERS, retries=2, timeout=12)
    if resp is None or resp.status_code != 200:
        return ""
    content_type = resp.headers.get("Content-Type", "").split(";")[0].strip()
    if "image" not in content_type or len(resp.content) < 1500:
        return ""
    ext = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp"}.get(content_type, "jpg")
    filepath = covers_dir / f"{book_id}.{ext}"
    filepath.write_bytes(resp.content)
    return f"/covers/{filepath.name}"


# --------------------------------------------------------------------------
# Per-book orchestration
# --------------------------------------------------------------------------

def needs(book, field, refresh_set):
    if field in refresh_set:
        return True
    val = book.get(field, "")
    if val in ("", None):
        return True
    if field == "authorDescription" and val == "Author biography not found.":
        return True
    return False


def enrich_book(book, args, cache, cache_lock):
    title, author = book.get("title", ""), book.get("author", "")
    key = f"{normalize(title)}|{normalize(author)}"
    changed = []

    want_desc_cover = needs(book, "description", args.refresh) or needs(book, "photoUrl", args.refresh)
    want_langyear = needs(book, "originalLanguage", args.refresh) or needs(book, "launchYear", args.refresh)
    want_author = needs(book, "authorDescription", args.refresh)
    want_country = needs(book, "countryOfOrigin", args.refresh)

    if not any([want_desc_cover, want_langyear, want_author, want_country]):
        return book, changed

    with cache_lock:
        cached = None if args.no_cache else cache.get(key)

    if cached is not None:
        gbooks, ol = cached.get("gbooks"), cached.get("ol")
    else:
        gbooks = fetch_google_books(title, author) if (want_desc_cover or want_langyear) else None
        ol = fetch_open_library(title, author) if want_langyear else None
        with cache_lock:
            cache[key] = {"gbooks": gbooks, "ol": ol}

    isbn = (gbooks or {}).get("isbn") or (ol or {}).get("isbn")
    olid = (ol or {}).get("olid")

    cw_cache = {}

    def crossword_once():
        if "result" not in cw_cache and not args.no_crossword:
            cw_cache["result"] = fetch_crossword(title, author)
        return cw_cache.get("result")

    # --- description / cover -------------------------------------------
    if want_desc_cover:
        desc = (gbooks or {}).get("description", "")
        cover = (gbooks or {}).get("photoUrl", "")

        if not desc or not cover:
            cw = crossword_once()
            if cw:
                desc = desc or cw.get("description", "")
                cover = cover or cw.get("photoUrl", "")
                isbn = isbn or cw.get("isbn", "")

        if (not desc or not cover) and args.scrape_amazon:
            az = fetch_amazon(title, author)
            if az:
                desc = desc or az.get("description", "")
                cover = cover or az.get("photoUrl", "")
            time.sleep(args.amazon_delay)

        if not cover:
            cover = open_library_cover_url(isbn=isbn, olid=olid)

        if desc and needs(book, "description", args.refresh):
            book["description"] = desc
            changed.append("description")
        if cover and needs(book, "photoUrl", args.refresh):
            book["photoUrl"] = cover
            changed.append("photoUrl")
            local = download_cover(cover, book.get("id"), args.covers_dir)
            if local:
                book["coverFile"] = local
                changed.append("coverFile")

    # --- language / year --------------------------------------------------
    if want_langyear:
        lang = (ol or {}).get("originalLanguage", "")
        year = (ol or {}).get("launchYear", "") or (gbooks or {}).get("launchYear", "")
        if not lang and (gbooks or {}).get("language2"):
            lang = LANG_2_TO_3.get(gbooks["language2"], "")
        if lang and needs(book, "originalLanguage", args.refresh):
            book["originalLanguage"] = lang
            changed.append("originalLanguage")
        if year and needs(book, "launchYear", args.refresh):
            book["launchYear"] = year
            changed.append("launchYear")

    # --- author bio + country guess ---------------------------------------
    if want_author or want_country:
        wiki = fetch_wikipedia_summary(author)
        bio = (wiki or {}).get("extract", "")
        short_desc = (wiki or {}).get("description", "")

        if want_author and bio:
            trimmed = bio[:1500] + ("..." if len(bio) > 1500 else "")
            book["authorDescription"] = trimmed
            changed.append("authorDescription")

        if want_country:
            country = infer_country(f"{short_desc} {bio[:300]}")
            if country:
                book["countryOfOrigin"] = country
                changed.append("countryOfOrigin")

    return book, changed


# --------------------------------------------------------------------------
# Main
# --------------------------------------------------------------------------

REFRESH_ALIASES = {
    "all": set(ENRICH_FIELDS),
    "none": set(),
    "langyear": {"originalLanguage", "launchYear"},
}


def parse_refresh(value):
    if value in REFRESH_ALIASES:
        return set(REFRESH_ALIASES[value])
    fields = {f.strip() for f in value.split(",") if f.strip()}
    unknown = fields - ENRICH_FIELDS
    if unknown:
        raise argparse.ArgumentTypeError(f"Unknown field(s) for --refresh: {sorted(unknown)}")
    return fields


def load_cache(path: Path):
    if path.exists():
        try:
            return json.loads(path.read_text())
        except json.JSONDecodeError:
            log.warning("Cache file was corrupt, starting fresh: %s", path)
    return {}


def save_json_atomic(path: Path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(json.dumps(data, indent=2, ensure_ascii=False))
    tmp.replace(path)


def check_duplicate_ids(books):
    seen = {}
    dupes = []
    for b in books:
        bid = b.get("id")
        if bid in seen:
            dupes.append((bid, seen[bid], b.get("title")))
        else:
            seen[bid] = b.get("title")
    if dupes:
        log.warning("Found %d duplicate 'id' value(s) in books.json. Enrichment results "
                    "won't bleed across entries (this script tracks books by list "
                    "position, not id), but cover downloads will collide since files "
                    "are saved as {id}.ext. Fix these before trusting coverFile:", len(dupes))
        for bid, first_title, second_title in dupes:
            log.warning("  id %r used by both %r and %r", bid, first_title, second_title)


def main():
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--input", type=Path, default=DEFAULT_INPUT)
    parser.add_argument("--covers-dir", type=Path, default=DEFAULT_COVERS_DIR)
    parser.add_argument("--cache", type=Path, default=DEFAULT_CACHE)
    parser.add_argument("--report", type=Path, default=DEFAULT_REPORT)
    parser.add_argument("--limit", type=int, default=0, help="Only process the first N books (0 = all)")
    parser.add_argument("--workers", type=int, default=4)
    parser.add_argument("--refresh", type=parse_refresh, default=parse_refresh("langyear"),
                         help="'all', 'none', 'langyear' (default), or a comma list of "
                              "fields to re-fetch even when already set")
    parser.add_argument("--no-cache", action="store_true")
    parser.add_argument("--no-crossword", action="store_true", help="Disable the Crossword.in lookup")
    parser.add_argument("--scrape-amazon", action="store_true",
                         help="Also try Amazon.in as a last resort. Off by default: low "
                              "hit rate, likely CAPTCHAs, and it runs against Amazon's "
                              "Terms of Service — use at your own discretion.")
    parser.add_argument("--amazon-delay", type=float, default=3.0)
    parser.add_argument("--save-every", type=int, default=15)
    parser.add_argument("-v", "--verbose", action="store_true")
    args = parser.parse_args()

    logging.basicConfig(level=logging.DEBUG if args.verbose else logging.INFO,
                         format="%(asctime)s  %(levelname)-7s %(message)s", datefmt="%H:%M:%S")

    args.covers_dir.mkdir(parents=True, exist_ok=True)

    if not args.input.exists():
        log.error("Input file not found: %s", args.input)
        sys.exit(1)

    books = json.loads(args.input.read_text())
    check_duplicate_ids(books)

    indexed = list(enumerate(books))
    target = indexed[: args.limit] if args.limit else indexed
    log.info("Loaded %d books (processing %d) | refresh=%s | crossword=%s | amazon=%s",
              len(books), len(target), sorted(args.refresh) or "none",
              not args.no_crossword, args.scrape_amazon)

    cache = load_cache(args.cache)
    cache_lock = threading.Lock()
    results_by_index: dict[int, dict] = {}
    stragglers: list[tuple[int, dict]] = []

    def write_progress():
        merged = [results_by_index.get(i, b) for i, b in enumerate(books)]
        save_json_atomic(args.input, merged)

    def phase1(item):
        i, book = item
        try:
            updated, changed = enrich_book(book, args, cache, cache_lock)
        except Exception:
            log.exception("Failed enriching '%s'", book.get("title"))
            return i, book, []
        return i, updated, changed

    log.info("Phase 1: Google Books + Open Library + Wikipedia + Crossword (concurrent, %d workers)",
              args.workers)
    done = 0
    with concurrent.futures.ThreadPoolExecutor(max_workers=args.workers) as ex:
        futures = [ex.submit(phase1, item) for item in target]
        for fut in concurrent.futures.as_completed(futures):
            i, book, changed = fut.result()
            results_by_index[i] = book
            done += 1
            label = (book.get("title") or "")[:45]
            if changed:
                log.info("  [%3d/%3d] %-45s -> %s", done, len(target), label, ", ".join(changed))
            else:
                log.debug("  [%3d/%3d] %-45s -> (nothing new)", done, len(target), label)
            if not book.get("description") or not book.get("photoUrl"):
                stragglers.append((i, book))
            if done % args.save_every == 0:
                write_progress()
                with cache_lock:
                    save_json_atomic(args.cache, cache)

    write_progress()
    with cache_lock:
        save_json_atomic(args.cache, cache)

    if args.scrape_amazon and stragglers:
        log.info("Phase 2: Amazon fallback for %d books still missing description/cover "
                  "(serial, ~%.0fs delay each — this will take a while)",
                  len(stragglers), args.amazon_delay)
        for n, (i, book) in enumerate(stragglers, 1):
            label = (book.get("title") or "")[:45]
            az = fetch_amazon(book.get("title", ""), book.get("author", ""))
            if az:
                if az.get("description") and not book.get("description"):
                    book["description"] = az["description"]
                if az.get("photoUrl") and not book.get("photoUrl"):
                    book["photoUrl"] = az["photoUrl"]
                    local = download_cover(az["photoUrl"], book.get("id"), args.covers_dir)
                    if local:
                        book["coverFile"] = local
                log.info("  [%3d/%3d] Amazon hit: %s", n, len(stragglers), label)
            else:
                log.info("  [%3d/%3d] Amazon: nothing usable for %s", n, len(stragglers), label)
            results_by_index[i] = book
            time.sleep(args.amazon_delay)
        write_progress()

    still_missing = []
    for i, b in enumerate(books):
        b = results_by_index.get(i, b)
        missing = [f for f in ("description", "photoUrl", "authorDescription")
                   if not b.get(f) or b.get(f) == "Author biography not found."]
        if missing:
            still_missing.append({"id": b.get("id"), "title": b.get("title"),
                                   "author": b.get("author"), "missing": missing})
    save_json_atomic(args.report, still_missing)

    log.info("Done. %d/%d books still missing something — see %s",
              len(still_missing), len(target), args.report)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        log.warning("Interrupted — progress up to the last save is intact.")
        sys.exit(1)
