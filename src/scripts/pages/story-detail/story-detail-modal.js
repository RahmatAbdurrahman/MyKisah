import * as Api from '../../data/api';
import { showFormattedDate, initials, showToast } from '../../utils/index';
import { createMap } from '../../utils/map';
import { isStorySaved, saveStory, deleteSavedStory } from '../../utils/idb';

export default class StoryDetailModal {
  #id = null;
  #detailMap = null;

  constructor(id) { this.#id = id; }

  open() {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Detail cerita');
    overlay.innerHTML = `
      <div class="modal-box">
        <div class="modal-header">
          <h2 class="modal-title">Detail Cerita</h2>
          <button class="modal-close" id="modal-close-btn" aria-label="Tutup dialog">×</button>
        </div>
        <div class="modal-body" id="modal-body">
          <div class="state-box" role="status"><p>Memuat…</p></div>
        </div>
      </div>`;

    document.body.appendChild(overlay);
    overlay.querySelector('#modal-close-btn').focus();

    const close = () => {
      if (this.#detailMap) { try { this.#detailMap.remove(); } catch (_) {} this.#detailMap = null; }
      overlay.remove();
    };

    overlay.querySelector('#modal-close-btn').addEventListener('click', close);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    overlay.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });

    this._load(overlay);
  }

  async _load(overlay) {
    const body = overlay.querySelector('#modal-body');
    try {
      const story  = await Api.getStoryById(this.#id);
      const saved  = await isStorySaved(story.id);
      const fallback = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='600' height='320'%3E%3Crect width='600' height='320' fill='%23312a21'/%3E%3Ctext x='300' y='165' text-anchor='middle' fill='%237a6e60' font-size='60'%3E📷%3C/text%3E%3C/svg%3E`;

      body.innerHTML = `
        <img style="width:100%;max-height:320px;object-fit:cover;border-radius:var(--radius);margin-bottom:16px"
          src="${story.photoUrl}" alt="Foto cerita oleh ${story.name}"
          onerror="this.src='${fallback}'" />
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;gap:12px;flex-wrap:wrap">
          <div style="display:flex;align-items:center;gap:10px">
            <div class="author-avatar" aria-hidden="true">${initials(story.name)}</div>
            <div>
              <p style="font-size:14px;font-weight:600;color:var(--text)">${story.name}</p>
              <time style="font-size:12px;color:var(--muted)" datetime="${story.createdAt}">
                ${showFormattedDate(story.createdAt)}
              </time>
            </div>
          </div>
          <button id="btn-modal-save" class="btn btn-sm ${saved ? 'btn-primary' : 'btn-ghost'}"
            aria-label="${saved ? 'Hapus dari tersimpan' : 'Simpan cerita'}">
            ${saved ? '✅ Tersimpan' : '🔖 Simpan'}
          </button>
        </div>
        <p style="font-size:15px;line-height:1.75;color:var(--text2);white-space:pre-wrap">${story.description}</p>
        ${story.lat && story.lon ? `
          <div style="margin-top:20px">
            <p class="section-label">📍 Lokasi</p>
            <div id="modal-detail-map" style="height:220px;border-radius:var(--radius);border:1px solid var(--border)"
              role="application" aria-label="Peta lokasi cerita"></div>
          </div>` : ''}`;

      // Save button logic
      const saveBtn = body.querySelector('#btn-modal-save');
      saveBtn?.addEventListener('click', async () => {
        const nowSaved = await isStorySaved(story.id);
        if (nowSaved) {
          await deleteSavedStory(story.id);
          saveBtn.className = 'btn btn-sm btn-ghost';
          saveBtn.textContent = '🔖 Simpan';
          saveBtn.setAttribute('aria-label', 'Simpan cerita');
          showToast('Cerita dihapus dari tersimpan', 'info');
        } else {
          await saveStory(story);
          saveBtn.className = 'btn btn-sm btn-primary';
          saveBtn.textContent = '✅ Tersimpan';
          saveBtn.setAttribute('aria-label', 'Hapus dari tersimpan');
          showToast('Cerita disimpan!', 'success');
        }
      });

      if (story.lat && story.lon) {
        setTimeout(() => {
          this.#detailMap = createMap('modal-detail-map', [story.lat, story.lon], 13);
          L.marker([story.lat, story.lon]).addTo(this.#detailMap)
            .bindPopup(`<b>${story.name}</b>`).openPopup();
        }, 60);
      }
    } catch (err) {
      body.innerHTML = `<div class="state-box" role="alert">
        <div class="state-icon" aria-hidden="true">⚠️</div>
        <p class="state-title">Gagal memuat</p>
        <p class="state-msg">${err.message}</p>
      </div>`;
    }
  }
}
