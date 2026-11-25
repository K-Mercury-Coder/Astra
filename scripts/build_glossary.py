#!/usr/bin/env python3
"""ASTRA site build: automatically index glossary, formulas, and models.
No external Python packages. Usage: python3 scripts/build_glossary.py
"""
import json
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SITE = ROOT / '_site'

def die(msg):
    raise SystemExit('ASTRA build error: ' + msg)

def collect(folder, kind):
    src = ROOT / 'content' / folder
    if not src.is_dir():
        die(f'Missing content/{folder}')
    data = []
    seen = set()
    for path in sorted(src.glob('*.json')):
        if path.name in ('manifest.json',) or path.name.endswith('-index.json'):
            continue
        try:
            obj = json.loads(path.read_text(encoding='utf8'))
        except (ValueError, UnicodeError) as ex:
            die(f'{path.relative_to(ROOT)}: {ex}')
        if not isinstance(obj, dict):
            die(f'{path}: expected a JSON object')
        key_field = 'term' if kind == 'glossary' else 'slug'
        val = obj.get(key_field)
        if not isinstance(val, str) or not val.strip():
            die(f'{path}: missing {key_field}')
        key = val.strip().casefold()
        if key in seen:
            die(f'{path}: duplicate {key_field}: {val}')
        seen.add(key)
        if kind == 'glossary':
            if isinstance(obj.get('definition'), list):
                obj['definition'] = '\n\n'.join(obj['definition'])
            if not isinstance(obj.get('definition', ''), str):
                die(f'{path}: definition must be text')
            if not isinstance(obj.get('related', []), list):
                die(f'{path}: related must be a list')
        if kind == 'formulas':
            if not isinstance(obj.get('title'), str) or not isinstance(obj.get('expression'), str):
                die(f'{path}: formula needs title and expression')
        if kind == 'models':
            model_file = obj.get('file', '')
            if not isinstance(model_file, str) or not model_file.startswith('models/') or not (ROOT / model_file).is_file():
                die(f'{path}: model file missing (models/...)')
        data.append(obj)
    data.sort(key=lambda x:(str(x.get('unit', '')), str(x.get('category', '')).casefold(), str(x.get('title', x.get('term', ''))).casefold()))
    return data

def main():
    if not (ROOT / 'index.html').exists():
        die('index.html must exist in repository root')
    if SITE.exists(): shutil.rmtree(SITE)
    SITE.mkdir()
    for item in ['index.html', 'learning.html', '.nojekyll', 'css', 'js', 'models', 'assets']:
        src = ROOT / item
        if src.is_dir(): shutil.copytree(src, SITE / item)
        elif src.is_file(): shutil.copy2(src, SITE / item)
    (SITE / '.nojekyll').touch(exist_ok=True)
    out = SITE / 'content'
    out.mkdir(exist_ok=True)
    for folder,kind,name in [('glossary','glossary','glossary-index.json'),('formulas','formulas','formula-index.json'),('models','models','model-index.json')]:
        items = collect(folder,kind)
        (out/name).write_text(json.dumps(items,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
        print(f'{name}: {len(items)} items')
    print('Site built at _site/')

if __name__ == '__main__':
    main()
