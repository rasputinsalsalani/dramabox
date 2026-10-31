/* MOVIEFLIXHD — TMDB + SERIES DETAILS + EPISODE PLAYER
   Existing ad redirect and three video servers preserved.
*/

(function(){
  const encodedKey = "MWJkMjhkZWU5NTMzYTBiMWVkMjkyNTQ5ZDgyNmY4OGI=";
  window.API_KEY = atob(encodedKey);
})();

const BASE = "https://api.themoviedb.org/3";
const IMG = "https://image.tmdb.org/t/p/w500";
const BACKDROP = "https://image.tmdb.org/t/p/original";
const STILL = "https://image.tmdb.org/t/p/w500";

const PLACEHOLDER =
  "https://placehold.co/500x750/151820/ffffff?text=No+Poster";

const POSTER_ERROR =
  "https://placehold.co/500x750/151820/ffffff?text=Poster+Unavailable";

const STILL_PLACEHOLDER =
  "https://placehold.co/640x360/151820/ffffff?text=Episode";

const AD_REDIRECT_URL =
  "ads here";

/* THREE VIDEO SERVERS */

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

/* GLOBAL VARIABLES */

let currentItem = null;
let bannerItem = null;
let currentServer = 0;
let playerUnlocked = false;

let searchTimeout = null;
let searchRequest = 0;

let currentSeries = null;
let currentSeasonEpisodes = [];
let selectedEpisodeIndex = -1;
let seriesRequest = 0;

/* TMDB API */

async function fetchJSON(url) {
  try {
    const response = await fetch(url);

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      console.error("TMDB API Error:", response.status, data);
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

/* FETCH MOVIES, TV AND ANIME */

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

/* POSTER IMAGE */

function setPosterImage(img, path) {
  img.alt = "Movie poster";
  img.loading = "lazy";
  img.decoding = "async";

  img.onerror = function() {
    this.onerror = null;
    this.src = POSTER_ERROR;
  };

  img.src = path
    ? `${IMG}${path}`
    : PLACEHOLDER;
}

/* MOVIE INFORMATION */

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

  const clean = text.trim().replace(/\s+/g, " ");

  if (clean.length <= maxLength) return clean;

  const shortened = clean.substring(0, maxLength);
  const lastSpace = shortened.lastIndexOf(" ");

  return shortened.substring(
    0,
    lastSpace > 90 ? lastSpace : maxLength
  ).trimEnd() + "...";
}

/* FEATURED BANNER */

function displayBanner(item) {
  if (!item) return;

  const banner = document.getElementById("banner");
  const title = document.getElementById("banner-title");
  const description = document.getElementById("banner-desc");
  const meta = document.getElementById("banner-meta");

  if (!banner || !title || !description) return;

  if (item.backdrop_path) {
    banner.style.backgroundImage =
      `url("${BACKDROP}${item.backdrop_path}")`;
  } else if (item.poster_path) {
    banner.style.backgroundImage =
      `url("${IMG}${item.poster_path}")`;
  } else {
    banner.style.backgroundImage = "none";
  }

  title.textContent =
    item.title || item.name || "Featured Movie";

  description.textContent =
    getShortOverview(item.overview, 145);

  const label = banner.querySelector(".banner-label");

  if (label) {
    label.textContent = "FEATURED MOVIE";
  }

  if (meta) {
    meta.innerHTML = "";

    const year = document.createElement("span");
    year.textContent = getItemYear(item);

    const divider = document.createElement("span");
    divider.className = "meta-divider";

    const rating = document.createElement("span");
    rating.className = "rating";
    rating.textContent = `★ ${getItemRating(item)}`;

    meta.append(year, divider, rating);
  }

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

/* MEDIA TYPE */

function getMediaType(item) {
  return item.media_type || (item.title ? "movie" : "tv");
}

/* CREATE MOVIE CARD */

function createMovieCard(item) {
  const card = document.createElement("div");

  card.className = "movie-card";
  card.tabIndex = 0;
  card.setAttribute("role", "button");

  const title = item.title || item.name || "Untitled";

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

  meta.append(year, rating);
  info.append(name, meta);
  card.append(image, info);

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

/* DISPLAY LIST */

function displayList(items, id) {
  const container = document.getElementById(id);

  if (!container) return;

  container.innerHTML = "";

  if (!items?.length) {
    container.innerHTML =
      '<p class="player-message">No titles available right now.</p>';
    return;
  }

  items.slice(0, 18).forEach(item => {
    container.appendChild(createMovieCard(item));
  });
}

/* SHOW DETAILS
   TV SHOWS AND ANIME OPEN SERIES PAGE.
   MOVIES KEEP THE ORIGINAL PLAYER FLOW.
*/

function showDetails(item) {
  if (!item) return;

  if (getMediaType(item) === "tv") {
    openSeriesPage(item.id);
    return;
  }

  currentItem = item;
  currentServer = 0;
  playerUnlocked = false;
  selectedEpisodeIndex = -1;

  const modal = document.getElementById("modal");
  const title = document.getElementById("modal-title");
  const description =
    document.getElementById("modal-description");
  const heading =
    document.getElementById("player-heading-title");

  if (!modal) return;

  const itemTitle = item.title || item.name || "Untitled";

  modal.style.display = "flex";

  if (title) title.textContent = itemTitle;

  if (description) {
    description.textContent =
      item.overview || "No description available.";
  }

  if (heading) heading.textContent = itemTitle;

  const episodeNav =
    document.getElementById("episode-navigation");

  if (episodeNav) episodeNav.hidden = true;

  const episodeLabel =
    document.getElementById("player-episode-label");

  if (episodeLabel) episodeLabel.textContent = "";

  updateServerName();
  setServerControlsVisible(false);
  showPlayNowScreen();
}

/* OPEN SERIES DETAILS PAGE */

async function openSeriesPage(id, pushState = true) {
  const token = ++seriesRequest;

  const home = document.getElementById("home-content");
  const banner = document.getElementById("banner");
  const page = document.getElementById("series-page");

  if (!home || !page) return;

  home.hidden = true;
  banner.hidden = true;
  page.hidden = false;

  page.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });

  document.getElementById("series-title").textContent =
    "Loading series...";

  document.getElementById("series-overview").textContent =
    "Fetching series information...";

  document.getElementById("episodes-list").innerHTML =
    '<p class="episode-status">Loading seasons and episodes...</p>';

  document.getElementById("season-select").innerHTML = "";

  const data = await fetchJSON(
    createTMDBUrl(`/tv/${encodeURIComponent(id)}`, {
      language: "en-US"
    })
  );

  if (token !== seriesRequest) return;

  if (!data) {
    document.getElementById("series-title").textContent =
      "Series unavailable";

    document.getElementById("series-overview").textContent =
      "Could not load series details. Please try again.";

    document.getElementById("episodes-list").innerHTML =
      '<p class="episode-status">Episodes could not be loaded.</p>';

    return;
  }

  currentSeries = data;
  currentSeasonEpisodes = [];

  const poster = document.getElementById("series-poster");

  poster.onerror = function() {
    this.onerror = null;
    this.src = PLACEHOLDER;
  };

  poster.src = data.poster_path
    ? `${IMG}${data.poster_path}`
    : PLACEHOLDER;

  document.getElementById("series-title").textContent =
    data.name || "Untitled Series";

  document.getElementById("series-overview").textContent =
    data.overview || "No series description is available.";

  const meta = document.getElementById("series-meta");
  meta.innerHTML = "";

  [
    data.first_air_date?.slice(0, 4),
    data.number_of_seasons
      ? `${data.number_of_seasons} Season${data.number_of_seasons === 1 ? "" : "s"}`
      : "",
    data.number_of_episodes
      ? `${data.number_of_episodes} Episodes`
      : ""
  ].filter(Boolean).forEach(value => {
    const span = document.createElement("span");
    span.textContent = value;
    meta.appendChild(span);
  });

  if (Number(data.vote_average) > 0) {
    const rating = document.createElement("span");
    rating.className = "rating";
    rating.textContent =
      `★ ${Number(data.vote_average).toFixed(1)}/10`;

    meta.appendChild(rating);
  }

  const select = document.getElementById("season-select");

  const seasons = (data.seasons || []).filter(
    season => season.season_number >= 0
  );

  if (!seasons.length) {
    document.getElementById("episodes-list").innerHTML =
      '<p class="episode-status">No season information is available.</p>';
    return;
  }

  seasons.forEach(season => {
    const option = document.createElement("option");

    option.value = season.season_number;
    option.textContent =
      season.name || `Season ${season.season_number}`;

    select.appendChild(option);
  });

  const firstRegular =
    seasons.find(season => season.season_number === 1) || seasons[0];

  select.value = String(firstRegular.season_number);

  await loadSeasonEpisodes(
    firstRegular.season_number,
    false,
    token
  );

  if (pushState) {
    const url = new URL(window.location.href);

    url.searchParams.set("tv", String(id));
    url.searchParams.delete("movie");

    history.pushState(
      { tv: id },
      "",
      url
    );
  }
}

/* LOAD SEASON EPISODES */

async function loadSeasonEpisodes(
  seasonNumber,
  updateHistory = false,
  token = seriesRequest
) {
  if (!currentSeries) return;

  const id = currentSeries.id;
  const season = Number(seasonNumber);

  const list = document.getElementById("episodes-list");

  list.innerHTML =
    '<p class="episode-status">Loading episodes...</p>';

  const data = await fetchJSON(
    createTMDBUrl(
      `/tv/${encodeURIComponent(id)}/season/${encodeURIComponent(season)}`,
      { language: "en-US" }
    )
  );

  if (
    token !== seriesRequest ||
    !currentSeries ||
    String(currentSeries.id) !== String(id)
  ) {
    return;
  }

  const episodes = data?.episodes || [];

  currentSeasonEpisodes = episodes;

  if (!episodes.length) {
    list.innerHTML =
      '<p class="episode-status">No episodes listed for this season.</p>';
    return;
  }

  list.innerHTML = "";

  episodes.forEach((episode, index) => {
    const card = document.createElement("article");

    card.className = "episode-card";
    card.tabIndex = 0;
    card.setAttribute("role", "button");

    const img = document.createElement("img");

    img.alt = episode.name || `Episode ${episode.episode_number}`;
    img.loading = "lazy";

    img.src = episode.still_path
      ? `${STILL}${episode.still_path}`
      : STILL_PLACEHOLDER;

    img.onerror = function() {
      this.onerror = null;
      this.src = STILL_PLACEHOLDER;
    };

    const info = document.createElement("div");

    const number = document.createElement("span");
    const title = document.createElement("h3");
    const overview = document.createElement("p");
    const runtime = document.createElement("span");

    number.className = "episode-number";
    number.textContent = `EPISODE ${episode.episode_number}`;

    title.textContent =
      episode.name || `Episode ${episode.episode_number}`;

    overview.textContent =
      episode.overview || "No episode description available.";

    runtime.className = "episode-runtime";

    runtime.textContent = episode.runtime
      ? `${episode.runtime} min`
      : (episode.air_date || "");

    info.append(number, title, overview, runtime);
    card.append(img, info);

    const play = () => openEpisode(index);

    card.addEventListener("click", play);

    card.addEventListener("keydown", event => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        play();
      }
    });

    list.appendChild(card);
  });

  if (updateHistory) {
    const url = new URL(window.location.href);

    url.searchParams.set("tv", String(id));
    url.searchParams.set("season", String(season));

    history.replaceState(
      { tv: id, season },
      "",
      url
    );
  }
}

/* PLAY FIRST EPISODE */

function playFirstEpisode() {
  if (!currentSeasonEpisodes.length) {
    alert("No episodes are available in this season.");
    return;
  }

  openEpisode(0);
}

/* OPEN SELECTED EPISODE */

function openEpisode(index) {
  if (!currentSeries || !currentSeasonEpisodes[index]) return;

  const episode = currentSeasonEpisodes[index];

  const season = Number(
    document.getElementById("season-select").value
  );

  currentItem = {
    id: currentSeries.id,
    name: currentSeries.name,
    media_type: "tv",
    season_number: season,
    episode_number: episode.episode_number,
    episode_index: index,
    episode_name:
      episode.name || `Episode ${episode.episode_number}`,
    episode_overview: episode.overview || ""
  };

  currentServer = 0;
  selectedEpisodeIndex = index;
  playerUnlocked = false;

  const modal = document.getElementById("modal");
  modal.style.display = "flex";

  document.getElementById("player-heading-title").textContent =
    currentSeries.name;

  document.getElementById("player-episode-label").textContent =
    `Season ${season} • Episode ${episode.episode_number} — ${currentItem.episode_name}`;

  document.getElementById("modal-title").textContent =
    currentItem.episode_name;

  document.getElementById("modal-description").textContent =
    currentItem.episode_overview || currentSeries.overview || "";

  document.getElementById("episode-navigation").hidden = false;

  updateEpisodeNavigation();
  updateServerName();
  setServerControlsVisible(false);
  showPlayNowScreen();
}

/* PREVIOUS / NEXT EPISODE BUTTONS */

function updateEpisodeNavigation() {
  const nav = document.getElementById("episode-navigation");

  if (!nav || !currentItem || currentItem.media_type !== "tv") {
    if (nav) nav.hidden = true;
    return;
  }

  const prev = document.getElementById("previous-episode-btn");
  const next = document.getElementById("next-episode-btn");

  prev.disabled = selectedEpisodeIndex <= 0;

  next.disabled =
    selectedEpisodeIndex < 0 ||
    selectedEpisodeIndex >= currentSeasonEpisodes.length - 1;

  document.getElementById("episode-nav-label").textContent =
    `S${currentItem.season_number} · E${currentItem.episode_number}`;
}

async function navigateEpisode(direction) {
  if (!currentSeries || !currentItem || currentItem.media_type !== "tv") {
    return;
  }

  const wasUnlocked = playerUnlocked;
  const target = selectedEpisodeIndex + direction;

  if (target >= 0 && target < currentSeasonEpisodes.length) {
    openEpisode(target);

    if (wasUnlocked) {
      playerUnlocked = true;
      setServerControlsVisible(true);
      loadMovieServer();
    }

    return;
  }

  const select = document.getElementById("season-select");

  const seasons = [...select.options].map(option =>
    Number(option.value)
  );

  const currentPos = seasons.indexOf(Number(select.value));
  const nextSeason = seasons[currentPos + direction];

  if (nextSeason === undefined) return;

  select.value = String(nextSeason);

  await loadSeasonEpisodes(nextSeason, true);

  if (currentSeasonEpisodes.length) {
    openEpisode(
      direction > 0 ? 0 : currentSeasonEpisodes.length - 1
    );

    if (wasUnlocked) {
      playerUnlocked = true;
      setServerControlsVisible(true);
      loadMovieServer();
    }
  }
}

/* PLAY NOW SCREEN */

function showPlayNowScreen() {
  const container =
    document.querySelector(".video-container");

  if (!container) return;

  container.innerHTML = "";

  const wrapper = document.createElement("div");
  wrapper.className = "player-message play-now-message";

  const paragraph = document.createElement("p");
  paragraph.textContent = "Click to start watching";

  const button = document.createElement("button");

  button.className = "play-now-btn";
  button.type = "button";
  button.textContent = "▶ PLAY NOW";

  button.addEventListener("click", unlockPlayer);

  wrapper.append(paragraph, button);
  container.appendChild(wrapper);
}

/* UNLOCK PLAYER AND OPEN AD */

function unlockPlayer() {
  if (!currentItem || playerUnlocked) return;

  const adURL = AD_REDIRECT_URL.trim();

  if (adURL && adURL !== "PLACE YOUR ADS HERE") {
    try {
      const parsed = new URL(adURL);

      if (
        parsed.protocol !== "https:" &&
        parsed.protocol !== "http:"
      ) {
        throw new Error("HTTP(S) required");
      }

      const adWindow = window.open(
        parsed.href,
        "_blank",
        "noopener,noreferrer"
      );

      if (!adWindow) {
        alert(
          "Please allow pop-ups to open the advertising page."
        );
      }

    } catch (error) {
      console.error("Invalid advertising URL:", error);

      alert(
        "The advertising URL is not valid. Please check the AD REDIRECT SETTINGS."
      );

      return;
    }

  } else {
    console.info("Ad URL not configured.");
  }

  playerUnlocked = true;

  setServerControlsVisible(true);
  updateServerName();
  loadMovieServer();
}

/* SHOW / HIDE SERVER CONTROLS */

function setServerControlsVisible(visible) {
  const controls =
    document.querySelector(".player-controls");

  if (controls) {
    controls.hidden = !visible;
  }
}

/* LOAD SELECTED VIDEO SERVER */

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
      url = source.tv(
        currentItem.id,
        currentItem.season_number || 1,
        currentItem.episode_number || 1
      );

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

  try {
    const parsed = new URL(url);

    if (parsed.protocol !== "https:") {
      throw new Error("HTTPS required");
    }

    url = parsed.href;

  } catch (error) {
    showPlayerMessage(
      "Invalid embed URL",
      "Please check your configured server URL."
    );

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

  updateServerName();
}

/* PLAYER MESSAGE */

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

  wrapper.append(heading, paragraph);
  container.appendChild(wrapper);
}

/* UPDATE ACTIVE SERVER */

function updateServerName() {
  const serverName =
    document.getElementById("server-name");

  if (serverName) {
    serverName.textContent =
      `Server ${currentServer + 1}`;
  }

  document.querySelectorAll(".server-btn").forEach(button => {
    const active =
      Number(button.dataset.server) === currentServer;

    button.classList.toggle("active", active);

    button.setAttribute(
      "aria-pressed",
      String(active)
    );
  });
}

/* SELECT SERVER */

function selectServer(index) {
  if (!playerUnlocked || !currentItem) return;

  if (
    !Number.isInteger(index) ||
    index < 0 ||
    index >= MOVIE_SOURCES.length
  ) {
    return;
  }

  currentServer = index;

  updateServerName();
  loadMovieServer();
}

/* NEXT SERVER */

function nextServer() {
  if (!playerUnlocked || !currentItem || !MOVIE_SOURCES.length) {
    return;
  }

  currentServer =
    (currentServer + 1) % MOVIE_SOURCES.length;

  updateServerName();
  loadMovieServer();
}

/* CLOSE PLAYER */

function closeModal() {
  const modal = document.getElementById("modal");

  const container =
    document.querySelector(".video-container");

  if (modal) modal.style.display = "none";
  if (container) container.innerHTML = "";

  currentItem = null;
  currentServer = 0;
  playerUnlocked = false;
  selectedEpisodeIndex = -1;

  setServerControlsVisible(false);
  updateServerName();
}

/* CLOSE SERIES PAGE */

function closeSeriesPage() {
  seriesRequest++;

  currentSeries = null;
  currentSeasonEpisodes = [];

  const page = document.getElementById("series-page");
  const home = document.getElementById("home-content");
  const banner = document.getElementById("banner");

  if (page) page.hidden = true;
  if (home) home.hidden = false;
  if (banner) banner.hidden = false;
}

/* BACK TO HOME */

function goHome(event) {
  if (event) event.preventDefault();

  closeSeriesPage();

  const url = new URL(window.location.href);

  url.searchParams.delete("tv");
  url.searchParams.delete("season");
  url.searchParams.delete("movie");

  history.pushState(
    { home: true },
    "",
    url
  );

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });

  return false;
}

/* SHARE SERIES */

async function shareSeries() {
  if (!currentSeries) return;

  const url = window.location.href;
  const title = currentSeries.name || "MovieFlixHD Series";

  try {
    if (navigator.share) {
      await navigator.share({
        title,
        text: `Watch ${title} on MovieFlixHD`,
        url
      });

    } else {
      await copyText(url);
    }

    showShareFeedback("Share link ready.");

  } catch (error) {
    if (error.name !== "AbortError") {
      await copyText(url);

      showShareFeedback(
        "Link copied. Share it with your friends."
      );
    }
  }
}

async function copySeriesLink() {
  if (!currentSeries) return;

  await copyText(window.location.href);
  showShareFeedback("Series link copied!");
}

async function copyText(value) {
  try {
    await navigator.clipboard.writeText(value);

  } catch (error) {
    const area = document.createElement("textarea");

    area.value = value;
    area.style.position = "fixed";
    area.style.opacity = "0";

    document.body.appendChild(area);

    area.select();
    document.execCommand("copy");

    area.remove();
  }
}

function showShareFeedback(message) {
  const el = document.getElementById("share-feedback");

  if (el) el.textContent = message;
}

/* URL ROUTING */

function handleRoute() {
  const params = new URLSearchParams(window.location.search);
  const tvId = params.get("tv");

  if (tvId) {
    openSeriesPage(tvId, false);
    return;
  }

  closeSeriesPage();
}

/* MODAL BACKDROP CLICK */

document.addEventListener("click", event => {
  const modal = document.getElementById("modal");

  if (modal && event.target === modal) {
    closeModal();
  }
});

/* ESCAPE KEY */

document.addEventListener("keydown", event => {
  if (event.key === "Escape") {
    closeModal();
  }
});

/* BROWSER BACK / FORWARD */

window.addEventListener("popstate", handleRoute);

/* SEARCH MOVIES AND TV */

async function searchTMDB(query) {
  clearTimeout(searchTimeout);

  const section =
    document.getElementById("search-section");

  const results =
    document.getElementById("search-results");

  if (!section || !results) return;

  const term = query.trim();

  if (!term) {
    searchRequest++;
    section.hidden = true;
    results.innerHTML = "";
    return;
  }

  searchTimeout = setTimeout(async () => {
    const requestId = ++searchRequest;

    const data = await fetchJSON(
      createTMDBUrl("/search/multi", {
        query: term,
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

/* INITIALIZE WEBSITE */

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

  if (movies.length) {
    displayBanner(movies[0]);
  }

  displayList(movies, "movies-list");
  displayList(tvShows, "tvshows-list");
  displayList(anime, "anime-list");

  console.log("MovieFlixHD loaded.", {
    movies: movies.length,
    tvShows: tvShows.length,
    anime: anime.length
  });

  handleRoute();
}

/* START WEBSITE */

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
