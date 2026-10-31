/* MovieFlixHD — TMDB-powered collections, search and 3-server player. */

const encodedKey = "MWJkMjhkZWU5NTMzYTBiMWVkMjkyNTQ5ZDgyNmY4OGI=";
const TMDB_BASE = "https://api.themoviedb.org/3";
const TMDB_IMAGE = "https://image.tmdb.org/t/p/w500";
const TMDB_BACKDROP = "https://image.tmdb.org/t/p/original";
const NO_POSTER = "https://placehold.co/500x750/151820/ffffff?text=No+Poster";

// Retained from your previous JS. Use these only for content you are authorized to stream.
const VIDEO_SERVERS = [
  {
    movie: id => `https://vidsrc.sh/embed/movie/${id}`,
    tv: (id, season, episode) =>
      `https://vidsrc.sh/embed/tv/${id}/${season}/${episode}`
  },
  {
    movie: id => `https://embed.vidrift.net/embed/movie/${id}`,
    tv: (id, season, episode) =>
      `https://embed.vidrift.net/embed/tv/${id}/${season}/${episode}`
  },
  {
    movie: id => `https://embedwave.cc/embed/movie/${id}`,
    tv: (id, season, episode) =>
      `https://embedwave.cc/embed/tv/${id}/${season}/${episode}`
  }
];

const $ = id => document.getElementById(id);

const modal = $('playerModal');

let currentItem = null;
let activeServer = 1;
let searchTimer = null;
let searchSequence = 0;


// TMDB API REQUEST
async function tmdb(path, params = {}) {
  if (!TMDB_API_KEY || TMDB_API_KEY.includes('PASTE_YOUR')) {
    throw new Error('Add your TMDB API key in the TMDB_API_KEY setting.');
  }

  const url = new URL(`${TMDB_BASE}${path}`);

  url.searchParams.set('api_key', TMDB_API_KEY);
  url.searchParams.set('language', 'en-US');

  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`TMDB request failed (${response.status}).`);
  }

  return response.json();
}


// MOVIE INFORMATION
function titleOf(item) {
  return item.title || item.name || 'Untitled';
}

function yearOf(item) {
  return (
    item.release_date ||
    item.first_air_date ||
    ''
  ).slice(0, 4) || 'N/A';
}

function ratingOf(item) {
  const rating = Number(item.vote_average);

  return Number.isFinite(rating) && rating > 0
    ? rating.toFixed(1)
    : 'N/A';
}

function mediaTypeOf(item) {
  return item.media_type || (item.title ? 'movie' : 'tv');
}

function posterUrl(item) {
  return item.poster_path
    ? `${TMDB_IMAGE}${item.poster_path}`
    : NO_POSTER;
}


// CREATE MOVIE CARD
function createCard(item, tag = 'TRENDING') {
  const card = document.createElement('article');

  card.className = 'movie';
  card.tabIndex = 0;
  card.setAttribute('role', 'button');
  card.dataset.search = titleOf(item).toLowerCase();

  const poster = document.createElement('div');

  poster.className = 'poster';

  poster.style.backgroundImage =
    `linear-gradient(0deg,rgba(0,0,0,.78),transparent 65%),url("${posterUrl(item)}")`;

  poster.style.backgroundSize = 'cover';
  poster.style.backgroundPosition = 'center';

  const tagEl = document.createElement('span');

  tagEl.className = 'poster-tag';
  tagEl.textContent = tag;

  const posterTitle = document.createElement('span');

  posterTitle.className = 'poster-title';
  posterTitle.textContent = titleOf(item);

  poster.append(tagEl, posterTitle);

  const info = document.createElement('div');

  info.className = 'movie-info';

  const heading = document.createElement('h3');

  heading.textContent = titleOf(item);

  const meta = document.createElement('p');

  const date = document.createElement('span');

  date.textContent =
    `${yearOf(item)} · ${mediaTypeOf(item) === 'movie' ? 'Movie' : 'TV'}`;

  const rating = document.createElement('b');

  rating.textContent = `★ ${ratingOf(item)}`;

  meta.append(date, rating);
  info.append(heading, meta);
  card.append(poster, info);

  const open = () => openPlayer(item);

  card.addEventListener('click', open);

  card.addEventListener('keydown', event => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      open();
    }
  });

  return card;
}


// DISPLAY MOVIE LIST
function renderList(elementId, items, tag) {
  const grid = $(elementId);

  if (!grid) return;

  grid.replaceChildren();

  if (!items.length) {
    const message = document.createElement('p');

    message.textContent = 'No titles are available right now.';

    grid.appendChild(message);

    return;
  }

  items.slice(0, 18).forEach(item => {
    grid.appendChild(createCard(item, tag));
  });
}


// OPEN PLAYER MODAL
function openPlayer(item) {
  currentItem = item;
  activeServer = 1;

  $('playerTitle').textContent = titleOf(item);
  $('modalTitle').textContent = titleOf(item);

  $('modalDesc').textContent =
    item.overview || 'No description is available for this title.';

  $('modalTag').textContent =
    `${mediaTypeOf(item) === 'movie' ? 'MOVIE' : 'TV SHOW'} DETAILS`;

  $('videoContainer').replaceChildren();
  $('videoContainer').hidden = true;

  $('playerControls').hidden = true;
  $('watchNow').hidden = false;

  setServer(1);

  modal.classList.add('open');
}


// SERVER SELECTION
function setServer(number) {
  activeServer = number;

  $('serverName').textContent = `Server ${number}`;

  document.querySelectorAll('.server-btn').forEach(button => {
    const selected = Number(button.dataset.server) === number;

    button.classList.toggle('active', selected);

    button.setAttribute('aria-pressed', String(selected));
  });

  if (!$('playerControls').hidden && currentItem) {
    loadSelectedServer();
  }
}


// LOAD SELECTED SERVER
function loadSelectedServer() {
  const container = $('videoContainer');

  container.replaceChildren();

  if (!currentItem) return;

  const type = mediaTypeOf(currentItem);

  const source = VIDEO_SERVERS[activeServer - 1];

  if (
    !source ||
    !currentItem.id ||
    !['movie', 'tv'].includes(type)
  ) {
    const message = document.createElement('p');

    message.textContent =
      'This title cannot be loaded from the selected server.';

    container.appendChild(message);

    return;
  }

  const url = type === 'movie'
    ? source.movie(currentItem.id)
    : source.tv(currentItem.id, 1, 1);

  const frame = document.createElement('iframe');

  frame.src = url;
  frame.title = `${titleOf(currentItem)} video player`;
  frame.loading = 'lazy';
  frame.allow = 'autoplay; fullscreen; picture-in-picture';
  frame.allowFullscreen = true;
  frame.referrerPolicy = 'strict-origin-when-cross-origin';

  container.appendChild(frame);
}


// CLOSE PLAYER
function closePlayer() {
  modal.classList.remove('open');

  $('videoContainer').replaceChildren();

  currentItem = null;
}


// LOAD HOMEPAGE COLLECTIONS
async function loadHome() {
  ['movieGrid', 'showGrid', 'animeGrid'].forEach(id => {
    const grid = $(id);

    if (grid) {
      grid.innerHTML = '<p>Loading titles…</p>';
    }
  });

  try {
    const [movies, shows, anime] = await Promise.all([
      tmdb('/trending/movie/week'),

      tmdb('/trending/tv/week'),

      tmdb('/discover/tv', {
        with_genres: '16',
        sort_by: 'popularity.desc'
      })
    ]);

    const movieItems = (movies.results || []).map(item => ({
      ...item,
      media_type: 'movie'
    }));

    const showItems = (shows.results || [])
      .filter(item => !(item.genre_ids || []).includes(16))
      .map(item => ({
        ...item,
        media_type: 'tv'
      }));

    const animeItems = (anime.results || []).map(item => ({
      ...item,
      media_type: 'tv'
    }));

    renderList('movieGrid', movieItems, 'MOVIE');

    renderList('showGrid', showItems, 'SERIES');

    renderList('animeGrid', animeItems, 'ANIME');


    // FEATURED MOVIE
    const featured = movieItems[0] || showItems[0];

    if (featured) {
      const heroTitle = document.querySelector('.hero h1');

      const heroDesc = document.querySelector('.hero-content > p');

      const heroMeta = document.querySelector('.hero-meta');

      if (heroTitle) {
        heroTitle.textContent = titleOf(featured);
      }

      if (heroDesc) {
        heroDesc.textContent =
          featured.overview ||
          'Explore trending movies and series on MovieFlixHD.';
      }

      if (heroMeta) {
        heroMeta.innerHTML = `
          <span>${yearOf(featured)}</span>
          <span>•</span>
          <span class="rating">★ ${ratingOf(featured)}</span>
          <span>•</span>
          <span class="quality">TRENDING</span>
        `;
      }

      if (featured.backdrop_path) {
        document.querySelector('.hero').style.backgroundImage =
          `linear-gradient(90deg,rgba(4,4,16,.94),rgba(4,4,16,.28)),url("${TMDB_BACKDROP}${featured.backdrop_path}")`;
      }

      $('heroPlay').onclick = () => openPlayer(featured);
    }

  } catch (error) {
    console.error('MovieFlixHD:', error);

    ['movieGrid', 'showGrid', 'animeGrid'].forEach(id => {
      const grid = $(id);

      if (grid) {
        grid.innerHTML =
          '<p>Unable to load titles. Check your TMDB API key and try again.</p>';
      }
    });
  }
}


// SEARCH MOVIES AND SHOWS
async function searchTMDB(query) {
  const sequence = ++searchSequence;

  try {
    const data = await tmdb('/search/multi', {
      query,
      include_adult: 'false'
    });

    if (sequence !== searchSequence) return;

    const results = (data.results || []).filter(item =>
      ['movie', 'tv'].includes(item.media_type)
    );

    const heading = document.querySelector('#movies h2');

    if (heading) {
      heading.textContent = `Search results for “${query}”`;
    }

    renderList('movieGrid', results, 'SEARCH');

    $('movies').scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });

  } catch (error) {
    console.error('Search failed:', error);
  }
}


// WATCH NOW BUTTON
$('watchNow').addEventListener('click', () => {
  $('videoContainer').hidden = false;

  $('playerControls').hidden = false;

  $('watchNow').hidden = true;

  $('modalTag').textContent = 'NOW PLAYING';

  loadSelectedServer();
});


// SERVER BUTTONS
document.querySelectorAll('.server-btn').forEach(button => {
  button.addEventListener('click', () => {
    setServer(Number(button.dataset.server));
  });
});


// NEXT SERVER BUTTON
$('nextServer').addEventListener('click', () => {
  setServer(activeServer % VIDEO_SERVERS.length + 1);
});


// CLOSE BUTTON
$('closeModal').addEventListener('click', closePlayer);


// CLICK OUTSIDE MODAL
modal.addEventListener('click', event => {
  if (event.target === modal) {
    closePlayer();
  }
});


// ESC KEY
document.addEventListener('keydown', event => {
  if (event.key === 'Escape') {
    closePlayer();
  }
});


// SEARCH INPUT
$('search').addEventListener('input', event => {
  const query = event.target.value.trim();

  clearTimeout(searchTimer);

  if (!query) {
    searchSequence++;

    const heading = document.querySelector('#movies h2');

    if (heading) {
      heading.textContent = 'Trending Movies';
    }

    loadHome();

    return;
  }

  searchTimer = setTimeout(() => {
    searchTMDB(query);
  }, 450);
});


// INITIALIZE WEBSITE
loadHome();
