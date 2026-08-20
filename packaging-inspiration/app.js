'use strict';

// 盒型/品类/风格/材料 选项（可随数据增长自动扩展）
const BOX_TYPES = ['飞机盒','异型盒','双插盒','扣底盒','吊孔盒','平粘盒/机包盒','自锁底盒','提手盒','披萨盒','翻盖盒','对盖盒','盘式盒','抽屉盒','未知'];
const MATERIALS = ['瓦楞纸','纸板','卡纸','EPE珍珠棉','泡沫','塑料','木浆甘蔗渣','环保纸塑','其他'];
const CATEGORIES = ['消费电子','食品','美妆','保健品','礼品','日用品','文具','酒类','其他'];
const STYLES = ['简约','高级感','丰富','可爱','科技感','复古','自然','极简'];

let ENTRIES = [];
let EDIT_MODE = false;

// ========== 初始化 ==========
async function init() {
  // 探测是否在本地服务器环境（有 /api）
  EDIT_MODE = await detectEditMode();
  updateModeBadge();

  await loadEntries();
  populateFilterOptions();
  renderGallery();
  bindEvents();
}

async function detectEditMode() {
  try {
    const res = await fetch('/api/entries', { method: 'GET' });
    if (res.ok) return true;
  } catch { /* 静态部署，无 API */ }
  return false;
}

function updateModeBadge() {
  const badge = document.getElementById('modeBadge');
  badge.hidden = false;
  if (EDIT_MODE) {
    badge.textContent = '编辑模式';
    badge.className = 'mode-badge edit';
    document.getElementById('newEntryBtn').hidden = false;
    document.getElementById('newEntryHint').hidden = false;
  } else {
    badge.textContent = '只读浏览';
    badge.className = 'mode-badge readonly';
    document.getElementById('newEntryBtn').hidden = true;
    document.getElementById('newEntryHint').hidden = true;
  }
}

async function loadEntries() {
  if (EDIT_MODE) {
    try {
      const res = await fetch('/api/entries');
      ENTRIES = await res.json();
    } catch (e) {
      ENTRIES = [];
    }
  } else {
    // 静态模式：读取本地 JSON 文件
    try {
      const res = await fetch('data/entries.json');
      ENTRIES = await res.json();
    } catch {
      ENTRIES = [];
    }
  }
}

// 填充筛选项
function populateFilterOptions() {
  // 盒型筛选：预设列表 + 自定义选项 + 数据中已存在的自定义盒型
  const customBoxTypes = ENTRIES
    .map(e => e.boxType)
    .filter(bt => bt && !BOX_TYPES.includes(bt));
  const uniqueCustom = [...new Set(customBoxTypes)];
  const allBoxTypes = uniqueCustom.length
    ? [...BOX_TYPES, '__custom_sep__', ...uniqueCustom, '__custom__']
    : [...BOX_TYPES, '__custom__'];
  fillSelect('filterBoxType', allBoxTypes, {
    separator: '__custom_sep__',
    labels: { '__custom__': '自定义' },
  });
  fillSelect('filterMaterial', MATERIALS);
  fillSelect('filterCategory', CATEGORIES);
  fillSelect('filterStyle', STYLES);
}

function fillSelect(id, options, opts = {}) {
  const sel = document.getElementById(id);
  const cur = sel.value;
  // 保留第一个 placeholder
  while (sel.options.length > 1) sel.remove(1);
  options.forEach(o => {
    if (o === opts.separator) {
      const sep = document.createElement('option');
      sep.disabled = true;
      sep.textContent = '── 自定义 ──';
      sel.appendChild(sep);
    } else if (opts.labels && opts.labels[o]) {
      const opt = document.createElement('option');
      opt.value = o; opt.textContent = opts.labels[o];
      sel.appendChild(opt);
    } else {
      const opt = document.createElement('option');
      opt.value = o; opt.textContent = o;
      sel.appendChild(opt);
    }
  });
  sel.value = cur;
}

// ========== 筛选与渲染 ==========
function getFiltered() {
  const kw = document.getElementById('searchInput').value.trim().toLowerCase();
  const ft = {
    boxType: document.getElementById('filterBoxType').value,
    material: document.getElementById('filterMaterial').value,
    category: document.getElementById('filterCategory').value,
    style: document.getElementById('filterStyle').value,
    dateFrom: document.getElementById('filterDateFrom').value,
    dateTo: document.getElementById('filterDateTo').value,
  };

  return ENTRIES.filter(e => {
    if (ft.boxType === '__custom__') {
      const cv = document.getElementById('filterBoxTypeCustom').value.trim().toLowerCase();
      if (!cv) return true; // 未输入文字时不过滤
      if (!e.boxType || !e.boxType.toLowerCase().includes(cv)) return false;
    } else if (ft.boxType && ft.boxType !== '__custom_sep__' && e.boxType !== ft.boxType) return false;
    if (ft.material && (!e.material || e.material.type !== ft.material)) return false;
    if (ft.category && e.productCategory !== ft.category) return false;
    if (ft.style && !(e.appearanceStyle || []).some(s => s === ft.style || s === '#' + ft.style || s.replace(/^#/,'') === ft.style)) return false;
    if (ft.dateFrom && e.date < ft.dateFrom) return false;
    if (ft.dateTo && e.date > ft.dateTo) return false;
    if (kw) {
      const hay = [
        e.title, e.boxType, e.insertStructure, e.unboxingExperience,
        e.inspirationNotes, e.productCategory,
        e.material ? e.material.type : '',
        (e.appearanceStyle || []).join(' '),
      ].join(' ').toLowerCase();
      if (!hay.includes(kw)) return false;
    }
    return true;
  });
}

function renderGallery() {
  const filtered = getFiltered();
  const gallery = document.getElementById('gallery');
  const empty = document.getElementById('emptyHint');
  document.getElementById('resultCount').textContent = `${filtered.length} 条记录`;

  if (filtered.length === 0) {
    gallery.innerHTML = '';
    empty.hidden = false;
    return;
  }
  empty.hidden = true;

  gallery.innerHTML = filtered.map(e => {
    const cover = (e.photos && e.photos[0]) ? e.photos[0].url : '';
    const tags = [
      e.boxType,
      e.material ? e.material.type : '',
      e.productCategory,
    ].filter(Boolean).slice(0, 3);
    const photoCount = (e.photos && e.photos.length) ? e.photos.length : 0;
    const photoBadge = photoCount > 1 ? `<span class="card-photo-count">${photoCount}张</span>` : '';
    const imgHtml = cover
      ? `<div class="card-img-wrap"><img class="card-img" src="${cover}" alt="${esc(e.title)}" loading="lazy">${photoBadge}</div>`
      : `<div class="card-img-wrap"><div class="card-img-placeholder">暂无图片</div>${photoBadge}</div>`;
    return `<div class="card" data-id="${esc(e.id)}">
      ${imgHtml}
      <div class="card-body">
        <p class="card-title">${esc(e.title || '未命名')}</p>
        <div class="card-tags">${tags.map(t => `<span class="card-tag">${esc(t)}</span>`).join('')}</div>
        <p class="card-date">${esc(e.date || '')}</p>
      </div>
    </div>`;
  }).join('');

  // 绑定卡片点击
  gallery.querySelectorAll('.card').forEach(card => {
    card.addEventListener('click', () => openDetail(card.dataset.id));
  });
}

// ========== 详情 ==========
function openDetail(id) {
  const e = ENTRIES.find(x => x.id === id);
  if (!e) return;
  const content = document.getElementById('detailContent');

  const tags = [e.boxType, e.productCategory, e.material?.type, e.material?.ecoFriendly ? '环保材质' : ''].filter(Boolean);
  const styleTags = (e.appearanceStyle || []).map(s => `<span class="card-tag">${esc(s)}</span>`).join('');

  const photosHtml = (e.photos || []).map(p => `
    <div class="photo-item">
      <img src="${p.url}" alt="${esc(p.angle || '')}" loading="lazy">
      ${p.angle ? `<span class="photo-angle">${esc(p.angle)}</span>` : ''}
    </div>`).join('');

  const dielineHtml = e.dieline && e.dieline.url
    ? `<a class="detail-dieline" href="${e.dieline.url}" target="_blank">📎 刀模文件 ${esc(e.dieline.format || '')}</a>`
    : '';

  const actionsHtml = EDIT_MODE ? `
    <div class="detail-actions">
      <button class="edit" data-act="edit">编辑</button>
      <button class="danger" data-act="delete">删除</button>
    </div>` : '';

  content.innerHTML = `
    <div class="detail-section">
      <div class="detail-header">
        <div>
          <h2 class="detail-title">${esc(e.title || '未命名')}</h2>
          <div class="detail-meta">
            ${tags.map(t => `<span class="card-tag">${esc(t)}</span>`).join('')}
            ${styleTags}
            <span class="card-tag">${esc(e.date || '')}</span>
          </div>
        </div>
        <button class="close-btn" data-act="close">&times;</button>
      </div>
    </div>
    ${e.dimensions ? `<div class="detail-section">
      <p class="detail-label">尺寸</p>
      <div class="detail-dims">
        <span>L ${esc(e.dimensions.L || '?')} mm</span>
        <span>W ${esc(e.dimensions.W || '?')} mm</span>
        <span>H ${esc(e.dimensions.H || '?')} mm</span>
      </div>
    </div>` : ''}
    ${e.insertStructure ? `<div class="detail-section">
      <p class="detail-label">内衬结构</p>
      <p class="detail-text">${esc(e.insertStructure)}</p>
    </div>` : ''}
    ${e.unboxingExperience ? `<div class="detail-section">
      <p class="detail-label">开箱体验</p>
      <p class="detail-text">${esc(e.unboxingExperience)}</p>
    </div>` : ''}
    ${e.inspirationNotes ? `<div class="detail-section">
      <p class="detail-label">灵感备注</p>
      <p class="detail-text">${esc(e.inspirationNotes)}</p>
    </div>` : ''}
    ${e.material ? `<div class="detail-section">
      <p class="detail-label">材料</p>
      <p class="detail-text">${esc(e.material.type || '')}${e.material.thickness ? ' / ' + esc(e.material.thickness) : ''}${e.material.note ? ' / ' + esc(e.material.note) : ''}</p>
    </div>` : ''}
    ${photosHtml ? `<div class="detail-section">
      <p class="detail-label">照片</p>
      <div class="detail-photos">${photosHtml}</div>
      ${dielineHtml}
    </div>` : (dielineHtml ? `<div class="detail-section">${dielineHtml}</div>` : '')}
    ${e.source ? `<div class="detail-section">
      <p class="detail-label">来源</p>
      <p class="detail-text">${esc(e.source)}</p>
    </div>` : ''}
    ${actionsHtml}
  `;

  // 绑定详情内事件
  content.querySelectorAll('[data-act]').forEach(btn => {
    btn.addEventListener('click', () => {
      const act = btn.dataset.act;
      if (act === 'close') closeOverlay('detailOverlay');
      if (act === 'edit') { closeOverlay('detailOverlay'); openEditor(e); }
      if (act === 'delete') handleDelete(e.id);
    });
  });
  content.querySelectorAll('.detail-photos img').forEach(img => {
    img.addEventListener('click', () => openLightbox(img.src));
  });

  showOverlay('detailOverlay');
}

// ========== 删除 ==========
async function handleDelete(id) {
  if (!confirm('确认删除这条记录？关联的图片和刀模文件也会一起删除。')) return;
  try {
    await fetch(`/api/entries/${encodeURIComponent(id)}`, { method: 'DELETE' });
    ENTRIES = ENTRIES.filter(e => e.id !== id);
    renderGallery();
    closeOverlay('detailOverlay');
  } catch (e) {
    alert('删除失败：' + e.message);
  }
}

// ========== 编辑器 ==========
function openEditor(entry) {
  if (!EDIT_MODE) return;
  const isEdit = !!entry;
  const data = entry || {};
  const form = document.getElementById('editorForm');

  form.innerHTML = `
    <div class="form-header">
      <h2>${isEdit ? '编辑记录' : '新建记录'}</h2>
      <button type="button" class="close-btn" id="editorClose">&times;</button>
    </div>
    <div class="form-body">
      <input type="hidden" id="f_id" value="${esc(data.id || '')}">

      <div class="field-group">
        <label>标题</label>
        <input type="text" id="f_title" value="${esc(data.title || '')}" placeholder="给这条灵感起个名字">
      </div>

      <div class="field-group">
        <label>日期</label>
        <input type="date" id="f_date" value="${esc(data.date || new Date().toISOString().slice(0,10))}">
      </div>

      <div class="field-group">
        <label>盒型</label>
        <select id="f_boxType">
          <option value="">请选择</option>
          ${BOX_TYPES.map(t => `<option ${data.boxType===t?'selected':''}>${t}</option>`).join('')}
          <option value="__custom__" ${data.boxType && !BOX_TYPES.includes(data.boxType) ? 'selected' : ''}>自定义</option>
        </select>
        <input type="text" id="f_boxTypeCustom" class="custom-input" placeholder="输入自定义盒型名称" value="${data.boxType && !BOX_TYPES.includes(data.boxType) ? esc(data.boxType) : ''}" style="display:none;margin-top:8px">
      </div>

      <div class="field-group">
        <label>尺寸（当前实物包装）</label>
        <div class="dim-row">
          <label>长 L<input type="number" id="f_dimL" value="${data.dimensions?.L||''}" step="0.1"><em>mm</em></label>
          <label>宽 W<input type="number" id="f_dimW" value="${data.dimensions?.W||''}" step="0.1"><em>mm</em></label>
          <label>高 H<input type="number" id="f_dimH" value="${data.dimensions?.H||''}" step="0.1"><em>mm</em></label>
        </div>
      </div>

      <div class="field-group">
        <label>内衬结构</label>
        <textarea id="f_insert" placeholder="如：与彩盒一体式内衬、EPE卡槽、纸卡折叠隔板…">${esc(data.insertStructure||'')}</textarea>
      </div>

      <div class="field-group">
        <label>外观风格标签</label>
        <div class="tag-input-wrap" id="styleTagsWrap">
          ${(data.appearanceStyle||[]).map((s,i)=>`<span class="tag-chip">${esc(s)}<button type="button" data-del="${i}">&times;</button></span>`).join('')}
          <div class="input-with-hash">
            <span class="hash">#</span>
            <input type="text" id="f_styleInput" placeholder="输入自定义标签后回车添加">
          </div>
        </div>
        <p class="hint-label">可选标签（点击添加）：</p>
        <div class="style-suggestions" id="styleSuggestions">
          ${STYLES.map(s => {
            const added = (data.appearanceStyle||[]).includes(s);
            return `<span class="style-suggestion${added?' added':''}" data-val="${esc(s)}">#${esc(s)}</span>`;
          }).join('')}
        </div>
      </div>

      <div class="field-group">
        <label>材料</label>
        <select id="f_materialType">
          <option value="">请选择</option>
          ${MATERIALS.map(m=>`<option ${data.material?.type===m?'selected':''}>${m}</option>`).join('')}
        </select>
      </div>
      <div class="field-group">
        <div class="dim-row">
          <label>纸板/材料厚度<input type="text" id="f_materialThickness" value="${esc(data.material?.thickness||'')}" placeholder="如 1.2mm"></label>
          <label><span style="font-size:12px;font-weight:800;color:#50677a;display:block;margin-bottom:5px">环保材质</span>
            <select id="f_ecoFriendly"><option value="false" ${!data.material?.ecoFriendly?'selected':''}>否</option><option value="true" ${data.material?.ecoFriendly?'selected':''}>是</option></select>
          </label>
          <label>材料备注<input type="text" id="f_materialNote" value="${esc(data.material?.note||'')}" placeholder="补充"></label>
        </div>
      </div>

      <div class="field-group">
        <label>产品品类</label>
        <select id="f_category">
          <option value="">请选择</option>
          ${CATEGORIES.map(c=>`<option ${data.productCategory===c?'selected':''}>${c}</option>`).join('')}
        </select>
      </div>

      <div class="field-group">
        <label>开箱体验</label>
        <textarea id="f_unboxing" placeholder="打开后第一眼看到什么？配件摆放顺序？质感如何？">${esc(data.unboxingExperience||'')}</textarea>
      </div>

      <div class="field-group">
        <label>灵感备注</label>
        <textarea id="f_inspiration" placeholder="为什么打动你？日后设计时想参考什么？">${esc(data.inspirationNotes||'')}</textarea>
      </div>

      <div class="field-group">
        <label>照片（可多角度）</label>
        <div class="photo-upload-area" id="photoUploadArea">
          <p>点击或拖拽照片到这里上传（正面/侧面/开箱/内衬等）</p>
        </div>
        <div class="photo-preview-grid" id="photoPreviewGrid"></div>
        <p class="upload-warning" id="pngWarning" hidden>⚠️ 检测到 PNG 图片，部署到 GitHub 后不会显示（被 .gitignore 排除）。建议转为 JPG 格式后上传。</p>
      </div>

      <div class="field-group">
        <label>刀模文件（PDF / JPG，可选）</label>
        <div class="file-upload-row">
          <input type="file" id="f_dieline" accept=".pdf,.jpg,.jpeg,.png">
          <span class="file-name" id="dielineName">${data.dieline?esc(data.dieline.file||''):''}</span>
        </div>
        <p class="hint">前期手动上传刀模文件；后续支持按尺寸自动生成为加分项。</p>
      </div>

      <div class="field-group">
        <label>来源</label>
        <input type="text" id="f_source" value="${esc(data.source||'')}" placeholder="如：京东购买 / 样品室 / 网络截图">
      </div>
    </div>
    <div class="form-footer">
      <button type="button" class="cancel" id="editorCancel">取消</button>
      <button type="button" class="save" id="editorSave">保存</button>
    </div>
  `;

  // 初始化照片列表
  let photos = (data.photos || []).map(p => ({...p}));
  renderPhotoPreview(photos);

  // 照片上传
  const uploadArea = document.getElementById('photoUploadArea');
  const fileInput = createHiddenFileInput('image/*', 'multiple');
  uploadArea.addEventListener('click', () => fileInput.click());
  uploadArea.addEventListener('dragover', e => { e.preventDefault(); uploadArea.style.borderColor = 'var(--blue)'; });
  uploadArea.addEventListener('dragleave', () => { uploadArea.style.borderColor = ''; });
  uploadArea.addEventListener('drop', e => { e.preventDefault(); uploadArea.style.borderColor=''; handlePhotoFiles(e.dataTransfer.files, photos); });
  fileInput.addEventListener('change', () => handlePhotoFiles(fileInput.files, photos));

  // 刀模文件
  let dieline = data.dieline ? {...data.dieline} : null;
  const dielineInput = document.getElementById('f_dieline');
  dielineInput.addEventListener('change', async () => {
    if (dielineInput.files[0]) {
      const uploaded = await uploadFile(dielineInput.files[0], 'dielines');
      dieline = uploaded;
      document.getElementById('dielineName').textContent = uploaded.file;
    }
  });

  // 风格标签输入
  bindTagInput('styleTagsWrap', 'f_styleInput');

  // 风格标签建议点击
  document.querySelectorAll('#styleSuggestions .style-suggestion').forEach(sug => {
    if (sug.classList.contains('added')) return;
    sug.addEventListener('click', () => {
      const input = document.getElementById('f_styleInput');
      input.value = sug.dataset.val;
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    });
  });

  // 盒型自定义切换
  const boxTypeSel = document.getElementById('f_boxType');
  const boxTypeCustom = document.getElementById('f_boxTypeCustom');
  function toggleBoxTypeCustom() {
    boxTypeCustom.style.display = boxTypeSel.value === '__custom__' ? 'block' : 'none';
  }
  boxTypeSel.addEventListener('change', toggleBoxTypeCustom);
  toggleBoxTypeCustom();

  // 按钮
  document.getElementById('editorClose').onclick = () => closeOverlay('editorOverlay');
  document.getElementById('editorCancel').onclick = () => closeOverlay('editorOverlay');
  document.getElementById('editorSave').onclick = async () => {
    const payload = collectForm(photos, dieline);
    if (!payload.title) { alert('请填写标题'); return; }
    await saveEntry(payload, isEdit ? data.id : null);
  };

  showOverlay('editorOverlay');
}

function createHiddenFileInput(accept, multiple) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = accept;
  if (multiple) input.multiple = true;
  input.hidden = true;
  document.body.appendChild(input);
  return input;
}

async function handlePhotoFiles(files, photos) {
  for (const file of files) {
    if (!file.type.startsWith('image/')) continue;
    const uploaded = await uploadFile(file, 'images');
    photos.push({ url: uploaded.url, file: uploaded.file, angle: '' });
  }
  renderPhotoPreview(photos);
}

function renderPhotoPreview(photos) {
  const grid = document.getElementById('photoPreviewGrid');
  const warn = document.getElementById('pngWarning');
  if (warn) {
    const hasPng = photos.some(p => p.file && p.file.toLowerCase().endsWith('.png'));
    warn.hidden = !hasPng;
  }
  const ANGLES = ['正面','侧面','背面','顶部','底部','开箱','内衬','其他'];
  grid.innerHTML = photos.map((p, i) => `
    <div class="photo-preview-item">
      <img src="${p.url}" alt="">
      <select data-pidx="${i}">
        ${ANGLES.map(a => `<option ${p.angle===a?'selected':''}>${a}</option>`).join('')}
      </select>
      <button type="button" class="remove" data-ridx="${i}">&times;</button>
    </div>`).join('');
  grid.querySelectorAll('select[data-pidx]').forEach(sel => {
    sel.addEventListener('change', () => { photos[+sel.dataset.pidx].angle = sel.value; });
  });
  grid.querySelectorAll('.remove[data-ridx]').forEach(btn => {
    btn.addEventListener('click', () => {
      photos.splice(+btn.dataset.ridx, 1);
      renderPhotoPreview(photos);
    });
  });
}

async function uploadFile(file, folder) {
  const dataUrl = await new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
  const res = await fetch('/api/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ folder, data: dataUrl, filename: file.name }),
  });
  if (!res.ok) throw new Error('上传失败');
  return res.json();
}

function bindTagInput(wrapId, inputId) {
  const wrap = document.getElementById(wrapId);
  const input = document.getElementById(inputId);
  const insertRef = input.parentElement || input;
  function markSuggestion(val, added) {
    const clean = val.replace(/^#/, '').trim();
    const sug = document.querySelector(`.style-suggestion[data-val="${clean}"]`);
    if (sug) sug.classList.toggle('added', added);
  }
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      let val = input.value.trim();
      if (!val) return;
      if (!val.startsWith('#')) val = '#' + val;
      // 获取已有标签
      const chips = wrap.querySelectorAll('.tag-chip');
      const existing = Array.from(chips).map(c => c.textContent.replace(/\s*×\s*$/,'').trim());
      if (existing.includes(val)) { input.value = ''; return; }
      const chip = document.createElement('span');
      chip.className = 'tag-chip';
      chip.innerHTML = `${esc(val)} <button type="button" data-del="new">&times;</button>`;
      chip.querySelector('button').onclick = () => { chip.remove(); markSuggestion(val, false); };
      wrap.insertBefore(chip, insertRef);
      markSuggestion(val, true);
      input.value = '';
    }
  });
  // 已有标签的删除按钮
  wrap.querySelectorAll('.tag-chip button[data-del]').forEach(btn => {
    if (btn.dataset.del === 'new') return;
    btn.onclick = () => {
      const chip = btn.parentElement;
      const val = chip.textContent.replace(/\s*×\s*$/,'').trim();
      chip.remove();
      markSuggestion(val, false);
    };
  });
}

function collectForm(photos, dieline) {
  // 收集风格标签
  const styleTags = Array.from(document.querySelectorAll('#styleTagsWrap .tag-chip'))
    .map(c => c.textContent.replace(/\s*×\s*$/,'').trim()).filter(Boolean);

  const dimL = document.getElementById('f_dimL').value;
  const dimW = document.getElementById('f_dimW').value;
  const dimH = document.getElementById('f_dimH').value;
  const matType = document.getElementById('f_materialType').value;

  return {
    title: document.getElementById('f_title').value.trim(),
    date: document.getElementById('f_date').value,
    boxType: document.getElementById('f_boxType').value === '__custom__'
      ? document.getElementById('f_boxTypeCustom').value.trim()
      : document.getElementById('f_boxType').value,
    dimensions: (dimL||dimW||dimH) ? { L: +dimL||null, W: +dimW||null, H: +dimH||null } : null,
    insertStructure: document.getElementById('f_insert').value.trim(),
    appearanceStyle: styleTags,
    material: matType ? {
      type: matType,
      thickness: document.getElementById('f_materialThickness').value.trim(),
      ecoFriendly: document.getElementById('f_ecoFriendly').value === 'true',
      note: document.getElementById('f_materialNote').value.trim(),
    } : null,
    productCategory: document.getElementById('f_category').value,
    unboxingExperience: document.getElementById('f_unboxing').value.trim(),
    inspirationNotes: document.getElementById('f_inspiration').value.trim(),
    photos: photos.filter(p => p.url),
    dieline: dieline,
    source: document.getElementById('f_source').value.trim(),
  };
}

async function saveEntry(payload, id) {
  try {
    const url = id ? `/api/entries/${encodeURIComponent(id)}` : '/api/entries';
    const method = id ? 'PUT' : 'POST';
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('保存失败');
    const saved = await res.json();
    if (id) {
      const idx = ENTRIES.findIndex(e => e.id === id);
      if (idx > -1) ENTRIES[idx] = saved;
    } else {
      ENTRIES.unshift(saved);
    }
    closeOverlay('editorOverlay');
    renderGallery();
  } catch (e) {
    alert('保存失败：' + e.message);
  }
}

// ========== 工具函数 ==========
function showOverlay(id) { document.getElementById(id).hidden = false; document.body.style.overflow = 'hidden'; }
function closeOverlay(id) { document.getElementById(id).hidden = true; document.body.style.overflow = ''; }

function openLightbox(src) {
  document.getElementById('lightboxImg').src = src;
  showOverlay('lightbox');
}

function esc(s) {
  if (s == null) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ========== 事件绑定 ==========
function bindEvents() {
  // 点击搜索按钮执行筛选
  document.getElementById('searchBtn').addEventListener('click', renderGallery);
  // 搜索框回车也执行筛选
  document.getElementById('searchInput').addEventListener('keydown', e => {
    if (e.key === 'Enter') renderGallery();
  });

  // 盒型筛选：选"自定义"时显示输入框
  const boxTypeSel = document.getElementById('filterBoxType');
  const boxTypeCustom = document.getElementById('filterBoxTypeCustom');
  boxTypeSel.addEventListener('change', () => {
    boxTypeCustom.hidden = boxTypeSel.value !== '__custom__';
    if (boxTypeCustom.hidden) boxTypeCustom.value = '';
    renderGallery();
  });
  // 自定义输入框回车触发筛选
  boxTypeCustom.addEventListener('keydown', e => {
    if (e.key === 'Enter') renderGallery();
  });

  document.getElementById('clearFilters').addEventListener('click', () => {
    ['searchInput','filterBoxType','filterMaterial','filterCategory','filterStyle','filterDateFrom','filterDateTo']
      .forEach(id => { document.getElementById(id).value = ''; });
    boxTypeCustom.hidden = true;
    boxTypeCustom.value = '';
    renderGallery();
  });

  document.getElementById('newEntryBtn').addEventListener('click', () => openEditor(null));

  // 点击弹层背景关闭
  ['detailOverlay','editorOverlay','lightbox'].forEach(id => {
    document.getElementById(id).addEventListener('click', e => {
      if (e.target.id === id) closeOverlay(id);
    });
  });

  // ESC 关闭弹层
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      ['detailOverlay','editorOverlay','lightbox'].forEach(id => {
 const el = document.getElementById(id);
        if (!el.hidden) closeOverlay(id);
      });
    }
  });
}

// 启动
init();
