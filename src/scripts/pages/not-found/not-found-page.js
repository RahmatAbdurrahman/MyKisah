export default class NotFoundPage {
  async render() {
    return `
      <div class="state-box page-view" style="padding:100px 24px" role="main">
        <div class="state-icon" aria-hidden="true">🌊</div>
        <h1 class="state-title">Halaman Tidak Ditemukan</h1>
        <p class="state-msg">Halaman yang kamu cari tidak tersedia.</p>
        <a href="#/" class="btn btn-primary mt-16">Kembali ke Beranda</a>
      </div>`;
  }
  async afterRender() {}
}
