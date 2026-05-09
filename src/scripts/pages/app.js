import routes from '../routes/routes';
import { getActiveRoute } from '../routes/url-parser';
import { isLoggedIn, clearToken } from '../data/api';
import { showToast } from '../utils/index';
import { registerServiceWorker } from '../utils/notification';

class App {
  #content          = null;
  #drawerButton     = null;
  #navigationDrawer = null;
  #deferredPrompt   = null;

  constructor({ navigationDrawer, drawerButton, content }) {
    this.#content          = content;
    this.#drawerButton     = drawerButton;
    this.#navigationDrawer = navigationDrawer;
    this.#setupDrawer();
    this.#setupLogout();
    this.#initSW();
    this.#setupInstallBanner();
  }

  async #initSW() {
    await registerServiceWorker();
    // Listen for messages from SW (e.g. sync done)
    navigator.serviceWorker?.addEventListener('message', (e) => {
      if (e.data?.type === 'SYNC_DONE') {
        showToast('Cerita offline berhasil disinkronkan! 🎉', 'success');
      }
    });
  }

  #setupInstallBanner() {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.#deferredPrompt = e;
      const banner = document.querySelector('#install-banner');
      if (banner) banner.classList.remove('hidden');
    });

    document.querySelector('#btn-install')?.addEventListener('click', async () => {
      if (!this.#deferredPrompt) return;
      this.#deferredPrompt.prompt();
      const { outcome } = await this.#deferredPrompt.userChoice;
      if (outcome === 'accepted') showToast('Aplikasi berhasil dipasang! 🎉', 'success');
      this.#deferredPrompt = null;
      document.querySelector('#install-banner')?.classList.add('hidden');
    });

    document.querySelector('#btn-install-dismiss')?.addEventListener('click', () => {
      document.querySelector('#install-banner')?.classList.add('hidden');
    });

    window.addEventListener('appinstalled', () => {
      showToast('Kisah berhasil dipasang!', 'success');
      document.querySelector('#install-banner')?.classList.add('hidden');
      this.#deferredPrompt = null;
    });
  }

  #setupDrawer() {
    this.#drawerButton.addEventListener('click', () => {
      const open = this.#navigationDrawer.classList.toggle('open');
      this.#drawerButton.setAttribute('aria-expanded', String(open));
    });

    document.body.addEventListener('click', (e) => {
      const outside =
        !this.#navigationDrawer.contains(e.target) &&
        !this.#drawerButton.contains(e.target);
      if (outside) {
        this.#navigationDrawer.classList.remove('open');
        this.#drawerButton.setAttribute('aria-expanded', 'false');
      }
      this.#navigationDrawer.querySelectorAll('a, button').forEach((el) => {
        if (el.contains(e.target)) {
          this.#navigationDrawer.classList.remove('open');
          this.#drawerButton.setAttribute('aria-expanded', 'false');
        }
      });
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.#navigationDrawer.classList.contains('open')) {
        this.#navigationDrawer.classList.remove('open');
        this.#drawerButton.setAttribute('aria-expanded', 'false');
      }
    });
  }

  #setupLogout() {
    document.querySelector('#btn-logout')?.addEventListener('click', () => {
      clearToken();
      showToast('Berhasil keluar', 'info');
      window.location.hash = '/login';
    });
  }

  #updateNav(route) {
    const loggedIn = isLoggedIn();
    document.querySelector('#nav-auth-item')?.classList.toggle('hidden', loggedIn);
    document.querySelector('#nav-logout-item')?.classList.toggle('hidden', !loggedIn);

    document.querySelectorAll('.nav-link').forEach((l) => l.classList.remove('active'));
    const navMap = {
      '/':      '#nav-home',
      '/add':   '#nav-add',
      '/saved': '#nav-saved',
      '/login': '#nav-login',
    };
    if (navMap[route]) document.querySelector(navMap[route])?.classList.add('active');
  }

  async renderPage() {
    const route    = getActiveRoute();
    const loggedIn = isLoggedIn();

    // Auth guard
    if (['/','  /add','/saved'].includes(route) && !loggedIn) {
      window.location.hash = '/login'; return;
    }
    if (['/login','/register'].includes(route) && loggedIn) {
      window.location.hash = '/'; return;
    }

    const PageClass = routes[route] || routes['/not-found'];
    const page = new PageClass();

    const doRender = async () => {
      this.#content.innerHTML = await page.render();
      await page.afterRender();
      this.#updateNav(route);
      setTimeout(() => this.#content.focus(), 50);
    };

    if (document.startViewTransition) {
      document.startViewTransition(doRender);
    } else {
      await doRender();
    }
  }
}

export default App;
