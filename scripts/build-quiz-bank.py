"""Compile reviewed multilingual knowledge checks; never calls an external AI API."""
import json, pathlib, re, sqlite3
root = pathlib.Path(__file__).resolve().parents[1]
locales = ['uz', 'ru', 'en', 'kaa']
groups, group = {}, ''
for line in (root / 'scripts/quiz-content.txt').read_text().splitlines():
    if not line.strip() or line.startswith('#'): continue
    if line.startswith('['):
        group = line[1:-1]; groups[group] = []; continue
    parts = line.split('|')
    assert len(parts) == 4, (group, line)
    fact, answer = {}, {}
    for lang, part in zip(locales, parts):
        matches = re.findall(r'\{([^{}]+)\}', part)
        assert len(matches) == 1, (group, lang, part)
        fact[lang] = part.replace('{'+matches[0]+'}', '{}')
        answer[lang] = matches[0]
    groups[group].append(dict(id=f'{group}-{len(groups[group])+1:02}', fact=fact, answer=answer))
mapping = {
 'eng-kop-beriladigan-savollarga-qisqa-javoblar': ['register','patient'],
 'tizimga-kirish':['access'], 'royxatga-oluvchi':['register','patient'],
 'amaliyotchi-hamshira':['nursing','patronage'], 'patronaj-hamshirasi':['patronage','nursing'],
 'shifokor':['care','inpatient'], 'qabul-bolimining-navbatchi-shifokorhamshirasi':['inpatient','register'],
 'shifoxonaning-davolovchi-shifokor':['inpatient','care'], 'shifoxona-tor-mutaxassis-korik-tartibi':['care','inpatient'],
 'laborant':['lab','devices'], 'taqrizchi-qayta-korib-chiquvchi':['review','rx'],
 'direktor':['director','reporting'], 'statist':['reporting','kpi'], 'farmasevt':['rx','review'],
 'ombor-mudiri':['warehouse'], 'buxgalter':['finance'], 'kassir':['finance'],
 'bosh-hamshira':['nursing','warehouse:10'], 'hamshira':['nursing','care'],
 'bemor':['patient','access:10'], 'kpi-asosiy-samaradorlik-korsatkichlari':['kpi','reporting'],
 'yangi-omborxona':['warehouse'], 'muxlisa-ilovasini-ornatish':['muxlisa','queue'],
 'violation-report':['violation'], 'electron-queue':['queue','muxlisa'], 'tech-settings':['devices','queue']
}
source = {'access':'tizimga-kirish','register':'royxatga-oluvchi','care':'shifokor','inpatient':'shifoxonaning-davolovchi-shifokor','nursing':'hamshira','patronage':'patronaj-hamshirasi','lab':'laborant','rx':'farmasevt','review':'taqrizchi-qayta-korib-chiquvchi','finance':'kassir','warehouse':'yangi-omborxona','director':'direktor','reporting':'statist','kpi':'kpi-asosiy-samaradorlik-korsatkichlari','patient':'bemor','devices':'tech-settings','muxlisa':'electron-queue','queue':'electron-queue','violation':'violation-report'}
questions = {q['id']:{**q,'source':source[g]} for g,items in groups.items() for q in items}
sections = {}
for slug, topics in mapping.items():
    rows = []
    for spec in topics:
        name, _, cap = spec.partition(':')
        rows += groups[name][:int(cap)] if cap else groups[name]
    assert len(rows) == len({r['id'] for r in rows}) == 20, (slug, len(rows))
    sections[slug] = [r['id'] for r in rows]
db=sqlite3.connect('file:'+str(root/'data/nazarov.db')+'?mode=ro',uri=True)
assert set(sections) == {r[0] for r in db.execute('select slug from categories')}
db.close()
(root/'src/data/quiz-bank.json').write_text(json.dumps({'version':'2026-11-13.1','questions':questions,'sections':sections},ensure_ascii=False,separators=(',',':'))+'\n')
(root/'src/data/quiz-section-slugs.json').write_text(json.dumps(list(sections),ensure_ascii=False)+'\n')
print(f'Compiled {len(questions)} knowledge checks, {len(sections)} sections × 20, {len(locales)} languages')
