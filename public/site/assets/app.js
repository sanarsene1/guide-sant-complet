const $=s=>document.querySelector(s),norm=s=>s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
const STOP='et ou de du la le les des un une avec chez sur en au aux'.split(' '),toks=q=>norm(q).split(/[^a-z0-9]+/).filter(w=>w&&!STOP.includes(w));
const CAT={poules:'Poules',chevres:'Chèvres',chiens:'Chiens',porcs:'Porcs',moutons:'Moutons',bovins:'Bovins',canards:'Canards',lapins:'Lapins',chats:'Chats',cobayes:'Cobayes',chevaux:'Chevaux',poissons:'Poissons',autres:'Autres',general:'Général'};
// Les 10 animaux les plus élevés en RDC, dans cet ordre, toujours en tête des listes.
const RDC_CATS=['poules','chevres','chiens','porcs','moutons','bovins','canards','lapins','chats','cobayes'];
const ORD=[...RDC_CATS,'chevaux','poissons','autres'],byOrd=(a,b)=>(ORD.indexOf(a)+1||99)-(ORD.indexOf(b)+1||99);
const uniq=(a,f)=>[...new Set(a.map(f))],sh=a=>a.map(x=>[Math.random(),x]).sort((x,y)=>x[0]-y[0]).map(x=>x[1]);
function chips(el,items,cb){el.innerHTML=items.map(([v,l,n],i)=>`<button class="chip${i?'':' on'}" data-v="${v}"><span>${l}</span>${n!=null?`<em>${n}</em>`:''}</button>`).join('');el.onclick=e=>{const b=e.target.closest('.chip');if(!b)return;setChip(el,b.dataset.v);cb(b.dataset.v)}}
function setChip(el,v){el.querySelectorAll('.chip').forEach(x=>x.classList.toggle('on',x.dataset.v==v))}
function go(p,P){if(window.VC_SPA){window.VCQ=P;location.hash='#'+p}else location.href=p+'.html?'+new URLSearchParams(P)}
const IMG={},CK='vc_img_v3',TC={Domestiques:'#dcefe4',Élevage:'#f6e6b8',Oiseaux:'#d3e5f1',Poissons:'#cbe7e9',Reptiles:'#dde8c6',Amphibiens:'#e7dcee',Insectes:'#f3dcc9',Autres:'#e4e8e2'};
try{Object.assign(IMG,JSON.parse(localStorage.getItem(CK)||'{}'))}catch(e){}if(typeof IMG_LOCAL!='undefined')Object.assign(IMG,IMG_LOCAL);
const sm=u=>u.replace(/\/\d+px-/,'/500px-');
const tile=a=>`<button class="tile" data-k="${a.key}" style="background:${TC[a.categorie]||'#e4e8e2'}">${IMG[a.key]?`<img loading="lazy" decoding="async" alt="${a.nom}" src="${sm(IMG[a.key])}" onerror="this.onerror=null;this.src='${IMG[a.key]}'">`:`<span class="ini">${a.nom[0]}</span>`}<span class="cap"><b>${a.nom}</b><small>${a.classe}</small></span></button>`;
const WT={Bovin:'Vache',Porc:'Cochon',Poule:'Poule',Mouton:'Mouton',Cobaye:"Cochon d'Inde",Abeille:'Abeille domestique',Souris:'Mus musculus',Rat:'Rattus norvegicus',Cerf:'Cerf élaphe',Ours:'Ours brun','Hippopotame nain':'Hippopotame pygmée',Python:'Pythonidae',Boa:'Boa constrictor',Crapaud:'Crapaud commun',Oie:'Oie domestique',Pigeon:'Pigeon biset',Caille:'Caille des blés',Faisan:'Faisan de Colchide',Paon:'Paon bleu',Cygne:'Cygne tuberculé',Perruche:'Perruche ondulée',Carpe:'Carpe commune',Truite:'Truite fario',Saumon:'Saumon atlantique',Thon:"Thon rouge de l'Atlantique",Sardine:'Sardine commune',Anguille:'Anguille européenne','Poisson combattant':'Betta splendens',Papillon:'Danaus plexippus',Criquet:'Criquet pèlerin','Ver de terre':'Lombric',Escargot:'Helix pomatia',Hérisson:'Erinaceus europaeus',Castor:"Castor d'Eurasie",Blaireau:'Blaireau européen',Dauphin:'Grand dauphin',Baleine:'Baleine à bosse',Manchot:'Manchot empereur',Aigle:'Aigle royal',Hibou:"Grand-duc d'Europe",Vautour:'Vautour fauve',Corbeau:'Grand corbeau','Martin-pêcheur':"Martin-pêcheur d'Europe",Mouette:'Mouette rieuse',Poulpe:'Octopus vulgaris',Méduse:'Aurelia aurita',Lama:'Lama glama',Hyène:'Hyène tachetée',Éléphant:'Loxodonta africana',Crocodile:'Crocodile du Nil',Alligator:"Alligator d'Amérique",Iguane:'Iguane vert',Salamandre:'Salamandre tachetée',Casoar:'Casoar à casque',Pintade:'Pintade de Numidie',Dindon:'Dindon domestique',Canard:'Canard colvert',Chat:'Chat domestique',Lapin:'Lapin domestique',Brebis:'Mouton',Buffle:'Bubalus bubalis'};
async function loadImgs(list,cb){const need=list.filter(a=>IMG[a.key]===undefined);
for(let i=0;i<need.length;i+=40){const part=need.slice(i,i+40),T=part.map(a=>WT[a.nom]||a.nom);
try{const r=await(await fetch('https://fr.wikipedia.org/w/api.php?action=query&format=json&origin=*&redirects=1&prop=pageimages&piprop=thumbnail&pithumbsize=500&titles='+encodeURIComponent(T.join('|')))).json(),Q=r.query||{},M={},P={};
(Q.normalized||[]).concat(Q.redirects||[]).forEach(x=>M[x.from]=x.to);Object.values(Q.pages||{}).forEach(p=>P[p.title]=p.thumbnail&&p.thumbnail.source);
part.forEach((a,k)=>{let t=T[k],s=0;while(M[t]&&s++<5)t=M[t];IMG[a.key]=P[t]||''})}catch(e){part.forEach(a=>IMG[a.key]=IMG[a.key]||'')}
cb&&cb()}
try{localStorage.setItem(CK,JSON.stringify(Object.fromEntries(Object.entries(IMG).filter(e=>e[1]))))}catch(e){}}
document.addEventListener('DOMContentLoaded',()=>{const b=document.querySelector('.burger');if(b)b.onclick=()=>b.setAttribute('aria-expanded',document.getElementById('nav').classList.toggle('open'))});
document.addEventListener('DOMContentLoaded',()=>{document.body.insertAdjacentHTML('afterbegin',`<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
<symbol id="i-home" viewBox="0 0 24 24"><path d="M12 2.5 1.8 11.6h3V21h5.6v-6h3.2v6h5.6v-9.4h3z"/></symbol>
<symbol id="i-paw" viewBox="0 0 24 24"><ellipse cx="4.6" cy="11" rx="2.1" ry="2.8"/><ellipse cx="9" cy="5.6" rx="2.2" ry="3"/><ellipse cx="15" cy="5.6" rx="2.2" ry="3"/><ellipse cx="19.4" cy="11" rx="2.1" ry="2.8"/><path d="M12 11c-3.3 0-6.4 3.8-6.4 6.5 0 2.2 1.9 2.8 3.7 2.2 1.1-.4 1.8-.6 2.7-.6s1.6.2 2.7.6c1.8.6 3.7 0 3.7-2.2C18.4 14.8 15.3 11 12 11z"/></symbol>
<symbol id="i-virus" viewBox="0 0 24 24"><circle cx="12" cy="12" r="5.2"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2.1 2.1M16.9 16.9 19 19M19 5l-2.1 2.1M7.1 16.9 5 19" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" fill="none"/><g><circle cx="12" cy="2" r="1.4"/><circle cx="12" cy="22" r="1.4"/><circle cx="2" cy="12" r="1.4"/><circle cx="22" cy="12" r="1.4"/></g></symbol>
<symbol id="i-bulb" viewBox="0 0 24 24"><path d="M12 1.8a6.7 6.7 0 0 0-3.900 12.2c.6.5.9 1 .9 1.7V17h6v-1.3c0-.7.3-1.2.9-1.7A6.7 6.7 0 0 0 12 1.8zM9 18.5h6v1.2a3 3 0 0 1-6 0z"/></symbol>
<symbol id="i-brain" viewBox="0 0 24 24"><mask id="bm"><rect width="24" height="24" fill="#fff"/><path d="M12 3.5v17M6.500 9.800c1.800 0 3 .9 3 2.400M17.500 9.800c-1.800 0-3 .9-3 2.400M6.800 15.600c1.600 0 2.700-.6 2.700-2M17.200 15.600c-1.600 0-2.700-.6-2.700-2" stroke="#000" stroke-width="1.500" stroke-linecap="round" fill="none"/></mask><g mask="url(#bm)"><circle cx="8.200" cy="8.600" r="4.800"/><circle cx="15.800" cy="8.600" r="4.800"/><circle cx="8" cy="15.600" r="4.600"/><circle cx="16" cy="15.600" r="4.600"/><rect x="8" y="8" width="8" height="12"/></g></symbol>
<symbol id="i-star" viewBox="0 0 24 24"><path d="m12 2 3 6.5 7 .8-5.2 4.8 1.4 7L12 17.600 5.8 21.1l1.4-7L2 9.3l7-.8z"/></symbol>
<symbol id="i-heart" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54z"/></symbol>
<symbol id="i-crown" viewBox="0 0 24 24"><path d="m2.5 7 4.8 4.2L12 4l4.7 7.2L21.5 7l-2 11.5h-15zM5 20h14v1.8H5z"/></symbol>
<symbol id="i-arr" viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" fill="none"/></symbol>
<symbol id="i-clip" viewBox="0 0 24 24"><path d="M8 3h8v3H8z"/><path d="M6 4.5H4.5v17h15v-17H18M8 12l1.5 1.5L12 11M8 17.5h8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/></symbol>
<symbol id="i-grid" viewBox="0 0 24 24"><rect x="2.5" y="2.5" width="8.5" height="8.5" rx="2"/><rect x="13" y="2.5" width="8.5" height="8.5" rx="2"/><rect x="2.5" y="13" width="8.5" height="8.5" rx="2"/><rect x="13" y="13" width="8.5" height="8.5" rx="2"/></symbol>
<symbol id="i-warn" viewBox="0 0 24 24"><path d="M12 3 1.8 20.5h20.4z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/><path d="M12 9.5v5M12 17.2v.3" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></symbol>
<symbol id="i-info" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9.3" fill="none" stroke="currentColor" stroke-width="1.9"/><path d="M12 10.6v6" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round"/><circle cx="12" cy="7.4" r="1.25"/></symbol>
<symbol id="i-med" viewBox="0 0 24 24"><path d="M9.6 3.5h4.8v6.1h6.1v4.8h-6.1v6.1H9.6v-6.1H3.5V9.6h6.1z" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/></symbol>
<symbol id="i-cap" viewBox="0 0 24 24"><path d="M12 4.2 1.8 9 12 13.8 22.2 9z"/><path d="M6 11.6v4.2c0 1.7 2.7 3 6 3s6-1.3 6-3v-4.2l-6 2.9z"/><path d="M20.6 9.6v5" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></symbol>
<symbol id="i-barn" viewBox="0 0 24 24"><path d="M3 9.6 12 3.4l9 6.2V21H3z" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"/><path d="M8.6 21v-6.8h6.8V21M8.6 14.2l6.8 6.8M15.4 14.2 8.6 21" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></symbol>
<symbol id="i-user" viewBox="0 0 24 24"><circle cx="12" cy="7.8" r="4.3"/><path d="M3.5 21.2c0-4.7 3.8-7.4 8.5-7.4s8.5 2.7 8.5 7.4z"/></symbol>
</defs></svg>`);
const n=document.getElementById('nav');if(!n)return;const L=[...n.querySelectorAll('a:not([data-p]):not([data-about]):not([data-mob="menu"])')];
const t=document.createElement('div');t.className='tabs';t.setAttribute('role','navigation');t.setAttribute('aria-label','Navigation principale');t.innerHTML=L.map(a=>`<a href="${a.getAttribute('href')}"${a.classList.contains('on')?' class="on" aria-current="page"':''}>${a.querySelector('svg').outerHTML}<span>${a.textContent}</span></a>`).join('');document.body.appendChild(t)});
/* Image skeletons: an <img class="sk"> shows a shimmer in its own frame until the photo arrives; text around it stays visible. */
(function(){const ok=(i,fade)=>{i.classList.add('sk-ok');if(fade)i.classList.add('sk-in')};
document.querySelectorAll('img.sk').forEach(i=>{if(i.complete&&i.naturalWidth){ok(i,false);return}
i.addEventListener('load',()=>ok(i,true),{once:true});i.addEventListener('error',()=>i.classList.add('sk-err'),{once:true})})})();

/* « À propos » : sur ordinateur, le survol affiche le message ; le clic n'ouvre pas la page. Sur téléphone (menu hamburger), le lien ouvre la page. */
(function(){const w=document.querySelector('.nav-about');if(!w)return;const a=w.querySelector('a'),mq=matchMedia('(min-width: 901px)');
a.addEventListener('click',e=>{if(mq.matches){e.preventDefault();w.classList.toggle('show')}});
document.addEventListener('click',e=>{if(!w.contains(e.target))w.classList.remove('show')});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){w.classList.remove('show');w.classList.add('hush');a.blur()}});w.addEventListener('mouseleave',()=>{w.classList.remove('show','hush')})})();


/* « Avis important » : le texte s'écrit comme une réponse d'IA, s'efface, puis recommence à l'infini. */
(function(){const notes=[...document.querySelectorAll('.vnote')];if(!notes.length||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
const wait=ms=>new Promise(r=>setTimeout(r,ms));
notes.forEach(n=>{const ps=[...n.querySelectorAll('.vnote-t,.vnote-s')];if(!ps.length)return;
const caret=document.createElement('span');caret.className='vt-caret';caret.setAttribute('aria-hidden','true');
const items=ps.map(p=>{const txt=p.textContent.trim();p.classList.add('vt');p.textContent='';
/* Une seule copie lisible du texte (le fantôme transparent) : la copie, la sélection et les lecteurs d'écran ne le voient qu'une fois. */
const gh=document.createElement('span');gh.className='vt-ghost';gh.textContent=txt;
const lv=document.createElement('span');lv.className='vt-live';lv.setAttribute('aria-hidden','true');
const out=document.createTextNode('');lv.append(out);p.append(gh,lv);return{txt,lv,out}});
let seen=false;new IntersectionObserver(es=>{seen=es.some(e=>e.isIntersecting)}).observe(n);
const put=(it,s)=>{it.out.nodeValue=s;it.lv.append(caret)};
(async function loop(){put(items[0],'');for(;;){
while(!seen)await wait(300);
n.classList.add('vt-typing');
for(const it of items){for(let i=1;i<=it.txt.length;i++){put(it,it.txt.slice(0,i));const c=it.txt[i-1];await wait(/[.,:;!?]/.test(c)?260:22+Math.random()*34)}await wait(380)}
n.classList.remove('vt-typing');await wait(3200);
n.classList.add('vt-typing');
for(const it of [...items].reverse()){for(let i=it.txt.length-1;i>=0;i--){put(it,it.txt.slice(0,i));await wait(9)}}
n.classList.remove('vt-typing');put(items[0],'');await wait(700)}})()})})();

/* Compte : une fois connecté, « Mon compte » devient le prénom + la photo (ou la première lettre sur une pastille colorée).
   La page /espace-veterinaire tient à jour localStorage['vc-account'] = {name, initial, avatar, color}. */
function vcAccount(){
  let a=null;try{a=JSON.parse(localStorage.getItem('vc-account')||'null')}catch(e){}
  /* Tous les liens « Mon compte » mènent directement à l’espace compte : il ouvre le compte si la
     session existe et ne renvoie vers la connexion que si personne n’est connecté. */
  document.querySelectorAll('a[href="/espace-veterinaire"],a[data-acct]').forEach(l=>{l.dataset.acct='1';l.setAttribute('href','/mon-compte')});
  document.querySelectorAll('a[data-acct][data-mob="menu"]').forEach(l=>{
    if(!l.dataset.orig)l.dataset.orig=l.innerHTML;
    if(!a||!a.name){l.innerHTML=l.dataset.orig;l.classList.remove('vc-me');l.removeAttribute('aria-label');return}
    const first=String(a.name).split(/\s+/)[0],c=Number(a.color)%6||0;
    const av=document.createElement('span');av.className='vc-av';av.dataset.c=c;av.setAttribute('aria-hidden','true');
    const ini=()=>{av.textContent=a.initial||first.charAt(0).toUpperCase()};
    if(a.avatar){const im=new Image();im.alt='';im.referrerPolicy='no-referrer';im.src=a.avatar;im.onerror=()=>{im.remove();ini()};av.appendChild(im)}else ini();
    const t=document.createElement('span');t.className='vc-me-n';t.textContent=first;
    l.replaceChildren(av,t);l.classList.add('vc-me');l.setAttribute('aria-label','Mon compte : '+a.name);l.title=a.name;
  });
}
document.addEventListener('DOMContentLoaded',vcAccount);
window.addEventListener('storage',e=>{if(e.key==='vc-account')vcAccount()});
/* Réseau lent : dès qu'on touche « Mon compte », une barre et « Ouverture de votre compte… » s'affichent,
   pour que la personne voie que ça charge au lieu de cliquer encore. */
document.addEventListener('click',e=>{
  const l=e.target.closest&&e.target.closest('a[data-acct]');
  if(!l||e.defaultPrevented||e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey||l.target==='_blank')return;
  if(document.querySelector('.vc-go'))return;
  const b=document.createElement('div');b.className='vc-go';b.setAttribute('role','status');
  b.innerHTML='<span class="vc-go-bar" aria-hidden="true"></span><span class="vc-go-t">Ouverture de votre compte…</span>';
  document.body.appendChild(b);
});
window.addEventListener('pageshow',()=>{const b=document.querySelector('.vc-go');if(b)b.remove()});
