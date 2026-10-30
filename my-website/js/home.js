
/* =========================================
   MOVIEFLIXHD - COMPLETE HOME JAVASCRIPT
   TMDB + MULTI-SERVER PLAYER
========================================= */


/* =========================================
   1. TMDB API CONFIGURATION
========================================= */

(function () {
  const encodedKey =
    "MWJkMjhkZWU5NTMzYTBiMWVkMjkyNTQ5ZDgyNmY4OGI=";

  window.API_KEY = atob(
    encodedKey.split("").reverse().join("")
  );
})();

const BASE = "https://api.themoviedb.org/3";
const IMG = "https://image.tmdb.org/t/p/w500";
const BACKDROP = "https://image.tmdb.org/t/p/original";


/* =========================================
   2. PLAYER SERVER CONFIGURATION
========================================= */

/*
  Ilagay dito ang authorized embed URLs
  mula sa video provider na ginagamit mo.

  Huwag maglagay ng random embed domains.
  Kailangan suportado ng provider ang content.
*/

const MOVIE_SOURCES = [
  {
    name: "Server 1",

    movie: (id) => "",

    tv: (id, season, episode) => ""
  },

  {
    name: "Server 2",

    movie: (id) => "",

    tv: (id, season, episode) => ""
  },

  {
    name: "Server 3",

    movie: (id) => "",

    tv: (id, season, episode) => ""
  }
];


/* =========================================
   3. GLOBAL VARIABLES
========================================= */

let currentItem = null;
let bannerItem = null;
let currentServer = 0;

let searchTimeout = null;
let searchRequest = 0;


/* =========================================
   4. FETCH FUNCTION
========================================= */

async function fetchJSON(url) {
  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error("API request failed");
    }

    return await response.json();

  } catch (error) {
    console.error("Fetch error:", error);
    return null;
  }
}


/* =========================================
   5. TMDB CATEGORY FUNCTIONS
========================================= */

async function fetchMovies() {
  const data = await fetchJSON(
    `${BASE}/trending/movie/week?api_key=${API_KEY}`
  );

  return data?.results || [];
}


async function fetchTV() {
  const data = await fetchJSON(
    `${BASE}/trending/tv/week?api_key=${API_KEY}`
  );

  return (data?.results || []).filter(item =>
    !(item.genre_ids || []).includes(16)
  );
}


async function fetchAnime() {
  const data = await fetchJSON(
    `${BASE}/trending/tv/week?api_key=${API_KEY}`
  );

  return (data?.results || []).filter(item =>
    (item.genre_ids || []).includes(16)
  );
}


/* =========================================
   6. BANNER
========================================= */

function displayBanner(item) {

  if (!item) return;

  const banner = document.getElementById("banner");

  const title = document.getElementById("banner-title");

  const description =
    document.getElementById("banner-desc");

  if (!banner || !title || !description) return;

  banner.style.backgroundImage =
    item.backdrop_path
      ? `url("${BACKDROP}${item.backdrop_path}")`
      : "none";

  title.textContent = item.title || item.name || "";

  description.textContent =
    item.overview || "Discover trending movies and shows.";

  bannerItem = {
    ...item,
    media_type: item.media_type || "movie"
  };
}


function openFromBanner() {
  if (bannerItem) {
    showDetails(bannerItem);
  }
}


/* =========================================
   7. DISPLAY MOVIE LIST
========================================= */

function displayList(items, elementId) {

  const container = document.getElementById(elementId);

  if (!container) return;

  container.innerHTML = "";

  items.slice(0, 18).forEach(item => {

    if (!item.poster_path) return;

    const card = document.createElement("div");

    card.className = "movie-card";

    const img = document.createElement("img");

    img.src = IMG + item.poster_path;
    img.alt = item.title || item.name || "Movie poster";
    img.loading = "lazy";

    img.onclick = () => showDetails({
      ...item,
      media_type:
        item.media_type ||
        (item.title ? "movie" : "tv")
    });

    card.appendChild(img);

    container.appendChild(card);
  });
}


/* =========================================
   8. PLAYER FUNCTIONS
========================================= */

function getMediaType(item) {

  if (item.media_type) {
    return item.media_type;
  }

  return item.title ? "movie" : "tv";
}


function showDetails(item) {

  currentItem = item;
  currentServer = 0;

  const modal = document.getElementById("modal");

  const title = document.getElementById("modal-title");

  const description =
    document.getElementById("modal-description");

  if (!modal) return;

  modal.style.display = "flex";

  if (title) {
    title.textContent = item.title || item.name || "";
  }

  if (description) {
    description.textContent =
      item.overview || "No description available.";
  }

  loadMovieServer();
}


/* =========================================
   9. LOAD SELECTED SERVER
========================================= */

function loadMovieServer() {

  const container =
    document.querySelector(".video-container");

  if (!container || !currentItem) return;

  container.innerHTML = "";

  const mediaType = getMediaType(currentItem);

  const source = MOVIE_SOURCES[currentServer];

  if (!source) {

    container.innerHTML = `
      <div class="player-message">
        <h3>No more servers available</h3>
        <p>Please try again later.</p>
      </div>
    `;

    updateServerName("No server");
    return;
  }

  let url = "";

  if (mediaType === "movie") {

    url = source.movie(currentItem.id);

  } else if (mediaType === "tv") {

    url = source.tv(currentItem.id, 1, 1);

  } else {

    container.innerHTML = `
      <div class="player-message">
        <h3>Unsupported media type</h3>
      </div>
    `;

    return;
  }

  if (!url) {

    container.innerHTML = `
      <div class="player-message">
        <h3>${source.name} is not configured</h3>
        <p>Add an authorized embed URL in home.js.</p>
      </div>
    `;

    updateServerName(source.name);
    return;
  }

  // Only allow HTTPS embed URLs.
  try {

    const parsedURL = new URL(url);

    if (parsedURL.protocol !== "https:") {
      throw new Error("HTTPS required");
    }

  } catch (error) {

    container.innerHTML = `
      <div class="player-message">
        <h3>Invalid embed URL</h3>
      </div>
    `;

    return;
  }

  const iframe = document.createElement("iframe");

  iframe.src = url;
  iframe.title = "MovieFlixHD Video Player";

  iframe.allow =
    "autoplay; fullscreen; picture-in-picture";

  iframe.allowFullscreen = true;

  iframe.referrerPolicy =
    "strict-origin-when-cross-origin";

  container.appendChild(iframe);

  updateServerName(source.name);
}


/* =========================================
   10. SERVER NAME
========================================= */

function updateServerName(name) {

  const element =
    document.getElementById("server-name");

  if (element) {
    element.textContent = name;
  }
}


/* =========================================
   11. NEXT SERVER
========================================= */

function nextServer() {

  if (!currentItem) return;

  if (currentServer >= MOVIE_SOURCES.length - 1) {

    alert("No more servers available.");

    return;
  }

  currentServer++;

  loadMovieServer();
}


/* =========================================
   12. CLOSE MODAL
========================================= */

function closeModal() {

  const modal = document.getElementById("modal");

  const container =
    document.querySelector(".video-container");

  if (modal) {
    modal.style.display = "none";
  }

  if (container) {
    container.innerHTML = "";
  }

  currentItem = null;
  currentServer = 0;
}


/* =========================================
   13. MODAL BACKDROP CLICK
========================================= */

document.addEventListener("click", function(event) {

  const modal = document.getElementById("modal");

  if (modal && event.target === modal) {
    closeModal();
  }

});


/* =========================================
   14. ESCAPE KEY
========================================= */

document.addEventListener("keydown", function(event) {

  if (event.key === "Escape") {
    closeModal();
  }

});


/* =========================================
   15. SEARCH TMDB
========================================= */

async function searchTMDB(query) {

  clearTimeout(searchTimeout);

  const section =
    document.getElementById("search-section");

  const results =
    document.getElementById("search-results");

  if (!section || !results) return;

  if (!query.trim()) {

    section.hidden = true;
    results.innerHTML = "";

    return;
  }

  searchTimeout = setTimeout(async () => {

    const requestId = ++searchRequest;

    const url = new URL(`${BASE}/search/multi`);

    url.searchParams.set("api_key", API_KEY);
    url.searchParams.set("query", query.trim());

    const data = await fetchJSON(url.toString());

    if (requestId !== searchRequest) return;

    section.hidden = false;
    results.innerHTML = "";

    const items = (data?.results || []).filter(item =>
      item.poster_path &&
      ["movie", "tv"].includes(item.media_type)
    );

    if (!items.length) {

      results.innerHTML =
        "<p>No results found.</p>";

      return;
    }

    items.forEach(item => {

      const img = document.createElement("img");

      img.src = IMG + item.poster_path;
      img.alt = item.title || item.name || "Movie";
      img.loading = "lazy";

      img.onclick = () => showDetails(item);

      results.appendChild(img);

    });

  }, 400);
}


/* =========================================
   16. INITIALIZE WEBSITE
========================================= */

async function init() {

  console.log("MovieFlixHD initializing...");

  const [
    movies,
    tvShows,
    anime
  ] = await Promise.all([
    fetchMovies(),
    fetchTV(),
    fetchAnime()
  ]);

  if (movies.length) {
    displayBanner(movies[0]);
  }

  displayList(movies, "movies-list");

  displayList(tvShows, "tvshows-list");

  displayList(anime, "anime-list");

  console.log("MovieFlixHD loaded successfully.");
}


/* =========================================
   17. START WEBSITE
========================================= */

document.addEventListener("DOMContentLoaded", init);
