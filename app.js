(function(){
  // ===== Keys =====
  const THEME_KEY='bm:theme';
  const USERS_KEY='bm:users';
  const CURRENT_KEY='bm:current';
  const ITEMS_KEY = (email)=> `bm:items:${email}`;

  // ===== DOM =====
  const searchEl = document.getElementById('search');
  const grid = document.getElementById('grid');
  const countEl = document.getElementById('count');

  const btnHome = document.getElementById('btnHome');
  const btnArchived = document.getElementById('btnArchived');
  const tagList = document.getElementById('tagList');
  const resetTags = document.getElementById('resetTags');

  const addBtn = document.getElementById('addBtn');
  const modalRoot = document.getElementById('modalRoot');
  const sortToggle = document.getElementById('sortToggle');
  const sortMenu = document.getElementById('sortMenu');

  const openLogin = document.getElementById('openLogin');
  const avatarBtn = document.getElementById('avatarBtn');
  const avatarImg = document.getElementById('avatarImg');
  const profileMenu = document.getElementById('profileMenu');
  const themeSwitch = document.getElementById('themeSwitch');
  const logoutBtn = document.getElementById('logoutBtn');
  const pPhoto = document.getElementById('pPhoto');
  const pName = document.getElementById('pName');
  const pEmail = document.getElementById('pEmail');

  // ===== State =====
  let currentUser = loadCurrent();
  let items = currentUser ? loadItems() : [];
  let showArchived = false;
  let selectedTags = [];     // array of strings
  let sortBy = 'recently_added'; // recently_added | recently_visited | most_visited
  let query = '';

  // ===== Boot =====
  applyTheme(loadTheme());
  themeSwitch.checked = (loadTheme()==='dark');

  wireEvents();
  if(currentUser){ ensureSeed(); updateProfileUI(); }
  updateAuthUI();
  renderTags();
  render();


  // ====== Events ======
  function wireEvents(){
    // Sidebar view
    btnHome.onclick = ()=>{ showArchived=false; btnHome.classList.add('active'); btnArchived.classList.remove('active'); renderTags(); render(); };
    btnArchived.onclick = ()=>{ showArchived=true; btnArchived.classList.add('active'); btnHome.classList.remove('active'); renderTags(); render(); };

    // Search
    searchEl.addEventListener ('input', e=>{ query=e.target.value; render(); });

    // Sort dropdown
    document.body.addEventListener('click', ()=> sortMenu.classList.add('hidden'));
    sortToggle.addEventListener('click', e=>{ e.stopPropagation(); sortMenu.classList.toggle('hidden'); });
    sortMenu.querySelectorAll('.sort-item').forEach(it=>{
      it.addEventListener('click', ()=>{
        sortMenu.querySelectorAll('.sort-item').forEach(x=>x.classList.remove('active'));
        it.classList.add('active');
        sortBy = it.dataset.sort;
        sortMenu.classList.add('hidden');
        render();
      });
    });

    // Add
    addBtn.onclick = ()=> currentUser ? openBookmarkModal() : openAuth('login');

    // Auth buttons
    openLogin.onclick = ()=> openAuth('login');
    avatarBtn.onclick = (e)=>{ e.stopPropagation(); profileMenu.classList.toggle('show'); };
    document.addEventListener('click', (e)=>{ if(!profileMenu.contains(e.target)) profileMenu.classList.remove('show'); });
    themeSwitch.onchange = ()=> setTheme(themeSwitch.checked ? 'dark':'light');
    logoutBtn.onclick = ()=> { setCurrent(null); items=[]; updateAuthUI(); render(); openAuth('login'); };

    // Reset tags
    resetTags.onclick = ()=>{ selectedTags=[]; renderTags(); render(); };
  }

  // ====== Theme ======
  function loadTheme(){ return localStorage.getItem(THEME_KEY)||'light'; }
  function applyTheme(t){ document.body.setAttribute('data-theme', t); }
  function setTheme(t){ localStorage.setItem(THEME_KEY, t); applyTheme(t); }

  // ====== Storage (users) ======
  function loadUsers(){ try{ return JSON.parse(localStorage.getItem(USERS_KEY)||'[]'); }catch(_){ return []; } }
  function saveUsers(arr){ localStorage.setItem(USERS_KEY, JSON.stringify(arr)); }
  function loadCurrent(){ return localStorage.getItem(CURRENT_KEY) || null; }
  function setCurrent(email){ if(email) localStorage.setItem(CURRENT_KEY,email); else localStorage.removeItem(CURRENT_KEY); currentUser=email; }
  function loadItems(){ try{ return JSON.parse(localStorage.getItem(ITEMS_KEY(currentUser))||'[]'); }catch(_){ return []; } }
  function saveItems(){ localStorage.setItem(ITEMS_KEY(currentUser), JSON.stringify(items)); }


  // ====== UI (auth/profile) ======
  function updateAuthUI(){
    const logged = !!currentUser;
    openLogin.classList.toggle('hidden', logged);
    avatarBtn.classList.toggle('hidden', !logged);
  }
  function updateProfileUI(){
    const u = loadUsers().find(x=>x.email===currentUser);
    const photo = u?.photo || `https://i.pravatar.cc/80?u=${encodeURIComponent(currentUser)}`;
    avatarImg.src = photo; pPhoto.src = photo;
    pName.textContent = u?.name || 'User';
    pEmail.textContent = u?.email || currentUser || '-';
  }


  // ====== Auth modal ======
  function openAuth(mode='login'){
    modalRoot.innerHTML=''; modalRoot.classList.remove('hidden');
    const node = document.getElementById('authTpl').content.cloneNode(true);
    modalRoot.appendChild(node);

    const form = document.getElementById('authForm');
    const title = document.getElementById('authTitle');
    const rowName = document.getElementById('rowName');
    const aName = document.getElementById('aName');
    const aEmail = document.getElementById('aEmail');
    const aPass = document.getElementById('aPass');
    const aPhoto = document.getElementById('aPhoto');
    const switchBtn = document.getElementById('switchAuth');
    const cancelBtn = document.getElementById('cancelAuth');
    const submitBtn = document.getElementById('submitAuth');

    function setMode(m){
      mode = m;
      title.textContent = (m==='login') ? 'Login' : 'Create account';
      rowName.style.display = (m==='login') ? 'none' : 'block';
      submitBtn.textContent = (m==='login') ? 'Login' : 'Register';
      switchBtn.textContent = (m==='login') ? 'Create new account' : 'Already have an account?';
    }
    setMode(mode);

    switchBtn.onclick = ()=> setMode(mode==='login'?'register':'login');
    cancelBtn.onclick = closeModal;

    form.onsubmit = (e)=>{
      e.preventDefault();
      const users = loadUsers();
      const email = aEmail.value.trim().toLowerCase();
      const pass = aPass.value;
      if(mode==='register'){
        if(users.some(u=>u.email===email)) return flash('Email already exists');
        users.push({ name:aName.value.trim()||'User', email, pass, photo:aPhoto.value.trim()||'' });
        saveUsers(users);
        setCurrent(email); items=[]; saveItems(); updateAuthUI(); updateProfileUI(); closeModal(); ensureSeed(); renderTags(); render(); flash('Account created');
      }else{
        const u = users.find(u=>u.email===email);
        if(!u) return flash('Account not found');
        if(u.pass!==pass) return flash('Wrong password');
        setCurrent(email); items = loadItems(); updateAuthUI(); updateProfileUI(); closeModal(); ensureSeed(); renderTags(); render(); flash('Logged in');
      }
    };

    function closeModal(){ modalRoot.classList.add('hidden'); modalRoot.innerHTML=''; }
  }
  

  // ====== Bookmark modal (add/edit) ======
  function openBookmarkModal(edit=null){
    modalRoot.innerHTML=''; modalRoot.classList.remove('hidden');
    const node = document.getElementById('bookmarkTpl').content.cloneNode(true);
    modalRoot.appendChild(node);
    const form = document.getElementById('bookmarkForm');
    const title = document.getElementById('bmTitle');
    const url = document.getElementById('bmUrl');
    const desc = document.getElementById('bmDesc');
    const tags = document.getElementById('bmTags');
    const modalTitle = document.getElementById('modalTitle');
    document.getElementById('closeModal').onclick = close;

    if(edit){
      modalTitle.textContent='Edit Bookmark';
      title.value = edit.title; url.value = edit.url; desc.value = edit.description||''; tags.value = (edit.tags||[]).join(', ');
    }

    form.onsubmit = (e)=>{
      e.preventDefault();
      const payload = {
        id: edit? edit.id : uid(),
        title: title.value.trim() || url.value.trim(),
        url: normalizeUrl(url.value.trim()),
        description: desc.value.trim(),
        tags: tags.value.split(',').map(t=>t.trim()).filter(Boolean),
        pinned: edit? edit.pinned : false,
        archived: edit? edit.archived : false,
        viewCount: edit? (edit.viewCount||0) : 0,
        lastVisited: edit? edit.lastVisited : null,
        dateAdded: edit? edit.dateAdded : new Date().toISOString()
      };
      if(edit){ const idx = items.findIndex(x=>x.id===edit.id); if(idx>-1) items[idx]=payload; }
      else items.unshift(payload);
      saveItems(); close(); renderTags(); render();
    };

    function close(){ modalRoot.classList.add('hidden'); modalRoot.innerHTML=''; }
  }

  // ====== Render helpers ======
  function render(){
    const list = filtered();
    countEl.textContent = list.length + ' items';
    grid.innerHTML = '';
    if(list.length===0){
      grid.innerHTML = `<div class="muted" style="text-align:center;padding:18px;background:var(--surface);border:1px solid var(--border);border-radius:12px">No bookmarks found.</div>`;
      return;
    }
    list.forEach(i=> grid.appendChild(card(i)));
  }

  function filtered(){
    let rs = items.filter(i=> i.archived===!!showArchived);
    if(query.trim()){
      const q = query.toLowerCase();
      rs = rs.filter(i=> (i.title||'').toLowerCase().includes(q));
    }
    if(selectedTags.length){
      rs = rs.filter(i=> selectedTags.every(t=> (i.tags||[]).includes(t)));
    }
    // sort
    if(sortBy==='recently_added') rs.sort((a,b)=> new Date(b.dateAdded)-new Date(a.dateAdded));
    else if(sortBy==='recently_visited') rs.sort((a,b)=> new Date(b.lastVisited||0)-new Date(a.lastVisited||0));
    else if(sortBy==='most_visited') rs.sort((a,b)=> (b.viewCount||0)-(a.viewCount||0));
    // pin on top
    rs.sort((a,b)=> (b.pinned?1:0)-(a.pinned?1:0));
    return rs;
  }

  function card(i){
    const c = document.createElement('article'); c.className='card';

    const meta = document.createElement('div'); meta.className='meta';
    const icon = document.createElement('img'); icon.className='favicon'; icon.alt='favicon';
    icon.src = 'https://www.google.com/s2/favicons?sz=64&domain='+encodeURIComponent(i.url);

    const info = document.createElement('div'); info.style.flex='1';
    const title = document.createElement('div'); title.className='title'; title.textContent = i.title || i.url;
    const url = document.createElement('div'); url.className='url'; url.textContent = i.url;
    info.append(title,url);

    const actions = document.createElement('div'); actions.className='actions-card';
    const more = document.createElement('button'); more.className='icon-btn'; more.title='Menu'; more.innerHTML='<i class="fa-solid fa-ellipsis-vertical"></i>';
    more.onclick = (e)=>{ e.stopPropagation(); closeMenus(); showCardMenu(more,i); };
    actions.appendChild(more);

    meta.append(icon,info,actions);

    const desc = document.createElement('div'); desc.className='desc'; desc.textContent = i.description || '';

    const chips = document.createElement('div'); chips.className='chips';
    (i.tags||[]).forEach(t=>{
      const s=document.createElement('span'); s.className='chip'; s.textContent=t;
      s.onclick=()=>{ if(!selectedTags.includes(t)){ selectedTags.push(t); renderTags(); render(); } };
      chips.appendChild(s);
    });

    const foot = document.createElement('div'); foot.className='foot';
    foot.innerHTML = `<span><i class="fa-regular fa-eye"></i> ${i.viewCount||1}</span>
                      <span>${i.lastVisited? new Date(i.lastVisited).toLocaleDateString() : '—'}</span>`;

    c.append(meta,desc,chips,foot);
    return c;
  }



// ====== Card menu ======
  function showCardMenu(anchor, i){
    const m = document.createElement('div'); m.className='card-menu';
    m.style.top = (anchor.getBoundingClientRect().bottom + window.scrollY + 6) + 'px';
    m.style.left = (anchor.getBoundingClientRect().right - 180) + 'px';
    m.innerHTML = `
      <div class="mi"><i class="fa-solid fa-arrow-up-right-from-square"></i> Visit</div>
      <div class="mi"><i class="fa-regular fa-copy"></i> Copy URL</div>
      <div class="mi"><i class="fa-solid fa-thumbtack"></i> ${i.pinned?'Unpin':'Pin'}</div>
      <div class="mi"><i class="fa-regular fa-pen-to-square"></i> Edit</div>
      <div class="mi"><i class="fa-regular fa-folder-closed"></i> ${i.archived?'Unarchive':'Archive'}</div>
    `;
    const [v,cop,pin,edit,arch] = m.querySelectorAll('.mi');
    v.onclick = ()=>{ window.open(i.url,'_blank','noopener'); i.viewCount=(i.viewCount||0)+1; i.lastVisited=new Date().toISOString(); saveItems(); closeMenus(); render(); };
    cop.onclick = ()=>{ navigator.clipboard.writeText(i.url); flash('URL copied'); closeMenus(); };
    pin.onclick = ()=>{ i.pinned=!i.pinned; saveItems(); closeMenus(); render(); };
    edit.onclick = ()=>{ closeMenus(); openBookmarkModal(i); };
    arch.onclick = ()=>{ i.archived=!i.archived; saveItems(); closeMenus(); render(); };

    document.body.appendChild(m);
    setTimeout(()=> document.addEventListener('click', closeMenusOnce, {once:true}));
    function closeMenusOnce(){ closeMenus(); }
  }

  function closeMenus(){ document.querySelectorAll('.card-menu').forEach(el=>el.remove()); }

  
  // ====== Tags (checkbox + count) ======
  function renderTags(){
    const list = items.filter(i=> i.archived===!!showArchived);
    const tagCounts = {};
    list.forEach(i=> (i.tags||[]).forEach(t=> tagCounts[t]=(tagCounts[t]||0)+1));
    const tags = Object.keys(tagCounts).sort((a,b)=> a.localeCompare(b));
    tagList.innerHTML = '';
    if(tags.length===0){
      tagList.innerHTML = '<div class="muted">No tags</div>'; return;
    }
    tags.forEach(t=>{
      const row = document.createElement('div'); row.className='tag-row';
      const cb = document.createElement('input'); cb.type='checkbox'; cb.checked = selectedTags.includes(t);
      cb.onchange = ()=>{ if(cb.checked){ selectedTags.push(t); } else{ selectedTags = selectedTags.filter(x=>x!==t); } render(); };
      const label = document.createElement('label'); label.textContent = t; label.onclick=()=>{ cb.checked=!cb.checked; cb.dispatchEvent(new Event('change')); };
      const count = document.createElement('div'); count.className='count'; count.textContent = tagCounts[t];
      row.append(cb,label,count); tagList.appendChild(row);
    });
  }

  // ====== Utils ======
  function normalizeUrl(u){ if(!/^https?:\/\//i.test(u)) return 'https://'+u; return u; }
  function uid(){ return Date.now().toString(36)+Math.random().toString(36).slice(2,8); }
  function flash(msg){
    const t=document.createElement('div');
    t.textContent=msg; Object.assign(t.style,{position:'fixed',right:'18px',bottom:'18px',background:'#111',color:'#fff',padding:'8px 12px',borderRadius:'10px',zIndex:200});
    document.body.appendChild(t); setTimeout(()=>t.remove(),1400);
  }

  // ====== Seed sample (first time) ======
  function ensureSeed(){
    if(items.length>0) return;
    items = [
      {id:uid(),title:'Frontend Mentor',url:'https://www.frontendmentor.io',description:'Improve your front-end skills by building projects.',tags:['Practice','Learning','Community'],viewCount:67,lastVisited:null,dateAdded:new Date().toISOString(),archived:false,pinned:false},
      {id:uid(),title:'MDN Web Docs',url:'https://developer.mozilla.org',description:'Docs for HTML, CSS, and JavaScript.',tags:['Reference','HTML','CSS','JavaScript'],viewCount:152,lastVisited:null,dateAdded:new Date().toISOString(),archived:false,pinned:true},
      {id:uid(),title:'Web.dev',url:'https://web.dev',description:'Guidance to build modern web experiences.',tags:['Performance','Learning','Tips'],viewCount:15,lastVisited:null,dateAdded:new Date().toISOString(),archived:false,pinned:false}
    ];
    saveItems();
  }

})();


