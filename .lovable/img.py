import json,os,sys,base64,io,requests,concurrent.futures as cf,time,re
from PIL import Image
ROOT='/dev-server/public/site'
src=open(ROOT+'/data/maladies.js').read()
MAL=json.loads(src[src.index('['):src.rindex(']')+1])
D=ROOT+'/assets/img/maladies'; os.makedirs(D,exist_ok=True)
K=os.environ['LOVABLE_API_KEY']
import unicodedata
def slug(s):
  s=unicodedata.normalize('NFKD',s).encode('ascii','ignore').decode().lower(); return re.sub(r'[^a-z0-9]+','-',s).strip('-')
def one(m):
  fn=D+'/'+slug(m['c']+'-'+m['t'])+'.webp'
  if os.path.exists(fn): return 'skip'
  p=f"Realistic documentary photograph, natural light, of a {m['a']} (animal) in a rural African farm or home setting, showing visible signs of illness: {m['s']} Context: veterinary education about {m['t']}. No text, no people's faces, not gory, landscape 3:2."
  for a in range(5):
    try:
      r=requests.post('https://ai.gateway.lovable.dev/v1/chat/completions',headers={'Authorization':'Bearer '+K},json={"model":"google/gemini-3.1-flash-image","messages":[{"role":"user","content":p}],"modalities":["image","text"]},timeout=180)
      if r.status_code==429 or r.status_code>=500: time.sleep(8*(a+1)); continue
      r.raise_for_status(); msg=r.json()['choices'][0]['message']
      url=msg['images'][0]['image_url']['url']
      im=Image.open(io.BytesIO(base64.b64decode(url.split(',',1)[1]))).convert('RGB')
      w,h=im.size; th=int(w*2/3)
      if th<=h: im=im.crop((0,(h-th)//2,w,(h-th)//2+th))
      else: tw=int(h*1.5); im=im.crop(((w-tw)//2,0,(w-tw)//2+tw,h))
      im.resize((1200,800)).save(fn,'WEBP',quality=55); return 'ok'
    except Exception as e: print('err',m['t'],repr(e)[:200],file=sys.stderr); time.sleep(4)
  return 'fail'
L=MAL[:int(sys.argv[1])] if len(sys.argv)>1 else MAL
with cf.ThreadPoolExecutor(10) as ex: print(list(ex.map(one,L)).count('ok'))
