#!/usr/bin/env bash
set -euo pipefail

tag="${1:-}"
file="${2:-helm/atelier/values-production.yaml}"

if [[ -z "${tag}" ]]; then
  printf 'usage: bump-image-tag.sh <tag> [values-file]\n' >&2
  exit 1
fi

if [[ ! "${tag}" =~ ^[A-Za-z0-9_][A-Za-z0-9_.-]{0,127}$ ]]; then
  printf 'error: image tag contains unexpected characters\n' >&2
  exit 1
fi

python3 - "${file}" "${tag}" <<'PY'
import pathlib
import re
import sys

path = pathlib.Path(sys.argv[1])
tag = sys.argv[2]
text = path.read_text()
pattern = re.compile(r'(?m)^(\s*tag:\s*")[^"]*("\s*# deploy-image-tag\s*)$')
new, count = pattern.subn(lambda match: f"{match.group(1)}{tag}{match.group(2)}", text)
if count != 1:
    raise SystemExit(f"expected exactly one deploy image tag, found {count}")
path.write_text(new)
PY
