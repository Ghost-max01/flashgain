"""Narrow codemod: JSON.parse(storageValue) -> safeParse(storageValue, fallback).

Only touches single lines matching these shapes (all observed crash sites):
  1. X ? JSON.parse(X) : []        -> safeParse(X, [])
  2. X ? JSON.parse(X) : {}        -> safeParse(X, {})
  3. X ? JSON.parse(X) : null      -> safeParse(X, null)
  4. JSON.parse(A || "[]")         -> safeParse(A, [])
  5. JSON.parse(A || "{}")         -> safeParse(A, {})
  6. set*(JSON.parse(X))           -> set*(safeParse(X, null))
     (setUserData/setUserInfo/setLoanData/setFormData/setTransactions/...)
  7. = JSON.parse(X) / : JSON.parse(X) / (JSON.parse(X) / , JSON.parse(X)
     -> safeParse(X, null)   (assignment/arg shapes; storage vars only)
  8. JSON.parse(X)?.              -> safeParse(X, null)?.

Shape 7 is restricted to args whose text mentions storage-ish identifiers
(stored/localStorage/sessionStorage/raw/existing/decoded/cooldown/complet/
transact/notif/formData/loanData/userInfo) so API-response parses are untouched.

Adds `import { safeParse } from "@/lib/safe-storage";` when a file is changed
and lacks it. Preserves CRLF. DRY_RUN=1 prints diffs without writing.
"""
import os
import re
import sys
import difflib

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DRY_RUN = os.environ.get("DRY_RUN", "1") == "1"
IMPORT_LINE = 'import { safeParse } from "@/lib/safe-storage";'

SKIP_DIRS = ("app/dashboard/", "node_modules/", ".next/")
SKIP_FILES = {"lib/session-client.ts", "lib/safe-storage.ts"}

STORAGE_HINT = re.compile(
    r"stored|localStorage|sessionStorage|\braw\b|existing|decoded|"
    r"cooldown|complet|transact|notif|formData|loanData|userInfo|"
    r"persisted|saved|meta",
    re.IGNORECASE,
)

PATS = [
    # 1-3: ternary with same var
    (re.compile(r"(\b[\w.()\"'\[\]]+?) \? JSON\.parse\(\1\) : \[\]"), None),
    (re.compile(r"(\b[\w.()\"'\[\]]+?) \? JSON\.parse\(\1\) : \{\}"), None),
    (re.compile(r"(\b[\w.()\"'\[\]]+?) \? JSON\.parse\(\1\) : null"), None),
    # 4-5: fallback literal inside parse (spacing-tolerant, incl. "null")
    (re.compile(r'JSON\.parse\((.+?)\s*\|\|\s*"(\[\]|\{\}|null)"\)'), None),
    # 8: optional chaining stays working on null fallback
    (re.compile(r"JSON\.parse\(([^()]+?)\)\?\."), None),
    # 6: setState wrappers (spacing-tolerant)
    (re.compile(r"\b(set\w+)\(\s*JSON\.parse\(([^()]+?)\)\)"), None),
    # 7: assignment / call-arg / return shapes (spacing-tolerant)
    (re.compile(r"(=|\(|,|:|return )\s*JSON\.parse\s*\(([^()]+?)\)"), None),
]


def fallback_for(kind: int, inner: str) -> str:
    if kind in (0, 3):
        return "[]"
    if kind in (1, 4):
        return "{}"
    return "null"


def transform_line(line: str):
    """Return new line or None if untouched."""
    if "JSON.parse" not in line or "safeParse" in line:
        return None
    original = line
    # kinds 0..2: ternary
    for kind in (0, 1, 2):
        m = PATS[kind][0].search(line)
        if m:
            var = m.group(1)
            line = (
                line[: m.start()]
                + f"safeParse({var}, {fallback_for(kind, var)})"
                + line[m.end():]
            )
            return line if line != original else None
    # kind 3: literal fallback (spacing-tolerant: [], {} or null)
    m = PATS[3][0].search(line)
    if m:
        inner, lit = m.group(1), m.group(2)
        fb = "[]" if lit == "[]" else ("{}" if lit == "{}" else "null")
        line = (
            line[: m.start()]
            + f"safeParse({inner}, {fb})"
            + line[m.end():]
        )
        return line if line != original else None
    # kind 4: optional chain
    m = PATS[4][0].search(line)
    if m:
        inner = m.group(1)
        if STORAGE_HINT.search(inner):
            line = line[: m.start()] + f"safeParse({inner}, null)?." + line[m.end():]
            return line if line != original else None
        return None
    # kind 5: setState
    m = PATS[5][0].search(line)
    if m:
        setter, inner = m.group(1), m.group(2)
        if STORAGE_HINT.search(inner):
            line = (
                line[: m.start()]
                + f"{setter}(safeParse({inner}, null))"
                + line[m.end():]
            )
            return line if line != original else None
        return None
    # kind 6: assignment/arg shapes
    m = PATS[6][0].search(line)
    if m:
        prefix, inner = m.group(1), m.group(2)
        if STORAGE_HINT.search(inner):
            line = (
                line[: m.start()]
                + f"{prefix}safeParse({inner}, null)"
                + line[m.end():]
            )
            return line if line != original else None
    return None


def process_file(path: str):
    with open(path, "r", encoding="utf-8", newline="") as f:
        content = f.read()
    lines = content.split("\n")
    changed = False
    out = []
    for line in lines:
        eol = ""
        body = line
        if body.endswith("\r"):
            eol = "\r"
            body = body[:-1]
        new_body = transform_line(body)
        if new_body is not None:
            body = new_body
            changed = True
        out.append(body + eol)
    if not changed:
        return None
    new_content = "\n".join(out)
    if 'safeParse' in content and '@lib/safe-storage' not in content and 'lib/safe-storage' not in content:
        pass
    if "@/lib/safe-storage" not in new_content:
        # insert import after last top-level import
        idxs = [
            i for i, l in enumerate(out)
            if re.match(r'^(import |from )', l.strip()) or l.strip().startswith("import ")
        ]
        insert_at = (idxs[-1] + 1) if idxs else 0
        # keep CRLF style of neighbours
        sample = out[insert_at - 1] if insert_at > 0 else (out[0] if out else "")
        cr = "\r" if sample.endswith("\r") else ""
        out.insert(insert_at, IMPORT_LINE + cr)
        new_content = "\n".join(out)
    return new_content


def main():
    targets = []
    for dirpath, _dirnames, filenames in os.walk(os.path.join(ROOT, "app")):
        for fn in filenames:
            if not fn.endswith((".ts", ".tsx")):
                continue
            full = os.path.join(dirpath, fn)
            rel = os.path.relpath(full, ROOT).replace(os.sep, "/")
            if rel.startswith(SKIP_DIRS) or rel in SKIP_FILES:
                continue
            targets.append((rel, full))
    for sub in ("lib", "components", "hooks", "services"):
        d = os.path.join(ROOT, sub)
        if not os.path.isdir(d):
            continue
        for dirpath, _d, filenames in os.walk(d):
            for fn in filenames:
                if not fn.endswith((".ts", ".tsx")):
                    continue
                full = os.path.join(dirpath, fn)
                rel = os.path.relpath(full, ROOT).replace(os.sep, "/")
                if rel in SKIP_FILES:
                    continue
                targets.append((rel, full))
    diffs = 0
    for rel, full in sorted(targets):
        try:
            new_content = process_file(full)
        except Exception as e:  # noqa: BLE001 - report and continue
            print(f"SKIP {rel}: {e}")
            continue
        if new_content is None:
            continue
        with open(full, "r", encoding="utf-8", newline="") as f:
            old = f.read()
        diff = "".join(
            difflib.unified_diff(
                old.splitlines(keepends=True),
                new_content.splitlines(keepends=True),
                fromfile=f"a/{rel}",
                tofile=f"b/{rel}",
            )
        )
        print(diff)
        diffs += 1
        if not DRY_RUN:
            with open(full, "w", encoding="utf-8", newline="") as f:
                f.write(new_content)
    print(f"\n{'WOULD change' if DRY_RUN else 'Changed'} {diffs} files.", file=sys.stderr)


if __name__ == "__main__":
    main()
