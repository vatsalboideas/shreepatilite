/* ==========================================================================
   Constants & State
   ========================================================================== */

const DESKTOP_BREAKPOINT = 1024;

/** Active ScrollTrigger instances for the services stack (cleared on resize). */
let servicesScrollTriggers = [];

/** Debounce timer for rebuilding services animations after viewport changes. */
let servicesResizeTimer;

/** Lenis smooth-scroll instance (null when disabled or unavailable). */
let lenis = null;

/* ==========================================================================
   Shared Utilities
   ========================================================================== */

/** Sticky header height plus optional gap — used for scroll offsets and GSAP pin positions. */
function getStickyHeaderOffset(extraGap = 20) {
  const header = document.querySelector('.hero-nav-wrap');
  if (!header) return 60;

  const stickyTop = parseFloat(getComputedStyle(header).top) || 0;
  return Math.ceil(stickyTop + header.offsetHeight + extraGap);
}

function getCurrentPageName() {
  const page = window.location.pathname.split('/').pop();
  return page || 'index.html';
}

function getLinkHash(href) {
  const hashIndex = href.indexOf('#');
  return hashIndex >= 0 ? href.slice(hashIndex) : '';
}

function getLinkPage(href) {
  if (href.startsWith('#')) return getCurrentPageName();
  const hashIndex = href.indexOf('#');
  const path = hashIndex >= 0 ? href.slice(0, hashIndex) : href;
  return path.split('/').pop() || 'index.html';
}

/* ==========================================================================
   Hero Carousel
   ========================================================================== */

function initHeroCarousel() {
  const carousel = document.querySelector('.hero-carousel-bg');
  if (!carousel) return;

  const heroPanel = carousel.closest('.hero-panel');
  const track = carousel.querySelector('.hero-carousel-track');
  const slides = [...carousel.querySelectorAll('.hero-carousel-slide')];
  const indicators = [
    ...(heroPanel || carousel).querySelectorAll('[data-hero-carousel-indicator]'),
  ];
  const prevBtn = (heroPanel || carousel).querySelector('[data-hero-carousel-prev]');
  const nextBtn = (heroPanel || carousel).querySelector('[data-hero-carousel-next]');
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const AUTOPLAY_DELAY = 5000;
  let activeIndex = 0;
  let autoplayTimer;

  if (slides.length <= 1) return;

  function setSlide(index) {
    activeIndex = (index + slides.length) % slides.length;

    // Slide the track
    track.style.transform = `translateX(-${activeIndex * 33.333333}%)`;

    // Update aria-hidden on each slide
    slides.forEach((slide, i) => {
      slide.setAttribute('aria-hidden', String(i !== activeIndex));
    });

    // Restart progress-bar fill animation by toggling is-active
    indicators.forEach((indicator, i) => {
      const isActive = i === activeIndex;
      indicator.classList.remove('is-active');
      if (isActive) {
        indicator.offsetWidth; // force reflow to restart animation
        indicator.classList.add('is-active');
        indicator.setAttribute('aria-selected', 'true');
      } else {
        indicator.setAttribute('aria-selected', 'false');
      }
    });
  }

  function startAutoplay() {
    if (prefersReducedMotion) return;
    clearInterval(autoplayTimer);
    autoplayTimer = setInterval(() => setSlide(activeIndex + 1), AUTOPLAY_DELAY);
  }

  function goToSlide(index) {
    setSlide(index);
    startAutoplay();
  }

  prevBtn?.addEventListener('click', () => goToSlide(activeIndex - 1));
  nextBtn?.addEventListener('click', () => goToSlide(activeIndex + 1));

  indicators.forEach((indicator, i) => {
    indicator.addEventListener('click', () => goToSlide(i));
  });

  setSlide(0);
  startAutoplay();
}

/* ==========================================================================
   Mobile Menu
   ========================================================================== */

function initMobileMenu() {
  const nav = document.getElementById('nav');
  const menuBtn = document.getElementById('menu-btn');
  if (!nav || !menuBtn) return;

  const closeMenu = () => {
    nav.classList.remove('open');
    menuBtn.classList.remove('open');
    menuBtn.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('menu-open');
    lenis?.start();
  };

  menuBtn.addEventListener('click', () => {
    const isOpen = nav.classList.toggle('open');
    menuBtn.classList.toggle('open', isOpen);
    menuBtn.setAttribute('aria-expanded', String(isOpen));
    document.body.classList.toggle('menu-open', isOpen);
    if (lenis) {
      if (isOpen) lenis.stop();
      else lenis.start();
    }
  });

  nav.querySelectorAll('.nav-menu a').forEach((link) => {
    link.addEventListener('click', closeMenu);
  });

  // Close when crossing into desktop layout
  window.matchMedia(`(min-width: ${DESKTOP_BREAKPOINT}px)`).addEventListener('change', (e) => {
    if (e.matches) closeMenu();
  });
}

/* ==========================================================================
   Lenis Smooth Scroll
   ========================================================================== */

function initLenis() {
  if (typeof Lenis === 'undefined') return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  lenis = new Lenis({
    lerp: 0.1,
    smoothWheel: true,
  });

  if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
    lenis.on('scroll', ScrollTrigger.update);

    ScrollTrigger.scrollerProxy(document.documentElement, {
      scrollTop(value) {
        if (arguments.length) {
          lenis.scrollTo(value, { immediate: true });
        }
        return lenis.scroll;
      },
      getBoundingClientRect() {
        return {
          top: 0,
          left: 0,
          width: window.innerWidth,
          height: window.innerHeight,
        };
      },
    });

    ScrollTrigger.addEventListener('refresh', () => lenis.resize());

    gsap.ticker.add((time) => {
      lenis.raf(time * 1000);
    });
    gsap.ticker.lagSmoothing(0);
  } else {
    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);
  }
}

function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', (e) => {
      const targetId = anchor.getAttribute('href');
      if (targetId === '#') return;

      const target = document.querySelector(targetId);
      if (!target) return;

      e.preventDefault();
      const headerOffset = getStickyHeaderOffset(12);

      if (lenis) {
        lenis.scrollTo(target, { offset: -headerOffset });
        return;
      }

      const top = target.getBoundingClientRect().top + window.scrollY - headerOffset;
      window.scrollTo({ top, behavior: 'smooth' });
    });
  });
}

/* ==========================================================================
   Navigation Highlighting
   ========================================================================== */

function initNavHighlighting() {
  const navLinks = document.querySelectorAll('.nav-links a');
  const navCta = document.querySelector('.nav-cta');
  if (!navLinks.length) return;

  const currentPage = getCurrentPageName();
  const isHomePage = currentPage === 'index.html' || currentPage === '';

  function clearActive() {
    navLinks.forEach((link) => {
      link.classList.remove('nav-link-active');
      link.removeAttribute('aria-current');
    });
    if (navCta) {
      navCta.classList.remove('nav-link-active');
      navCta.removeAttribute('aria-current');
    }
  }

  function setActive(link, ariaValue = 'page') {
    clearActive();
    link.classList.add('nav-link-active');
    link.setAttribute('aria-current', ariaValue);
  }

  // Standalone pages: highlight matching nav item
  if (currentPage === 'about.html') {
    const aboutLink = [...navLinks].find((link) => link.getAttribute('href') === 'about.html');
    if (aboutLink) setActive(aboutLink);
    return;
  }
}

/* ==========================================================================
   Scroll Reveal Animations
   ========================================================================== */

function initScrollReveal() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const STAGGER_MS = 75;
  const pendingGroups = [];

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.1, rootMargin: '0px 0px -5% 0px' }
  );

  function markReveal(el, delayMs = 0) {
    if (!el) return;
    el.classList.add('reveal');
    if (delayMs > 0) el.style.setProperty('--reveal-delay', `${delayMs}ms`);
  }

  function registerGroup(group, playOnLoad = false) {
    pendingGroups.push({ group, playOnLoad });
  }

  function setupAboutSection(section) {
    section.classList.add('reveal-group');
    let delay = 0;

    markReveal(section.querySelector('.about-title'), delay);
    delay += 100;
    markReveal(section.querySelector('.about-name'), delay);
    delay += 80;

    const photoWrap = section.querySelector('.about-photo-wrap');
    if (photoWrap) {
      photoWrap.classList.add('reveal--from-right');
      markReveal(photoWrap, delay);
    }
    delay += 100;

    markReveal(section.querySelector('.about-subtitle'), delay);
    delay += 80;
    markReveal(section.querySelector('.about-body'), delay);

    registerGroup(section, true);
  }

  function setupServicesSection(section) {
    section.classList.add('reveal-group');
    let delay = 0;

    const title = section.querySelector('.services-section-title');
    if (title) {
      markReveal(title, delay);
      delay += 100;
    }

    const scrollWrapper = section.querySelector('.services-scroll-wrapper');
    if (scrollWrapper) {
      scrollWrapper.classList.add('reveal--fade-only');
      markReveal(scrollWrapper, delay);
    }

    registerGroup(section);
  }

  function setupGenericSection(section) {
    section.classList.add('reveal-group');
    let delay = 0;

    const productsBanner = section.querySelector('.products-banner');

    if (productsBanner) {
      markReveal(productsBanner, delay);
    } else {
      const title = section.querySelector(':scope > .container-main > .section-title');
      if (title) {
        markReveal(title, delay);
        delay += 100;
      }

      section.querySelectorAll('.different-item, .blog-card').forEach((item) => {
        markReveal(item, delay);
        delay += STAGGER_MS;
      });

      if (!title && !section.querySelector('.reveal')) {
        const fallback = section.querySelector(':scope > .container-main');
        if (fallback) markReveal(fallback, 0);
      }
    }

    registerGroup(section);
  }

  function setupGroup(section) {
    if (section.classList.contains('about-section')) {
      setupAboutSection(section);
      return;
    }

    if (section.id === 'services') {
      setupServicesSection(section);
      return;
    }

    setupGenericSection(section);
  }

  // Hero (above the fold — plays immediately)
  const hero = document.querySelector('.hero-shell');
  if (hero) {
    hero.classList.add('reveal-group');
    hero.querySelectorAll('.hero-panel h1, .hero-panel p').forEach((el, i) => {
      markReveal(el, i * 120);
    });
    registerGroup(hero, true);
  }

  document.querySelectorAll('main > section:not(.hero-shell)').forEach(setupGroup);

  const footer = document.querySelector('footer.site-footer');
  if (footer) {
    footer.classList.add('reveal-group');
    footer.querySelectorAll(':scope > .container-main').forEach((block, i) => {
      markReveal(block, i * 100);
    });
    registerGroup(footer);
  }

  if (!pendingGroups.length) return;

  document.documentElement.classList.add('reveal-ready');
  document.documentElement.offsetHeight; // Force reflow before starting transitions

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      document.documentElement.classList.add('reveal-animate');

      pendingGroups.forEach(({ group, playOnLoad }) => {
        if (playOnLoad) {
          window.setTimeout(() => group.classList.add('is-visible'), 80);
          return;
        }

        observer.observe(group);

        const rect = group.getBoundingClientRect();
        if (rect.top < window.innerHeight * 0.92 && rect.bottom > 0) {
          group.classList.add('is-visible');
        }
      });
    });
  });
}

/* ==========================================================================
   Services Stack (GSAP / ScrollTrigger)
   ========================================================================== */

function getServicesPinEnd() {
  return Math.min(550, window.innerHeight * 0.65);
}

function killServicesAnimations() {
  servicesScrollTriggers.forEach((st) => st.kill());
  servicesScrollTriggers = [];

  const stack = document.querySelector('#services .services-stack');
  const cards = document.querySelectorAll('#services .service-card');
  const wrappers = document.querySelectorAll('#services .service-card-wrapper');

  cards.forEach((card) => {
    gsap.killTweensOf(card);
    gsap.set(card, { clearProps: 'transform,zIndex' });
  });

  wrappers.forEach((wrapper) => {
    gsap.set(wrapper, { clearProps: 'zIndex' });
  });

  if (stack) stack.classList.remove('services-stack--static');
}

function scheduleServicesRefresh(delay = 200) {
  clearTimeout(servicesResizeTimer);
  servicesResizeTimer = setTimeout(setupServicesStack, delay);
}

function setupServicesStack() {
  killServicesAnimations();

  const scrollWrapper = document.querySelector('#services .services-scroll-wrapper');
  const titleSticky = document.querySelector('#services .services-title-sticky');
  const stack = document.querySelector('#services .services-stack');
  const cardsWrappers = gsap.utils.toArray('#services .service-card-wrapper');
  const cards = gsap.utils.toArray('#services .service-card');

  if (!scrollWrapper || !titleSticky || !stack || cardsWrappers.length !== cards.length) {
    return;
  }

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    stack.classList.add('services-stack--static');
    ScrollTrigger.refresh();
    return;
  }

  stack.classList.remove('services-stack--static');

  const titlePinTop = () => getStickyHeaderOffset();

  const titleTrigger = ScrollTrigger.create({
    trigger: titleSticky,
    start: () => 'top ' + titlePinTop(),
    endTrigger: scrollWrapper,
    end: () => 'bottom ' + getServicesPinEnd(),
    pin: true,
    pinSpacing: false,
    anticipatePin: 1,
    invalidateOnRefresh: true,
    id: 'services-title',
  });
  servicesScrollTriggers.push(titleTrigger);

  cardsWrappers.forEach((wrapper, i) => {
    const card = cards[i];
    const isLast = i === cards.length - 1;
    const scale = isLast ? 1 : 0.9 + 0.025 * i;
    const rotation = isLast ? 0 : -10;

    gsap.set(wrapper, { zIndex: i + 1 });
    gsap.set(card, { zIndex: i + 1, force3D: true, transformOrigin: 'top center' });

    const cardTween = gsap.to(card, {
      ease: 'none',
      scrollTrigger: {
        trigger: wrapper,
        start: () => 'top ' + (titlePinTop() + titleSticky.offsetHeight + i * 10),
        end: () => 'bottom ' + getServicesPinEnd(),
        endTrigger: scrollWrapper,
        scrub: 0.6,
        pin: wrapper,
        pinSpacing: false,
        pinReparent: true,
        anticipatePin: 1,
        fastScrollEnd: true,
        invalidateOnRefresh: true,
        id: 'service-' + (i + 1),
      },
    });
    servicesScrollTriggers.push(cardTween.scrollTrigger);
  });

  ScrollTrigger.refresh();
}

function initServicesStackAnimation() {
  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;

  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ ignoreMobileResize: true });

  if (!document.querySelector('#services .services-scroll-wrapper')) return;

  setupServicesStack();

  window.addEventListener('resize', () => scheduleServicesRefresh(200));
  window.addEventListener('orientationchange', () => scheduleServicesRefresh(300));
}

/* ==========================================================================
   Image Parallax
   ========================================================================== */

/** ScrollTrigger instances for image parallax. */
let imageParallaxTriggers = [];

function killImageParallax() {
  imageParallaxTriggers.forEach((st) => st.kill());
  imageParallaxTriggers = [];
}

function wrapParallaxMedia(img) {
  if (img.parentElement?.classList.contains('parallax-media')) {
    return img;
  }

  const wrap = document.createElement('div');
  wrap.className = 'parallax-media';
  img.parentNode.insertBefore(wrap, img);
  wrap.appendChild(img);
  return img;
}

function addImageParallax(target, options) {
  const tween = gsap.fromTo(
    target,
    { yPercent: options.from },
    {
      yPercent: options.to,
      ease: 'none',
      force3D: true,
      scrollTrigger: {
        trigger: options.trigger,
        start: options.start,
        end: options.end,
        scrub: options.scrub ?? 0.5,
        invalidateOnRefresh: true,
      },
    }
  );

  imageParallaxTriggers.push(tween.scrollTrigger);
}

function initAboutImageParallax() {
  const aboutSection = document.querySelector('.about-section');
  const aboutPhoto = document.querySelector('.about-photo');
  if (!aboutSection || !aboutPhoto) return;

  addImageParallax(aboutPhoto, {
    from: -8,
    to: 10,
    trigger: aboutSection,
    start: 'top bottom',
    end: 'bottom top',
    scrub: 0.5,
  });
}

function initHomeImageParallax() {
  const heroShell = document.querySelector('.hero-shell');
  if (heroShell) {
    document.querySelectorAll('.hero-carousel-slide img').forEach((img) => {
      addImageParallax(img, {
        from: -8,
        to: 12,
        trigger: heroShell,
        start: 'top top',
        end: 'bottom top',
        scrub: 0.35,
      });
    });
  }

  document.querySelectorAll('.service-card-media img').forEach((img) => {
    wrapParallaxMedia(img);
    const card = img.closest('.service-card');
    if (!card) return;

    addImageParallax(img, {
      from: -10,
      to: 10,
      trigger: card,
      start: 'top bottom',
      end: 'bottom top',
      scrub: 0.6,
    });
  });

  const productsBanner = document.querySelector('.products-banner');
  const productsImg = productsBanner?.querySelector(':scope > img');
  if (productsBanner && productsImg) {
    wrapParallaxMedia(productsImg);

    addImageParallax(productsImg, {
      from: -12,
      to: 12,
      trigger: productsBanner,
      start: 'top bottom',
      end: 'bottom top',
      scrub: 0.5,
    });
  }

  document.querySelectorAll('.blog-card-image').forEach((img) => {
    wrapParallaxMedia(img);
    const card = img.closest('.blog-card');
    if (!card) return;

    addImageParallax(img, {
      from: -8,
      to: 8,
      trigger: card,
      start: 'top bottom',
      end: 'bottom top',
      scrub: 0.45,
    });
  });

}

function initImageParallax() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;

  killImageParallax();
  gsap.registerPlugin(ScrollTrigger);

  if (document.body.classList.contains('page-home')) {
    initHomeImageParallax();
  }

  if (document.body.classList.contains('page-about')) {
    initAboutImageParallax();
  }

  ScrollTrigger.refresh();
}

/* ==========================================================================
   Partners Marquee
   ========================================================================== */

function initPartnersMarquee() {
  const marquee = document.querySelector('.partners-marquee');
  if (!marquee) return;

  const track = marquee.querySelector('.partners-marquee-track');
  const sourceSet = track?.querySelector('.partners-marquee-set');
  if (!track || !sourceSet) return;

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const originalItems = [...sourceSet.children].map((node) => node.cloneNode(true));
  const MARQUEE_SPEED = 45; // pixels per second
  let resizeTimer;

  function renderMarquee() {
    track.textContent = '';
    track.classList.remove('is-animating');
    track.style.removeProperty('--marquee-distance');
    track.style.removeProperty('--marquee-duration');
    marquee.classList.remove('is-ready', 'is-static');

    const primarySet = document.createElement('div');
    primarySet.className = 'partners-marquee-set';
    originalItems.forEach((item) => primarySet.appendChild(item.cloneNode(true)));
    track.appendChild(primarySet);

    const minWidth = marquee.offsetWidth + 1;
    while (primarySet.scrollWidth < minWidth) {
      originalItems.forEach((item) => primarySet.appendChild(item.cloneNode(true)));
    }

    if (prefersReducedMotion) {
      marquee.classList.add('is-ready', 'is-static');
      return;
    }

    const loopSet = primarySet.cloneNode(true);
    loopSet.setAttribute('aria-hidden', 'true');
    loopSet.querySelectorAll('img').forEach((img) => img.setAttribute('alt', ''));
    track.appendChild(loopSet);

    const distance = primarySet.getBoundingClientRect().width;
    const duration = Math.max(distance / MARQUEE_SPEED, 20);

    track.style.setProperty('--marquee-distance', `-${distance}px`);
    track.style.setProperty('--marquee-duration', `${duration}s`);
    track.classList.add('is-animating');
    marquee.classList.add('is-ready');
  }

  renderMarquee();

  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(renderMarquee, 200);
  });
}

/* ==========================================================================
   Bootstrap
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  initLenis();
  initHeroCarousel();
  initMobileMenu();
  initSmoothScroll();
  initNavHighlighting();
  initScrollReveal();
  initServicesStackAnimation();
  initImageParallax();
  initPartnersMarquee();
});
