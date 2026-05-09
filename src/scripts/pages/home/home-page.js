import * as Api from '../../data/api';
import { showFormattedDate, showToast, initials, skeletonCards } from '../../utils/index';
import { createMap } from '../../utils/map';
import { isStorySaved, saveStory, deleteSavedStory } from '../../utils/idb';
import {
  registerServiceWorker,
  requestNotificationPermission,
  subscribePushNotification,
  unsubscribePushNotification,
  getSubscriptionStatus,
  autoSubscribeIfPermitted,
} from '../../utils/notification';

/* BroadcastChannel — home listens for "story-added" messages */
const storyCh = new BroadcastChannel('kisah-story-channel');

export default class HomePage {
  #map        = null;
  #swReg      = null;
  #allStories = [];

  async render() {
    const user = Api.getUser();
    return `
      <div class="home-page page-view">
        <header class="home-header">
          <div>
            <h1 class="home-title">Cerita dari <span>seluruh dunia</span></h1>
            <p class="home-greeting">Halo, ${user?.name || 'Penjelajah'} 👋</p>
          </div>
          <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center">
            <button id="btn-notif-toggle" class="btn btn-secondary btn-sm"
              aria-label="Toggle push notification" aria-pressed="false">
              🔔 Aktifkan Notifikasi
            </button>
            <a href="#/add" class="btn btn-primary" aria-label="Tambah cerita baru">
              <span aria-hidden="true">+</span> Cerita Baru
            </a>
          </div>
        </header>

        <section class="map-section" aria-label="Peta lokasi cerita">
          <p class="section-label">📍 Peta Cerita</p>
          <div id="stories-map" role="application" aria-label="Peta interaktif lokasi cerita"></div>
        </section>

        <section aria-label="Daftar cerita">
          <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;margin-bottom:12px">
            <p class="section-label" style="margin-bottom:0">📖 Semua Cerita</p>
            <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
              <label class="form-label" for="search-input" style="margin-bottom:0">Cari:</label>
              <input type="search" id="search-input" class="form-control"
                style="width:180px;padding:6px 10px;font-size:13px"
                placeholder="Nama / cerita..." aria-label="Cari cerita" />
              <label class="form-label" for="sort-select" style="margin-bottom:0">Urutkan:</label>
              <select id="sort-select" class="form-control"
                style="width:140px;padding:6px 10px;font-size:13px" aria-label="Urutkan cerita">
                <option value="newest">Terbaru</option>
                <option value="oldest">Terlama</option>
                <option value="name">Nama (A-Z)</option>
              </select>
            </div>
          </div>
          <div id="stories-grid" class="stories-grid" aria-live="polite">
            ${skeletonCards(6)}
          </div>
        </section>
      </div>`;
  }

  async afterRender() {
    this.#map = createMap('stories-map');

    /* ---- Service Worker & Push ---- */
    this.#swReg = await registerServiceWorker();
    if (this.#swReg) {
      // Auto-subscribe if browser permission is already granted
      await autoSubscribeIfPermitted(this.#swReg);
      await this._setupNotifButton();
    }

    /* ---- Listen for SW messages (background sync done) ---- */
    navigator.serviceWorker?.addEventListener('message', (e) => {
      if (e.data?.type === 'SYNC_DONE') {
        showToast('Cerita offline berhasil disinkronkan! 🎉', 'success');
        this._refreshStories();
      }
    });

    /* ---- BroadcastChannel: refresh when add-story page posts ---- */
    storyCh.onmessage = (e) => {
      if (e.data?.type === 'STORY_ADDED') {
        this._refreshStories();
      }
    };

    await this._loadStories();
  }

  /* ---- Notification toggle button ---- */
  async _setupNotifButton() {
    const btn = document.querySelector('#btn-notif-toggle');
    if (!btn) return;

    const updateBtn = async () => {
      const subscribed = await getSubscriptionStatus(this.#swReg);
      btn.setAttribute('aria-pressed', String(subscribed));
      btn.textContent = subscribed ? '🔕 Nonaktifkan Notifikasi' : '🔔 Aktifkan Notifikasi';
      btn.classList.toggle('btn-secondary', !subscribed);
      btn.classList.toggle('btn-ghost',      subscribed);
    };

    await updateBtn();

    btn.addEventListener('click', async () => {
      try {
        const subscribed = await getSubscriptionStatus(this.#swReg);
        if (subscribed) {
          await unsubscribePushNotification(this.#swReg);
          showToast('Notifikasi dinonaktifkan', 'info');
        } else {
          const perm = await requestNotificationPermission();
          if (perm !== 'granted') {
            showToast('Izin notifikasi ditolak. Aktifkan dari pengaturan browser.', 'error');
            return;
          }
          await subscribePushNotification(this.#swReg);
          showToast('Notifikasi diaktifkan! 🔔 Kamu akan diberitahu saat ada cerita baru.', 'success');
        }
        await updateBtn();
      } catch (err) {
        showToast('Gagal mengubah notifikasi: ' + err.message, 'error');
      }
    });
  }

  /* ---- Load stories (initial) ---- */
  async _loadStories() {
    const grid = document.querySelector('#stories-grid');
    if (!grid) return;
    grid.innerHTML = skeletonCards(6);
    try {
      this.#allStories = await Api.getStories();
      this._renderGrid(this.#allStories);
      this._addMapMarkers(this.#allStories);
      this._setupFilters();
    } catch (err) {
      grid.innerHTML = `
        <div class="state-box" role="alert">
          <div class="state-icon" aria-hidden="true">⚠️</div>
          <p class="state-title">Gagal memuat cerita</p>
          <p class="state-msg">${err.message}</p>
          <button class="btn btn-secondary mt-16" onclick="window.location.reload()">Coba lagi</button>
        </div>`;
      showToast(err.message, 'error');
    }
  }

  /* ---- Refresh stories (called after story-added event) ---- */
  async _refreshStories() {
    try {
      this.#allStories = await Api.getStories();
      this._renderGrid(this.#allStories);

      /* Rebuild map markers */
      if (this.#map) {
        this.#map.eachLayer((layer) => {
          if (layer instanceof L.Marker) this.#map.removeLayer(layer);
        });
        this._addMapMarkers(this.#allStories);
      }

      /* Re-apply active filters */
      this._applyFilters();
    } catch (_) { /* silent — user still sees old data */ }
  }

  /* ---- Filters ---- */
  _setupFilters() {
    document.querySelector('#search-input')?.addEventListener('input', () => this._applyFilters());
    document.querySelector('#sort-select')?.addEventListener('change', () => this._applyFilters());
  }

  _applyFilters() {
    let list = [...this.#allStories];
    const q    = document.querySelector('#search-input')?.value.trim().toLowerCase() || '';
    const sort = document.querySelector('#sort-select')?.value || 'newest';

    if (q) list = list.filter((s) =>
      s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q)
    );
    if (sort === 'newest') list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    if (sort === 'oldest') list.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    if (sort === 'name')   list.sort((a, b) => a.name.localeCompare(b.name));

    this._renderGrid(list);
  }

  /* ---- Render grid ---- */
  _renderGrid(stories) {
    const grid = document.querySelector('#stories-grid');
    if (!grid) return;

    if (!stories.length) {
      grid.innerHTML = `<div class="state-box" role="status">
        <div class="state-icon" aria-hidden="true">📭</div>
        <p class="state-title">Tidak ada cerita ditemukan</p>
      </div>`;
      return;
    }

    grid.innerHTML = stories.map((s) => this._cardHTML(s)).join('');

    grid.querySelectorAll('.story-card').forEach((card) => {
      const id = card.dataset.id;
      const clickArea = card.querySelector('.card-click-area');
      const story     = stories.find((s) => s.id === id);

      clickArea.addEventListener('click', () => this._openModal(id));
      clickArea.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this._openModal(id); }
      });

      card.querySelector('.btn-save').addEventListener('click', (e) => {
        e.stopPropagation();
        this._toggleSave(id, story, card.querySelector('.btn-save'));
      });
    });

    /* Update saved-state icons */
    this._updateSavedIcons(stories);
  }

  async _updateSavedIcons(stories) {
    for (const s of stories) {
      const saved = await isStorySaved(s.id);
      const btn   = document.querySelector(`.story-card[data-id="${s.id}"] .btn-save`);
      if (btn) {
        btn.textContent = saved ? '✅' : '🔖';
        btn.setAttribute('aria-label', saved ? 'Hapus dari tersimpan' : 'Simpan cerita');
      }
    }
  }

  async _toggleSave(id, story, btn) {
    const saved = await isStorySaved(id);
    if (saved) {
      await deleteSavedStory(id);
      btn.textContent = '🔖';
      btn.setAttribute('aria-label', 'Simpan cerita');
      showToast('Cerita dihapus dari tersimpan', 'info');
    } else {
      await saveStory(story);
      btn.textContent = '✅';
      btn.setAttribute('aria-label', 'Hapus dari tersimpan');
      showToast('Cerita disimpan!', 'success');
    }
  }

  /* ---- Map markers ---- */
  _addMapMarkers(stories) {
    if (!this.#map) return;
    const bounds = [];
    stories.forEach((s) => {
      if (!s.lat || !s.lon) return;
      bounds.push([s.lat, s.lon]);
      L.marker([s.lat, s.lon]).addTo(this.#map).bindPopup(`
        <div>
          <img class="popup-img" src="${s.photoUrl}" alt="Foto cerita oleh ${s.name}" loading="lazy"/>
          <p class="popup-name">${s.name}</p>
          <p class="popup-desc">${s.description.substring(0, 80)}…</p>
        </div>`);
    });
    if (bounds.length > 1) this.#map.fitBounds(bounds, { padding: [40, 40] });
  }

  /* ---- Card HTML ---- */
  _cardHTML(s) {
    const fallback = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='200'%3E%3Crect width='400' height='200' fill='%23312a21'/%3E%3Ctext x='200' y='105' text-anchor='middle' fill='%237a6e60' font-size='40'%3E📷%3C/text%3E%3C/svg%3E`;
    return `
      <article class="story-card" data-id="${s.id}">
        <div class="card-click-area" role="button" tabindex="0"
          aria-label="Lihat detail cerita oleh ${s.name}">
          <img class="story-card-img" src="${s.photoUrl}"
            alt="Foto cerita oleh ${s.name}" loading="lazy"
            onerror="this.src='${fallback}'" />
          <div class="story-card-body">
            <div class="story-card-author">
              <div class="author-avatar" aria-hidden="true">${initials(s.name)}</div>
              <div>
                <p class="author-name">${s.name}</p>
                <time class="story-date" datetime="${s.createdAt}">${showFormattedDate(s.createdAt)}</time>
              </div>
            </div>
            <p class="story-desc">${s.description}</p>
            ${s.lat && s.lon ? `<span class="story-location-badge" aria-label="Memiliki lokasi">📍 Memiliki lokasi</span>` : ''}
          </div>
        </div>
        <div class="card-actions">
          <button class="btn-save btn-icon" aria-label="Simpan cerita" title="Simpan cerita offline">🔖</button>
        </div>
      </article>`;
  }

  async _openModal(id) {
    const { default: Modal } = await import('../story-detail/story-detail-modal.js');
    new Modal(id).open();
  }
}
