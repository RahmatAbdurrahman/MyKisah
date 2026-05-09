import { getSavedStories, deleteSavedStory } from '../../utils/idb';
import { showFormattedDate, initials, showToast } from '../../utils/index';

export default class SavedPage {
  async render() {
    return `
      <div class="home-page page-view">
        <header class="home-header">
          <div>
            <h1 class="home-title">Cerita <span>Tersimpan</span></h1>
            <p class="home-greeting">Cerita yang kamu simpan akan tetap tersedia offline 📚</p>
          </div>
          <div style="display:flex;gap:8px;align-items:center">
            <label class="form-label" for="saved-search" style="margin-bottom:0;white-space:nowrap">Cari:</label>
            <input type="search" id="saved-search" class="form-control"
              style="width:180px;padding:6px 10px;font-size:13px"
              placeholder="Nama / cerita..." aria-label="Cari cerita tersimpan" />
          </div>
        </header>
        <section aria-label="Daftar cerita tersimpan">
          <div id="saved-grid" class="stories-grid" aria-live="polite">
            <div class="state-box" role="status"><p>Memuat…</p></div>
          </div>
        </section>
      </div>`;
  }

  #allSaved = [];

  async afterRender() {
    this.#allSaved = await getSavedStories();
    this._renderGrid(this.#allSaved);

    document.querySelector('#saved-search')?.addEventListener('input', (e) => {
      const q = e.target.value.trim().toLowerCase();
      const filtered = q
        ? this.#allSaved.filter((s) => s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q))
        : this.#allSaved;
      this._renderGrid(filtered);
    });
  }

  _renderGrid(stories) {
    const grid = document.querySelector('#saved-grid');
    if (!grid) return;
    if (!stories.length) {
      grid.innerHTML = `
        <div class="state-box" role="status">
          <div class="state-icon" aria-hidden="true">🔖</div>
          <p class="state-title">Belum ada cerita tersimpan</p>
          <p class="state-msg">Simpan cerita dari halaman beranda untuk membacanya saat offline.</p>
          <a href="#/" class="btn btn-primary mt-16">Ke Beranda</a>
        </div>`; return;
    }

    grid.innerHTML = stories.map((s) => this._cardHTML(s)).join('');
    grid.querySelectorAll('.story-card').forEach((card) => {
      card.querySelector('.card-click-area').addEventListener('click', () => this._openModal(card.dataset.id));
      card.querySelector('.card-click-area').addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this._openModal(card.dataset.id); }
      });
      card.querySelector('.btn-delete-saved').addEventListener('click', async (e) => {
        e.stopPropagation();
        await deleteSavedStory(card.dataset.id);
        this.#allSaved = this.#allSaved.filter((s) => s.id !== card.dataset.id);
        card.remove();
        showToast('Cerita dihapus dari tersimpan', 'info');
        if (!document.querySelectorAll('.story-card').length) this._renderGrid([]);
      });
    });
  }

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
          </div>
        </div>
        <div class="card-actions">
          <button class="btn-delete-saved btn-icon" aria-label="Hapus dari tersimpan" title="Hapus">🗑</button>
        </div>
      </article>`;
  }

  async _openModal(id) {
    const { default: Modal } = await import('../story-detail/story-detail-modal.js');
    new Modal(id).open();
  }
}
