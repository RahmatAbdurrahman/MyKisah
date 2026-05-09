import * as Api from '../../data/api';
import { showToast, setLoading, showFieldError, clearFieldErrors } from '../../utils/index';

export default class LoginPage {
  async render() {
    return `
      <section class="auth-page page-view" aria-labelledby="login-heading">
        <div class="auth-card">
          <div class="brand-mark" aria-hidden="true">MyKisah</div>
          <h1 class="auth-title" id="login-heading">Selamat datang</h1>
          <p class="auth-subtitle">Masuk untuk membaca dan berbagi cerita</p>
          <form class="auth-form" id="login-form" novalidate aria-label="Form masuk">
            <div class="form-group">
              <label class="form-label" for="login-email">Alamat Email</label>
              <input class="form-control" type="email" id="login-email"
                placeholder="email@contoh.com" autocomplete="email" required />
              <span class="form-error" id="err-login-email" role="alert"></span>
            </div>
            <div class="form-group">
              <label class="form-label" for="login-password">Kata Sandi</label>
              <input class="form-control" type="password" id="login-password"
                placeholder="Minimal 8 karakter" autocomplete="current-password" required />
              <span class="form-error" id="err-login-password" role="alert"></span>
            </div>
            <button class="btn btn-primary btn-lg w-full" type="submit" id="btn-login">Masuk</button>
          </form>
          <p class="auth-footer">Belum punya akun? <a href="#/register">Daftar sekarang</a></p>
        </div>
      </section>`;
  }

  async afterRender() {
    const form = document.querySelector('#login-form');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearFieldErrors(form);
      let valid = true;
      const email = form.querySelector('#login-email');
      const pass  = form.querySelector('#login-password');
      if (!email.value.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
        showFieldError(form, 'err-login-email', 'Masukkan email yang valid');
        email.classList.add('is-invalid'); valid = false;
      }
      if (pass.value.length < 8) {
        showFieldError(form, 'err-login-password', 'Kata sandi minimal 8 karakter');
        pass.classList.add('is-invalid'); valid = false;
      }
      if (!valid) return;
      const btn = form.querySelector('#btn-login');
      setLoading(btn, true);
      try {
        await Api.login(email.value.trim(), pass.value);
        showToast('Berhasil masuk!', 'success');
        window.location.hash = '/';
      } catch (err) {
        showToast(err.message, 'error');
      } finally {
        setLoading(btn, false);
      }
    });
  }
}
