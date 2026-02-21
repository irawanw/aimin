import re
from langchain_text_splitters import RecursiveCharacterTextSplitter

splitter = RecursiveCharacterTextSplitter(
    chunk_size=400,
    chunk_overlap=50,
    separators=["\n\n", "\n", ". ", "? ", "! ", ", ", " "],
    length_function=len,
)

# Company letterhead lines (repeat on every page of multi-page packages)
_LETTERHEAD_RE = re.compile(
    r'BIRO PERJALANAN WISATA|PLATINUM CEMERLANG|'
    r'^JL[.\s]|^-Kedung|^-Jl\s|HP\s*/\s*WA\s*:|'
    r'^\d{10,13}\s*$|BANU SUKOCO|^Direktur\s*$',
    re.IGNORECASE
)

# Lines that are clearly section CONTENT, not package names
# (These appear after letterhead when a multi-page package continues)
_CONTENT_STARTS_RE = re.compile(
    r'^(Transportasi|Fasilitas|FASILITAS|TUJUAN|Makan|Free\s|Tiket|'
    r'Asuransi|PPPK|TOL,|MMT|Video|Pemandu|Snack|Doorprize|'
    r'Hari\s+0[2-9]|HARI\s+0[2-9]|'   # continuation day headers in multi-day tours
    r'Sesudah|Sesudah|Pukul|PAGI|SORE|MALAM)',
    re.IGNORECASE
)

def _is_letterhead(line):
    return bool(_LETTERHEAD_RE.search(line.strip()))

def _is_content_not_header(line):
    """True if the line is package content, not a new package name."""
    stripped = line.strip()
    if not stripped:
        return False
    # Long lines are always content
    if len(stripped) > 70:
        return True
    # Known content keywords
    if _CONTENT_STARTS_RE.match(stripped):
        return True
    return False

def _looks_like_package_name(line):
    """
    True if this line is a package/destination name.
    Used to decide whether a post-letterhead line starts a new section
    or continues the previous one (multi-page package).
    """
    stripped = line.strip()
    if not stripped or len(stripped) > 80 or len(stripped) < 3:
        return False
    if _is_letterhead(stripped) or _is_content_not_header(stripped):
        return False
    # Skip bullet points
    if re.match(r'^[\*\-\u2022\d]', stripped):
        return False

    words = stripped.split()
    if len(words) < 1 or len(words) > 10:
        return False

    letters = [c for c in stripped if c.isalpha()]
    if not letters:
        return False

    # At least 40% uppercase → looks like a title
    upper_ratio = sum(c.isupper() for c in letters) / len(letters)
    return upper_ratio >= 0.40

def _split_by_letterhead(text):
    """
    Split document into (package_name, content_lines) by detecting
    company letterhead blocks that appear before each package section.

    Key insight: in multi-page packages, the letterhead repeats on each page
    but the content continues. Only start a new section if the line after
    the letterhead looks like a package name (short, titlecase/uppercase).
    If it looks like content (e.g. "Transportasi Bus..."), fold it into
    the current section.
    """
    lines = text.replace('\r\n', '\n').split('\n')

    sections = []
    current_header = None
    current_lines = []
    in_letterhead = False

    for line in lines:
        stripped = line.strip()

        if _is_letterhead(stripped):
            in_letterhead = True
            continue

        if in_letterhead:
            if not stripped:
                continue  # blank line between letterhead lines
            if _looks_like_package_name(stripped):
                # New package starts
                if current_lines:
                    sections.append((current_header, current_lines))
                    current_lines = []
                current_header = stripped
                in_letterhead = False
            else:
                # Continuation of previous section (multi-page package)
                in_letterhead = False
                current_lines.append(line)
            continue

        current_lines.append(line)

    if current_lines:
        sections.append((current_header, current_lines))

    return sections

def chunk_text(text):
    """
    Split text into context-aware chunks, each prefixed with [Paket: <name>].

    Detects company letterhead blocks as section separators to identify
    which tour package each chunk belongs to. Prevents cross-package
    confusion: Bali pricing is always [Paket: BALI OVERLAND], Jogja is
    always [Paket: SKE EDUTAINMENT TOUR] / [Paket: JOGJA BERANGKAT MALAM].
    """
    if not text or not text.strip():
        return []

    sections = _split_by_letterhead(text)

    # Fallback for plain-text KBs without letterhead structure
    if not sections:
        chunks = splitter.split_text(text.strip())
        return [c.strip() for c in chunks if len(c.strip()) > 50]

    all_chunks = []

    for header, content_lines in sections:
        content = '\n'.join(content_lines).strip()
        if not content:
            continue

        prefix = '[Paket: {}]\n'.format(header) if header else ''
        prefixed = prefix + content

        raw_chunks = splitter.split_text(prefixed)

        for chunk in raw_chunks:
            chunk = chunk.strip()
            if len(chunk) <= 50:
                continue
            # Re-inject header if the split removed it
            if header and '[Paket:' not in chunk:
                chunk = '[Paket: {}]\n{}'.format(header, chunk)
            all_chunks.append(chunk)

    return all_chunks
