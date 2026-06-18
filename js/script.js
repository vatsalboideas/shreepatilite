document.addEventListener('DOMContentLoaded', () => {
  initAccordion();
  initMobileMenu();
  initSmoothScroll();
});

function initAccordion() {
  const accordion = document.getElementById('services-accordion');
  if (!accordion) return;

  const items = accordion.querySelectorAll('.accordion-item');

  items.forEach((item, index) => {
    const header = item.querySelector('.accordion-header');
    const body = item.querySelector('.accordion-body');

    header.addEventListener('click', () => {
      const isActive = item.classList.contains('active');

      items.forEach((other) => {
        other.classList.remove('active');
        other.querySelector('.accordion-header').setAttribute('aria-expanded', 'false');
        other.querySelector('.accordion-body').style.maxHeight = '0';
      });

      if (!isActive) {
        item.classList.add('active');
        header.setAttribute('aria-expanded', 'true');
        body.style.maxHeight = body.scrollHeight + 'px';
      }
    });

    if (index === 0) {
      item.classList.add('active');
      header.setAttribute('aria-expanded', 'true');
      body.style.maxHeight = body.scrollHeight + 'px';
    }
  });

  window.addEventListener('resize', () => {
    const activeItem = accordion.querySelector('.accordion-item.active');
    if (activeItem) {
      const body = activeItem.querySelector('.accordion-body');
      body.style.maxHeight = body.scrollHeight + 'px';
    }
  });
}

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
