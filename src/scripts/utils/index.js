export function showFormattedDate(date, locale = 'id-ID', options = {}) {
  return new Date(date).toLocaleDateString(locale, {
    year: 'numeric', month: 'long', day: 'numeric', ...options,
  });
}

export function sleep(time = 1000) {
  return new Promise((resolve) => setTimeout(resolve, time));
}

export function initials(name) {
  return (name || '?').split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();
}

export function showToast(message, type = 'info', duration = 4000) {
  const container = document.querySelector('#toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  toast.setAttribute('role', 'alert');
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'toastOut 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

export function setLoading(btn, loading) {
  if (!btn) return;
  if (loading) {
    btn.setAttribute('disabled', '');
    btn._origHTML = btn.innerHTML;
    btn.innerHTML = '';
    btn.classList.add('btn-loading');
  } else {
    btn.removeAttribute('disabled');
    btn.innerHTML = btn._origHTML || '';
    btn.classList.remove('btn-loading');
  }
}

export function showFieldError(root, id, msg) {
  const el = root.querySelector(`#${id}`);
  if (el) { el.textContent = msg; el.classList.add('visible'); }
}

export function clearFieldErrors(root) {
  root.querySelectorAll('.form-error').forEach((e) => { e.classList.remove('visible'); e.textContent = ''; });
  root.querySelectorAll('.is-invalid').forEach((e) => e.classList.remove('is-invalid'));
}

export function skeletonCards(n) {
  return Array.from({ length: n }, () => `
    <article class="skeleton-card" aria-hidden="true">
      <div class="skeleton skeleton-img"></div>
      <div class="skeleton-body">
        <div class="skeleton skeleton-line" style="width:60%"></div>
        <div class="skeleton skeleton-line" style="width:100%"></div>
        <div class="skeleton skeleton-line" style="width:75%"></div>
      </div>
    </article>`).join('');
}

export function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}
