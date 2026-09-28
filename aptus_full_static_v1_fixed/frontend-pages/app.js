/* APTUS 1.0 — runtime local database using IndexedDB.
   This keeps the GitHub Pages build self-contained. The project also ships
   database/schema.sql with the corresponding PostgreSQL schema (10 tables).
*/
const DB_NAME = 'aptus_v1';
const DB_VERSION = 1;
const STORES = ['users','user_profiles','nutritionists','posts','comments','likes','recipes','follows','consultations','messages'];
const state = { db:null, session:null, view:'home', authMode:'user' };

const $ = (s,root=document)=>root.querySelector(s);
const $$ = (s,root=document)=>[...root.querySelectorAll(s)];

function uid(prefix='id'){ return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2,8)}`; }
function initials(name='Aptus'){ return name.split(/\s+/).slice(0,2).map(x=>x[0]).join('').toUpperCase(); }
function escapeHtml(s=''){ return String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
function now(){ return new Date().toISOString(); }
function fmtDate(v){ return new Date(v).toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'}); }
function toast(msg){ const el=$('#toast'); el.textContent=msg; el.classList.add('show'); clearTimeout(toast.t); toast.t=setTimeout(()=>el.classList.remove('show'),2400); }

function openDb(){
  return new Promise((resolve,reject)=>{
    const req=indexedDB.open(DB_NAME,DB_VERSION);
    req.onupgradeneeded=e=>{
      const db=e.target.result;
      const keyPath='id';
      const make=(name)=>{ if(!db.objectStoreNames.contains(name)) db.createObjectStore(name,{keyPath}); };
      STORES.forEach(make);
      const indexes={
        users:['username','email','role'], user_profiles:['userId'], nutritionists:['userId'], posts:['authorId','createdAt'],
        comments:['postId','authorId'], likes:['postId','userId'], recipes:['authorId'], follows:['followerId','followingId'],
        consultations:['userId','nutritionistId','status'], messages:['conversationId','senderId','receiverId']
      };
      Object.entries(indexes).forEach(([store,fields])=>{
        const os=e.target.transaction.objectStore(store);
        fields.forEach(f=>{ if(!os.indexNames.contains(f)) os.createIndex(f,f,{unique:false}); });
      });
    };
    req.onsuccess=e=>resolve(e.target.result);
    req.onerror=()=>reject(req.error);
  });
}
function tx(store,mode='readonly'){ return state.db.transaction(store,mode).objectStore(store); }
function getAll(store){ return new Promise((resolve,reject)=>{const r=tx(store).getAll(); r.onsuccess=()=>resolve(r.result); r.onerror=()=>reject(r.error);}); }
function getOne(store,id){ return new Promise((resolve,reject)=>{const r=tx(store).get(id); r.onsuccess=()=>resolve(r.result); r.onerror=()=>reject(r.error);}); }
function put(store,obj){ return new Promise((resolve,reject)=>{const r=tx(store,'readwrite').put(obj); r.onsuccess=()=>resolve(obj); r.onerror=()=>reject(r.error);}); }
function remove(store,id){ return new Promise((resolve,reject)=>{const r=tx(store,'readwrite').delete(id); r.onsuccess=()=>resolve(); r.onerror=()=>reject(r.error);}); }

async function seed(){
  const existing=await getAll('users');
  if(existing.length) return;
  const lucas={id:'u_lucas',username:'lucas',email:'lucas@aptus.demo',password:'Aptus@123',role:'user',name:'Lucas Almeida',createdAt:now()};
  const marina={id:'u_marina',username:'marina.nutri',email:'marina@aptus.demo',password:'Aptus@123',role:'nutritionist',name:'Marina Oliveira',createdAt:now()};
  const bia={id:'u_bia',username:'bia.fit',email:'bia@aptus.demo',password:'demo123',role:'user',name:'Beatriz Lima',createdAt:now()};
  const joao={id:'u_joao',username:'joao.s',email:'joao@aptus.demo',password:'demo123',role:'user',name:'João Santos',createdAt:now()};
  for(const u of [lucas,marina,bia,joao]) await put('users',u);
  for(const p of [
    {id:'p_lucas',userId:lucas.id,bio:'Ajustando a rotina, sem radicalismo.',goal:'Melhorar hábitos',city:'Barra do Garças - MT',streak:12},
    {id:'p_bia',userId:bia.id,bio:'Receitas fáceis e vida ativa.',goal:'Mais constância',city:'Goiânia - GO',streak:7},
    {id:'p_joao',userId:joao.id,bio:'Começando do básico.',goal:'Mais disposição',city:'Cuiabá - MT',streak:4}
  ]) await put('user_profiles',p);
  await put('nutritionists',{id:'n_marina',userId:marina.id,crn:'CRN 1/12345',specialty:'Comportamento alimentar',rating:4.9,about:'Atendimento focado em educação nutricional e construção de hábitos sustentáveis.',availability:'Seg–Sex, 8h–18h'});
  await put('posts',{id:'post_1',authorId:marina.id,type:'recipe',title:'Pão de queijo de frigideira',body:'Uma opção rápida para um café da manhã simples. Experimente adaptar os ingredientes à sua rotina.',cover:'🍳',tone:'orange',createdAt:now()});
  await put('posts',{id:'post_2',authorId:bia.id,type:'curiosity',title:'Por que a fibra ajuda na saciedade?',body:'Ela participa da formação do bolo alimentar e pode ajudar a manter a sensação de saciedade ao longo do dia.',cover:'🥑',tone:'berry',createdAt:new Date(Date.now()-86400000).toISOString()});
  await put('posts',{id:'post_3',authorId:marina.id,type:'habit',title:'Seu prato não precisa ser perfeito',body:'Consistência costuma ser mais útil do que buscar 100% de perfeição em todas as refeições.',cover:'🥗',tone:'green',createdAt:new Date(Date.now()-172800000).toISOString()});
  await put('recipes',{id:'r_1',authorId:marina.id,title:'Bowl de frango e legumes',description:'Montagem simples para almoço.',ingredients:'Frango em cubos\nArroz\nBrócolis\nCenoura\nAzeite e temperos',steps:'1. Grelhe o frango.\n2. Cozinhe os legumes.\n3. Monte o bowl e finalize com azeite.',prepTime:'25 min'});
  await put('recipes',{id:'r_2',authorId:bia.id,title:'Overnight oats de banana',description:'Café da manhã prático para deixar pronto.',ingredients:'Aveia\nIogurte\nBanana\nCanela',steps:'Misture tudo em um pote, leve à geladeira e finalize com banana pela manhã.',prepTime:'5 min + geladeira'});
  await put('follows',{id:'f_1',followerId:lucas.id,followingId:marina.id});
  await put('consultations',{id:'c_1',userId:lucas.id,nutritionistId:marina.id,date:new Date(Date.now()+3*86400000).toISOString(),status:'Agendada',notes:'Primeira conversa sobre rotina.'});
  await put('messages',{id:'m_1',conversationId:'conv_lucas_marina',senderId:marina.id,receiverId:lucas.id,text:'Oi, Lucas! Como está a adaptação à nova rotina?',createdAt:new Date(Date.now()-3600000).toISOString()});
  await put('messages',{id:'m_2',conversationId:'conv_lucas_marina',senderId:lucas.id,receiverId:marina.id,text:'Estou conseguindo manter o café da manhã com mais regularidade.',createdAt:new Date(Date.now()-3000000).toISOString()});
}

async function currentUser(){ return state.session ? getOne('users',state.session.userId) : null; }
async function userProfile(userId){ return (await getAll('user_profiles')).find(x=>x.userId===userId) || null; }
async function currentNutri(){ const u=await currentUser(); if(!u) return null; return (await getAll('nutritionists')).find(n=>n.userId===u.id) || null; }

function setAuthMode(mode){
  state.authMode=mode;
  $$('.auth-tab').forEach(b=>b.classList.toggle('active',b.dataset.auth===mode));
  $('#user-login-form').classList.toggle('hidden',mode!=='user');
  $('#nutritionist-login-form').classList.toggle('hidden',mode!=='nutritionist');
}

async function login(username,password,role){
  const users=await getAll('users');
  const user=users.find(u=>u.role===role && (u.username===username || u.email===username) && u.password===password);
  if(!user){ toast('Usuário ou senha incorretos.'); return; }
  state.session={userId:user.id,role:user.role}; localStorage.setItem('aptus_session',JSON.stringify(state.session));
  showApp();
}
function logout(){ localStorage.removeItem('aptus_session'); state.session=null; $('#app-view').classList.add('hidden'); $('#auth-view').classList.remove('hidden'); setAuthMode('user'); }

async function showApp(){
  $('#auth-view').classList.add('hidden'); $('#app-view').classList.remove('hidden');
  const u=await currentUser(); $('#header-profile').innerHTML=`<span class="avatar" style="width:28px;height:28px;font-size:10px">${initials(u.name)}</span>${escapeHtml(u.name.split(' ')[0])}`;
  const isNutri=u.role==='nutritionist'; $('#user-nav').classList.toggle('hidden',isNutri); $('#nutritionist-nav').classList.toggle('hidden',!isNutri);
  state.view=isNutri?'pro-home':'home'; syncNav(); render();
}
function syncNav(){ $$('.nav-btn').forEach(b=>b.classList.toggle('active',b.dataset.view===state.view)); }

async function render(){
  syncNav();
  if(state.view==='home') return renderHome();
  if(state.view==='discover') return renderDiscover();
  if(state.view==='nutritionist') return renderNutritionistDirectory();
  if(state.view==='pro-home') return renderProHome();
  if(state.view==='pro-messages') return renderProMessages();
}

async function renderHome(){
  const u=await currentUser(); const p=await userProfile(u.id); const posts=(await getAll('posts')).filter(x=>x.authorId===u.id); const cs=(await getAll('consultations')).filter(x=>x.userId===u.id);
  const likes=(await getAll('likes')).filter(x=>x.userId===u.id).length; const followCount=(await getAll('follows')).filter(x=>x.followerId===u.id).length;
  $('#content').innerHTML=`
    <div class="section-head"><div><h1>Olá, ${escapeHtml(u.name.split(' ')[0])} 👋</h1><p>Seu espaço para acompanhar hábitos sem precisar ser perfeito.</p></div><span class="tag">Sequência: ${p?.streak||0} dias</span></div>
    <section class="hero"><div><span class="tag">Objetivo atual</span><h1>${escapeHtml(p?.goal||'Construir hábitos saudáveis')}</h1><p>${escapeHtml(p?.bio||'Seu progresso é construído no dia a dia. Use o APTUS para registrar, aprender e conversar com profissionais.')}</p><button class="primary-btn" style="max-width:220px" onclick="openProfileModal()">Editar perfil</button></div><div class="hero-stat"><div class="stat-top"><span>Constância semanal</span><span>78%</span></div><div class="stat-number">${Math.min(100,55+(p?.streak||0)*2)}%</div><div class="progress"><span style="width:${Math.min(100,55+(p?.streak||0)*2)}%"></span></div><p class="muted" style="font-size:12px">Baseado nas interações registradas no demo.</p></div></section>
    <div class="metric-row" style="margin-bottom:18px"><div class="metric"><small>Publicações</small><strong>${posts.length}</strong></div><div class="metric"><small>Seguindo</small><strong>${followCount}</strong></div><div class="metric"><small>Interações</small><strong>${likes}</strong></div><div class="metric"><small>Consultas</small><strong>${cs.length}</strong></div></div>
    <div class="grid grid-2"><section class="card"><div class="section-head" style="margin-bottom:12px"><div><h2 style="margin:0">Próximo acompanhamento</h2><p>Seu contato mais recente com nutricionista.</p></div></div>${cs.length?cs.map(c=>`<div class="user-row"><div class="avatar">MO</div><div><h3>Marina Oliveira</h3><p>${fmtDate(c.date)} · ${escapeHtml(c.status)}</p></div><span class="tag" style="margin-left:auto">Acompanhar</span></div>`).join(''):`<div class="empty">Você ainda não tem consultas. Visite a aba Nutricionista para começar.</div>`}</section><section class="card"><div class="section-head" style="margin-bottom:12px"><div><h2 style="margin:0">Suas publicações</h2><p>Conteúdo que você já compartilhou.</p></div><button class="small-btn" onclick="state.view='discover';render()">Ver feed</button></div>${posts.length?posts.slice(0,3).map(p=>`<div class="user-row" style="margin-bottom:12px"><div class="avatar">${initials(u.name)}</div><div><h3>${escapeHtml(p.title)}</h3><p>${fmtDate(p.createdAt)}</p></div></div>`).join(''):`<div class="empty">Você ainda não publicou nada.</div>`}</section></div>`;
}

async function renderDiscover(){
  const posts=await getAll('posts'); const users=await getAll('users'); const likes=await getAll('likes'); const comments=await getAll('comments');
  posts.sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
  $('#content').innerHTML=`<div class="section-head"><div><h1>Descobrir</h1><p>Receitas, curiosidades e ideias para uma rotina mais sustentável.</p></div><button class="primary-btn" style="width:auto;margin:0" onclick="openPostModal()">＋ Publicar</button></div><div class="reels">${posts.map(post=>{const author=users.find(u=>u.id===post.authorId)||{name:'APTUS'};const liked=likes.some(l=>l.postId===post.id&&l.userId===state.session.userId);const cc=comments.filter(c=>c.postId===post.id).length;return `<article class="reel"><div class="reel-top"><span class="tag" style="background:rgba(255,255,255,.15);color:#fff">${escapeHtml(post.type)}</span><span style="font-size:12px;opacity:.8">${fmtDate(post.createdAt)}</span></div><div class="reel-content"><div class="reel-media">${escapeHtml(post.cover||'🥗')}</div><h3>${escapeHtml(post.title)}</h3><p>${escapeHtml(post.body)}</p><small style="opacity:.72">por ${escapeHtml(author.name)}</small><div class="reel-actions"><button class="reel-btn ${liked?'active':''}" onclick="toggleLike('${post.id}')">♥ ${likes.filter(l=>l.postId===post.id).length}</button><button class="reel-btn" onclick="openComments('${post.id}')">💬 ${cc}</button><button class="reel-btn" onclick="openRecipeForPost('${post.id}')">↗</button></div></div></article>`}).join('')}</div>`;
}

async function renderNutritionistDirectory(){
  const nuts=await getAll('nutritionists'); const users=await getAll('users');
  $('#content').innerHTML=`<div class="section-head"><div><h1>Nutricionista</h1><p>Escolha um profissional para conversar e acompanhar sua rotina.</p></div></div><div class="grid grid-3">${nuts.map(n=>{const u=users.find(x=>x.id===n.userId);return `<article class="card nutri-card"><div class="top"><div class="avatar lg">${initials(u.name)}</div><div><h3 style="margin:0 0 5px">${escapeHtml(u.name)}</h3><div class="rating">★ ${n.rating}</div><p class="muted" style="margin:4px 0 0">${escapeHtml(n.specialty)}</p></div></div><p class="muted" style="line-height:1.55">${escapeHtml(n.about)}</p><div style="display:flex;gap:8px;flex-wrap:wrap"><span class="tag">${escapeHtml(n.crn)}</span><span class="tag">${escapeHtml(n.availability)}</span></div><div style="display:flex;gap:8px;margin-top:auto"><button class="secondary-btn" onclick="openNutritionist('${n.id}')">Ver perfil</button><button class="primary-btn" style="margin:0" onclick="startConversation('${n.id}')">Conversar</button></div></article>`}).join('')}</div>`;
}

async function renderProHome(){
  const u=await currentUser(); const nuts=await getAll('nutritionists'); const n=nuts.find(x=>x.userId===u.id); const users=await getAll('users'); const cs=(await getAll('consultations')).filter(c=>c.nutritionistId===n.id); const posts=(await getAll('posts')).filter(p=>p.authorId===u.id); const conversations=[...new Set((await getAll('messages')).filter(m=>m.senderId===u.id||m.receiverId===u.id).map(m=>m.conversationId))];
  $('#content').innerHTML=`<div class="section-head"><div><h1>Painel profissional</h1><p>Olá, ${escapeHtml(u.name)}. Aqui você gerencia conteúdo e acompanhamento.</p></div><button class="primary-btn" style="width:auto;margin:0" onclick="openPostModal()">＋ Novo conteúdo</button></div><div class="metric-row" style="margin-bottom:18px"><div class="metric"><small>Pacientes</small><strong>${new Set(cs.map(c=>c.userId)).size}</strong></div><div class="metric"><small>Consultas</small><strong>${cs.length}</strong></div><div class="metric"><small>Publicações</small><strong>${posts.length}</strong></div><div class="metric"><small>Conversas</small><strong>${conversations.length}</strong></div></div><div class="grid grid-2"><section class="card"><h2 style="margin-top:0">Consultas recentes</h2>${cs.length?`<table class="table"><thead><tr><th>Paciente</th><th>Data</th><th>Status</th></tr></thead><tbody>${cs.map(c=>{const pu=users.find(x=>x.id===c.userId);return `<tr><td>${escapeHtml(pu?.name||'Paciente')}</td><td>${fmtDate(c.date)}</td><td><span class="tag">${escapeHtml(c.status)}</span></td></tr>`}).join('')}</tbody></table>`:`<div class="empty">Nenhuma consulta cadastrada.</div>`}</section><section class="card"><h2 style="margin-top:0">Sobre seu perfil</h2><div class="user-row"><div class="avatar lg">${initials(u.name)}</div><div><h3 style="margin:0">${escapeHtml(u.name)}</h3><p>${escapeHtml(n?.crn||'')}</p><p>${escapeHtml(n?.specialty||'')}</p></div></div><p class="muted" style="line-height:1.6">${escapeHtml(n?.about||'')}</p><button class="secondary-btn" onclick="openProfessionalModal()">Editar perfil profissional</button></section></div>`;
}

async function renderProMessages(){
  const u=await currentUser(); const msgs=(await getAll('messages')).filter(m=>m.senderId===u.id||m.receiverId===u.id).sort((a,b)=>a.createdAt.localeCompare(b.createdAt)); const users=await getAll('users'); const convs=[...new Set(msgs.map(m=>m.conversationId))];
  $('#content').innerHTML=`<div class="section-head"><div><h1>Mensagens</h1><p>Converse com seus pacientes dentro do APTUS.</p></div></div><div class="grid grid-2"><section class="card"><h3>Conversas</h3>${convs.length?convs.map(c=>{const last=msgs.filter(m=>m.conversationId===c).at(-1);const otherId=last.senderId===u.id?last.receiverId:last.senderId;const other=users.find(x=>x.id===otherId);return `<button class="nav-btn" style="width:100%;margin-top:6px;background:#f5faf8" onclick="openConversation('${c}','${otherId}')"><div class="avatar">${initials(other?.name||'P')}</div><div><b>${escapeHtml(other?.name||'Paciente')}</b><small style="display:block;color:var(--muted)">${escapeHtml(last.text.slice(0,45))}</small></div></button>`}).join(''):`<div class="empty">Nenhuma conversa.</div>`}</section><section class="card"><h3>Caixa de entrada</h3><div class="empty">Escolha uma conversa ao lado para visualizar as mensagens.</div></section></div>`;
}

async function toggleLike(postId){
  const likes=await getAll('likes'); const mine=likes.find(l=>l.postId===postId&&l.userId===state.session.userId); if(mine) await remove('likes',mine.id); else await put('likes',{id:uid('like'),postId,userId:state.session.userId,createdAt:now()}); renderDiscover(); }
async function openComments(postId){
  const comments=(await getAll('comments')).filter(c=>c.postId===postId); const users=await getAll('users'); showModal(`<div class="modal-head"><h2 style="margin:0">Comentários</h2><button class="close-btn" data-close-modal>×</button></div>${comments.length?comments.map(c=>{const u=users.find(x=>x.id===c.authorId);return `<div class="user-row" style="margin-bottom:12px"><div class="avatar">${initials(u?.name||'U')}</div><div><b>${escapeHtml(u?.name||'Usuário')}</b><p class="muted" style="margin:2px 0 0">${escapeHtml(c.text)}</p></div></div>`}).join(''):`<div class="empty">Ainda não há comentários.</div>`}<div class="composer"><input id="comment-text" placeholder="Escreva um comentário..."><button class="primary-btn" style="margin:0;width:auto" onclick="submitComment('${postId}')">Enviar</button></div>`);
}
async function submitComment(postId){ const text=$('#comment-text')?.value.trim(); if(!text) return; await put('comments',{id:uid('comment'),postId,authorId:state.session.userId,text,createdAt:now()}); toast('Comentário publicado.'); openComments(postId); }
async function openRecipeForPost(postId){ const post=await getOne('posts',postId); const recipes=await getAll('recipes'); const r=recipes.find(x=>x.title===post.title); if(!r){toast('Este conteúdo não possui uma receita detalhada.');return;} showModal(`<div class="modal-head"><div><span class="tag">Receita</span><h2 style="margin:7px 0 0">${escapeHtml(r.title)}</h2></div><button class="close-btn" data-close-modal>×</button></div><p class="muted">${escapeHtml(r.description)}</p><h3>Ingredientes</h3><div class="recipe-steps">${escapeHtml(r.ingredients)}</div><h3>Modo de preparo</h3><div class="recipe-steps">${escapeHtml(r.steps)}</div><p class="muted">Tempo: ${escapeHtml(r.prepTime)}</p>`); }
async function openNutritionist(nid){ const n=await getOne('nutritionists',nid); const u=await getOne('users',n.userId); showModal(`<div class="modal-head"><h2 style="margin:0">${escapeHtml(u.name)}</h2><button class="close-btn" data-close-modal>×</button></div><div class="user-row"><div class="avatar lg">${initials(u.name)}</div><div><b>${escapeHtml(n.specialty)}</b><p class="muted">${escapeHtml(n.crn)} · ★ ${n.rating}</p></div></div><p class="muted" style="line-height:1.65">${escapeHtml(n.about)}</p><button class="primary-btn" onclick="startConversation('${n.id}')">Iniciar conversa</button>`); }
async function startConversation(nid){ const n=await getOne('nutritionists',nid); const conv=`conv_${state.session.userId}_${n.userId}`; closeModal(); state.view=state.session.role==='nutritionist'?'pro-messages':'nutritionist'; await render(); if(state.session.role==='user'){showModal(`<div class="modal-head"><h2 style="margin:0">Nova mensagem</h2><button class="close-btn" data-close-modal>×</button></div><p class="muted">Escreva para ${escapeHtml((await getOne('users',n.userId)).name)}.</p><textarea id="first-message" rows="5" placeholder="Conte brevemente o que você gostaria de acompanhar..."></textarea><button class="primary-btn" onclick="sendFirstMessage('${n.userId}','${conv}')">Enviar mensagem</button>`);} }
async function sendFirstMessage(nutriUserId,conv){const text=$('#first-message')?.value.trim();if(!text)return;await put('messages',{id:uid('msg'),conversationId:conv,senderId:state.session.userId,receiverId:nutriUserId,text,createdAt:now()}); toast('Mensagem enviada.'); closeModal();}
async function openConversation(conv,otherId){ const msgs=(await getAll('messages')).filter(m=>m.conversationId===conv).sort((a,b)=>a.createdAt.localeCompare(b.createdAt)); const other=await getOne('users',otherId); showModal(`<div class="modal-head"><div class="user-row"><div class="avatar">${initials(other.name)}</div><div><b>${escapeHtml(other.name)}</b><p class="muted">Conversa APTUS</p></div></div><button class="close-btn" data-close-modal>×</button></div><div class="message-list">${msgs.map(m=>`<div class="message ${m.senderId===state.session.userId?'mine':''}">${escapeHtml(m.text)}<small>${new Date(m.createdAt).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</small></div>`).join('')}</div><div class="composer"><input id="reply-text" placeholder="Digite sua mensagem..."><button class="primary-btn" style="margin:0;width:auto" onclick="sendMessage('${conv}','${otherId}')">Enviar</button></div>`); }
async function sendMessage(conv,otherId){const text=$('#reply-text')?.value.trim();if(!text)return;await put('messages',{id:uid('msg'),conversationId:conv,senderId:state.session.userId,receiverId:otherId,text,createdAt:now()}); openConversation(conv,otherId);}

function openPostModal(){ showModal(`<div class="modal-head"><div><span class="tag">Novo conteúdo</span><h2 style="margin:7px 0 0">Compartilhar no APTUS</h2></div><button class="close-btn" data-close-modal>×</button></div><div class="form-grid"><label>Tipo<select id="post-type"><option>receita</option><option>curiosidade</option><option>habit</option></select></label><label>Emoji de capa<input id="post-cover" value="🥗"></label><label class="full">Título<input id="post-title" placeholder="Ex.: 3 ideias para o café da manhã"></label><label class="full">Descrição<textarea id="post-body" rows="5" placeholder="Conte algo útil para a comunidade..."></textarea></label></div><button class="primary-btn" onclick="createPost()">Publicar</button>`); }
async function createPost(){ const title=$('#post-title')?.value.trim(),body=$('#post-body')?.value.trim();if(!title||!body){toast('Preencha título e descrição.');return;}await put('posts',{id:uid('post'),authorId:state.session.userId,type:$('#post-type').value,title,body,cover:$('#post-cover').value||'🥗',tone:'green',createdAt:now()});toast('Conteúdo publicado.');closeModal();state.view=state.session.role==='nutritionist'?'pro-home':'discover';render();}
function openProfileModal(){ getProfileData().then(({u,p})=>showModal(`<div class="modal-head"><h2 style="margin:0">Editar perfil</h2><button class="close-btn" data-close-modal>×</button></div><div class="form-grid"><label>Nome<input id="pf-name" value="${escapeHtml(u.name)}"></label><label>Objetivo<input id="pf-goal" value="${escapeHtml(p?.goal||'')}"></label><label class="full">Bio<textarea id="pf-bio" rows="4">${escapeHtml(p?.bio||'')}</textarea></label><label>Localização<input id="pf-city" value="${escapeHtml(p?.city||'')}"></label><label>Sequência de dias<input id="pf-streak" type="number" min="0" value="${p?.streak||0}"></label></div><button class="primary-btn" onclick="saveProfile()">Salvar alterações</button>`)); }
async function getProfileData(){const u=await currentUser();return {u,p:await userProfile(u.id)}}
async function saveProfile(){const u=await currentUser();const p=await userProfile(u.id)||{id:uid('profile'),userId:u.id};u.name=$('#pf-name').value;p.goal=$('#pf-goal').value;p.bio=$('#pf-bio').value;p.city=$('#pf-city').value;p.streak=Number($('#pf-streak').value||0);await put('users',u);await put('user_profiles',p);toast('Perfil atualizado.');closeModal();showApp();}
function openProfessionalModal(){toast('O modo demo permite visualizar seu perfil profissional.');}
function showModal(html){$('#modal-card').innerHTML=html;$('#modal').classList.remove('hidden');}
function closeModal(){$('#modal').classList.add('hidden');$('#modal-card').innerHTML='';}

document.addEventListener('click',async e=>{
  if(e.target.matches('[data-close-modal]')) closeModal();
  if(e.target.closest('[data-close-modal]')) closeModal();
  const nav=e.target.closest('.nav-btn'); if(nav){state.view=nav.dataset.view;$('#sidebar').classList.remove('open');render();}
});
$('#mobile-menu')?.addEventListener('click',()=>$('#sidebar').classList.toggle('open'));
$('#logout-btn')?.addEventListener('click',logout);
$('#floating-create')?.addEventListener('click',openPostModal);
$('#header-profile')?.addEventListener('click',()=>{if(state.session.role==='user')openProfileModal();else openProfessionalModal();});
$$('.auth-tab').forEach(btn=>btn.addEventListener('click',()=>setAuthMode(btn.dataset.auth)));
$('#user-login-form').addEventListener('submit',e=>{e.preventDefault();login($('#user-login').value.trim(),$('#user-password').value,'user')});
$('#nutritionist-login-form').addEventListener('submit',e=>{e.preventDefault();login($('#nutri-login').value.trim(),$('#nutri-password').value,'nutritionist')});
$('#notification-btn').addEventListener('click',()=>toast('Você não tem novas notificações.'));

(async()=>{
  if(!('indexedDB' in window)){ toast('Seu navegador não suporta a base local do APTUS.'); return; }
  state.db=await openDb(); await seed();
  const saved=localStorage.getItem('aptus_session');
  if(saved){ try{state.session=JSON.parse(saved); await showApp();}catch{logout();} }
})();
