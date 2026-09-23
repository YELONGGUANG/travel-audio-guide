const guides = [
  { title: '卢浮宫', country: 'france', city: '巴黎', file: '卢浮宫-中文语音导览-详细版.mp3' },
  { title: '奥赛博物馆', country: 'france', city: '巴黎', file: '奥赛博物馆-中文语音导览-详细版.mp3' },
  { title: '橘园美术馆', country: 'france', city: '巴黎', file: '橘园美术馆-中文语音导览-详细版.mp3' },
  { title: '巴黎罗丹美术馆', country: 'france', city: '巴黎', file: '巴黎罗丹美术馆-中文语音导览-详细版.mp3' },
  { title: '巴黎荣军院', country: 'france', city: '巴黎', file: '巴黎荣军院-中文语音导览-详细版.mp3' },
  { title: '巴黎圣母院', country: 'france', city: '巴黎', file: '巴黎圣母院-中文语音导览-详细版.mp3' },
  { title: '圣心堂与蒙马特', country: 'france', city: '巴黎', file: '巴黎-圣心堂与蒙马特-中文语音导览.mp3' },
  { title: '阿尔罕布拉宫', country: 'spain', city: '格拉纳达', file: '阿尔罕布拉宫-中文语音导览-详细版.mp3' },
  { title: '圣赫罗尼莫修道院', country: 'spain', city: '格拉纳达', file: '格拉纳达圣赫罗尼莫修道院-中文语音导览-详细版.mp3' },
  { title: '圣家堂', country: 'spain', city: '巴塞罗那', file: '圣家堂-中文语音导览.mp3' },
  { title: '桂尔公园', country: 'spain', city: '巴塞罗那', file: '桂尔公园-中文语音导览-详细版.mp3' },
  { title: '巴塞罗那桂尔宫', country: 'spain', city: '巴塞罗那', file: '巴塞罗那桂尔宫-中文语音导览-详细版.mp3' },
  { title: '巴特略之家', country: 'spain', city: '巴塞罗那', file: '巴特略之家-中文语音导览-详细版.mp3' },
  { title: '米拉之家', country: 'spain', city: '巴塞罗那', file: '米拉之家-中文语音导览-详细版.mp3' },
  { title: '圣保罗医院', country: 'spain', city: '巴塞罗那', file: '圣保罗医院-中文语音导览-详细版.mp3' },
  { title: '加泰罗尼亚音乐宫', country: 'spain', city: '巴塞罗那', file: '加泰罗尼亚音乐宫-中文语音导览-详细版.mp3' },
  { title: '巴塞罗那毕加索博物馆', country: 'spain', city: '巴塞罗那', file: '巴塞罗那毕加索博物馆-中文语音导览-详细版.mp3' },
  { title: '马德里王宫', country: 'spain', city: '马德里', file: '马德里王宫-中文语音导览-详细版.mp3' },
  { title: '普拉多博物馆', country: 'spain', city: '马德里', file: '普拉多博物馆-中文语音导览-详细版.mp3' },
  { title: '索菲亚王后国家艺术中心', country: 'spain', city: '马德里', file: '索菲亚王后国家艺术中心-中文语音导览-详细版.mp3' },
  { title: '提森国立博物馆', country: 'spain', city: '马德里', file: '提森国立博物馆-中文语音导览-详细版.mp3' },
  { title: '塞维利亚大教堂', country: 'spain', city: '塞维利亚', file: '塞维利亚大教堂-中文语音导览-详细版.mp3' },
  { title: '塞维利亚王宫', country: 'spain', city: '塞维利亚', file: '塞维利亚王宫-中文语音导览-详细版.mp3' }
];

const $ = (id) => document.getElementById(id);
const audio = $('audio');
const DB_NAME = 'travel-audio-guide';
const STORE = 'tracks';
const savedFiles = new Set();
let playToken = 0;
let activeBlobUrl = '';
let ignoreAudioError = false;

const state = {
  country: 'all',
  city: 'all',
  query: '',
  current: null,
  favorites: new Set(JSON.parse(localStorage.getItem('tour-favorites') || '[]')),
  recent: JSON.parse(localStorage.getItem('tour-recent') || '[]')
};

function save() {
  localStorage.setItem('tour-favorites', JSON.stringify([...state.favorites]));
  localStorage.setItem('tour-recent', JSON.stringify(state.recent.slice(0, 8)));
  updateStats();
}

function updateStats() {
  $('totalCount').textContent = guides.length;
  $('favoriteCount').textContent = state.favorites.size;
  $('recentCount').textContent = state.recent.length;
}

function audioUrl(file) {
  return new URL('audio/' + encodeURIComponent(file), document.baseURI).href;
}

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function withStore(mode, action) {
  return openDb().then((db) => new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE, mode);
    const request = action(transaction.objectStore(STORE));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => db.close();
    transaction.onerror = () => reject(transaction.error);
  }));
}

function saveTrack(file, blob) {
  return withStore('readwrite', (store) => store.put(blob, file));
}

function loadTrack(file) {
  return withStore('readonly', (store) => store.get(file));
}

function listTracks() {
  return withStore('readonly', (store) => store.getAllKeys());
}

function updateOfflineStatus() {
  const count = savedFiles.size;
  $('offlineStatus').textContent = count === guides.length
    ? '已下载到手机，可断网播放'
    : '已下载 ' + count + '/' + guides.length + ' 个导览';
  $('offlineButton').textContent = count === guides.length ? '已准备好' : (count ? '继续下载' : '下载全部');
  $('offlineButton').disabled = false;
}

async function refreshSaved() {
  const keys = await listTracks();
  savedFiles.clear();
  keys.forEach((key) => savedFiles.add(String(key)));
  updateOfflineStatus();
}

async function downloadAll() {
  if (location.protocol === 'file:') {
    $('offlineStatus').textContent = '请用网站地址打开后再下载';
    return;
  }
  const button = $('offlineButton');
  const progress = $('offlineProgress');
  const bar = $('offlineProgressBar');
  button.disabled = true;
  progress.hidden = false;
  if (navigator.storage && navigator.storage.persist) {
    try { await navigator.storage.persist(); } catch (error) {}
  }
  let saved = 0;
  let failed = 0;
  for (const guide of guides) {
    try {
      if (!savedFiles.has(guide.file)) {
        const response = await fetch(audioUrl(guide.file));
        if (!response.ok) throw new Error('HTTP ' + response.status);
        const blob = await response.blob();
        if (!blob.size) throw new Error('空文件');
        await saveTrack(guide.file, blob);
        savedFiles.add(guide.file);
      }
      saved += 1;
    } catch (error) {
      failed += 1;
      console.warn(guide.title, error);
    }
    const finished = saved + failed;
    bar.style.width = Math.round(finished / guides.length * 100) + '%';
    $('offlineStatus').textContent = '正在下载 ' + finished + '/' + guides.length;
  }
  button.disabled = false;
  if (failed) {
    $('offlineStatus').textContent = '已下载 ' + saved + ' 个，失败 ' + failed + ' 个。请保持这个页面在前台，然后点继续下载。';
    $('offlineButton').textContent = '继续下载';
  } else {
    updateOfflineStatus();
  }
}

function remember(guide) {
  state.current = guide;
  $('nowPlaying').textContent = guide.title;
  $('nowCity').textContent = guide.city + ' · ' + (guide.country === 'france' ? '法国' : '西班牙');
  $('player').hidden = false;
  state.recent = [guide.file, ...state.recent.filter((file) => file !== guide.file)].slice(0, 8);
  save();
}

function restorePosition(token) {
  const apply = () => {
    if (token !== playToken || !state.current) return;
    const startAt = Number(localStorage.getItem('progress:' + state.current.file) || 0);
    if (startAt > 2 && audio.duration && startAt < audio.duration - 1) {
      try { audio.currentTime = startAt; } catch (error) {}
    }
  };
  if (audio.readyState >= 1) apply();
  else audio.addEventListener('loadedmetadata', apply, { once: true });
}

function setSource(url, token) {
  ignoreAudioError = true;
  audio.src = url;
  restorePosition(token);
}

async function playSaved(guide, token) {
  $('offlineStatus').textContent = '正在打开已下载的音频…';
  const blob = await loadTrack(guide.file);
  if (token !== playToken) return;
  if (!blob) throw new Error('missing');
  if (activeBlobUrl) URL.revokeObjectURL(activeBlobUrl);
  activeBlobUrl = URL.createObjectURL(blob);
  setSource(activeBlobUrl, token);
  await audio.play();
  $('offlineStatus').textContent = '正在播放已下载的导览';
}

function play(guide) {
  if (!guide) return;
  const token = ++playToken;
  remember(guide);
  if (!navigator.onLine && savedFiles.has(guide.file)) {
    playSaved(guide, token).catch(() => {
      $('offlineStatus').textContent = '离线音频已准备好，请按下方播放器的播放键';
    });
    return;
  }
  setSource(audioUrl(guide.file), token);
  audio.play().catch(() => {
    ignoreAudioError = false;
    if (savedFiles.has(guide.file)) {
      playSaved(guide, token).catch(() => {
        $('offlineStatus').textContent = '请再点一次导览，或按播放器上的播放键';
      });
      return;
    }
    $('offlineStatus').textContent = '请再点一次导览，或按播放器上的播放键';
  });
}

function cityList() {
  const cities = [...new Set(guides.filter((guide) => state.country === 'all' || state.country === 'favorites' || guide.country === state.country).map((guide) => guide.city))];
  $('cityRow').innerHTML = cities.map((city) => '<button class="city-button ' + (state.city === city ? 'active' : '') + '" data-city="' + city + '">' + city + '</button>').join('');
  $('cityRow').querySelectorAll('[data-city]').forEach((button) => {
    button.onclick = () => {
      state.city = state.city === button.dataset.city ? 'all' : button.dataset.city;
      render();
    };
  });
}

function matches(guide) {
  const query = state.query.trim().toLowerCase();
  const countryOk = state.country === 'all' || state.country === 'favorites' || guide.country === state.country;
  const favoriteOk = state.country !== 'favorites' || state.favorites.has(guide.file);
  const cityOk = state.city === 'all' || guide.city === state.city;
  return countryOk && favoriteOk && cityOk && (!query || (guide.title + guide.city).toLowerCase().includes(query));
}

function render() {
  cityList();
  const visible = guides.filter(matches);
  $('guideGrid').innerHTML = visible.map((guide) => {
    const saved = state.favorites.has(guide.file);
    return '<article class="guide-card" tabindex="0" data-file="' + encodeURIComponent(guide.file) + '"><div class="card-top"><span class="country-label">' + (guide.country === 'france' ? 'FRANCE' : 'SPAIN') + '</span><button class="favorite ' + (saved ? 'saved' : '') + '" data-fav="' + encodeURIComponent(guide.file) + '" aria-label="收藏 ' + guide.title + '">' + (saved ? '★' : '☆') + '</button></div><h2>' + guide.title + '</h2><p>' + guide.city + ' · 中文语音导览</p><div class="card-footer"><span class="play-mark"><span>▶</span>播放导览</span><span>' + (savedFiles.has(guide.file) ? '已下载' : '在线播放') + '</span></div></article>';
  }).join('');
  $('emptyState').hidden = visible.length > 0;
  $('guideGrid').querySelectorAll('.guide-card').forEach((card) => {
    const guide = guides.find((item) => encodeURIComponent(item.file) === card.dataset.file);
    card.onclick = (event) => {
      if (event.target.closest('[data-fav]')) return;
      play(guide);
    };
    card.onkeydown = (event) => {
      if (event.key === 'Enter') play(guide);
    };
  });
  $('guideGrid').querySelectorAll('[data-fav]').forEach((button) => {
    button.onclick = (event) => {
      event.stopPropagation();
      const file = decodeURIComponent(button.dataset.fav);
      if (state.favorites.has(file)) state.favorites.delete(file);
      else state.favorites.add(file);
      save();
      render();
    };
  });
}

audio.addEventListener('playing', () => {
  ignoreAudioError = false;
});
audio.addEventListener('error', () => {
  if (ignoreAudioError || !state.current) return;
  $('offlineStatus').textContent = '音频没有打开。请再点一次该导览。';
});
audio.addEventListener('timeupdate', () => {
  if (state.current && audio.currentTime > 2) localStorage.setItem('progress:' + state.current.file, String(audio.currentTime));
});
audio.addEventListener('ended', () => {
  if (state.current) localStorage.removeItem('progress:' + state.current.file);
});

$('backButton').onclick = () => {
  audio.currentTime = Math.max(0, audio.currentTime - 15);
};
$('forwardButton').onclick = () => {
  audio.currentTime = Math.min(audio.duration || Infinity, audio.currentTime + 30);
};
$('closePlayer').onclick = () => {
  $('player').hidden = true;
  audio.pause();
};
document.querySelectorAll('[data-country]').forEach((button) => {
  button.onclick = () => {
    document.querySelectorAll('[data-country]').forEach((item) => item.classList.remove('active'));
    button.classList.add('active');
    state.country = button.dataset.country;
    state.city = 'all';
    render();
  };
});
$('searchInput').oninput = (event) => {
  state.query = event.target.value;
  render();
};
$('offlineButton').onclick = () => {
  downloadAll().catch((error) => {
    console.error(error);
    $('offlineButton').disabled = false;
    $('offlineStatus').textContent = '下载没有开始，请再点一次。';
  });
};

updateStats();
render();
refreshSaved().catch(() => {
  $('offlineStatus').textContent = '这部手机暂时不能保存离线音频，但仍可以在线播放';
});

if ('serviceWorker' in navigator) {
  let reloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloaded) return;
    reloaded = true;
    location.reload();
  });
  navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' });
}
