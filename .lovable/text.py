import json,re,os,sys,requests,concurrent.futures as cf,time
ROOT='/dev-server/public/site'
src=open(ROOT+'/data/maladies.js').read()
MAL=json.loads(src[src.index('['):src.rindex(']')+1])
OUT='/dev-server/.lovable/fiches-work.jsonl'
done=set()
if os.path.exists(OUT):
  for l in open(OUT):
    try: done.add(json.loads(l)['key'])
    except: pass
K=os.environ['LOVABLE_API_KEY']
def slug(s): 
  import unicodedata
  s=unicodedata.normalize('NFKD',s).encode('ascii','ignore').decode().lower()
  return re.sub(r'[^a-z0-9]+','-',s).strip('-')
SCHEMA={"type":"object","additionalProperties":False,"required":["d","sy","ca","pg","pr"],"properties":{k:{"type":"array","items":{"type":"string"}} for k in ["d","sy","ca","pg","pr"]}}
def one(m):
  key=m['c']+'|'+m['t']
  p=f"""Tu rédiges une fiche éducative en français simple pour éleveurs et étudiants (Afrique francophone) sur la maladie « {m['t']} » chez l'animal : {m['a']}.
Données connues : signes : {m['s']} Résumé : {m['r']} Que faire : {' '.join(m['f'])} Prévention : {' '.join(m['p'])}
Rends un JSON :
- d : 2 ou 3 paragraphes (3 à 5 phrases chacun) qui expliquent la maladie : ce que c'est, qui est touché, évolution, gravité.
- sy : 5 à 7 éléments au format « Nom du symptôme : explication en 1 à 2 phrases de ce qu'on observe et pourquoi ».
- ca : 4 à 6 éléments au format « Cause ou voie de transmission : explication en 1 à 2 phrases ».
- pg : 5 à 7 premiers gestes concrets, chacun une phrase complète qui explique aussi pourquoi. Jamais de dose de médicament ; renvoyer au vétérinaire pour tout traitement.
- pr : 5 à 7 moyens de prévention, chacun une phrase complète expliquée.
Pas de markdown. Apostrophes typographiques ’."""
  for a in range(6):
    try:
      r=requests.post('https://ai.gateway.lovable.dev/v1/chat/completions',headers={'Authorization':'Bearer '+K},json={"model":"google/gemini-3-flash-preview","messages":[{"role":"user","content":p}],"response_format":{"type":"json_schema","json_schema":{"name":"fiche","strict":True,"schema":SCHEMA}}},timeout=120)
      if r.status_code==429 or r.status_code>=500: time.sleep(5*(a+1)); continue
      r.raise_for_status()
      d=json.loads(r.json()['choices'][0]['message']['content'])
      if len(d['d'])>=2 and len(d['sy'])>=5 and len(d['ca'])>=4 and len(d['pg'])>=5 and len(d['pr'])>=5:
        d['key']=key; d['im']=slug(m['c']+'-'+m['t'])+'.webp'; return d
    except Exception as e: print('err',key,e,file=sys.stderr); time.sleep(3)
  return None
todo=[m for m in MAL if m['c']+'|'+m['t'] not in done][:int(sys.argv[1]) if len(sys.argv)>1 else 9999]
with cf.ThreadPoolExecutor(12) as ex, open(OUT,'a') as f:
  for d in ex.map(one,todo):
    if d: f.write(json.dumps(d,ensure_ascii=False)+'\n'); f.flush()
print('total', sum(1 for _ in open(OUT)))
