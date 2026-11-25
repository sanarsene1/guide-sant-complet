# Builds public/site/data/maladies-fiches.js from .lovable/fiches-work.jsonl (generated disease texts).
import json
F={}
for l in open('/dev-server/.lovable/fiches-work.jsonl'):
  d=json.loads(l); k=d.pop('key'); F[k]=d
with open('/dev-server/public/site/data/maladies-fiches.js','w') as f:
  f.write('/* Fiches détaillées par maladie, clé « espèce|nom » : d présentation, sy symptômes, ca causes, pg premiers gestes, pr prévention, im photo (assets/img/maladies). */\nconst FICHES='+json.dumps(F,ensure_ascii=False,separators=(',',':'))+';\n')
print(len(F))
