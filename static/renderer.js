const $ = id => document.getElementById(id);

// ═══════════════════════════════════════════════════
//  PC PROFILES & ENCODERS
// ═══════════════════════════════════════════════════
let PC_PROFILES = []; // loaded from /api/profiles at boot

const ENCODERS = {
  libx264: {
    label: 'H.264 (libx264) — CPU', type: 'sw', codec: 'h264',
    presets: ['medium','slow','slower','veryslow'], defaultPreset: 'slower',
    hint: 'CPU — lento pero preciso', twoPass: true,
    buildBR: (br,pr,pf,vf,au,inp,out,nd,thr) => {
      const t = thr ? ` -threads ${thr}` : '';
      const c = `-c:v libx264 -b:v ${br}k -preset ${pr} -pix_fmt ${pf}${vf}${t}`;
      return [`ffmpeg -y -i "${inp}" ${c} -pass 1 -an -f null ${nd}`, `ffmpeg -y -i "${inp}" ${c} -pass 2 ${au} "${out}"`];
    },
    buildCRF: (crf,pr,pf,vf,au,inp,out,thr) => {
      const t = thr ? ` -threads ${thr}` : '';
      return [`ffmpeg -y -i "${inp}" -c:v libx264 -crf ${crf} -preset ${pr} -pix_fmt ${pf}${vf}${t} ${au} "${out}"`];
    },
  },
  libx265: {
    label: 'H.265 (libx265) — CPU', type: 'sw', codec: 'hevc',
    presets: ['medium','slow','slower','veryslow'], defaultPreset: 'slower',
    hint: 'CPU — ~30% mejor compresión', twoPass: true,
    buildBR: (br,pr,pf,vf,au,inp,out,nd,thr) => {
      const t = thr ? ` -threads ${thr}` : '';
      const c = `-c:v libx265 -b:v ${br}k -preset ${pr} -pix_fmt ${pf}${vf} -tag:v hvc1${t}`;
      return [`ffmpeg -y -i "${inp}" ${c} -x265-params pass=1:stats=x265stats -an -f null ${nd}`, `ffmpeg -y -i "${inp}" ${c} -x265-params pass=2:stats=x265stats ${au} "${out}"`];
    },
    buildCRF: (crf,pr,pf,vf,au,inp,out,thr) => {
      const t = thr ? ` -threads ${thr}` : '';
      return [`ffmpeg -y -i "${inp}" -c:v libx265 -crf ${crf} -preset ${pr} -pix_fmt ${pf}${vf} -tag:v hvc1${t} ${au} "${out}"`];
    },
  },
  h264_nvenc: {
    label: 'H.264 NVENC — GPU', type: 'hw', codec: 'h264',
    presets: ['slow','medium','fast','hq'], defaultPreset: 'hq',
    hint: 'NVENC Pascal — rápido',
    buildBR: (br,pr,pf,vf,au,inp,out) => [`ffmpeg -y -i "${inp}" -c:v h264_nvenc -b:v ${br}k -preset ${pr} -pix_fmt ${pf} -rc vbr -spatial-aq 1 -temporal-aq 1${vf} ${au} "${out}"`],
    buildCRF: (cq,pr,pf,vf,au,inp,out) => [`ffmpeg -y -i "${inp}" -c:v h264_nvenc -cq ${cq} -preset ${pr} -pix_fmt ${pf} -rc vbr -spatial-aq 1 -temporal-aq 1${vf} ${au} "${out}"`],
  },
  h264_amf: {
    label: 'H.264 AMF — AMD', type: 'hw', codec: 'h264',
    presets: ['speed','balanced','quality'], defaultPreset: 'quality',
    hint: 'AMF — GPU AMD',
    buildBR: (br,pr,pf,vf,au,inp,out) => [`ffmpeg -y -i "${inp}" -c:v h264_amf -b:v ${br}k -quality ${pr} -pix_fmt ${pf} -rc cbr${vf} ${au} "${out}"`],
    buildCRF: (crf,pr,pf,vf,au,inp,out) => [`ffmpeg -y -i "${inp}" -c:v h264_amf -rc cqp -qp_i ${crf} -qp_p ${crf} -quality ${pr} -pix_fmt ${pf}${vf} ${au} "${out}"`],
  },
  hevc_amf: {
    label: 'H.265 AMF — AMD', type: 'hw', codec: 'hevc',
    presets: ['speed','balanced','quality'], defaultPreset: 'quality',
    hint: 'AMF HEVC — mejor compresión',
    buildBR: (br,pr,pf,vf,au,inp,out) => [`ffmpeg -y -i "${inp}" -c:v hevc_amf -b:v ${br}k -quality ${pr} -pix_fmt ${pf} -rc cbr${vf} -tag:v hvc1 ${au} "${out}"`],
    buildCRF: (crf,pr,pf,vf,au,inp,out) => [`ffmpeg -y -i "${inp}" -c:v hevc_amf -rc cqp -qp_i ${crf} -qp_p ${crf} -quality ${pr} -pix_fmt ${pf}${vf} -tag:v hvc1 ${au} "${out}"`],
  },
  h264_qsv: {
    label: 'H.264 QSV — Intel', type: 'hw', codec: 'h264',
    presets: ['fast','medium','slow','veryslow'], defaultPreset: 'slow',
    hint: 'Quick Sync — iGPU Intel',
    buildBR: (br,pr,pf,vf,au,inp,out) => [`ffmpeg -y -i "${inp}" -c:v h264_qsv -b:v ${br}k -preset ${pr} -pix_fmt ${pf}${vf} ${au} "${out}"`],
    buildCRF: (crf,pr,pf,vf,au,inp,out) => [`ffmpeg -y -i "${inp}" -c:v h264_qsv -global_quality ${crf} -preset ${pr} -pix_fmt ${pf}${vf} ${au} "${out}"`],
  },
  hevc_qsv: {
    label: 'H.265 QSV — Intel', type: 'hw', codec: 'hevc',
    presets: ['fast','medium','slow','veryslow'], defaultPreset: 'slow',
    hint: 'QSV HEVC — mejor compresión',
    buildBR: (br,pr,pf,vf,au,inp,out) => [`ffmpeg -y -i "${inp}" -c:v hevc_qsv -b:v ${br}k -preset ${pr} -pix_fmt ${pf}${vf} -tag:v hvc1 ${au} "${out}"`],
    buildCRF: (crf,pr,pf,vf,au,inp,out) => [`ffmpeg -y -i "${inp}" -c:v hevc_qsv -global_quality ${crf} -preset ${pr} -pix_fmt ${pf}${vf} -tag:v hvc1 ${au} "${out}"`],
  },
  h264_vaapi: {
    label: 'H.264 VAAPI — Intel', type: 'hw', codec: 'h264',
    presets: ['quality','balanced','speed'], defaultPreset: 'quality',
    hint: 'VAAPI — iGPU Intel (Linux) · quality=velocidad 0→más lento/mejor',
    buildBR: (br,pr,pf,vf,au,inp,out) => {
      const q = {quality:0, balanced:4, speed:7}[pr] ?? 0;
      const m = vf.match(/^ -vf "(.+)"$/);
      const hwvf = m ? ` -vf "${m[1]},format=nv12,hwupload"` : ' -vf "format=nv12,hwupload"';
      return [`ffmpeg -y -vaapi_device /dev/dri/renderD128 -i "${inp}"${hwvf} -c:v h264_vaapi -b:v ${br}k -quality ${q} ${au} "${out}"`];
    },
    buildCRF: (qp,pr,pf,vf,au,inp,out) => {
      const q = {quality:0, balanced:4, speed:7}[pr] ?? 0;
      const m = vf.match(/^ -vf "(.+)"$/);
      const hwvf = m ? ` -vf "${m[1]},format=nv12,hwupload"` : ' -vf "format=nv12,hwupload"';
      return [`ffmpeg -y -vaapi_device /dev/dri/renderD128 -i "${inp}"${hwvf} -c:v h264_vaapi -qp ${qp} -quality ${q} ${au} "${out}"`];
    },
  },
  hevc_vaapi: {
    label: 'H.265 VAAPI — Intel', type: 'hw', codec: 'hevc',
    presets: ['quality','balanced','speed'], defaultPreset: 'quality',
    hint: 'VAAPI HEVC — mejor compresión (Linux) · quality=velocidad 0→más lento/mejor',
    buildBR: (br,pr,pf,vf,au,inp,out) => {
      const q = {quality:0, balanced:4, speed:7}[pr] ?? 0;
      const m = vf.match(/^ -vf "(.+)"$/);
      const hwvf = m ? ` -vf "${m[1]},format=nv12,hwupload"` : ' -vf "format=nv12,hwupload"';
      return [`ffmpeg -y -vaapi_device /dev/dri/renderD128 -i "${inp}"${hwvf} -c:v hevc_vaapi -b:v ${br}k -quality ${q} -tag:v hvc1 ${au} "${out}"`];
    },
    buildCRF: (qp,pr,pf,vf,au,inp,out) => {
      const q = {quality:0, balanced:4, speed:7}[pr] ?? 0;
      const m = vf.match(/^ -vf "(.+)"$/);
      const hwvf = m ? ` -vf "${m[1]},format=nv12,hwupload"` : ' -vf "format=nv12,hwupload"';
      return [`ffmpeg -y -vaapi_device /dev/dri/renderD128 -i "${inp}"${hwvf} -c:v hevc_vaapi -qp ${qp} -quality ${q} -tag:v hvc1 ${au} "${out}"`];
    },
  },
};

// ═══════════════════════════════════════════════════
//  STATE
// ═══════════════════════════════════════════════════
let activePC = null; // set after profiles load
let currentMode = 'compress';
let selectedFiles = []; // [{path, name, size, probe: null|{...}}]
let currentBrowsePath = '';

const VIDEO_EXTS = ['.mp4','.mkv','.avi','.mov','.webm','.mpg','.mpeg','.vob','.ts','.m2ts','.wmv','.flv','.m4v','.3gp','.ogv'];

// ═══════════════════════════════════════════════════
//  FILE BROWSER
// ═══════════════════════════════════════════════════
async function browseTo(path) {
  try {
    const r = await fetch(`/api/browse?path=${encodeURIComponent(path)}`);
    const data = await r.json();
    if (data.error) { console.error(data.error); return; }

    currentBrowsePath = data.path;
    $('pathInput').value = data.path;

    // Drives
    if (data.drives && data.drives.length) {
      $('drivesRow').innerHTML = data.drives.map(d =>
        `<button class="drive-btn" data-path="${d}">${d}</button>`
      ).join('');
      $('drivesRow').querySelectorAll('.drive-btn').forEach(b =>
        b.addEventListener('click', () => browseTo(b.dataset.path))
      );
    }

    // File list
    const list = $('fileList');
    list.innerHTML = '';

    for (const item of data.items) {
      const isVideo = !item.is_dir && VIDEO_EXTS.includes(item.ext);
      if (!item.is_dir && !isVideo) continue; // hide non-video files

      const el = document.createElement('div');
      el.className = 'file-item';
      el.dataset.path = item.path;
      el.dataset.isDir = item.is_dir;
      el.dataset.name = item.name;
      el.dataset.size = item.size;

      const icon = item.is_dir ? '📁' : '🎬';
      const nameClass = item.is_dir ? 'file-name dir' : 'file-name';
      const sizeStr = item.is_dir ? '' : formatSize(item.size);

      const isSelected = selectedFiles.some(f => f.path === item.path);

      el.innerHTML = `
        ${!item.is_dir ? `<div class="file-check">${isSelected ? '✓' : ''}</div>` : ''}
        <div class="file-icon">${icon}</div>
        <div class="${nameClass}">${item.name}</div>
        <div class="file-size">${sizeStr}</div>
      `;

      if (isSelected) el.classList.add('selected');

      el.addEventListener('click', () => {
        if (item.is_dir) {
          browseTo(item.path);
        } else {
          toggleFileSelection(item, el);
        }
      });

      list.appendChild(el);
    }

    updateSelectionUI();
  } catch(e) {
    console.error('Browse error:', e);
  }
}

function toggleFileSelection(item, el) {
  const idx = selectedFiles.findIndex(f => f.path === item.path);
  if (idx >= 0) {
    selectedFiles.splice(idx, 1);
    el.classList.remove('selected');
    el.querySelector('.file-check').textContent = '';
  } else {
    const entry = { path: item.path, name: item.name, size: item.size, probe: null };
    selectedFiles.push(entry);
    el.classList.add('selected');
    el.querySelector('.file-check').textContent = '✓';
    // Auto-probe
    probeFile(entry);
  }
  updateSelectionUI();
}

function updateSelectionUI() {
  const n = selectedFiles.length;
  $('selectedCount').textContent = `${n} archivo${n !== 1 ? 's' : ''}`;
  $('btnAddQueue').disabled = n === 0;
  renderSelectedFiles();
}

$('btnUp').addEventListener('click', () => {
  const parts = currentBrowsePath.replace(/\\/g, '/').split('/');
  if (parts.length > 1) {
    parts.pop();
    browseTo(parts.join('/') || '/');
  }
});

$('pathInput').addEventListener('keydown', e => {
  if (e.key === 'Enter') browseTo($('pathInput').value);
});

$('btnGo').addEventListener('click', () => browseTo($('pathInput').value));

$('btnSelectAll').addEventListener('click', () => {
  const items = $('fileList').querySelectorAll('.file-item:not([data-is-dir="true"])');
  const allSelected = [...items].every(el => el.classList.contains('selected'));

  if (allSelected) {
    // Deselect all in current folder
    items.forEach(el => {
      const path = el.dataset.path;
      selectedFiles = selectedFiles.filter(f => f.path !== path);
      el.classList.remove('selected');
      const check = el.querySelector('.file-check');
      if (check) check.textContent = '';
    });
  } else {
    items.forEach(el => {
      if (!el.classList.contains('selected')) {
        const item = { path: el.dataset.path, name: el.dataset.name, size: parseInt(el.dataset.size) };
        toggleFileSelection(item, el);
      }
    });
  }
  updateSelectionUI();
});

// ═══════════════════════════════════════════════════
//  FFPROBE
// ═══════════════════════════════════════════════════
async function probeFile(entry) {
  try {
    const r = await fetch('/api/probe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: entry.path }),
    });
    const data = await r.json();
    if (data.error) {
      entry.probe = { error: data.error };
    } else {
      entry.probe = data;
    }
  } catch(e) {
    entry.probe = { error: e.message };
  }
  renderSelectedFiles();
  checkInterlaced();
}

function checkInterlaced() {
  // Show deinterlace option if any selected file is interlaced
  const hasInterlaced = selectedFiles.some(f => f.probe?.video?.interlaced);
  $('rowDeinterlace').style.display = hasInterlaced ? '' : 'none';
}

// ═══════════════════════════════════════════════════
//  SELECTED FILES LIST
// ═══════════════════════════════════════════════════
function renderSelectedFiles() {
  const el = $('selectedFiles');
  if (selectedFiles.length === 0) {
    el.innerHTML = '<div class="empty-state" style="padding:24px;"><div class="sub">Selecciona archivos del explorador</div></div>';
    return;
  }

  el.innerHTML = selectedFiles.map((f, i) => {
    let metaHTML = '';
    let tagsHTML = '';
    let streamsHTML = '';

    if (f.probe === null) {
      metaHTML = '<div class="sel-file-loading">Analizando con ffprobe...</div>';
    } else if (f.probe.error) {
      metaHTML = `<div class="sel-file-loading" style="color:var(--red);">Error: ${f.probe.error}</div>`;
    } else {
      const v = f.probe.video;
      const fmt = f.probe.format;
      const dur = fmt?.duration ? formatTime(fmt.duration) : '?';
      const size = fmt?.size ? formatSize(fmt.size) : '?';

      metaHTML = `<div class="sel-file-meta">
        <span>${dur}</span>
        <span>${size}</span>
        ${v ? `<span>${v.width}×${v.height}</span>` : ''}
        ${v ? `<span>${v.fps} fps</span>` : ''}
        ${v?.codec ? `<span>${v.codec}</span>` : ''}
      </div>`;

      // Tags
      const tags = [];
      if (v?.interlaced) tags.push(`<span class="probe-tag interlaced">${v.field_order || 'ENTRELAZADO'}</span>`);
      if (v?.sar && v.sar !== '1:1') tags.push(`<span class="probe-tag sar">SAR ${v.sar}</span>`);

      const legacyCodecs = ['mpeg2video','mpeg1video','mjpeg','msmpeg4','wmv3','flv1'];
      if (v?.codec && legacyCodecs.includes(v.codec)) tags.push(`<span class="probe-tag legacy">LEGACY</span>`);
      else if (v) tags.push(`<span class="probe-tag ok">${v.codec || 'OK'}</span>`);

      if (tags.length) tagsHTML = `<div class="probe-tags">${tags.join('')}</div>`;

      // Stream selectors
      const audioStreams = f.probe.audio_streams || [];
      const subStreams = f.probe.subtitle_streams || [];

      if (audioStreams.length > 1) {
        const effAudio = f.selectedAudioStreamIdx ?? audioStreams[0]?.index;
        streamsHTML += `<div class="sel-file-streams">
          <span class="stream-label">Audio:</span>
          <select class="stream-select stream-audio" data-idx="${i}">
            ${audioStreams.map(s => {
              const parts = [s.language?.toUpperCase(), s.title, s.channels ? s.channels + 'ch' : '', s.codec].filter(Boolean);
              return `<option value="${s.index}" data-rel="${s.relative_index}" ${s.index === effAudio ? 'selected' : ''}>${parts.join(' · ')}</option>`;
            }).join('')}
          </select>
        </div>`;
      }

      if (subStreams.length > 0) {
        const effSub = f.selectedSubStreamIdx ?? null;
        streamsHTML += `<div class="sel-file-streams">
          <span class="stream-label">Subs:</span>
          <select class="stream-select stream-sub" data-idx="${i}">
            <option value="">No grabar</option>
            ${subStreams.map(s => {
              const parts = [s.language?.toUpperCase(), s.title, s.codec].filter(Boolean);
              return `<option value="${s.index}" data-rel="${s.relative_index}" data-codec="${escapeHtml(s.codec)}" ${s.index === effSub ? 'selected' : ''}>${parts.join(' · ')}</option>`;
            }).join('')}
          </select>
        </div>`;
      }
    }

    return `<div class="sel-file">
      <div class="sel-file-header">
        <div class="sel-file-icon">🎬</div>
        <div class="sel-file-name">${f.name}</div>
        <button class="sel-file-remove" data-idx="${i}" title="Quitar">✕</button>
      </div>
      ${metaHTML}
      ${tagsHTML}
      ${streamsHTML}
    </div>`;
  }).join('');

  // Remove buttons
  el.querySelectorAll('.sel-file-remove').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedFiles.splice(parseInt(btn.dataset.idx), 1);
      updateSelectionUI();
      checkInterlaced();
    });
  });

  // Audio track selector
  el.querySelectorAll('.stream-audio').forEach(sel => {
    sel.addEventListener('change', () => {
      selectedFiles[parseInt(sel.dataset.idx)].selectedAudioStreamIdx = parseInt(sel.value);
    });
  });

  // Subtitle burn selector
  el.querySelectorAll('.stream-sub').forEach(sel => {
    sel.addEventListener('change', () => {
      const entry = selectedFiles[parseInt(sel.dataset.idx)];
      if (!sel.value) {
        entry.selectedSubStreamIdx = null;
        entry.selectedSubRelIdx = null;
        entry.selectedSubCodec = null;
      } else {
        const opt = sel.options[sel.selectedIndex];
        entry.selectedSubStreamIdx = parseInt(sel.value);
        entry.selectedSubRelIdx = parseInt(opt.dataset.rel);
        entry.selectedSubCodec = opt.dataset.codec;
      }
    });
  });
}

// ═══════════════════════════════════════════════════
//  MODE SELECTOR
// ═══════════════════════════════════════════════════
$('modeSelector').querySelectorAll('.pc-chip').forEach(chip => {
  chip.addEventListener('click', () => {
    currentMode = chip.dataset.mode;
    $('modeSelector').querySelectorAll('.pc-chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    updateModeUI();
  });
});

function updateModeUI() {
  const isConvert = currentMode === 'convert';
  $('rowSizeLimit').style.display = isConvert ? 'none' : '';
  $('rowCRF').style.display = isConvert ? '' : 'none';
}

// ═══════════════════════════════════════════════════
//  PC PROFILES
// ═══════════════════════════════════════════════════
function renderProfiles() {
  $('pcProfiles').innerHTML = PC_PROFILES.map(pc => `
    <div class="pc-chip ${pc.id === activePC.id ? 'active' : ''}" data-id="${pc.id}">
      <div class="pc-chip-icon">${pc.icon}</div>
      <div>
        <div class="pc-chip-name">${pc.name}</div>
        <div class="pc-chip-sub">${pc.sub}</div>
      </div>
    </div>
  `).join('');

  $('pcProfiles').querySelectorAll('.pc-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      activePC = PC_PROFILES.find(p => p.id === chip.dataset.id);
      renderProfiles(); updateEncoderOptions();
    });
  });

  const badges = [];
  badges.push(`<span class="hw-badge os">${activePC.os === 'windows' ? 'Windows' : 'Ubuntu'}</span>`);
  badges.push(`<span class="hw-badge cpu">${activePC.cpu}</span>`);
  if (activePC.hwEncoders.includes('h264_nvenc')) badges.push('<span class="hw-badge nvenc">NVENC</span>');
  if (activePC.hwEncoders.some(e => e.includes('amf'))) badges.push('<span class="hw-badge amf">AMF</span>');
  if (activePC.hwEncoders.some(e => e.includes('qsv'))) badges.push('<span class="hw-badge qsv">QSV</span>');
  if (activePC.hwEncoders.some(e => e.includes('vaapi'))) badges.push('<span class="hw-badge vaapi">VAAPI</span>');
  $('hwBadges').innerHTML = badges.join('');
}

function updateEncoderOptions() {
  if (!activePC) return;
  const sel = $('encoder');
  const available = [...activePC.hwEncoders, ...activePC.swEncoders];
  const prev = sel.value;
  sel.innerHTML = available.map(id => ENCODERS[id] ? `<option value="${id}">${ENCODERS[id].label}</option>` : '').join('');
  sel.value = available.includes(prev) ? prev : (activePC.hwEncoders[0] || activePC.swEncoders[0]);
  updatePresetOptions();
}

function updatePresetOptions() {
  const enc = ENCODERS[$('encoder').value];
  if (!enc) return;
  $('preset').innerHTML = enc.presets.map(p => `<option value="${p}" ${p === enc.defaultPreset ? 'selected' : ''}>${p}</option>`).join('');
  $('presetHint').textContent = enc.hint;
  $('encoderHint').textContent = enc.type === 'hw' ? 'Hardware — rápido' : 'Software — lento pero preciso';
}

$('encoder').addEventListener('change', updatePresetOptions);

// ═══════════════════════════════════════════════════
//  TABS
// ═══════════════════════════════════════════════════
let _logRefreshTimer = null;

document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    tab.classList.add('active');
    $('panel' + tab.dataset.tab.charAt(0).toUpperCase() + tab.dataset.tab.slice(1)).classList.add('active');

    clearInterval(_logRefreshTimer);
    if (tab.dataset.tab === 'logs') {
      fetchLogs();
      _logRefreshTimer = setInterval(fetchLogs, 3000);
    }
  });
});

// ═══════════════════════════════════════════════════
//  ADD TO QUEUE
// ═══════════════════════════════════════════════════
$('btnAddQueue').addEventListener('click', async () => {
  if (selectedFiles.length === 0) return;

  // Wait for all probes to finish
  const pending = selectedFiles.filter(f => f.probe === null);
  if (pending.length > 0) {
    await new Promise(resolve => {
      const check = setInterval(() => {
        if (selectedFiles.every(f => f.probe !== null)) { clearInterval(check); resolve(); }
      }, 200);
    });
  }

  const encId = $('encoder').value;
  const enc = ENCODERS[encId];
  if (!enc) return;

  const preset = $('preset').value;
  const abr = parseInt($('audioBitrate').value);
  const hasAudio = $('includeAudio').checked;
  const resOv = $('resOverride').value;
  const fpsOv = $('fpsOverride').value;
  const isConvert = currentMode === 'convert';
  const sizeLimitMB = isConvert ? 0 : (parseFloat($('sizeLimit').value) || 10);
  const crfVal = parseInt($('crfValue').value) || 20;
  const deint = $('deinterlace').value;
  const nullDev = activePC.os === 'linux' ? '/dev/null' : 'NUL';

  const jobsToAdd = [];

  for (const f of selectedFiles) {
    if (f.probe?.error) continue;

    const v = f.probe?.video;
    const dur = f.probe?.format?.duration || 10;
    const srcW = v?.width || 1280;
    const srcH = v?.height || 720;
    const srcFps = v?.fps || 30;
    const isInterlaced = v?.interlaced || false;
    const sar = v?.sar || null;
    const hasSAR = sar && sar !== '1:1';
    const useBitrate = !isConvert;

    // Bitrate calc
    let vbr = 0;
    if (useBitrate) {
      const tgtBytes = sizeLimitMB * 1048576 * 0.98;
      const audioBitsTotal = hasAudio ? (abr * 1000 * dur) : 0;
      vbr = Math.floor((tgtBytes * 8 - audioBitsTotal) / dur / 1000);
      if (vbr < 50) vbr = 50;
    }

    // FPS
    let tFps = srcFps, fpsNeeded = false;
    if (fpsOv === 'auto') {
      if (useBitrate) { tFps = vbr < 400 ? 24 : vbr < 800 ? 30 : srcFps; }
      fpsNeeded = tFps < srcFps;
    } else if (fpsOv !== 'source') {
      tFps = parseInt(fpsOv);
      fpsNeeded = tFps !== srcFps;
    }

    // Resolution
    let tH = srcH, scaleNeeded = false;
    if (resOv === 'auto') {
      if (useBitrate) {
        tH = vbr < 300 ? 360 : vbr < 700 ? 480 : vbr < 1500 ? 720 : vbr < 4000 ? 1080 : srcH;
        if (tH >= srcH) tH = srcH; else scaleNeeded = true;
      }
    } else if (resOv !== 'source') {
      tH = parseInt(resOv);
      scaleNeeded = tH !== srcH;
    }

    // Filters
    let vfParts = [];
    if (isInterlaced && deint !== 'none') vfParts.push(`${deint}=0:-1:0`);
    if (scaleNeeded && hasSAR) {
      vfParts.push(`scale=-2:${tH}:force_original_aspect_ratio=decrease`);
      vfParts.push('setsar=1');
    } else if (scaleNeeded) {
      vfParts.push(`scale=-2:${tH}`);
    } else if (hasSAR) {
      vfParts.push('scale=trunc(iw*sar/2)*2:ih');
      vfParts.push('setsar=1');
    }
    if (fpsNeeded) vfParts.push(`fps=${tFps}`);

    // Stream selection
    const audioStreams = f.probe?.audio_streams || [];
    const selectedAudioGlobalIdx = f.selectedAudioStreamIdx ?? audioStreams[0]?.index ?? null;
    const IMAGE_SUB_CODECS = new Set(['hdmv_pgs_subtitle','dvb_subtitle','xsub','dvd_subtitle']);
    const selectedSub = (f.selectedSubStreamIdx != null)
      ? { relIdx: f.selectedSubRelIdx, codec: f.selectedSubCodec }
      : null;

    const usingFilterComplex = selectedSub && IMAGE_SUB_CODECS.has(selectedSub.codec);
    const needsAudioMap = usingFilterComplex || audioStreams.length > 1;
    const audioMapIdx = selectedAudioGlobalIdx;

    // Build vf string (or filter_complex for image-based subtitle burn)
    let vf;
    if (usingFilterComplex) {
      // Scale subtitle proportionally to FIT within source video dimensions (no stretch,
      // no crop), then overlay at original resolution centered horizontally, then apply
      // scale/fps/etc to the composited video. eof_action=pass keeps video going when
      // the subtitle track ends before the film ends.
      const scaleSub = `[0:s:${selectedSub.relIdx}]scale=${srcW}:${srcH}:force_original_aspect_ratio=decrease[sub]`;
      const overlayFilter = `[0:v][sub]overlay=x=(W-w)/2:eof_action=pass`;
      if (vfParts.length) {
        vf = ` -filter_complex "${scaleSub};${overlayFilter}[ov];[ov]${vfParts.join(',')}[vout]" -map "[vout]"`;
      } else {
        vf = ` -filter_complex "${scaleSub};${overlayFilter}[vout]" -map "[vout]"`;
      }
    } else if (selectedSub) {
      // Text-based subtitle (SRT/ASS) — subtitles filter
      const esc = f.path.replace(/\\/g, '/').replace(/:/g, '\\:');
      vfParts.push(`subtitles='${esc}':si=${selectedSub.relIdx}`);
      vf = ` -vf "${vfParts.join(',')}"`;
    } else {
      vf = vfParts.length ? ` -vf "${vfParts.join(',')}"` : '';
    }

    // Build audio string with explicit -map flags when needed
    let audioStr;
    if (!hasAudio) {
      audioStr = '-an';
    } else if (needsAudioMap && audioMapIdx !== null) {
      if (usingFilterComplex) {
        // -map "[vout]" already handles video; just map audio
        audioStr = `-map 0:${audioMapIdx} -c:a aac -b:a ${abr}k`;
      } else {
        // No filter_complex — must map both video and audio explicitly
        audioStr = `-map 0:v:0 -map 0:${audioMapIdx} -c:a aac -b:a ${abr}k`;
      }
    } else {
      audioStr = `-c:a aac -b:a ${abr}k`;
    }

    const output = f.path.replace(/\.[^.]+$/, '') + '_discord.mp4';

    let cmds;
    if (useBitrate) {
      if (usingFilterComplex && enc.twoPass) {
        // Pass 1 must NOT include the subtitle overlay — the overlay changes per-frame
        // properties and causes x264/x265 2-pass stats to diverge massively (15 GB output).
        // Run pass 1 with normal scale/fps filters only, pass 2 with the full overlay.
        const vfPass1 = vfParts.length ? ` -vf "${vfParts.join(',')}"` : '';
        const p1 = enc.buildBR(vbr, preset, 'yuv420p', vfPass1, '-an', f.path, output, nullDev, activePC.threads);
        const p2 = enc.buildBR(vbr, preset, 'yuv420p', vf, audioStr, f.path, output, nullDev, activePC.threads);
        cmds = [p1[0], p2[p2.length - 1]];
      } else {
        cmds = enc.buildBR(vbr, preset, 'yuv420p', vf, audioStr, f.path, output, nullDev, activePC.threads);
      }
    } else {
      cmds = enc.buildCRF(crfVal, preset, 'yuv420p', vf, audioStr, f.path, output, activePC.threads);
    }

    // PGS subtitles need extra analysis time before ffmpeg can decode them
    if (usingFilterComplex) {
      cmds = cmds.map(cmd => cmd.replace('ffmpeg -y -i ', 'ffmpeg -y -probesize 100M -analyzeduration 100M -i '));
    }

    jobsToAdd.push({
      input: f.path,
      output: output,
      command: cmds,
      duration: dur,
    });
  }

  if (jobsToAdd.length === 0) return;

  // Send to server
  try {
    await fetch('/api/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(jobsToAdd),
    });
  } catch(e) {
    console.error('Failed to add jobs:', e);
  }

  // Clear selection & switch to queue tab
  selectedFiles = [];
  updateSelectionUI();
  document.querySelector('.tab[data-tab="queue"]').click();
});

// ═══════════════════════════════════════════════════
//  JOB LIST & SSE PROGRESS
// ═══════════════════════════════════════════════════
function renderJobs(jobs) {
  const el = $('jobList');

  // Update badge
  const running = jobs.filter(j => j.status === 'running' || j.status === 'queued').length;
  $('queueBadge').textContent = running > 0 ? `(${running})` : '';

  if (jobs.length === 0) {
    el.innerHTML = `<div class="empty-state">
      <div class="icon">📋</div>
      <div class="text">Cola vacía</div>
      <div class="sub">Selecciona archivos y agrégalos a la cola</div>
    </div>`;
    return;
  }

  el.innerHTML = jobs.map(j => {
    const statusClass = j.status;
    let meta = '';
    if (j.status === 'running') {
      meta = `<div class="job-meta">
        <span><strong>${j.progress.toFixed(1)}%</strong></span>
        ${j.fps_speed > 0 ? `<span>${j.fps_speed} fps</span>` : ''}
        <span>${formatTime(j.current_time)} / ${formatTime(j.duration)}</span>
      </div>`;
    } else if (j.status === 'done') {
      meta = `<div class="job-done-info">✓ Listo${j.output_size ? ' — ' + formatSize(j.output_size) : ''}</div>`;
    } else if (j.status === 'error') {
      meta = `<div class="job-error-msg">${escapeHtml(j.error || 'Error desconocido')}</div>`;
    }

    const cancelBtn = (j.status === 'queued' || j.status === 'running')
      ? `<button class="job-cancel" data-id="${j.id}">Cancelar</button>` : '';

    return `<div class="job-card ${statusClass}">
      <div class="job-header">
        <div class="job-status-dot ${statusClass}"></div>
        <div class="job-filename">${j.filename}</div>
        ${cancelBtn}
      </div>
      <div class="job-progress-bar">
        <div class="job-progress-fill" style="width:${j.progress}%"></div>
      </div>
      ${meta}
    </div>`;
  }).join('');

  // Cancel buttons
  el.querySelectorAll('.job-cancel').forEach(btn => {
    btn.addEventListener('click', async () => {
      await fetch(`/api/jobs/${btn.dataset.id}`, { method: 'DELETE' });
    });
  });
}

$('btnClearDone').addEventListener('click', async () => {
  await fetch('/api/jobs/clear', { method: 'POST' });
});

// SSE connection
function connectSSE() {
  const sse = new EventSource('/api/progress');
  sse.onmessage = e => {
    try {
      const jobs = JSON.parse(e.data);
      renderJobs(jobs);
    } catch(err) {}
  };
  sse.onerror = () => {
    sse.close();
    setTimeout(connectSSE, 2000);
  };
}

// ═══════════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════════
function escapeHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1073741824) return (bytes / 1048576).toFixed(2) + ' MB';
  return (bytes / 1073741824).toFixed(2) + ' GB';
}

function formatTime(s) {
  if (!s || !isFinite(s)) return '0s';
  const m = Math.floor(s / 60);
  const sec = (s % 60).toFixed(1);
  return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
}

// ═══════════════════════════════════════════════════
//  LOG VIEWER
// ═══════════════════════════════════════════════════
let _currentLogLevel = 'all';

async function fetchLogs() {
  try {
    const r = await fetch(`/api/logs?n=300&level=${_currentLogLevel}`);
    const data = await r.json();
    const viewer = $('logViewer');
    const atBottom = viewer.scrollHeight - viewer.scrollTop <= viewer.clientHeight + 60;

    if (!data.lines.length) {
      viewer.innerHTML = '<span class="log-line lv-info">Sin entradas en el log todavía.</span>';
    } else {
      viewer.innerHTML = data.lines.map(line => {
        let cls = 'lv-info';
        if (line.includes('[ERROR  ]'))   cls = 'lv-error';
        else if (line.includes('[WARNING]')) cls = 'lv-warning';
        else if (line.includes('[DEBUG  ]')) cls = 'lv-debug';
        return `<span class="log-line ${cls}">${escapeHtml(line)}</span>`;
      }).join('\n');
    }

    if (data.file) $('logPath').textContent = data.file;
    if (atBottom) viewer.scrollTop = viewer.scrollHeight;
  } catch(e) {
    $('logViewer').innerHTML = `<span class="log-line lv-error">Error al cargar logs: ${escapeHtml(e.message)}</span>`;
  }
}

document.querySelectorAll('.log-level-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.log-level-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    _currentLogLevel = btn.dataset.level;
    fetchLogs();
  });
});

$('btnRefreshLog').addEventListener('click', fetchLogs);

// ═══════════════════════════════════════════════════
//  PROFILE WIZARD
// ═══════════════════════════════════════════════════
const _WIZ_HW = ['h264_nvenc','hevc_nvenc','h264_amf','hevc_amf','h264_qsv','hevc_qsv','h264_vaapi','hevc_vaapi','h264_videotoolbox','hevc_videotoolbox'];
const _WIZ_SW = ['libx264','libx265'];
const _WIZ_ALL = [..._WIZ_HW, ..._WIZ_SW];
const _WIZ_LABELS = {
  libx264:'H.264 · CPU', libx265:'H.265 · CPU',
  h264_nvenc:'H.264 · NVIDIA', hevc_nvenc:'H.265 · NVIDIA',
  h264_amf:'H.264 · AMD', hevc_amf:'H.265 · AMD',
  h264_qsv:'H.264 · Intel', hevc_qsv:'H.265 · Intel',
  h264_vaapi:'H.264 · Intel VAAPI', hevc_vaapi:'H.265 · Intel VAAPI',
  h264_videotoolbox:'H.264 · Apple', hevc_videotoolbox:'H.265 · Apple',
};

let _wizSys = null, _wizResults = {}, _wizScanning = false, _wizScanDone = false;

function openWizard() {
  _wizSys = null; _wizResults = {}; _wizScanning = false; _wizScanDone = false;
  $('wizBtnScan').textContent = 'Iniciar escaneo';
  $('wizBtnScan').disabled = false;
  _wizGoStep(1);
  $('wizardOverlay').style.display = 'flex';
  _wizLoadSys();
}

function closeWizard() { $('wizardOverlay').style.display = 'none'; }

$('wizardClose').addEventListener('click', closeWizard);
$('btnNewProfile').addEventListener('click', openWizard);
$('wizardOverlay').addEventListener('click', e => { if (e.target === $('wizardOverlay')) closeWizard(); });

function _wizGoStep(n) {
  document.querySelectorAll('.wiz-step-dot').forEach(d => {
    const s = parseInt(d.dataset.step);
    d.className = 'wiz-step-dot' + (s < n ? ' done' : s === n ? ' active' : '');
  });
  for (let i = 1; i <= 3; i++) {
    const el = $(`wizStep${i}`);
    el.style.display = i === n ? 'flex' : 'none';
  }
}

async function _wizLoadSys() {
  try {
    const r = await fetch('/api/wizard/sysinfo');
    _wizSys = await r.json();
    const osIcon = {windows:'🪟', linux:'🐧', macos:'🍎'}[_wizSys.os] || '💻';
    $('wizSysinfo').innerHTML =
      `<div class="wiz-tag">${osIcon} ${_wizSys.os}</div>` +
      `<div class="wiz-tag">⚡ ${_wizSys.threads} threads</div>` +
      `<div class="wiz-tag wiz-tag-wide" title="${escapeHtml(_wizSys.cpu)}">🖥 ${escapeHtml(_wizSys.cpu)}</div>`;
    $('wizEncList').innerHTML = _WIZ_ALL.map(e =>
      `<div class="wiz-enc-row"><span class="wiz-enc-name">${e}</span><span class="wiz-enc-badge" id="wizB_${e}">pendiente</span></div>`
    ).join('');
  } catch(e) {
    $('wizSysinfo').innerHTML = `<div class="wiz-tag" style="color:var(--red)">Error al detectar</div>`;
  }
}

$('wizBtnScan').addEventListener('click', async () => {
  if (_wizScanDone) { _wizPopForm(); _wizGoStep(2); return; }
  if (_wizScanning) return;
  _wizScanning = true;
  $('wizBtnScan').disabled = true;
  $('wizBtnScan').textContent = 'Escaneando…';

  $('wizEncList').insertAdjacentHTML('beforebegin',
    '<div class="wiz-progress"><div class="wiz-prog-fill" id="wizProgFill" style="width:0%"></div></div>');

  for (let i = 0; i < _WIZ_ALL.length; i++) {
    const enc = _WIZ_ALL[i];
    const badge = $(`wizB_${enc}`);
    if (badge) { badge.className = 'wiz-enc-badge testing'; badge.textContent = 'probando…'; }
    try {
      const r = await fetch('/api/wizard/test', {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({encoder: enc}),
      });
      const d = await r.json();
      _wizResults[enc] = d;
      if (badge) { badge.className = `wiz-enc-badge ${d.ok ? 'ok' : 'fail'}`; badge.textContent = d.ok ? '✓ OK' : '✗ no'; }
    } catch(e) {
      _wizResults[enc] = {ok: false};
      if (badge) { badge.className = 'wiz-enc-badge fail'; badge.textContent = '✗ error'; }
    }
    const pf = $('wizProgFill');
    if (pf) pf.style.width = `${Math.round((i+1) / _WIZ_ALL.length * 100)}%`;
  }

  _wizScanning = false;
  _wizScanDone = true;
  const n = Object.values(_wizResults).filter(r => r.ok).length;
  $('wizBtnScan').disabled = false;
  $('wizBtnScan').textContent = `${n} compatible${n !== 1 ? 's' : ''} — Configurar →`;
});

function _wizPopForm() {
  if (!_wizSys) return;
  $('wizName').value = '';
  $('wizName').style.borderColor = '';
  $('wizIcon').value = {windows:'🖥️', linux:'🐧', macos:'🍎'}[_wizSys.os] || '💻';
  $('wizSub').value = '';
  $('wizCpu').value = _wizSys.cpu;
  $('wizOs').value = _wizSys.os === 'darwin' ? 'macos' : (_wizSys.os || 'windows');
  $('wizThreads').value = _wizSys.threads;

  const renderChecks = (container, list) => {
    const passing = list.filter(e => _wizResults[e]?.ok);
    if (!passing.length) {
      container.innerHTML = '<div class="wiz-none-msg">No se encontraron encoders.</div>';
      return;
    }
    container.innerHTML = passing.map(e => `
      <label class="wiz-chk-row checked">
        <input type="checkbox" checked data-enc="${e}">
        <div class="wiz-chk-box">✓</div>
        <span class="wiz-chk-name">${e}</span>
        <span class="wiz-chk-hint">${_WIZ_LABELS[e] || ''}</span>
      </label>`).join('');
    container.querySelectorAll('.wiz-chk-row').forEach(row => {
      row.addEventListener('click', () => {
        const cb = row.querySelector('input');
        cb.checked = !cb.checked;
        row.classList.toggle('checked', cb.checked);
        row.querySelector('.wiz-chk-box').textContent = cb.checked ? '✓' : '';
      });
    });
  };
  renderChecks($('wizHwEnc'), _WIZ_HW);
  renderChecks($('wizSwEnc'), _WIZ_SW);
}

$('wizBtnBack').addEventListener('click', () => _wizGoStep(1));

$('wizBtnSave').addEventListener('click', async () => {
  const name = $('wizName').value.trim();
  if (!name) { $('wizName').focus(); $('wizName').style.borderColor = 'var(--red)'; return; }
  $('wizName').style.borderColor = '';

  let id = name.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').substring(0, 30) || 'pc_nuevo';
  let base = id, n = 2;
  while (PC_PROFILES.some(p => p.id === id)) id = `${base}_${n++}`;

  const hw = [...document.querySelectorAll('#wizHwEnc input:checked')].map(c => c.dataset.enc);
  const sw = [...document.querySelectorAll('#wizSwEnc input:checked')].map(c => c.dataset.enc);

  try {
    const r = await fetch('/api/wizard/save', {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({
        id, name, icon: $('wizIcon').value || '💻',
        sub: $('wizSub').value.trim(), os: $('wizOs').value,
        cpu: $('wizCpu').value.trim(), hwEncoders: hw, swEncoders: sw,
        threads: parseInt($('wizThreads').value) || 4,
      }),
    });
    const data = await r.json();
    if (data.error) { alert(data.error); return; }
    $('wizDoneSub').textContent = `"${name}" guardado como profiles/${id}.json`;
    _wizGoStep(3);
    const pr = await fetch('/api/profiles');
    PC_PROFILES = await pr.json();
    activePC = PC_PROFILES.find(p => p.id === id) || PC_PROFILES[0];
    renderProfiles(); updateEncoderOptions();
  } catch(e) { alert('Error: ' + e.message); }
});

$('wizBtnDone').addEventListener('click', closeWizard);

// ═══════════════════════════════════════════════════
//  BOOT
// ═══════════════════════════════════════════════════
async function boot() {
  try {
    const r = await fetch('/api/profiles');
    PC_PROFILES = await r.json();
  } catch(e) {
    console.error('Failed to load profiles:', e);
    PC_PROFILES = [];
  }
  activePC = PC_PROFILES[0] || null;
  renderProfiles();
  updateEncoderOptions();
  updateModeUI();
  browseTo('');
  connectSSE();
}
boot();
