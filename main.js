import { initializeApp }                              from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, collection, onSnapshot,
         addDoc, query, where, orderBy, serverTimestamp }      from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

window.addEventListener('message', e => {
  if (e.data === 'toggle-product-btn') {
    const o = document.querySelector('.ts-click-overlay');
    if (o) o.classList.toggle('show');
  }
});

const firebaseConfig = {
  apiKey:            "AIzaSyAvMTGPX1NRdDWfBJVTwKFu1MX1-Junq7Y",
  authDomain:        "ashana-journeys.firebaseapp.com",
  projectId:         "ashana-journeys",
  storageBucket:     "ashana-journeys.firebasestorage.app",
  messagingSenderId: "1056206455125",
  appId:             "1:1056206455125:web:5e09ea23b28847dff06fdc",
  measurementId:     "G-FNKGTSYC8C"
};
const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);

/* ── VH polyfill ── */
(function initVH() {
  let lastWidth = window.innerWidth;
  function set() { document.documentElement.style.setProperty('--svh', (window.innerHeight * 0.01) + 'px'); }
  
  set(); // Run once on load
  
  window.addEventListener('resize', () => {
    // ONLY recalculate if the width changes (e.g. rotating the phone).
    // This stops the mobile URL bar from breaking the scroll!
    if (window.innerWidth !== lastWidth) {
      lastWidth = window.innerWidth;
      set();
    }
  }, { passive: true });
  
  window.addEventListener('orientationchange', () => setTimeout(set, 120));
})();


/* ── SCROLL REVEAL ── */
window.revealObs = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); window.revealObs.unobserve(e.target); } });
}, { threshold: 0, rootMargin: '0px 0px -50px 0px' });
function initReveals() { document.querySelectorAll('.reveal').forEach(el => window.revealObs.observe(el)); }
initReveals();
window.addEventListener('load', initReveals);

/* ── NAVBAR SCROLL EFFECT ── */
(function initNavScroll() {
  const nav = document.getElementById('top-nav');
  if (!nav) return;
  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 30);
  }, { passive: true });
})();

/* ── HERO PARALLAX ── */
(function initParallax() {
  if (!window.matchMedia('(pointer: fine)').matches) return;
  const video = document.querySelector('.hero-video');
  const ghost = document.querySelector('.hero-ghost');
  const content = document.querySelector('.hero-content');
  if (!video || !content) return;
  let raf = false;
  window.addEventListener('scroll', () => {
    if (raf) return; raf = true;
    requestAnimationFrame(() => {
      raf = false;
      const y = window.scrollY, vh = window.innerHeight;
      if (y > vh * 1.4) return;
      video.style.transform = `translateZ(0) scale(1.1) translateY(${y * 0.28}px)`;
      if (ghost) ghost.style.transform = `translateY(calc(-50% + ${y * 0.14}px)) translateX(-20px)`;
      content.style.transform = `translateY(${y * 0.07}px)`;
      content.style.opacity = `${Math.max(0, 1 - y / (vh * 0.70))}`;
    });
  }, { passive: true });
})();

/* ── NAV SPY ── */
(function initNavSpy() {
  const sections  = document.querySelectorAll('section[id]');
  const dockItems = document.querySelectorAll('#dock [data-sec]');
  const sideItems = document.querySelectorAll('#sidebar [data-sec]');
  const topItems  = document.querySelectorAll('#top-nav [data-sec]');
  function activate(id) { [...dockItems, ...sideItems, ...topItems].forEach(el => el.classList.toggle('active', el.dataset.sec === id)); }
  const spy = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) activate(e.target.id); });
  }, { threshold: 0.35 });
  sections.forEach(s => spy.observe(s));
})();

/* ── ABOUT SLIDER — dynamic from Firestore gallery collection ── */
/* ── DYNAMIC ABOUT SLIDER (Firestore Integrated) ── */
(function initSlider() {
  const wrap = document.getElementById('about-slider');
  const img  = document.getElementById('about-slide-img');
  if (!wrap || !img) return;

  // Fallback images in case Firestore is empty
  const defaultImages = [
    'assets/hiking.jpg',
    'assets/surfing.jpg',
    'assets/diving.jpg',
    'assets/dirtbike.jpg'
  ];

  let images = [];
  let idx = 0;
  let wheelLocked = false;

  // 1. Load Initial images from HTML dataset
  try { 
    images = JSON.parse(wrap.dataset.images || '[]'); 
  } catch (e) { 
    images = defaultImages; 
  }

  // 2. Listen to Firestore 'settings' collection (Matches Admin Panel)
  onSnapshot(collection(db, 'settings'), snap => {
    snap.forEach(d => {
      const s = d.data();
      if (s.heroImages && Array.isArray(s.heroImages)) {
        // Map the object array {url: "...", label: "..."} to a simple URL array
        const firestoreImages = s.heroImages.map(item => item.url);
        
        if (firestoreImages.length > 0) {
          images = firestoreImages;
          // Ensure index is valid if images were deleted
          if (idx >= images.length) idx = 0;
          img.src = images[idx];
        }
      }
    });
  });

  function goTo(i) {
    if (images.length === 0) return;
    idx = (i + images.length) % images.length;
    const nextSrc = images[idx];
    
    const preload = new Image();
    preload.onload = () => {
      img.style.transition = 'none';
      img.style.opacity = '0';
      requestAnimationFrame(() => {
        img.src = nextSrc;
        requestAnimationFrame(() => {
          img.style.transition = 'opacity .35s ease';
          img.style.opacity = '1';
        });
      });
    };
    preload.src = nextSrc;
  }

  // ── Touch & Mouse Controls ──
  let startX = 0, dx = 0, dragging = false;

  wrap.addEventListener('touchstart', e => { startX = e.changedTouches[0].clientX; }, { passive: true });
  wrap.addEventListener('touchend', e => { 
    dx = e.changedTouches[0].clientX - startX; 
    if (Math.abs(dx) > 36) goTo(idx + (dx < 0 ? 1 : -1)); 
  }, { passive: true });

  wrap.addEventListener('mousedown', e => { dragging = true; startX = e.clientX; e.preventDefault(); });
  window.addEventListener('mousemove', e => { if (dragging) dx = e.clientX - startX; });
  window.addEventListener('mouseup', () => { 
    if (!dragging) return; 
    dragging = false; 
    if (Math.abs(dx) > 36) goTo(idx + (dx < 0 ? 1 : -1)); 
    dx = 0; 
  });

  wrap.addEventListener('wheel', e => {
    if (wheelLocked) return;
    const absDX = Math.abs(e.deltaX);
    const absDY = Math.abs(e.deltaY);
    if (absDX > 30 && absDX > absDY * 1.5) {
      e.preventDefault();
      goTo(idx + (e.deltaX > 0 ? 1 : -1));
      wheelLocked = true;
      setTimeout(() => { wheelLocked = false; }, 600);
    }
  }, { passive: false });
})();


// Load gallery from Firestore; fall back to local assets if empty
(function loadGallerySlider() {
  try {
    onSnapshot(collection(db, 'gallery'), snap => {
      if (snap.empty) {
        initSlider(FALLBACK_GALLERY);
        return;
      }
      const docs = [];
      snap.forEach(d => docs.push({ order: d.data().order ?? 999, url: d.data().url }));
      docs.sort((a, b) => a.order - b.order);
      const urls = docs.map(d => d.url).filter(Boolean);
      initSlider(urls.length ? urls : FALLBACK_GALLERY);
    });
  } catch(e) {
    console.warn('Gallery load failed, using fallback:', e);
    initSlider(FALLBACK_GALLERY);
  }
})();

/* ── T-SHIRT 360 ── */
(function initTShirt() {
  const scene = document.getElementById('ts-scene');
  const inner = document.getElementById('ts-inner');
  if (!scene || !inner) return;
  let isDragging = false, startX = 0, rotY = 0;
  (function loop() { if (!isDragging) rotY += 0.22; inner.style.transform = `rotateY(${rotY}deg)`; requestAnimationFrame(loop); })();
  function getX(e) { return e.touches ? e.touches[0].clientX : e.clientX; }
  function onStart(e) { isDragging = true; startX = getX(e); e.preventDefault(); }
  function onMove(e)  { if (!isDragging) return; const x = getX(e); rotY += (x - startX) * 0.55; startX = x; }
  function onEnd()    { isDragging = false; }
  scene.addEventListener('mousedown',  onStart);
  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup',   onEnd);
  scene.addEventListener('touchstart', onStart, { passive: false });
  window.addEventListener('touchmove', onMove,  { passive: true });
  window.addEventListener('touchend',  onEnd);
})();

/* ── CAROUSEL COUNTER ── */
(function initCounter() {
  const rail = document.getElementById('trips-rail');
  const counter = document.getElementById('trip-count');
  if (!rail || !counter) return;
  rail.addEventListener('scroll', () => {
    const cards = rail.querySelectorAll('.trip-card');
    if (!cards.length) return;
    const cardW = cards[0].offsetWidth + 18;
    const i = Math.round(rail.scrollLeft / cardW) + 1;
    counter.textContent = `${Math.min(i, cards.length)} / ${cards.length}`;
  }, { passive: true });
})();

/* ── FAQ ACCORDION ── */
(function initFAQ() {
  document.addEventListener('click', e => {
    const q = e.target.closest('.faq-q');
    if (!q) return;
    const item = q.closest('.faq-item');
    const a = item.querySelector('.faq-a');
    const isOpen = q.classList.contains('open');
    document.querySelectorAll('.faq-q.open').forEach(el => {
      el.classList.remove('open');
      el.closest('.faq-item').querySelector('.faq-a').style.maxHeight = '0';
    });
    if (!isOpen) { q.classList.add('open'); a.style.maxHeight = a.scrollHeight + 'px'; }
  });
})();

/* ══════════════════════════════════════
   TRIP DETAIL MODAL
══════════════════════════════════════ */
let currentTripData = null;

function openTripModal(tripData) {
  currentTripData = tripData;
  const modal = document.getElementById('trip-modal');
  const gallery = document.getElementById('modal-gallery');
  const mainImg = document.getElementById('modal-main-img');
  const thumbsEl = document.getElementById('modal-thumbs');

  const images = Array.isArray(tripData.photos) && tripData.photos.length
    ? tripData.photos
    : (tripData.photo ? [tripData.photo] : []);

  if (images.length > 0) {
    gallery.style.display = '';
    mainImg.src = images[0];
    mainImg.alt = tripData.name || '';
    thumbsEl.innerHTML = '';
    if (images.length > 1) {
      images.forEach((src, i) => {
        const div = document.createElement('div');
        div.className = 'modal-thumb' + (i === 0 ? ' active' : '');
        div.innerHTML = `<img src="${src}" alt="Trip photo ${i+1}" loading="lazy"/>`;
        div.addEventListener('click', () => {
          mainImg.style.opacity = '0';
          setTimeout(() => { mainImg.src = src; mainImg.style.opacity = '1'; }, 200);
          thumbsEl.querySelectorAll('.modal-thumb').forEach(t => t.classList.remove('active'));
          div.classList.add('active');
        });
        thumbsEl.appendChild(div);
      });
    }
  } else {
    gallery.style.display = 'none';
  }

  document.getElementById('modal-title').textContent = tripData.name || '';

  const metaEl = document.getElementById('modal-meta');
  metaEl.innerHTML = '';
  if (tripData.location)  metaEl.innerHTML += `<span>📍 ${esc(tripData.location)}</span>`;
  if (tripData.startDate) metaEl.innerHTML += `<span>🗓 From: ${esc(tripData.startDate)}</span>`;
  if (tripData.endDate)   metaEl.innerHTML += `<span>🏁 To: ${esc(tripData.endDate)}</span>`;
  if (tripData.date && !tripData.startDate) metaEl.innerHTML += `<span>📅 ${esc(tripData.date)}</span>`;

  document.getElementById('modal-desc').textContent = tripData.description || 'Join us on this amazing adventure! Contact us via WhatsApp for full details.';

  const waMsg = `Hi! I'm interested in joining the trip: ${tripData.name || 'Ashana Journeys Trip'}`;
  document.getElementById('modal-wa-btn').href = `https://wa.me/60102046250?text=${encodeURIComponent(waMsg)}`;

  modal.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeTripModal() {
  document.getElementById('trip-modal').classList.remove('open');
  document.body.style.overflow = '';
  currentTripData = null;
}

document.getElementById('modal-close-btn').addEventListener('click', closeTripModal);
document.getElementById('modal-backdrop').addEventListener('click', closeTripModal);

document.getElementById('modal-join-btn').addEventListener('click', () => {
  const tripToJoin = currentTripData;
  closeTripModal();
  openJoinForm(tripToJoin || { name: 'Ashana Journeys Trip' });
});

/* ══════════════════════════════════════
   JOIN FORM
══════════════════════════════════════ */
function openJoinForm(tripData) {
  const overlay = document.getElementById('join-form-overlay');
  document.getElementById('jf-trip-name-display').textContent = tripData ? `Trip: ${tripData.name}` : '';
  document.getElementById('jf-success').style.display = 'none';
  document.getElementById('jf-form-section').style.display = '';
  document.getElementById('jf-err').textContent = '';
  ['jf-name','jf-email','jf-phone'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('jf-packs').value = '';

  const waMsg = tripData ? `Hi! I'd like to join the trip: ${tripData.name}` : "Hi! I'd like to join a trip.";
  document.getElementById('jf-wa-link').href = `https://wa.me/60102046250?text=${encodeURIComponent(waMsg)}`;

  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
  window._currentJoinTrip = tripData;
}

function closeJoinForm() {
  document.getElementById('join-form-overlay').classList.remove('open');
  document.body.style.overflow = '';
}

document.getElementById('jf-close-btn').addEventListener('click', closeJoinForm);
document.getElementById('jf-backdrop').addEventListener('click', closeJoinForm);

document.getElementById('jf-send-btn').addEventListener('click', async () => {
  const name   = document.getElementById('jf-name').value.trim();
  const email  = document.getElementById('jf-email').value.trim();
  const phone  = document.getElementById('jf-phone').value.trim();
  const packs  = document.getElementById('jf-packs').value;
  const errEl  = document.getElementById('jf-err');
  const btn    = document.getElementById('jf-send-btn');
  const trip   = window._currentJoinTrip || {};

  errEl.textContent = '';
  if (!name)  { errEl.textContent = 'Please enter your full name.'; return; }
  if (!email || !email.includes('@')) { errEl.textContent = 'Please enter a valid email address.'; return; }
  if (!phone) { errEl.textContent = 'Please enter your mobile number.'; return; }
  if (!packs) { errEl.textContent = 'Please select how many people are joining.'; return; }

  btn.textContent = 'Sending…';
  btn.disabled = true;

  try {
    await addDoc(collection(db, 'registrations'), {
      tripId:    trip.id   || '',
      tripName:  trip.name || 'Unknown Trip',
      name, email, phone,
      packs:     parseInt(packs) || packs,
      submittedAt: serverTimestamp()
    });

    document.getElementById('jf-form-section').style.display = 'none';
    document.getElementById('jf-success').style.display = 'block';
    document.getElementById('jf-success-trip').textContent = trip.name || 'this trip';

    const successWaMsg = `Hi! I just registered for the trip: ${trip.name || 'Ashana Trip'}. My name is ${name}, ${packs} person(s) joining.`;
    document.getElementById('jf-success-wa').href = `https://wa.me/60102046250?text=${encodeURIComponent(successWaMsg)}`;

  } catch(err) {
    console.error('Registration error:', err);
    errEl.textContent = 'Failed to send. Please try WhatsApp below.';
  } finally {
    btn.textContent = 'Send Registration ✦';
    btn.disabled = false;
  }
});

/* ══════════════════════════════════════
   PAST TRIPS MODAL
══════════════════════════════════════ */
let pastTripsLoaded = false;
let allTripsData = [];

function openPastModal() {
  document.getElementById('past-modal').classList.add('open');
  document.body.style.overflow = 'hidden';
  renderPastTrips();
}
function closePastModal() {
  document.getElementById('past-modal').classList.remove('open');
  document.body.style.overflow = '';
}
document.getElementById('view-past-btn').addEventListener('click', openPastModal);
document.getElementById('past-close-btn').addEventListener('click', closePastModal);
document.getElementById('past-backdrop').addEventListener('click', closePastModal);

function isPastTrip(trip) {
  const today = new Date();
  today.setHours(0,0,0,0);
  const dateStr = trip.endDate || trip.date || '';
  if (!dateStr) return false;
  const parsed = new Date(dateStr);
  if (!isNaN(parsed)) return parsed < today;
  const yearMatch = dateStr.match(/20\d\d/);
  if (yearMatch) {
    const year = parseInt(yearMatch[0]);
    if (year < today.getFullYear()) return true;
    if (year > today.getFullYear()) return false;
  }
  return false;
}

function renderPastTrips() {
  const grid = document.getElementById('past-grid');
  const past = allTripsData.filter(t => isPastTrip(t));
  if (!past.length) {
    grid.innerHTML = '<div class="past-empty">No past trips recorded yet.</div>';
    return;
  }
  grid.innerHTML = '';
  past.forEach(trip => {
    const card = document.createElement('div');
    card.className = 'past-card';
    const img = trip.photos?.[0] || trip.photo || '';
    card.innerHTML = `
      ${img ? `<img class="past-card-img" src="${img}" alt="${esc(trip.name)}" loading="lazy"/>` : ''}
      <div class="past-card-body">
        <div class="past-tag">Completed</div>
        <div class="past-card-name">${esc(trip.name)}</div>
        <div class="past-card-meta">📍 ${esc(trip.location || '')} ${trip.date ? '· 📅 ' + esc(trip.date) : ''}</div>
      </div>
    `;
    grid.appendChild(card);
  });
}

/* ══════════════════════════════════════
   FIRESTORE — TRIPS
══════════════════════════════════════ */
function esc(str) { return String(str || '').replace(/</g,'&lt;'); }

function isCurrentOrFuture(trip) { return !isPastTrip(trip); }

onSnapshot(
  query(collection(db, 'trips'), orderBy('createdAt', 'desc')),
  snap => {
    allTripsData = [];
    snap.forEach(docSnap => {
      allTripsData.push({ id: docSnap.id, ...docSnap.data() });
    });

    const rail    = document.getElementById('trips-rail');
    const counter = document.getElementById('trip-count');
    if (!rail) return;
    rail.innerHTML = '';

    const upcoming = allTripsData.filter(isCurrentOrFuture);

    if (!upcoming.length) {
      rail.innerHTML = '<div class="rail-msg" role="status">No upcoming trips — check back soon!</div>';
      if (counter) counter.textContent = '';
      return;
    }

    if (counter) counter.textContent = `1 / ${upcoming.length}`;

    upcoming.forEach((t, i) => {
      const card = document.createElement('div');
      card.className = 'trip-card';
      card.setAttribute('role', 'listitem');
      card.setAttribute('tabindex', '0');

      const photos = (Array.isArray(t.photos) && t.photos.length > 0) ? t.photos : (t.photo ? [t.photo] : []);
      const hasMultiple = photos.length > 1;

      let photoHTML = '';
      if (photos.length > 0) {
        if (hasMultiple) {
          const slidesHTML = photos.map(url =>
            `<div class="tc-slide"><img src="${url}" alt="${esc(t.name)}" loading="lazy" onerror="this.parentElement.style.display='none'"/></div>`
          ).join('');
          const dotsHTML = photos.map((_, idx) =>
            `<div class="tc-dot${idx === 0 ? ' active' : ''}" data-idx="${idx}"></div>`
          ).join('');
          photoHTML = `
            <div class="tc-swiper" data-swiper>
              <div class="tc-slides">${slidesHTML}</div>
              <div class="tc-dots">${dotsHTML}</div>
              <div class="tc-swipe-hint">swipe ›</div>
            </div>`;
        } else {
          photoHTML = `<div class="tc-photo-wrap"><img class="tc-photo" src="${photos[0]}" alt="${esc(t.name)}" loading="lazy" onerror="this.parentElement.style.display='none'"/></div>`;
        }
      }

      card.innerHTML = `
        <div class="tc-glow-bar" aria-hidden="true"></div>
        <div class="tc-shimmer"  aria-hidden="true"></div>
        ${photoHTML}
        <div class="tc-body">
          <span class="tc-tag">Curated Trip</span>
          <h3 class="tc-name">${esc(t.name)}</h3>
          <div class="tc-meta">
            ${t.location  ? `<span>📍 ${esc(t.location)}</span>` : ''}
            ${t.startDate ? `<span>🗓 ${esc(t.startDate)} → ${esc(t.endDate || '')}</span>` : (t.date ? `<span>📅 ${esc(t.date)}</span>` : '')}
          </div>
          <button class="btn-join">View Trip →</button>
        </div>
      `;

      if (hasMultiple) {
        const swiper  = card.querySelector('[data-swiper]');
        const slides  = card.querySelector('.tc-slides');
        const dots    = card.querySelectorAll('.tc-dot');
        const hint    = card.querySelector('.tc-swipe-hint');
        let cur = 0, total = photos.length;
        let startX = 0, isDragging = false, moved = false;

        function goTo(idx) {
          cur = (idx + total) % total;
          slides.style.transform = `translateX(-${cur * 100}%)`;
          dots.forEach((d, i) => d.classList.toggle('active', i === cur));
          if (cur > 0 && hint) { hint.classList.add('hidden'); }
        }

        dots.forEach(d => d.addEventListener('click', e => {
          e.stopPropagation();
          goTo(parseInt(d.dataset.idx));
        }));

        swiper.addEventListener('touchstart', e => { startX = e.touches[0].clientX; isDragging = true; moved = false; }, { passive: true });
        swiper.addEventListener('touchmove',  e => { moved = true; }, { passive: true });
        swiper.addEventListener('touchend',   e => {
          if (!isDragging) return;
          const diff = startX - e.changedTouches[0].clientX;
          if (Math.abs(diff) > 40) { goTo(diff > 0 ? cur + 1 : cur - 1); }
          isDragging = false;
        });

        swiper.addEventListener('mousedown', e => { startX = e.clientX; isDragging = true; moved = false; e.preventDefault(); });
        swiper.addEventListener('mousemove', e => { if (isDragging) moved = true; });
        swiper.addEventListener('mouseup',   e => {
          if (!isDragging) return;
          const diff = startX - e.clientX;
          if (Math.abs(diff) > 40) { goTo(diff > 0 ? cur + 1 : cur - 1); }
          isDragging = false;
        });
        swiper.addEventListener('mouseleave', () => { isDragging = false; });
      }

      function handleTripClick(e) {
        if (e.target.classList.contains('tc-dot')) return;
        const swiper = card.querySelector('[data-swiper]');
        if (swiper && swiper.contains(e.target)) {
          const diff = Math.abs((e._startX || 0) - e.clientX);
          if (diff > 10) return;
        }
        e.preventDefault();
        openTripModal(t);
      }
      card.addEventListener('click', handleTripClick);
      card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openTripModal(t); } });

      rail.appendChild(card);
    });
  },
  err => {
    console.error('[Ashana] Trips error:', err);
    const rail = document.getElementById('trips-rail');
    if (rail) rail.innerHTML = '<div class="rail-msg rail-err" role="alert">⚠ Failed to load trips. Please refresh.</div>';
  }
);

/* ── FIRESTORE — MERCHANTS ── */
onSnapshot(
  collection(db, 'merchants'),
  snap => {
    const grid = document.getElementById('merch-dyn');
    if (!grid) return;
    grid.innerHTML = '';
    snap.forEach((docSnap, i) => {
      const m = docSnap.data();
      const name  = esc(m.name  || '');
      const price = esc(m.price || '');
      const link  = esc(m.link  || '');
      const card = document.createElement('div');
      card.className = 'merch-card reveal';
      card.style.transitionDelay = (i % 3 * 0.12) + 's';
      card.innerHTML = `
        <div class="mc-img">
          <img src="${m.photo || ''}" alt="${name}" loading="lazy" onerror="this.src='https://placehold.co/300x225/20232b/c9952b?text=Item'"/>
        </div>
        <div class="mc-body">
          <div class="mc-name">${name}</div>
          <div class="mc-price">RM ${price}</div>
          <a href="${link || 'javascript:void(0)'}" ${link ? 'target="_blank" rel="noopener noreferrer"' : ''} class="btn-buy">Buy Now</a>
        </div>`;
      if (window.revealObs) window.revealObs.observe(card);
      grid.appendChild(card);
    });
  },
  err => {
    console.error('[Ashana] Merchants error:', err);
    const grid = document.getElementById('merch-dyn');
    if (grid) grid.innerHTML = '<div class="merch-err" role="alert">⚠ Failed to load items. Please refresh.</div>';
  }
);

/* ── FIRESTORE — REVIEWS ── */
onSnapshot(
  collection(db, 'reviews'),
  snap => {
    const grid = document.getElementById('reviews-grid');
    if (!grid) return;
    if (snap.empty) { grid.innerHTML = '<div class="reviews-empty">No reviews yet — be the first to adventure with us!</div>'; return; }
    grid.innerHTML = '';
    snap.forEach((docSnap, i) => {
      const r = docSnap.data();
      const name = esc(r.name || 'Adventurer');
      const message = esc(r.message || '');
      const date = esc(r.date || '');
      const initial = (r.name || 'A').charAt(0).toUpperCase();
      const card = document.createElement('div');
      card.className = 'review-card reveal';
      card.style.transitionDelay = (i % 3 * 0.12) + 's';
      card.setAttribute('role','listitem');
      card.innerHTML = `
        <div class="review-stars">★★★★★</div>
        <p class="review-msg">"${message}"</p>
        <div class="review-author">
          <div class="review-avatar">${initial}</div>
          <div class="review-info">
            <div class="review-name">${name}</div>
            ${date ? `<div class="review-date">${date}</div>` : ''}
          </div>
        </div>`;
      if (window.revealObs) window.revealObs.observe(card);
      grid.appendChild(card);
    });
  },
  err => {
    const grid = document.getElementById('reviews-grid');
    if (grid) grid.innerHTML = '<div class="reviews-empty">⚠ Failed to load reviews. Please refresh.</div>';
  }
);

/* ── FIRESTORE — FAQS ── */
onSnapshot(
  collection(db, 'faqs'),
  snap => {
    const list = document.getElementById('faq-list');
    if (!list) return;
    if (snap.empty) { list.innerHTML = '<div class="faq-empty reveal">FAQs coming soon — stay tuned.</div>'; return; }
    list.innerHTML = '';
    snap.forEach((docSnap, i) => {
      const f = docSnap.data();
      const q = esc(f.question || '');
      const a = esc(f.answer || '').replace(/\n/g, '<br/>');
      const item = document.createElement('div');
      item.className = 'faq-item reveal';
      item.style.transitionDelay = (i * 0.1) + 's';
      item.innerHTML = `
        <div class="faq-q"><span>${q}</span><span class="faq-chevron">▾</span></div>
        <div class="faq-a"><div class="faq-a-inner">${a}</div></div>`;
      if (window.revealObs) window.revealObs.observe(item);
      list.appendChild(item);
    });
  },
  err => {
    const list = document.getElementById('faq-list');
    if (list) list.innerHTML = '<div class="faq-empty reveal">⚠ Failed to load FAQs. Please refresh.</div>';
  }
);

/* ── TSHIRT PRODUCT MODAL ── */

// 1. Create a dictionary mapping the sizes to your new Stripe links
const stripeLinks = {
  'XS': 'https://buy.stripe.com/bJeaEZ4xpf0k9XBfUKebu01',
  'S':  'https://buy.stripe.com/6oU8wR0h9cScglZ9wmebu02',
  'M':  'https://buy.stripe.com/6oU7sN2ph2dy4DhdMCebu03',
  'L':  'https://buy.stripe.com/7sY7sN6Fx4lG0n1aAqebu04',
  'XL': 'https://buy.stripe.com/6oU8wR9RJ19uedR8siebu05',
  'XXL':'https://buy.stripe.com/28E5kF4xp5pKglZ23Uebu06'
};

function openTshirtModal() {
  const modal = document.getElementById('tshirt-product-modal');
  if (!modal) return;
  modal.classList.add('open');
  document.body.style.overflow = 'hidden';
  const firstThumb = document.querySelector('[data-tsm-thumb]');
  tsmSetImg('https://i.ibb.co/20FS6DR1/20260330-085215.jpg', firstThumb);
  document.querySelectorAll('[data-tsm-thumb]').forEach((t,i) => t.classList.toggle('active', i === 0));
  
  // Set default size 'M' to active visually
  document.querySelectorAll('.tsm-size-btn').forEach(b => b.classList.toggle('active', b.textContent.trim() === 'M'));
  
  const buyBtn = document.getElementById('tsm-buy-btn');
  // Set default buy button href to 'M' size Stripe link when modal opens
  if (buyBtn) buyBtn.href = stripeLinks['M'];
}

function closeTshirtModal() {
  const modal = document.getElementById('tshirt-product-modal');
  if (!modal) return;
  modal.classList.remove('open');
  document.body.style.overflow = '';
}

function tsmSetImg(src, thumb) {
  const main = document.getElementById('tsm-main-img');
  if (!main) return;
  main.style.opacity = '0';
  setTimeout(() => { main.src = src; main.style.opacity = '1'; }, 220);
  document.querySelectorAll('[data-tsm-thumb]').forEach(t => t.classList.remove('active'));
  if (thumb) thumb.classList.add('active');
}

function tsmSelectSize(btn) {
  document.querySelectorAll('.tsm-size-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const size = btn.textContent.trim();
  const buyBtn = document.getElementById('tsm-buy-btn');
  
  // Dynamically update the href to the corresponding Stripe link
  if (buyBtn && stripeLinks[size]) {
    buyBtn.href = stripeLinks[size];
  }
}

// Expose tshirt functions globally (used via onclick in HTML)
window.tsmSetImg = tsmSetImg;
window.tsmSelectSize = tsmSelectSize;



// Expose tshirt functions globally (used via onclick in HTML)
window.tsmSetImg = tsmSetImg;
window.tsmSelectSize = tsmSelectSize;

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('tsm-close-btn')?.addEventListener('click', closeTshirtModal);
  document.getElementById('tsm-backdrop')?.addEventListener('click', closeTshirtModal);
  document.getElementById('tshirt-buy-btn')?.addEventListener('click', e => { e.preventDefault(); openTshirtModal(); });
  document.getElementById('ts-overlay-open')?.addEventListener('click', e => { e.preventDefault(); openTshirtModal(); });
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeTshirtModal(); });

/* ── DYNAMIC HERO VIDEO WITH LOCAL CACHING ── */
const dynamicVideoEl = document.getElementById('dynamic-hero-video');
const DEFAULT_VIDEO = 'hero/hero.mp4';

if (dynamicVideoEl) {
  // 1. Instantly load the last known video from cache (prevents blank screen delay)
  const cachedUrl = localStorage.getItem('ashana-hero-video') || DEFAULT_VIDEO;
  dynamicVideoEl.setAttribute('src', cachedUrl);

  // 2. Check Firebase in the background for any live updates
  onSnapshot(
    collection(db, 'settings'),
    snap => {
      let dbVideoUrl = null;
      snap.forEach(docSnap => {
        if (docSnap.data().mainVideoUrl) dbVideoUrl = docSnap.data().mainVideoUrl;
      });

      // If DB has a video, use it. Otherwise fall back to local file.
      const finalUrl = dbVideoUrl || DEFAULT_VIDEO;

      // 3. Only interrupt and reload if the Firebase URL is DIFFERENT than what is currently playing
      if (dynamicVideoEl.getAttribute('src') !== finalUrl) {
        dynamicVideoEl.setAttribute('src', finalUrl);
        dynamicVideoEl.load();
        dynamicVideoEl.play().catch(e => console.warn('Autoplay prevented by browser:', e));
        
        // Save the new video to cache for next time
        localStorage.setItem('ashana-hero-video', finalUrl);
      }
    },
    err => {
      console.error('[Ashana] Settings/Video error:', err);
    }
  );
}


/* ── LIGHT / DARK MODE TOGGLE ── */
(function() {
  const ROOT    = document.documentElement;
  const STORAGE = 'ashana-theme';
  const BTN_NAV = document.getElementById('tn-theme-toggle');
  const BTN_MOB = document.getElementById('theme-toggle-float');

  function setTheme(theme) {
    ROOT.setAttribute('data-theme', theme);
    localStorage.setItem(STORAGE, theme);
    const icon = theme === 'light' ? '🌙' : '☀️';
    if (BTN_NAV) BTN_NAV.textContent = icon;
    if (BTN_MOB) BTN_MOB.textContent = icon;
  }

  function toggleTheme() {
    const current = ROOT.getAttribute('data-theme') || 'dark';
    setTheme(current === 'light' ? 'dark' : 'light');
  }

  // Init from localStorage
  const saved = localStorage.getItem(STORAGE);
  if (saved) setTheme(saved);

  if (BTN_NAV) BTN_NAV.addEventListener('click', toggleTheme);
  if (BTN_MOB) BTN_MOB.addEventListener('click', toggleTheme);
})();
