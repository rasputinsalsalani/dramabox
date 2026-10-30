/* =========================================
   MOVIEFLIXHD - COMPLETE HOME JAVASCRIPT
   TMDB API + POSTER FIX + 3 SERVER PLAYER
========================================= */


/* =========================================
   1. TMDB API CONFIGURATION
========================================= */

(function () {
  const encodedKey =
    "MWJkMjhkZWU5NTMzYTBiMWVkMjkyNTQ5ZDgyNmY4OGI=";

  window.API_KEY = atob(encodedKey);
})();

const BASE = "https://api.themoviedb.org/3";
const IMG = "https://image.tmdb.org/t/p/w500";
const BACKDROP = "https://image.tmdb.org/t/p/original";

const PLACEHOLDER =
  "https://placehold.co/500x750/151820/d8b66a?text=No+Poster";

const POSTER_ERROR =
  "https://placehold.co/500x750/151820/d8b66a?text=Poster+Unavailable";


/* =========================================
   2. PLAYER SERVER CONFIGURATION
========================================= */

const MOVIE_SOURCES = [
  {
    name: "VidSrc",

    movie: (id) =>
      `https://vidsrc.sh/embed/movie/${id}`,

    tv: (id, season, episode) =>
      `https://vidsrc.sh/embed/tv/${id}/${season}/${episode}`
  },

  {
    name: "VidRift",

    movie: (id) =>
      `https://embed.vidrift.net/embed/movie/${id}`,

    tv: (id, season, episode) =>
      `https://embed.vidrift.net/embed/tv/${id}/${season}/${episode}`
  },

  {
    name: "EmbedWave",

    movie: (id) =>
      `https://embedwave.cc/embed/movie/${id}`,

    tv: (id, season, episode) =>
      `https://embedwave.cc/embed/tv/${id}/${season}/${episode}`
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
   4. TMDB API REQUEST
========================================= */

async function fetchJSON(url) {
  try {
    const response = await fetch(url);

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);

      console.error(
        "TMDB API Error:",
        response.status,
        errorData
      );

      return null;
    }

    return await response.json();

  } catch (error) {
    console.error("Network error:", error);
    return null;
  }
}


function createTMDBUrl(endpoint, params = {}) {
  const url = new URL(`${BASE}${endpoint}`);

  url.searchParams.set("api_key", window.API_KEY);

  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  return url.toString();
}


/* =========================================
   5. FETCH MOVIES, TV AND ANIME
========================================= */

async function fetchMovies() {
  const data = await fetchJSON(
    createTMDBUrl("/trending/movie/week")
  );

  return data?.results || [];
}


async function fetchTV() {
  const data = await fetchJSON(
    createTMDBUrl("/trending/tv/week")
  );

  return (data?.results || []).filter(item =>
    !(item.genre_ids || []).includes(16)
  );
}


async function fetchAnime() {
  const data = await fetchJSON(
    createTMDBUrl("/trending/tv/week")
  );

  return (data?.results || []).filter(item =>
    (item.genre_ids || []).includes(16)
  );
}


/* =========================================
   6. POSTER IMAGE HANDLER
========================================= */

function setPosterImage(img, posterPath) {
  img.alt = "Movie poster";
  img.loading = "lazy";
  img.decoding = "async";

  img.onerror = function () {
    this.onerror = null;
    this.src = POSTER_ERROR;
  };

  img.src = posterPath
    ? `${IMG}${posterPath}`
    : PLACEHOLDER;
}


/* =========================================
   7. FEATURED BANNER
========================================= */

function displayBanner(item) {
  if (!item) return;

  const banner = document.getElementById("banner");
  const title = document.getElementById("banner-title");
  const description = document.getElementById("banner-desc");

  if (!banner || !title || !description) return;

  if (item.backdrop_path) {
    banner.style.backgroundImage =
      `url("${BACKDROP}${item.backdrop_path}")`;
  } else {
    banner.style.backgroundImage = "none";
  }

  title.textContent = item.title || item.name || "Featured";

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
   8. DISPLAY MOVIE POSTERS
========================================= */

function displayList(items, elementId) {
  const container = document.getElementById(elementId);

  if (!container) return;

  container.innerHTML = "";

  if (!items || !items.length) {
    container.innerHTML =
      '<p class="player-message">No movies available right now.</p>';
    return;
  }

  items.slice(0, 18).forEach(item => {
    const card = document.createElement("div");
    card.className = "movie-card";

    const img = document.createElement("img");

    img.alt = item.title || item.name || "Movie poster";

    setPosterImage(img, item.poster_path);

    img.onclick = () => {
      showDetails({
        ...item,
        media_type:
          item.media_type ||
          (item.title ? "movie" : "tv")
      });
    };

    card.appendChild(img);
    container.appendChild(card);
  });
}


/* =========================================
   9. MEDIA TYPE
========================================= */

function getMediaType(item) {
  if (item.media_type) {
    return item.media_type;
  }

  return item.title ? "movie" : "tv";
}


/* =========================================
   10. SHOW MOVIE DETAILS
========================================= */

function showDetails(item) {
  if (!item) return;

  currentItem = item;
  currentServer = 0;

  const modal = document.getElementById("modal");
  const title = document.getElementById("modal-title");
  const description = document.getElementById("modal-description");
  const heading = document.getElementById("player-heading-title");

  if (!modal) return;

  const itemTitle = item.title || item.name || "Untitled";

  modal.style.display = "flex";

  if (title) {
    title.textContent = itemTitle;
  }

  if (description) {
    description.textContent =
      item.overview || "No description available.";
  }

  if (heading) {
    heading.textContent = itemTitle;
  }

  updateServerName();
  loadMovieServer();
}


/* =========================================
   11. LOAD SELECTED SERVER
========================================= */

function loadMovieServer() {
  const container = document.querySelector(".video-container");

  if (!container || !currentItem) return;

  container.innerHTML = "";

  const mediaType = getMediaType(currentItem);
  const source = MOVIE_SOURCES[currentServer];

  if (!source) {
    showPlayerMessage(
      "Server unavailable",
      "Please select another server."
    );

    updateServerName("Unavailable");
    return;
  }

  let url = "";

  try {
    if (mediaType === "movie") {
      url = source.movie(currentItem.id);

    } else if (mediaType === "tv") {
      url = source.tv(currentItem.id, 1, 1);

    } else {
      showPlayerMessage(
        "Unsupported media type",
        "This content type is not supported."
      );

      updateServerName(source.name);
      return;
    }

  } catch (error) {
    console.error("Server URL error:", error);

    showPlayerMessage(
      "Unable to load server",
      "There was a problem preparing this video source."
    );

    updateServerName(source.name);
    return;
  }

  if (!url || typeof url !== "string") {
    showPlayerMessage(
      `${source.name} is not configured`,
      "This server is not yet connected."
    );

    updateServerName(source.name);
    return;
  }

  let parsedURL;

  try {
    parsedURL = new URL(url);

    if (parsedURL.protocol !== "https:") {
      throw new Error("HTTPS required");
    }

  } catch (error) {
    showPlayerMessage(
      "Invalid embed URL",
      "Please check your configured server URL."
    );

    updateServerName(source.name);
    return;
  }

  const iframe = document.createElement("iframe");

  iframe.src = parsedURL.href;
  iframe.title = "MovieFlixHD Video Player";
  iframe.allow = "autoplay; fullscreen; picture-in-picture";
  iframe.allowFullscreen = true;
  iframe.referrerPolicy = "strict-origin-when-cross-origin";

  container.appendChild(iframe);

  updateServerName(source.name);
}


/* =========================================
   12. PLAYER MESSAGE
========================================= */

function showPlayerMessage(title, message) {
  const container = document.querySelector(".video-container");

  if (!container) return;

  container.innerHTML = "";

  const wrapper = document.createElement("div");
  wrapper.className = "player-message";

  const heading = document.createElement("h3");
  heading.textContent = title;

  const paragraph = document.createElement("p");
  paragraph.textContent = message;

  wrapper.appendChild(heading);
  wrapper.appendChild(paragraph);

  container.appendChild(wrapper);
}


/* =========================================
   13. UPDATE SERVER NAME AND BUTTONS
========================================= */

function updateServerName(name) {
  const source = MOVIE_SOURCES[currentServer];

  const serverName = document.getElementById("server-name");

  if (serverName) {
    serverName.textContent =
      name || source?.name || "Unavailable";
  }

  document.querySelectorAll(".server-btn").forEach(button => {
    const buttonIndex = Number(button.dataset.server);
    const isActive = buttonIndex === currentServer;

    button.classList.toggle("active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
}


/* =========================================
   14. SELECT SERVER
========================================= */

function selectServer(index) {
  if (!Number.isInteger(index)) return;

  if (index < 0 || index >= MOVIE_SOURCES.length) {
    return;
  }

  currentServer = index;

  updateServerName();

  if (currentItem) {
    loadMovieServer();
  }
}


/* =========================================
   15. NEXT SERVER
========================================= */

function nextServer() {
  if (!currentItem) return;

  if (!MOVIE_SOURCES.length) return;

  currentServer =
    (currentServer + 1) % MOVIE_SOURCES.length;

  updateServerName();
  loadMovieServer();
}


/* =========================================
   16. CLOSE MODAL
========================================= */

function closeModal() {
  const modal = document.getElementById("modal");
  const container = document.querySelector(".video-container");

  if (modal) {
    modal.style.display = "none";
  }

  if (container) {
    container.innerHTML = "";
  }

  currentItem = null;
  currentServer = 0;

  updateServerName();
}


/* =========================================
   17. MODAL BACKDROP CLICK
========================================= */

document.addEventListener("click", function (event) {
  const modal = document.getElementById("modal");

  if (modal && event.target === modal) {
    closeModal();
  }
});


/* =========================================
   18. ESCAPE KEY
========================================= */

document.addEventListener("keydown", function (event) {
  if (event.key === "Escape") {
    closeModal();
  }
});


/* =========================================
   19. SEARCH MOVIES AND TV
========================================= */

async function searchTMDB(query) {
  clearTimeout(searchTimeout);

  const section = document.getElementById("search-section");
  const results = document.getElementById("search-results");

  if (!section || !results) return;

  const searchTerm = query.trim();

  if (!searchTerm) {
    searchRequest++;
    section.hidden = true;
    results.innerHTML = "";
    return;
  }

  searchTimeout = setTimeout(async () => {
    const requestId = ++searchRequest;

    const data = await fetchJSON(
      createTMDBUrl("/search/multi", {
        query: searchTerm,
        include_adult: "false"
      })
    );

    if (requestId !== searchRequest) return;

    section.hidden = false;
    results.innerHTML = "";

    const items = (data?.results || []).filter(item =>
      ["movie", "tv"].includes(item.media_type)
    );

    if (!items.length) {
      results.innerHTML = "<p>No results found.</p>";
      return;
    }

    items.forEach(item => {
      const img = document.createElement("img");

      img.alt = item.title || item.name || "Movie poster";

      setPosterImage(img, item.poster_path);

      img.onclick = () => showDetails(item);

      results.appendChild(img);
    });

  }, 400);
}


/* =========================================
   20. INITIALIZE WEBSITE
========================================= */

async function init() {
  console.log("MovieFlixHD initializing...");

  const movieContainer = document.getElementById("movies-list");
  const tvContainer = document.getElementById("tvshows-list");
  const animeContainer = document.getElementById("anime-list");

  if (movieContainer) {
    movieContainer.innerHTML = "<p>Loading movies...</p>";
  }

  if (tvContainer) {
    tvContainer.innerHTML = "<p>Loading TV shows...</p>";
  }

  if (animeContainer) {
    animeContainer.innerHTML = "<p>Loading anime...</p>";
  }

  const [movies, tvShows, anime] = await Promise.all([
    fetchMovies(),
    fetchTV(),
    fetchAnime()
  ]);

  if (movies.length > 0) {
    displayBanner(movies[0]);
  }

  displayList(movies, "movies-list");
  displayList(tvShows, "tvshows-list");
  displayList(anime, "anime-list");

  console.log("MovieFlixHD loaded.");
  console.log("Movies:", movies.length);
  console.log("TV Shows:", tvShows.length);
  console.log("Anime:", anime.length);
}


/* =========================================
   21. START WEBSITE
========================================= */

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
