import * as Api from '../../data/api';
import { showToast, setLoading, showFieldError, clearFieldErrors } from '../../utils/index';

export default class RegisterPage {
  async render() {
    return `
      <section class="auth-page page-view" aria-labelledby="register-heading">
        <div class="auth-card">
          <div class="brand-mark" aria-hidden="true">MyKisah</div>
          <h1 class="auth-title" id="register-heading">Buat Akun Baru</h1>
          <p class="auth-subtitle">Bergabunglah dan mulai berbagi ceritamu</p>
          <form class="auth-form" id="register-form" novalidate aria-label="Form pendaftaran">
            <div class="form-group">
              <label class="form-label" for="reg-name">Nama Lengkap</label>
              <input class="form-control" type="text" id="reg-name"
                placeholder="Nama kamu" autocomplete="name" required />
              <span class="form-error" id="err-reg-name" role="alert"></span>
            </div>
            <div class="form-group">
              <label class="form-label" for="reg-email">Alamat Email</label>
              <input class="form-control" type="email" id="reg-email"
                placeholder="email@contoh.com" autocomplete="email" required />
              <span class="form-error" id="err-reg-email" role="alert"></span>
            </div>
            <div class="form-group">
              <label class="form-label" for="reg-password">Kata Sandi</label>
              <input class="form-control" type="password" id="reg-password"
                placeholder="Minimal 8 karakter" autocomplete="new-password" required />
              <span class="form-error" id="err-reg-password" role="alert"></span>
            </div>
            <button class="btn btn-primary btn-lg w-full" type="submit" id="btn-register">Daftar</button>
          </form>
          <p class="auth-footer">Sudah punya akun? <a href="#/login">Masuk</a></p>
        </div>
      </section>`;
  }

  async afterRender() {
    const form = document.querySelector('#register-form');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearFieldErrors(form);
      let valid = true;
      const name  = form.querySelector('#reg-name');
      const email = form.querySelector('#reg-email');
      const pass  = form.querySelector('#reg-password');
      if (name.value.trim().length < 2) {
        showFieldError(form, 'err-reg-name', 'Nama minimal 2 karakter');
        name.classList.add('is-invalid'); valid = false;
      }
      if (!email.value.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
        showFieldError(form, 'err-reg-email', 'Masukkan email yang valid');
        email.classList.add('is-invalid'); valid = false;
      }
      if (pass.value.length < 8) {
        showFieldError(form, 'err-reg-password', 'Kata sandi minimal 8 karakter');
        pass.classList.add('is-invalid'); valid = false;
      }
      if (!valid) return;
      const btn = form.querySelector('#btn-register');
      setLoading(btn, true);
      try {
        await Api.register(name.value.trim(), email.value.trim(), pass.value);
        showToast('Berhasil mendaftar! Silakan masuk.', 'success');
        window.location.hash = '/login';
      } catch (err) {
        showToast(err.message, 'error');
      } finally {
        setLoading(btn, false);
      }
    });
  }
}
