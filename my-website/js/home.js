
/* =========================================
   MOVIEFLIXHD — COMPLETE HOME JAVASCRIPT
   TMDB + PREMIUM FEATURED + PLAY NOW
   AD REDIRECT + 3 SERVER PLAYER
========================================= */

/* 1. TMDB API CONFIGURATION */

(function () {
  const encodedKey =
    "MWJkMjhkZWU5NTMzYTBiMWVkMjkyNTQ5ZDgyNmY4OGI=";

  window.API_KEY = atob(encodedKey);
})();

const BASE = "https://api.themoviedb.org/3";
const IMG = "https://image.tmdb.org/t/p/w500";
const BACKDROP = "https://image.tmdb.org/t/p/original";

const PLACEHOLDER =
  "https://placehold.co/500x750/151820/ffffff?text=No+Poster";

const POSTER_ERROR =
  "https://placehold.co/500x750/151820/ffffff?text=Poster+Unavailable";

/* 2. AD REDIRECT SETTINGS */

// Palitan ito kapag mayroon ka nang advertising URL.
const AD_REDIRECT_URL = "PLACE YOUR ADS HERE";

/* 3. PLAYER SERVER CONFIGURATION */

const MOVIE_SOURCES = [
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

/* 4. GLOBAL VARIABLES */

let currentItem = null;
let bannerItem = null;
let currentServer = 0;

let playerUnlocked = false;
let searchTimeout = null;
let searchRequest = 0;

/* 5. TMDB API REQUEST */

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

/* 6. FETCH MOVIES, TV AND ANIME */

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

/* 7. POSTER IMAGE HANDLER */

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

/* 8. MOVIE METADATA */

function getItemYear(item) {
  const date = item.release_date || item.first_air_date || "";

  return date ? date.substring(0, 4) : "N/A";
}

function getItemRating(item) {
  const rating = Number(item.vote_average);

  return Number.isFinite(rating) && rating > 0
    ? rating.toFixed(1)
    : "N/A";
}

function getShortOverview(text, maxLength = 145) {
  if (!text) {
    return "Discover trending movies and shows on MovieFlixHD.";
  }

  const cleanText = text.trim().replace(/\s+/g, " ");

  if (cleanText.length <= maxLength) {
    return cleanText;
  }

  const shortened = cleanText.substring(0, maxLength);
  const lastSpace = shortened.lastIndexOf(" ");

  return shortened.substring(
    0,
    lastSpace > 90 ? lastSpace : maxLength
  ).trimEnd() + "...";
}

/* 9. FEATURED MOVIE BANNER */

function displayBanner(item) {
  if (!item) return;

  const banner = document.getElementById("banner");
  const title = document.getElementById("banner-title");
  const description = document.getElementById("banner-desc");
  const meta = document.getElementById("banner-meta");

  if (!banner || !title || !description) return;

  // Use the movie backdrop as the full banner background.
  if (item.backdrop_path) {
    const backdropURL =
      `${BACKDROP}${item.backdrop_path}`;

    banner.style.backgroundImage =
      `url("${backdropURL}")`;
  } else if (item.poster_path) {
    // Fallback if no backdrop is available.
    banner.style.backgroundImage =
      `url("${IMG}${item.poster_path}")`;
  } else {
    banner.style.backgroundImage = "none";
  }

  // Movie title.
  title.textContent =
    item.title || item.name || "Featured Movie";

  // Short description.
  description.textContent =
    getShortOverview(item.overview, 145);

  // Featured label.
  const label = banner.querySelector(".banner-label");

  if (label) {
    label.textContent = "FEATURED MOVIE";
  }

  // Aligned year and rating.
  if (meta) {
    meta.innerHTML = "";

    const year = document.createElement("span");
    year.textContent = getItemYear(item);

    const divider = document.createElement("span");
    divider.className = "meta-divider";

    const rating = document.createElement("span");
    rating.className = "rating";
    rating.textContent = `★ ${getItemRating(item)}`;

    meta.appendChild(year);
    meta.appendChild(divider);
    meta.appendChild(rating);
  }

  // Save featured movie for Watch Now.
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

/* 10. CREATE MOVIE CARD */

function createMovieCard(item) {
  const card = document.createElement("div");

  card.className = "movie-card";
  card.tabIndex = 0;
  card.setAttribute("role", "button");

  const title =
    item.title || item.name || "Untitled";

  const image = document.createElement("img");
  image.alt = `${title} poster`;

  setPosterImage(image, item.poster_path);

  const info = document.createElement("div");
  info.className = "movie-card-info";

  const name = document.createElement("div");
  name.className = "movie-card-title";
  name.textContent = title;

  const meta = document.createElement("div");
  meta.className = "movie-card-meta";

  const year = document.createElement("span");
  year.textContent = getItemYear(item);

  const rating = document.createElement("span");
  rating.className = "movie-card-rating";
  rating.textContent = `★ ${getItemRating(item)}`;

  meta.appendChild(year);
  meta.appendChild(rating);

  info.appendChild(name);
  info.appendChild(meta);

  card.appendChild(image);
  card.appendChild(info);

  const openItem = () => {
    showDetails({
      ...item,
      media_type: getMediaType(item)
    });
  };

  card.addEventListener("click", openItem);

  card.addEventListener("keydown", event => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openItem();
    }
  });

  return card;
}

/* 11. DISPLAY MOVIE LIST */

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
    container.appendChild(createMovieCard(item));
  });
}

/* 12. MEDIA TYPE */

function getMediaType(item) {
  if (item.media_type) {
    return item.media_type;
  }

  return item.title ? "movie" : "tv";
}

/* 13. SHOW MOVIE DETAILS */

function showDetails(item) {
  if (!item) return;

  currentItem = item;
  currentServer = 0;
  playerUnlocked = false;

  const modal = document.getElementById("modal");
  const title = document.getElementById("modal-title");
  const description =
    document.getElementById("modal-description");
  const heading =
    document.getElementById("player-heading-title");

  if (!modal) return;

  const itemTitle =
    item.title || item.name || "Untitled";

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
  setServerControlsVisible(false);
  showPlayNowScreen();
}

/* 14. PLAY NOW SCREEN */

function showPlayNowScreen() {
  const container =
    document.querySelector(".video-container");

  if (!container) return;

  container.innerHTML = "";

  const wrapper = document.createElement("div");
  wrapper.className =
    "player-message play-now-message";

  const paragraph = document.createElement("p");
  paragraph.textContent = "Click to start watching";

  const button = document.createElement("button");
  button.className = "play-now-btn";
  button.type = "button";
  button.textContent = "▶ PLAY NOW";

  button.addEventListener("click", unlockPlayer);

  wrapper.appendChild(paragraph);
  wrapper.appendChild(button);

  container.appendChild(wrapper);
}

/* 15. UNLOCK PLAYER AND OPEN AD */

function unlockPlayer() {
  if (!currentItem || playerUnlocked) return;

  const adURL = AD_REDIRECT_URL.trim();

  if (
    adURL &&
    adURL !== "PLACE YOUR ADS HERE"
  ) {
    try {
      const parsedAdURL = new URL(adURL);

      if (
        parsedAdURL.protocol === "https:" ||
        parsedAdURL.protocol === "http:"
      ) {
        const adWindow = window.open(
          parsedAdURL.href,
          "_blank",
          "noopener,noreferrer"
        );

        if (!adWindow) {
          alert(
            "Please allow pop-ups to open the advertising page."
          );
        }
      } else {
        alert("Please use a valid HTTP or HTTPS ad URL.");
        return;
      }

    } catch (error) {
      console.error("Invalid advertising URL:", error);
      alert(
        "The advertising URL is not valid. Please check the AD REDIRECT SETTINGS."
      );
      return;
    }

  } else {
    console.info(
      "Ad URL not configured. PLACE YOUR ADS HERE."
    );
  }

  playerUnlocked = true;

  setServerControlsVisible(true);
  updateServerName();
  loadMovieServer();
}

/* 16. SHOW / HIDE SERVER CONTROLS */

function setServerControlsVisible(visible) {
  const controls =
    document.querySelector(".player-controls");

  if (controls) {
    controls.hidden = !visible;
  }
}

/* 17. LOAD SELECTED SERVER */

function loadMovieServer() {
  const container =
    document.querySelector(".video-container");

  if (!container || !currentItem || !playerUnlocked) return;

  container.innerHTML = "";

  const mediaType = getMediaType(currentItem);
  const source = MOVIE_SOURCES[currentServer];

  if (!source) {
    showPlayerMessage(
      "Server unavailable",
      "Please select another server."
    );

    updateServerName();
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

      return;
    }

  } catch (error) {
    console.error("Server URL error:", error);

    showPlayerMessage(
      "Unable to load server",
      "There was a problem preparing this video source."
    );

    return;
  }

  if (!url || typeof url !== "string") {
    showPlayerMessage(
      "Server unavailable",
      "This server is currently unavailable."
    );

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

    return;
  }

  const iframe = document.createElement("iframe");

  iframe.src = parsedURL.href;
  iframe.title = "MovieFlixHD Video Player";
  iframe.allow =
    "autoplay; fullscreen; picture-in-picture";
  iframe.allowFullscreen = true;
  iframe.referrerPolicy =
    "strict-origin-when-cross-origin";

  container.appendChild(iframe);

  updateServerName();
}

/* 18. PLAYER MESSAGE */

function showPlayerMessage(title, message) {
  const container =
    document.querySelector(".video-container");

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

/* 19. UPDATE ACTIVE SERVER LABEL */

function updateServerName() {
  const serverName =
    document.getElementById("server-name");

  if (serverName) {
    serverName.textContent =
      `Server ${currentServer + 1}`;
  }

  document.querySelectorAll(".server-btn").forEach(button => {
    const buttonIndex =
      Number(button.dataset.server);

    const isActive =
      buttonIndex === currentServer;

    button.classList.toggle("active", isActive);
    button.setAttribute(
      "aria-pressed",
      String(isActive)
    );
  });
}

/* 20. SELECT SERVER */

function selectServer(index) {
  if (!playerUnlocked || !currentItem) return;
  if (!Number.isInteger(index)) return;

  if (
    index < 0 ||
    index >= MOVIE_SOURCES.length
  ) {
    return;
  }

  currentServer = index;

  updateServerName();
  loadMovieServer();
}

/* 21. NEXT SERVER */

function nextServer() {
  if (!playerUnlocked || !currentItem) return;
  if (!MOVIE_SOURCES.length) return;

  currentServer =
    (currentServer + 1) % MOVIE_SOURCES.length;

  updateServerName();
  loadMovieServer();
}

/* 22. CLOSE MODAL */

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
  playerUnlocked = false;

  setServerControlsVisible(false);
  updateServerName();
}

/* 23. MODAL BACKDROP CLICK */

document.addEventListener("click", function (event) {
  const modal = document.getElementById("modal");

  if (modal && event.target === modal) {
    closeModal();
  }
});

/* 24. ESCAPE KEY */

document.addEventListener("keydown", function (event) {
  if (event.key === "Escape") {
    closeModal();
  }
});

/* 25. SEARCH MOVIES AND TV */

async function searchTMDB(query) {
  clearTimeout(searchTimeout);

  const section =
    document.getElementById("search-section");

  const results =
    document.getElementById("search-results");

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

    items.slice(0, 30).forEach(item => {
      results.appendChild(createMovieCard(item));
    });

  }, 400);
}

/* 26. INITIALIZE WEBSITE */

async function init() {
  console.log("MovieFlixHD initializing...");

  const movieContainer =
    document.getElementById("movies-list");

  const tvContainer =
    document.getElementById("tvshows-list");

  const animeContainer =
    document.getElementById("anime-list");

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

/* 27. START WEBSITE */

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
