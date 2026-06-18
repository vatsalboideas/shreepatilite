document.addEventListener('DOMContentLoaded', () => {
  initMobileMenu();
  initSmoothScroll();
});

function initMobileMenu() {
  const nav = document.querySelector('.nav');
  const menuBtn = document.querySelector('.mobile-menu-btn');
  if (!nav || !menuBtn) return;

  menuBtn.addEventListener('click', () => {
    nav.classList.toggle('open');
  });

  nav.querySelectorAll('.nav-links a, .nav-cta').forEach((link) => {
    link.addEventListener('click', () => nav.classList.remove('open'));
  });
}

function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', (e) => {
      const targetId = anchor.getAttribute('href');
      if (targetId === '#') return;

      const target = document.querySelector(targetId);
      if (!target) return;

      e.preventDefault();
      const headerOffset = 100;
      const top = target.getBoundingClientRect().top + window.scrollY - headerOffset;
      window.scrollTo({ top, behavior: 'smooth' });
    });
  });
}
