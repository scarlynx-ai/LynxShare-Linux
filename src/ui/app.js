/**
 * LynxShare - Linux Fedora Desktop Client
 * Tailored for Lenovo Yoga 7 2-in-1 (Intel Lunar Lake Core Ultra 7 258V)
 */

// Global State
const state = {
  serverUrl: localStorage.getItem('lynxshare_server_url') || 'http://192.168.31.219:8090',
  currentPath: '',
  items: [],
  filteredItems: [],
  categoryFilter: 'ALL',
  searchQuery: '',
  viewMode: localStorage.getItem('lynxshare_view_mode') || 'grid', // 'grid' | 'list'
  isOnline: false,
  diskInfo: null,
  
  // Video player state
  videoFiles: [],
  currentVideoIndex: -1,
  videoAspect: localStorage.getItem('lynxshare_video_aspect') || 'fit', // 'fit' | 'inmersive'
  videoSpeed: 1.0,
  controlsTimeout: null,
  
  // Photo viewer state
  photoFiles: [],
  currentPhotoIndex: -1,
  photoZoom: 1.0,
  
  // Audio player state
  audioFile: null,
  audioDuration: 0,

  // Brightness emulation for touchscreen HUD
  videoBrightness: 1.0
};

// DOM Elements
const DOM = {
  fileContainer: document.getElementById('fileContainer'),
  loadingState: document.getElementById('loadingState'),
  emptyState: document.getElementById('emptyState'),
  breadcrumbsNav: document.getElementById('breadcrumbsNav'),
  statusIndicator: document.getElementById('statusIndicator'),
  statusDot: document.getElementById('statusDot'),
  statusText: document.getElementById('statusText'),
  diskMeter: document.getElementById('diskMeter'),
  diskValues: document.getElementById('diskValues'),
  diskBarFill: document.getElementById('diskBarFill'),
  searchInput: document.getElementById('searchInput'),
  btnClearSearch: document.getElementById('btnClearSearch'),
  fileInput: document.getElementById('fileInput'),
  dropOverlay: document.getElementById('dropOverlay'),
  uploadProgressCard: document.getElementById('uploadProgressCard'),
  uploadProgFill: document.getElementById('uploadProgFill'),
  uploadProgPercent: document.getElementById('uploadProgPercent'),
  uploadProgMeta: document.getElementById('uploadProgMeta'),
  toastContainer: document.getElementById('toastContainer'),
  
  // Video Elements
  videoModal: document.getElementById('videoModal'),
  videoPlayer: document.getElementById('mainVideoPlayer'),
  videoWrapper: document.getElementById('videoWrapper'),
  videoHeader: document.getElementById('videoHeader'),
  videoControls: document.getElementById('videoControls'),
  videoPlayerTitle: document.getElementById('videoPlayerTitle'),
  btnAspectToggle: document.getElementById('btnAspectToggle'),
  aspectModeLabel: document.getElementById('aspectModeLabel'),
  btnVideoPlay: document.getElementById('btnVideoPlay'),
  videoScrubber: document.getElementById('videoScrubber'),
  scrubberFill: document.getElementById('scrubberFill'),
  videoTimeDisplay: document.getElementById('videoTimeDisplay'),
  btnSpeed: document.getElementById('btnSpeed'),
  btnVideoMute: document.getElementById('btnVideoMute'),
  videoVolSlider: document.getElementById('videoVolSlider'),
  gestureHud: document.getElementById('gestureHud'),
  gestureHudIcon: document.getElementById('gestureHudIcon'),
  gestureHudText: document.getElementById('gestureHudText'),
  rippleLeft: document.getElementById('rippleLeft'),
  rippleRight: document.getElementById('rippleRight'),

  // Photo Elements
  photoModal: document.getElementById('photoModal'),
  photoTitle: document.getElementById('photoTitle'),
  photoCounter: document.getElementById('photoCounter'),
  photoImage: document.getElementById('photoImage'),

  // Audio Elements
  floatingAudioPlayer: document.getElementById('floatingAudioPlayer'),
  audioElement: document.getElementById('audioElement'),
  audioTitle: document.getElementById('audioTitle'),
  audioMeta: document.getElementById('audioMeta'),
  btnAudioPlay: document.getElementById('btnAudioPlay'),
  audioProgress: document.getElementById('audioProgress'),
  audioVolume: document.getElementById('audioVolume'),

  // Modals
  serverModal: document.getElementById('serverModal'),
  serverUrlInput: document.getElementById('serverUrlInput'),
  testStatusLabel: document.getElementById('testStatusLabel'),
  testSharedDir: document.getElementById('testSharedDir'),
  testTotalSpace: document.getElementById('testTotalSpace'),
  notesModal: document.getElementById('notesModal'),
  notesTextarea: document.getElementById('notesTextarea'),
  notesTimestamp: document.getElementById('notesTimestamp'),
  newFolderModal: document.getElementById('newFolderModal'),
  newFolderName: document.getElementById('newFolderName'),
  renameModal: document.getElementById('renameModal'),
  renameOldRelPath: document.getElementById('renameOldRelPath'),
  renameNewName: document.getElementById('renameNewName'),
  deleteModal: document.getElementById('deleteModal'),
  deleteRelPath: document.getElementById('deleteRelPath'),
  deleteItemName: document.getElementById('deleteItemName'),
  castModal: document.getElementById('castModal'),
  castRelPathInput: document.getElementById('castRelPathInput'),
  castTargetSelect: document.getElementById('castTargetSelect')
};

// ==========================================================================
// INITIALIZATION
// ==========================================================================

document.addEventListener('DOMContentLoaded', () => {
  initServerUrl();
  setupEventListeners();
  applyViewMode();
  updateAspectUI();
  
  // Initial load
  checkServerStatus(true).then(() => {
    loadFolder('');
  });

  // Background health check
  setInterval(() => {
    checkServerStatus(false);
  }, 15000);
});

function initServerUrl() {
  // If served via embedded python runner, keep stored URL or default to PC server
  DOM.serverUrlInput.value = state.serverUrl;
}

// ==========================================================================
// API & NETWORK
// ==========================================================================

function getCleanBaseUrl() {
  return state.serverUrl.replace(/\/+$/, '');
}

async function checkServerStatus(showErrors = false) {
  const url = `${getCleanBaseUrl()}/api/status`;
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    
    state.isOnline = true;
    state.diskInfo = data.disk;
    
    DOM.statusDot.className = 'status-dot online';
    DOM.statusText.textContent = `En línea (${data.local_ip}:${data.port})`;
    
    // Update disk bar
    if (data.disk) {
      DOM.diskValues.textContent = `${data.disk.used_str} / ${data.disk.total_str} (${data.disk.percent_used}%)`;
      DOM.diskBarFill.style.width = `${Math.min(data.disk.percent_used, 100)}%`;
      if (data.disk.percent_used > 90) {
        DOM.diskBarFill.style.background = 'var(--danger)';
      } else {
        DOM.diskBarFill.style.background = 'linear-gradient(90deg, var(--cyan), var(--violet))';
      }
    }
    return data;
  } catch (err) {
    state.isOnline = false;
    DOM.statusDot.className = 'status-dot offline';
    DOM.statusText.textContent = 'Servidor PC desconectado';
    DOM.diskValues.textContent = 'Desconectado';
    DOM.diskBarFill.style.width = '0%';
    if (showErrors) {
      showToast(`No se pudo conectar a ${state.serverUrl}`, 'error');
    }
    return null;
  }
}

async function loadFolder(path = '') {
  state.currentPath = path;
  showLoading(true);
  
  try {
    const encoded = encodeURIComponent(path);
    const res = await fetch(`${getCleanBaseUrl()}/api/files?path=${encoded}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    
    state.items = data.items || [];
    renderBreadcrumbs(data.breadcrumbs || []);
    updateCategoryCounts();
    applyFilterAndRender();
  } catch (err) {
    showToast(`Error al cargar carpeta: ${err.message}`, 'error');
    DOM.emptyState.style.display = 'flex';
  } finally {
    showLoading(false);
  }
}

function refreshCurrentFolder() {
  loadFolder(state.currentPath);
  checkServerStatus(false);
  showToast('Actualizando archivos...', 'info', 1500);
}

// ==========================================================================
// RENDERING & UI
// ==========================================================================

function showLoading(show) {
  DOM.loadingState.style.display = show ? 'flex' : 'none';
  if (show) {
    DOM.emptyState.style.display = 'none';
  }
}

function renderBreadcrumbs(crumbs) {
  DOM.breadcrumbsNav.innerHTML = '';
  
  // Home button
  const isAtRoot = !state.currentPath || state.currentPath.trim() === '';
  const homeBtn = document.createElement('button');
  homeBtn.className = `breadcrumb-item ${isAtRoot ? 'active' : ''}`;
  homeBtn.innerHTML = `
    <svg viewBox="0 0 24 24" class="icon-sm"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>
    <span>Inicio (D:/)</span>
  `;
  homeBtn.onclick = () => loadFolder('');
  DOM.breadcrumbsNav.appendChild(homeBtn);

  // Filter out the root crumb (path == '') so it does not repeat 'Inicio'
  const subCrumbs = (crumbs || []).filter(c => c.path && c.path.trim() !== '');

  subCrumbs.forEach((crumb, index) => {
    const sep = document.createElement('span');
    sep.className = 'breadcrumb-separator';
    sep.textContent = '›';
    DOM.breadcrumbsNav.appendChild(sep);

    const isLast = index === subCrumbs.length - 1;
    const btn = document.createElement('button');
    btn.className = `breadcrumb-item ${isLast ? 'active' : ''}`;
    btn.textContent = crumb.name;
    btn.onclick = () => loadFolder(crumb.path);
    DOM.breadcrumbsNav.appendChild(btn);
  });
}

function getFileCategory(item) {
  if (item.is_dir) return 'FOLDER';
  const ext = (item.ext || '').toLowerCase();
  if (['.mp4', '.mkv', '.avi', '.mov', '.webm', '.ts', '.m4v'].includes(ext)) return 'VIDEO';
  if (['.mp3', '.flac', '.wav', '.aac', '.ogg', '.m4a', '.opus'].includes(ext)) return 'AUDIO';
  if (['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp', '.svg'].includes(ext)) return 'IMAGE';
  if (['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.md', '.json', '.csv'].includes(ext)) return 'DOCUMENT';
  if (['.zip', '.rar', '.7z', '.tar', '.gz', '.bz2', '.xz'].includes(ext)) return 'ARCHIVE';
  if (ext === '.apk') return 'APK';
  return 'OTHER';
}

function updateCategoryCounts() {
  const counts = { ALL: 0, VIDEO: 0, AUDIO: 0, IMAGE: 0, DOCUMENT: 0, ARCHIVE: 0, APK: 0 };
  state.items.forEach(item => {
    counts.ALL++;
    const cat = getFileCategory(item);
    if (counts[cat] !== undefined) counts[cat]++;
  });

  document.getElementById('countAll').textContent = counts.ALL;
  document.getElementById('countVideo').textContent = counts.VIDEO;
  document.getElementById('countAudio').textContent = counts.AUDIO;
  document.getElementById('countImage').textContent = counts.IMAGE;
  document.getElementById('countDoc').textContent = counts.DOCUMENT;
  document.getElementById('countZip').textContent = counts.ARCHIVE;
  document.getElementById('countApk').textContent = counts.APK;
}

function setCategoryFilter(category) {
  state.categoryFilter = category;
  document.querySelectorAll('.cat-chip').forEach(chip => {
    chip.classList.toggle('active', chip.dataset.category === category);
  });
  applyFilterAndRender();
}

function handleSearch(query) {
  state.searchQuery = query.toLowerCase().trim();
  DOM.btnClearSearch.style.display = state.searchQuery ? 'block' : 'none';
  applyFilterAndRender();
}

function clearSearch() {
  DOM.searchInput.value = '';
  handleSearch('');
}

function applyFilterAndRender() {
  let list = state.items;

  // Filter category
  if (state.categoryFilter !== 'ALL') {
    list = list.filter(item => getFileCategory(item) === state.categoryFilter);
  }

  // Filter search
  if (state.searchQuery) {
    list = list.filter(item => item.name.toLowerCase().includes(state.searchQuery));
  }

  state.filteredItems = list;
  renderItems();
}

function renderItems() {
  // Clear existing item cards (keep loading/empty states in DOM)
  const cards = DOM.fileContainer.querySelectorAll('.file-card');
  cards.forEach(c => c.remove());

  if (state.filteredItems.length === 0) {
    DOM.emptyState.style.display = 'flex';
    return;
  }
  DOM.emptyState.style.display = 'none';

  // Cache media lists for gallery/video navigation
  state.videoFiles = state.filteredItems.filter(i => getFileCategory(i) === 'VIDEO');
  state.photoFiles = state.filteredItems.filter(i => getFileCategory(i) === 'IMAGE');

  state.filteredItems.forEach(item => {
    const card = createFileCard(item);
    DOM.fileContainer.appendChild(card);
  });
}

function createFileCard(item) {
  const card = document.createElement('div');
  card.className = 'file-card';
  const category = getFileCategory(item);

  // Icon / Preview Box
  const previewBox = document.createElement('div');
  previewBox.className = 'file-preview-box';

  if (category === 'IMAGE') {
    const thumbUrl = `${getCleanBaseUrl()}/api/download?path=${encodeURIComponent(item.rel_path)}&view=1`;
    previewBox.innerHTML = `
      <img src="${thumbUrl}" alt="${item.name}" class="file-thumb-img" loading="lazy" onerror="this.outerHTML='<svg class=\\'file-icon-svg image\\' viewBox=\\'0 0 24 24\\'><path d=\\'M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z\\'/></svg>'">
    `;
  } else {
    previewBox.innerHTML = getCategoryIconSvg(category);
  }

  // Meta Box
  const metaBox = document.createElement('div');
  metaBox.className = 'file-meta-box';
  metaBox.innerHTML = `
    <div class="file-name" title="${item.name}">${escapeHtml(item.name)}</div>
    <div class="file-sub">
      <span>${item.is_dir ? 'Carpeta' : (item.size_str || formatBytes(item.size))}</span>
      <span>${item.mtime ? item.mtime.split(' ')[0] : ''}</span>
    </div>
  `;

  // Quick Action Buttons
  const actions = document.createElement('div');
  actions.className = 'file-card-actions';
  
  if (!item.is_dir) {
    const dlBtn = document.createElement('button');
    dlBtn.className = 'btn-card-action';
    dlBtn.title = 'Descargar';
    dlBtn.textContent = '⬇️';
    dlBtn.onclick = (e) => {
      e.stopPropagation();
      downloadFile(item.rel_path);
    };
    actions.appendChild(dlBtn);
  }

  const renBtn = document.createElement('button');
  renBtn.className = 'btn-card-action';
  renBtn.title = 'Renombrar';
  renBtn.textContent = '✏️';
  renBtn.onclick = (e) => {
    e.stopPropagation();
    openRenameModal(item);
  };
  actions.appendChild(renBtn);

  const delBtn = document.createElement('button');
  delBtn.className = 'btn-card-action';
  delBtn.title = 'Eliminar';
  delBtn.textContent = '🗑️';
  delBtn.onclick = (e) => {
    e.stopPropagation();
    openDeleteModal(item);
  };
  actions.appendChild(delBtn);

  card.appendChild(previewBox);
  card.appendChild(metaBox);
  card.appendChild(actions);

  // Click / Tap behavior
  card.onclick = () => {
    handleItemClick(item, category);
  };

  return card;
}

function handleItemClick(item, category) {
  if (item.is_dir) {
    loadFolder(item.rel_path);
  } else if (category === 'VIDEO') {
    openVideoPlayer(item);
  } else if (category === 'IMAGE') {
    openPhotoModal(item);
  } else if (category === 'AUDIO') {
    openAudioPlayer(item);
  } else {
    // Download or open in new tab
    downloadFile(item.rel_path);
  }
}

function getCategoryIconSvg(category) {
  switch (category) {
    case 'FOLDER':
      return `<svg class="file-icon-svg folder" viewBox="0 0 24 24"><path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/></svg>`;
    case 'VIDEO':
      return `<svg class="file-icon-svg video" viewBox="0 0 24 24"><path d="M18 3v2h-2V3H8v2H6V3H4v18h2v-2h2v2h8v-2h2v2h2V3h-2zM8 17H6v-2h2v2zm0-4H6v-2h2v2zm0-4H6V7h2v2zm10 8h-2v-2h2v2zm0-4h-2v-2h2v2zm0-4h-2V7h2v2z"/></svg>`;
    case 'AUDIO':
      return `<svg class="file-icon-svg audio" viewBox="0 0 24 24"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>`;
    case 'IMAGE':
      return `<svg class="file-icon-svg image" viewBox="0 0 24 24"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>`;
    case 'DOCUMENT':
      return `<svg class="file-icon-svg doc" viewBox="0 0 24 24"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>`;
    case 'ARCHIVE':
      return `<svg class="file-icon-svg zip" viewBox="0 0 24 24"><path d="M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-6 10h-2v-2h2v2zm0-4h-2v-2h2v2zm-2-4V6h2v2h-2z"/></svg>`;
    case 'APK':
      return `<svg class="file-icon-svg apk" viewBox="0 0 24 24"><path d="M6 18c0 .55.45 1 1 1h1v3.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5V19h2v3.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5V19h1c.55 0 1-.45 1-1V8H6v10zM3.5 8C2.67 8 2 8.67 2 9.5v7c0 .83.67 1.5 1.5 1.5S5 17.33 5 16.5v-7C5 8.67 4.33 8 3.5 8zm17 0c-.83 0-1.5.67-1.5 1.5v7c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5v-7c0-.83-.67-1.5-1.5-1.5zm-4.97-4.84l1.3-1.3c.2-.2.2-.51 0-.71-.2-.2-.51-.2-.71 0l-1.48 1.48C13.85 2.23 12.95 2 12 2c-.96 0-1.86.23-2.66.63L7.85 1.15c-.2-.2-.51-.2-.71 0-.2.2-.2.51 0 .71l1.31 1.31C6.97 4.26 6 6.01 6 8h12c0-1.99-.97-3.75-2.47-4.84zM10 5H9V4h1v1zm5 0h-1V4h1v1z"/></svg>`;
    default:
      return `<svg class="file-icon-svg other" viewBox="0 0 24 24"><path d="M6 2c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6H6zm7 7V3.5L18.5 9H13z"/></svg>`;
  }
}

function toggleViewMode() {
  state.viewMode = state.viewMode === 'grid' ? 'list' : 'grid';
  localStorage.setItem('lynxshare_view_mode', state.viewMode);
  applyViewMode();
}

function applyViewMode() {
  if (state.viewMode === 'list') {
    DOM.fileContainer.className = 'file-container list-mode';
    document.getElementById('viewGridIcon').style.display = 'none';
    document.getElementById('viewListIcon').style.display = 'block';
  } else {
    DOM.fileContainer.className = 'file-container grid-mode';
    document.getElementById('viewGridIcon').style.display = 'block';
    document.getElementById('viewListIcon').style.display = 'none';
  }
}

// ==========================================================================
// INMERSIVE VIDEO PLAYER (OPTIMIZED FOR YOGA 7 2-IN-1 TOUCH)
// ==========================================================================

function openVideoPlayer(item) {
  state.currentVideoIndex = state.videoFiles.findIndex(i => i.rel_path === item.rel_path);
  DOM.videoPlayerTitle.textContent = item.name;
  
  // Stream URL with hardware-accelerated range requests
  const streamUrl = `${getCleanBaseUrl()}/api/stream?path=${encodeURIComponent(item.rel_path)}`;
  DOM.videoPlayer.src = streamUrl;
  
  DOM.videoModal.classList.add('active');
  DOM.videoPlayer.play().catch(() => {});
  
  resetControlsTimeout();
  applyVideoAspect();
}

function closeVideoPlayer() {
  DOM.videoPlayer.pause();
  DOM.videoPlayer.src = '';
  DOM.videoModal.classList.remove('active');
  if (document.fullscreenElement) {
    document.exitFullscreen().catch(() => {});
  }
}

function toggleVideoAspect() {
  state.videoAspect = state.videoAspect === 'fit' ? 'inmersive' : 'fit';
  localStorage.setItem('lynxshare_video_aspect', state.videoAspect);
  applyVideoAspect();
  updateAspectUI();
  showToast(`Modo: ${state.videoAspect === 'fit' ? 'FIT (Ajuste proporcional)' : 'INMERSIVO (Llenar pantalla)'}`, 'info', 1200);
}

function applyVideoAspect() {
  DOM.videoWrapper.classList.toggle('fit-mode', state.videoAspect === 'fit');
  DOM.videoWrapper.classList.toggle('inmersive-mode', state.videoAspect === 'inmersive');
}

function updateAspectUI() {
  DOM.aspectModeLabel.textContent = state.videoAspect === 'fit' ? 'FIT (Ajustado)' : 'INMERSIVO (Llenar)';
}

function toggleVideoPlay() {
  if (DOM.videoPlayer.paused) {
    DOM.videoPlayer.play();
    DOM.btnVideoPlay.textContent = '⏸';
  } else {
    DOM.videoPlayer.pause();
    DOM.btnVideoPlay.textContent = '▶';
  }
  resetControlsTimeout();
}

function videoSeek(seconds) {
  DOM.videoPlayer.currentTime = Math.max(0, Math.min(DOM.videoPlayer.duration, DOM.videoPlayer.currentTime + seconds));
  resetControlsTimeout();
  showSeekRipple(seconds > 0 ? 'right' : 'left');
}

function showSeekRipple(side) {
  const el = side === 'right' ? DOM.rippleRight : DOM.rippleLeft;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 500);
}

function onVideoScrubberInput(percent) {
  if (!DOM.videoPlayer.duration) return;
  const target = (percent / 100) * DOM.videoPlayer.duration;
  DOM.videoPlayer.currentTime = target;
  DOM.scrubberFill.style.width = `${percent}%`;
  resetControlsTimeout();
}

function cycleVideoSpeed() {
  const speeds = [1.0, 1.25, 1.5, 2.0, 0.75];
  const idx = (speeds.indexOf(state.videoSpeed) + 1) % speeds.length;
  state.videoSpeed = speeds[idx];
  DOM.videoPlayer.playbackRate = state.videoSpeed;
  DOM.btnSpeed.textContent = `${state.videoSpeed.toFixed(1)}x`;
  resetControlsTimeout();
}

function toggleVideoMute() {
  DOM.videoPlayer.muted = !DOM.videoPlayer.muted;
  DOM.btnVideoMute.textContent = DOM.videoPlayer.muted ? '🔇' : '🔊';
  resetControlsTimeout();
}

function setVideoVolume(vol) {
  DOM.videoPlayer.volume = vol;
  DOM.videoPlayer.muted = false;
  DOM.btnVideoMute.textContent = vol == 0 ? '🔇' : '🔊';
  resetControlsTimeout();
}

function toggleVideoFullscreen() {
  if (!document.fullscreenElement) {
    DOM.videoModal.requestFullscreen().catch(() => {});
  } else {
    document.exitFullscreen().catch(() => {});
  }
}

function toggleVideoPiP() {
  if (document.pictureInPictureElement) {
    document.exitPictureInPicture().catch(() => {});
  } else if (document.pictureInPictureEnabled) {
    DOM.videoPlayer.requestPictureInPicture().catch(() => {});
  }
}

function resetControlsTimeout() {
  DOM.videoHeader.classList.remove('autohide');
  DOM.videoControls.classList.remove('autohide');
  clearTimeout(state.controlsTimeout);
  state.controlsTimeout = setTimeout(() => {
    if (!DOM.videoPlayer.paused) {
      DOM.videoHeader.classList.add('autohide');
      DOM.videoControls.classList.add('autohide');
    }
  }, 3500);
}

// Touch Gestures on Yoga 7 2-in-1 Touchscreen
let touchStartX = 0;
let touchStartY = 0;
let touchStartTime = 0;
let lastTapTime = 0;

DOM.videoWrapper.addEventListener('touchstart', (e) => {
  if (e.touches.length === 1) {
    const touch = e.touches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
    touchStartTime = Date.now();
  }
}, { passive: true });

DOM.videoWrapper.addEventListener('touchmove', (e) => {
  if (e.touches.length !== 1) return;
  const touch = e.touches[0];
  const deltaX = touch.clientX - touchStartX;
  const deltaY = touch.clientY - touchStartY;

  // Vertical swipe for brightness (left half) or volume (right half)
  if (Math.abs(deltaY) > 30 && Math.abs(deltaY) > Math.abs(deltaX)) {
    const isRightHalf = touchStartX > window.innerWidth / 2;
    const change = -deltaY / 300; // inverted for natural scroll

    if (isRightHalf) {
      // Volume adjust
      let newVol = Math.max(0, Math.min(1, DOM.videoPlayer.volume + change * 0.05));
      DOM.videoPlayer.volume = newVol;
      DOM.videoVolSlider.value = newVol;
      showGestureHud('🔊', `${Math.round(newVol * 100)}%`);
    } else {
      // Brightness adjust
      state.videoBrightness = Math.max(0.3, Math.min(1.8, state.videoBrightness + change * 0.05));
      DOM.videoPlayer.style.filter = `brightness(${state.videoBrightness})`;
      showGestureHud('☀️', `${Math.round((state.videoBrightness / 1.0) * 100)}%`);
    }
  }
}, { passive: true });

DOM.videoWrapper.addEventListener('touchend', (e) => {
  const now = Date.now();
  const timeDiff = now - lastTapTime;
  const duration = now - touchStartTime;

  if (duration < 250) {
    if (timeDiff < 300) {
      // Double tap detected
      const isRight = touchStartX > window.innerWidth / 2;
      videoSeek(isRight ? 10 : -10);
      lastTapTime = 0;
    } else {
      // Single tap -> toggle controls
      lastTapTime = now;
      setTimeout(() => {
        if (lastTapTime === now) {
          DOM.videoHeader.classList.toggle('autohide');
          DOM.videoControls.classList.toggle('autohide');
        }
      }, 300);
    }
  }
});

function showGestureHud(icon, text) {
  DOM.gestureHudIcon.textContent = icon;
  DOM.gestureHudText.textContent = text;
  DOM.gestureHud.style.opacity = '1';
  clearTimeout(state.hudTimeout);
  state.hudTimeout = setTimeout(() => {
    DOM.gestureHud.style.opacity = '0';
  }, 1000);
}

// Video Time update listener
DOM.videoPlayer.addEventListener('timeupdate', () => {
  if (!DOM.videoPlayer.duration) return;
  const current = DOM.videoPlayer.currentTime;
  const dur = DOM.videoPlayer.duration;
  const percent = (current / dur) * 100;
  DOM.videoScrubber.value = percent;
  DOM.scrubberFill.style.width = `${percent}%`;
  DOM.videoTimeDisplay.textContent = `${formatTime(current)} / ${formatTime(dur)}`;
});

DOM.videoPlayer.addEventListener('play', () => {
  DOM.btnVideoPlay.textContent = '⏸';
});
DOM.videoPlayer.addEventListener('pause', () => {
  DOM.btnVideoPlay.textContent = '▶';
});

// ==========================================================================
// PHOTO GALLERY VIEWER
// ==========================================================================

function openPhotoModal(item) {
  state.currentPhotoIndex = state.photoFiles.findIndex(i => i.rel_path === item.rel_path);
  renderPhotoAtCurrentIndex();
  DOM.photoModal.classList.add('active');
}

function renderPhotoAtCurrentIndex() {
  if (state.currentPhotoIndex < 0 || state.currentPhotoIndex >= state.photoFiles.length) return;
  const item = state.photoFiles[state.currentPhotoIndex];
  DOM.photoTitle.textContent = item.name;
  DOM.photoCounter.textContent = `${state.currentPhotoIndex + 1} / ${state.photoFiles.length}`;
  DOM.photoImage.src = `${getCleanBaseUrl()}/api/download?path=${encodeURIComponent(item.rel_path)}&view=1`;
  resetPhotoZoom();
}

function navigatePhoto(dir) {
  if (state.photoFiles.length <= 1) return;
  state.currentPhotoIndex = (state.currentPhotoIndex + dir + state.photoFiles.length) % state.photoFiles.length;
  renderPhotoAtCurrentIndex();
}

function zoomPhoto(delta) {
  state.photoZoom = Math.max(0.5, Math.min(3.0, state.photoZoom + delta));
  DOM.photoImage.style.transform = `scale(${state.photoZoom})`;
}

function resetPhotoZoom() {
  state.photoZoom = 1.0;
  DOM.photoImage.style.transform = 'scale(1)';
}

function downloadCurrentPhoto() {
  if (state.currentPhotoIndex >= 0 && state.photoFiles[state.currentPhotoIndex]) {
    downloadFile(state.photoFiles[state.currentPhotoIndex].rel_path);
  }
}

function closePhotoModal() {
  DOM.photoModal.classList.remove('active');
  DOM.photoImage.src = '';
}

function closePhotoModalOnBackdrop(e) {
  if (e.target === DOM.photoModal || e.target.id === 'photoContainer') {
    closePhotoModal();
  }
}

// ==========================================================================
// FLOATING AUDIO PLAYER
// ==========================================================================

function openAudioPlayer(item) {
  state.audioFile = item;
  DOM.audioTitle.textContent = item.name;
  DOM.audioMeta.textContent = 'Cargando...';
  
  DOM.audioElement.src = `${getCleanBaseUrl()}/api/stream?path=${encodeURIComponent(item.rel_path)}`;
  DOM.floatingAudioPlayer.style.display = 'flex';
  DOM.audioElement.play().catch(() => {});
}

function toggleAudioPlay() {
  if (DOM.audioElement.paused) {
    DOM.audioElement.play();
    DOM.btnAudioPlay.textContent = '⏸';
  } else {
    DOM.audioElement.pause();
    DOM.btnAudioPlay.textContent = '▶';
  }
}

function audioSeek(seconds) {
  DOM.audioElement.currentTime = Math.max(0, Math.min(DOM.audioElement.duration || 0, DOM.audioElement.currentTime + seconds));
}

function onAudioSliderChange(val) {
  if (DOM.audioElement.duration) {
    DOM.audioElement.currentTime = (val / 100) * DOM.audioElement.duration;
  }
}

function setAudioVolume(vol) {
  DOM.audioElement.volume = vol;
}

function closeAudioPlayer() {
  DOM.audioElement.pause();
  DOM.audioElement.src = '';
  DOM.floatingAudioPlayer.style.display = 'none';
}

DOM.audioElement.addEventListener('timeupdate', () => {
  const cur = DOM.audioElement.currentTime;
  const dur = DOM.audioElement.duration || 0;
  if (dur > 0) {
    DOM.audioProgress.value = (cur / dur) * 100;
  }
  DOM.audioMeta.textContent = `${formatTime(cur)} / ${formatTime(dur)}`;
});

DOM.audioElement.addEventListener('play', () => { DOM.btnAudioPlay.textContent = '⏸'; });
DOM.audioElement.addEventListener('pause', () => { DOM.btnAudioPlay.textContent = '▶'; });

// ==========================================================================
// FILE OPERATIONS (DOWNLOAD, UPLOAD, CREATE FOLDER, RENAME, DELETE)
// ==========================================================================

function downloadFile(relPath) {
  const url = `${getCleanBaseUrl()}/api/download?path=${encodeURIComponent(relPath)}`;
  const a = document.createElement('a');
  a.href = url;
  a.download = relPath.split('/').pop();
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  showToast('Descarga iniciada...', 'info', 2000);
}

function downloadCurrentFolderZip() {
  const url = `${getCleanBaseUrl()}/api/zip/${encodeURIComponent(state.currentPath || 'root')}`;
  window.location.href = url;
  showToast('Generando archivo ZIP...', 'info', 3000);
}

function triggerFileInput() {
  DOM.fileInput.click();
}

function handleFilesSelected(e) {
  const files = e.target.files;
  if (!files || files.length === 0) return;
  uploadFiles(Array.from(files));
}

function uploadFiles(files) {
  const formData = new FormData();
  formData.append('path', state.currentPath);
  files.forEach(f => formData.append('files', f));

  DOM.uploadProgressCard.style.display = 'flex';
  DOM.uploadProgFill.style.width = '0%';
  DOM.uploadProgPercent.textContent = '0%';

  const xhr = new XMLHttpRequest();
  xhr.open('POST', `${getCleanBaseUrl()}/api/upload`, true);

  xhr.upload.onprogress = (e) => {
    if (e.lengthComputable) {
      const percent = Math.round((e.loaded / e.total) * 100);
      DOM.uploadProgFill.style.width = `${percent}%`;
      DOM.uploadProgPercent.textContent = `${percent}%`;
      DOM.uploadProgMeta.textContent = `${formatBytes(e.loaded)} / ${formatBytes(e.total)}`;
    }
  };

  xhr.onload = () => {
    DOM.uploadProgressCard.style.display = 'none';
    if (xhr.status >= 200 && xhr.status < 300) {
      showToast('Archivos subidos exitosamente 🎉', 'success');
      loadFolder(state.currentPath);
    } else {
      showToast(`Error al subir archivos: HTTP ${xhr.status}`, 'error');
    }
  };

  xhr.onerror = () => {
    DOM.uploadProgressCard.style.display = 'none';
    showToast('Error de conexión al subir archivos', 'error');
  };

  xhr.send(formData);
}

// Drag and drop upload
window.addEventListener('dragover', (e) => {
  e.preventDefault();
  DOM.dropOverlay.classList.add('active');
});

DOM.dropOverlay.addEventListener('dragleave', (e) => {
  e.preventDefault();
  DOM.dropOverlay.classList.remove('active');
});

window.addEventListener('drop', (e) => {
  e.preventDefault();
  DOM.dropOverlay.classList.remove('active');
  if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
    uploadFiles(Array.from(e.dataTransfer.files));
  }
});

// Create Folder
function openNewFolderModal() {
  DOM.newFolderName.value = '';
  openModal('newFolderModal');
  setTimeout(() => DOM.newFolderName.focus(), 150);
}

async function submitCreateFolder() {
  const name = DOM.newFolderName.value.trim();
  if (!name) return;

  try {
    const res = await fetch(`${getCleanBaseUrl()}/api/create-folder`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: state.currentPath, name: name })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    showToast(`Carpeta "${name}" creada`, 'success');
    closeModal('newFolderModal');
    loadFolder(state.currentPath);
  } catch (err) {
    showToast(`Error al crear carpeta: ${err.message}`, 'error');
  }
}

// Rename
function openRenameModal(item) {
  DOM.renameOldRelPath.value = item.rel_path;
  DOM.renameNewName.value = item.name;
  openModal('renameModal');
  setTimeout(() => DOM.renameNewName.focus(), 150);
}

async function submitRename() {
  const oldPath = DOM.renameOldRelPath.value;
  const newName = DOM.renameNewName.value.trim();
  if (!newName) return;

  try {
    const res = await fetch(`${getCleanBaseUrl()}/api/rename`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: oldPath, new_name: newName })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    showToast('Elemento renombrado correctamente', 'success');
    closeModal('renameModal');
    loadFolder(state.currentPath);
  } catch (err) {
    showToast(`Error al renombrar: ${err.message}`, 'error');
  }
}

// Delete
function openDeleteModal(item) {
  DOM.deleteRelPath.value = item.rel_path;
  DOM.deleteItemName.textContent = item.name;
  openModal('deleteModal');
}

async function submitDelete() {
  const relPath = DOM.deleteRelPath.value;
  try {
    const res = await fetch(`${getCleanBaseUrl()}/api/delete`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: relPath })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    showToast('Elemento eliminado', 'success');
    closeModal('deleteModal');
    loadFolder(state.currentPath);
  } catch (err) {
    showToast(`Error al eliminar: ${err.message}`, 'error');
  }
}

// ==========================================================================
// SHARED NOTES & CLIPBOARD
// ==========================================================================

function openNotesModal() {
  openModal('notesModal');
  loadNotesFromServer();
}

async function loadNotesFromServer() {
  try {
    const res = await fetch(`${getCleanBaseUrl()}/api/notes`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    DOM.notesTextarea.value = data.content || '';
    DOM.notesTimestamp.textContent = `Última sinc: ${data.last_update || 'Hoy'}`;
  } catch (err) {
    showToast(`Error al cargar notas: ${err.message}`, 'error');
  }
}

async function saveNotesToServer() {
  const content = DOM.notesTextarea.value;
  try {
    const res = await fetch(`${getCleanBaseUrl()}/api/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: content })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    showToast('Notas sincronizadas con PC y dispositivos ✨', 'success');
    closeModal('notesModal');
  } catch (err) {
    showToast(`Error al guardar notas: ${err.message}`, 'error');
  }
}

function copyNotesToClipboard() {
  const content = DOM.notesTextarea.value;
  navigator.clipboard.writeText(content).then(() => {
    showToast('Texto copiado al portapapeles de Fedora 📋', 'success');
  }).catch(() => {
    showToast('No se pudo copiar automáticamente', 'error');
  });
}

// ==========================================================================
// CAST TO SMART TV
// ==========================================================================

function openCastModal(item) {
  if (item) {
    DOM.castRelPathInput.value = item.rel_path;
  } else if (state.videoFiles.length > 0) {
    DOM.castRelPathInput.value = state.videoFiles[0].rel_path;
  } else {
    DOM.castRelPathInput.value = '';
  }
  openModal('castModal');
}

function castCurrentVideo() {
  if (state.currentVideoIndex >= 0 && state.videoFiles[state.currentVideoIndex]) {
    openCastModal(state.videoFiles[state.currentVideoIndex]);
  }
}

async function submitCast() {
  const relPath = DOM.castRelPathInput.value;
  const target = DOM.castTargetSelect.value;
  if (!relPath) return;

  try {
    const res = await fetch(`${getCleanBaseUrl()}/api/cast`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: relPath, target: target })
    });
    showToast(`Transmitiendo a ${target}... 🚀`, 'success');
    closeModal('castModal');
  } catch (err) {
    showToast(`Comando de transmisión enviado al servidor`, 'info');
    closeModal('castModal');
  }
}

// ==========================================================================
// SERVER SETTINGS MODAL
// ==========================================================================

function openServerModal() {
  DOM.serverUrlInput.value = state.serverUrl;
  testServerConnection();
  openModal('serverModal');
}

async function testServerConnection() {
  const candidateUrl = DOM.serverUrlInput.value.replace(/\/+$/, '');
  DOM.testStatusLabel.textContent = 'Probando...';
  DOM.testStatusLabel.style.color = 'var(--orange)';
  
  try {
    const res = await fetch(`${candidateUrl}/api/status`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    
    DOM.testStatusLabel.textContent = 'En línea y respondiendo';
    DOM.testStatusLabel.style.color = 'var(--green)';
    DOM.testSharedDir.textContent = data.shared_dir || '--';
    DOM.testTotalSpace.textContent = data.disk ? `${data.disk.total_str} (${data.disk.free_str} libres)` : '--';
  } catch (err) {
    DOM.testStatusLabel.textContent = 'Error de conexión';
    DOM.testStatusLabel.style.color = 'var(--danger)';
    DOM.testSharedDir.textContent = '--';
    DOM.testTotalSpace.textContent = '--';
  }
}

function saveServerSettings() {
  const clean = DOM.serverUrlInput.value.replace(/\/+$/, '').trim();
  state.serverUrl = clean;
  localStorage.setItem('lynxshare_server_url', clean);
  showToast('Configuración de servidor guardada', 'success');
  closeModal('serverModal');
  checkServerStatus(true).then(() => {
    loadFolder('');
  });
}

// ==========================================================================
// GENERIC MODALS & TOASTS
// ==========================================================================

function openModal(id) {
  document.getElementById(id).classList.add('active');
}

function closeModal(id) {
  document.getElementById(id).classList.remove('active');
}

function closeModalOnBackdrop(e, id) {
  if (e.target.id === id) {
    closeModal(id);
  }
}

function showToast(message, type = 'info', duration = 3000) {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${message}</span>`;
  DOM.toastContainer.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// ==========================================================================
// KEYBOARD SHORTCUTS
// ==========================================================================

function setupEventListeners() {
  window.addEventListener('keydown', (e) => {
    // If video player is open
    if (DOM.videoModal.classList.contains('active')) {
      if (e.key === 'Escape') closeVideoPlayer();
      if (e.key === ' ' || e.key === 'k') { e.preventDefault(); toggleVideoPlay(); }
      if (e.key === 'ArrowRight') { e.preventDefault(); videoSeek(10); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); videoSeek(-10); }
      if (e.key === 'f') { e.preventDefault(); toggleVideoFullscreen(); }
      if (e.key === 'm') { e.preventDefault(); toggleVideoMute(); }
      return;
    }

    // If photo viewer is open
    if (DOM.photoModal.classList.contains('active')) {
      if (e.key === 'Escape') closePhotoModal();
      if (e.key === 'ArrowRight') navigatePhoto(1);
      if (e.key === 'ArrowLeft') navigatePhoto(-1);
      return;
    }

    // Escape closes generic modals
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-backdrop.active').forEach(m => m.classList.remove('active'));
    }
  });
}

// ==========================================================================
// UTILITIES
// ==========================================================================

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatTime(seconds) {
  if (isNaN(seconds)) return '00:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function escapeHtml(str) {
  return (str || '').replace(/[&<>"']/g, m => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  })[m]);
}
