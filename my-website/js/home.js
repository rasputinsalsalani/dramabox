(() => {
  "use strict";

  // ==============================
  // CONFIGURATION
  // ==============================

  const TMDB_KEY = atob("MWJkMjhkZWU5NTMzYTBiMWVkMjkyNTQ5ZDgyNmY4OGI=");
  const API = "https://api.themoviedb.org/3";
  const IMG = "https://image.tmdb.org/t/p/w500";
  const BACKDROP = "https://image.tmdb.org/t/p/original";

  const AD_URL =
    "https://directyp.org/4/02b9737bd4da1e3a14a820f0ce61a20d";

  const SOURCES = [
    {
      name: "Server 1",
      movie: id => `https://vidsrc.sh/embed/movie/${id}`,
      tv: (id, season, episode) =>
        `https://vidsrc.sh/embed/tv/${id}/${season}/${episode}`
    },
    {
      name: "Server 2",
      movie: id => `https://embed.vidrift.net/embed/movie/${id}`,
      tv: (id, season, episode) =>
        `https://embed.vidrift.net/embed/tv/${id}/${season}/${episode}`
    },
    {
      name: "Server 3",
      movie: id => `https://embedwave.cc/embed/movie/${id}`,
      tv: (id, season, episode) =>
        `https://embedwave.cc/embed/tv/${id}/${season}/${episode}`
    }
  ];

  // ==============================
  // STATE
  // ==============================

  let currentItem = null;
  let currentMovie = null;
  let currentSeries = null;
  let bannerItem = null;

  let currentServer = 0;
  let playerUnlocked = false;

  let currentSeason = 1;
  let episodes = [];
  let episodeIndex = 0;

  let searchTimer = null;
  let searchRequest = 0;

  // ==============================
  // ELEMENT HELPERS
  // ==============================

  const $ = id => document.getElementById(id);

  const elements = {
    home: $("home-content"),
    details: $("series-page"),
    modal: $("modal"),
    shareModal: $("share-modal"),
    searchInput: $("search-input"),
    searchResults: $("search-results"),
    searchList: $("search-results-list")
  };

  // ==============================
  // GENERAL HELPERS
  // ==============================

  function escapeHTML(value = "") {
    return String(value).replace(/[&<>"']/g, char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    })[char]);
  }

  function getTitle(item) {
    return item.title || item.name || "Untitled";
  }

  function getYear(item) {
    const date = item.release_date || item.first_air_date || "";
    return date ? date.substring(0, 4) : "N/A";
  }

  function getRating(item) {
    const rating = Number(item.vote_average || 0);
    return rating ? rating.toFixed(1) : "N/A";
  }

  function getPoster(item) {
    return item.poster_path
      ? IMG + item.poster_path
      : "https://placehold.co/500x750/151515/ffffff?text=No+Poster";
  }

  function getBackdrop(item) {
    return item.backdrop_path
      ? BACKDROP + item.backdrop_path
      : "";
  }

  function getType(item) {
    if (item.media_type) return item.media_type;
    if (item.first_air_date) return "tv";
    return "movie";
  }

  function makeUrl(path, params = {}) {
    const url = new URL(API + path);
    url.searchParams.set("api_key", TMDB_KEY);
    url.searchParams.set("language", "en-US");

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, value);
      }
    });

    return url;
  }

  async function api(path, params = {}) {
    const response = await fetch(makeUrl(path, params));

    if (!response.ok) {
      throw new Error(`TMDB request failed: ${response.status}`);
    }

    return response.json();
  }

  function setText(id, value) {
    const element = $(id);
    if (element) element.textContent = value ?? "";
  }

  function show(element) {
    if (element) element.hidden = false;
  }

  function hide(element) {
    if (element) element.hidden = true;
  }

  // ==============================
  // MOVIE / SERIES CARDS
  // ==============================

  function createCard(item) {
    const type = getType(item);
    const card = document.createElement("article");

    card.className = "movie-card";
    card.tabIndex = 0;

    card.innerHTML = `
      <div class="poster-wrap">
        <img
          src="${escapeHTML(getPoster(item))}"
          alt="${escapeHTML(getTitle(item))}"
          loading="lazy"
        >
        <span class="rating">★ ${escapeHTML(getRating(item))}</span>
      </div>
      <div class="card-info">
        <h3>${escapeHTML(getTitle(item))}</h3>
        <p>${escapeHTML(getYear(item))} · ${type === "tv" ? "Series" : "Movie"}</p>
      </div>
    `;

    const open = () => {
      if (type === "tv") {
        openSeries(item.id);
      } else {
        openMovie(item.id);
      }
    };

    card.addEventListener("click", open);
    card.addEventListener("keydown", event => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        open();
      }
    });

    return card;
  }

  function renderGrid(containerId, items) {
    const container = $(containerId);
    if (!container) return;

    container.replaceChildren();

    items.forEach(item => {
      container.appendChild(createCard(item));
    });
  }

  // ==============================
  // HOME PAGE
  // ==============================

  async function loadHome() {
    try {
      const [movies, series, anime] = await Promise.all([
        api("/trending/movie/week"),
        api("/trending/tv/week"),
        api("/discover/tv", {
          with_genres: 16,
          with_original_language: "ja",
          sort_by: "popularity.desc"
        })
      ]);

      renderGrid(
        "trending-movies",
        (movies.results || []).slice(0, 20)
      );

      renderGrid(
        "popular-series",
        (series.results || []).slice(0, 20)
      );

      renderGrid(
        "popular-anime",
        (anime.results || []).slice(0, 20)
      );

      const featured = (movies.results || []).find(
        item => item.backdrop_path
      );

      if (featured) {
        bannerItem = featured;

        const background = $("banner-bg");
        if (background) {
          background.style.backgroundImage =
            `url("${getBackdrop(featured)}")`;
        }

        setText("banner-title", getTitle(featured));
        setText(
          "banner-meta",
          `${getYear(featured)} · ★ ${getRating(featured)}`
        );
        setText(
          "banner-overview",
          featured.overview || "Discover this featured movie."
        );
      }
    } catch (error) {
      console.error("Home loading error:", error);
    }
  }

  const bannerPlay = $("banner-play");

  if (bannerPlay) {
    bannerPlay.addEventListener("click", () => {
      if (bannerItem) openMovie(bannerItem.id);
    });
  }

  const banner = $("banner");

  if (banner) {
    banner.addEventListener("click", event => {
      if (
        event.target.closest("#banner-play") ||
        !bannerItem
      ) return;

      openMovie(bannerItem.id);
    });
  }

  // ==============================
  // DIRECT LINKS
  // ==============================

  function updateAddress(type, id, season) {
    const url = new URL(window.location.href);

    url.search = "";

    if (type === "movie") {
      url.searchParams.set("movie", id);
    } else if (type === "tv") {
      url.searchParams.set("tv", id);

      if (season) {
        url.searchParams.set("season", season);
      }
    }

    history.pushState({}, "", url);
  }

  function clearAddress() {
    const url = new URL(window.location.href);
    url.search = "";
    history.pushState({}, "", url);
  }

  // ==============================
  // DETAILS PAGE
  // ==============================

  async function openMovie(id, updateURL = true) {
    try {
      const movie = await api(`/movie/${id}`);

      currentMovie = movie;
      currentSeries = null;
      currentItem = {
        ...movie,
        media_type: "movie"
      };

      if (updateURL) {
        updateAddress("movie", id);
      }

      showDetailsPage();

      hide($("episodes-section"));
      show($("movie-suggestions-section"));

      setText("details-kicker", "MOVIE");
      setText("series-title", getTitle(movie));
      setText(
        "series-meta",
        `${getYear(movie)} · ${movie.runtime || "N/A"} min · ★ ${getRating(movie)}`
      );
      setText(
        "series-overview",
        movie.overview || "No description available."
      );

      const poster = $("series-poster");

      if (poster) {
        poster.src = getPoster(movie);
        poster.alt = getTitle(movie);
      }

      setText("details-list-kicker", "RECOMMENDATIONS");
      setText("details-list-title", "YOU MAY ALSO LIKE");

      const primaryButton = $("details-primary-btn");

      if (primaryButton) {
        primaryButton.textContent = "▶ PLAY MOVIE";
        primaryButton.onclick = () => openMoviePlayer(movie);
      }

      const suggestions = await api(
        `/movie/${id}/recommendations`
      );

      renderGrid(
        "movie-suggestions-list",
        (suggestions.results || []).slice(0, 12)
      );

      hide($("season-control"));

      window.scrollTo({ top: 0, behavior: "smooth" });

    } catch (error) {
      console.error("Movie details error:", error);
      alert("Unable to load movie details. Please try again.");
    }
  }

  async function openSeries(id, updateURL = true, requestedSeason = null) {
    try {
      const series = await api(`/tv/${id}`);

      currentSeries = series;
      currentMovie = null;
      currentItem = {
        ...series,
        media_type: "tv"
      };

      if (updateURL) {
        updateAddress("tv", id, requestedSeason);
      }

      showDetailsPage();

      show($("episodes-section"));
      hide($("movie-suggestions-section"));
      show($("season-control"));

      setText("details-kicker", "TV SERIES");
      setText("series-title", getTitle(series));
      setText(
        "series-meta",
        `${getYear(series)} · ${series.number_of_seasons || 0} Seasons · ★ ${getRating(series)}`
      );
      setText(
        "series-overview",
        series.overview || "No description available."
      );

      const poster = $("series-poster");

      if (poster) {
        poster.src = getPoster(series);
        poster.alt = getTitle(series);
      }

      const primaryButton = $("details-primary-btn");

      if (primaryButton) {
        primaryButton.textContent = "▶ PLAY SERIES";
        primaryButton.onclick = () => {
          if (episodes.length) {
            openEpisode(0);
          }
        };
      }

      const seasonSelect = $("season-select");

      if (seasonSelect) {
        seasonSelect.replaceChildren();

        (series.seasons || [])
          .filter(season => season.season_number >= 0)
          .forEach(season => {
            const option = document.createElement("option");
            option.value = season.season_number;
            option.textContent = season.name;
            seasonSelect.appendChild(option);
          });

        seasonSelect.onchange = () => {
          loadSeason(
            series.id,
            Number(seasonSelect.value),
            true
          );
        };
      }

      const availableSeasons = (series.seasons || [])
        .filter(season => season.season_number >= 0);

      currentSeason = requestedSeason !== null
        ? Number(requestedSeason)
        : (availableSeasons[0]?.season_number ?? 1);

      if (seasonSelect) {
        seasonSelect.value = String(currentSeason);
      }

      await loadSeason(series.id, currentSeason, false);

      window.scrollTo({ top: 0, behavior: "smooth" });

    } catch (error) {
      console.error("Series details error:", error);
      alert("Unable to load series details. Please try again.");
    }
  }

  function showDetailsPage() {
    hide(elements.home);
    hide(elements.searchResults);
    show(elements.details);

    const input = elements.searchInput;
    if (input) input.value = "";
  }

  // ==============================
  // SEASONS AND EPISODES
  // ==============================

  async function loadSeason(seriesId, seasonNumber, updateURL = true) {
    try {
      const data = await api(
        `/tv/${seriesId}/season/${seasonNumber}`
      );

      currentSeason = seasonNumber;
      episodes = data.episodes || [];

      if (updateURL) {
        updateAddress("tv", seriesId, seasonNumber);
      }

      setText(
        "details-list-kicker",
        `SEASON ${seasonNumber}`
      );

      setText(
        "details-list-title",
        `${episodes.length} EPISODES`
      );

      renderEpisodes();

    } catch (error) {
      console.error("Season loading error:", error);
      episodes = [];
      renderEpisodes();
    }
  }

  function renderEpisodes() {
    const container = $("episodes-list");
    if (!container) return;

    container.replaceChildren();

    if (!episodes.length) {
      container.textContent = "No episodes available.";
      return;
    }

    episodes.forEach((episode, index) => {
      const card = document.createElement("article");
      card.className = "episode-card";
      card.tabIndex = 0;

      const still = episode.still_path
        ? BACKDROP + episode.still_path
        : "https://placehold.co/640x360/151515/ffffff?text=Episode";

      card.innerHTML = `
        <img
          src="${escapeHTML(still)}"
          alt="${escapeHTML(episode.name || "Episode")}"
          loading="lazy"
        >
        <div class="episode-info">
          <h3>
            ${index + 1}. ${escapeHTML(episode.name || "Episode")}
          </h3>
          <p>
            Episode ${episode.episode_number}
            ${episode.runtime ? ` · ${episode.runtime} min` : ""}
          </p>
          <p>${escapeHTML(episode.overview || "No description available.")}</p>
        </div>
      `;

      const play = () => openEpisode(index);

      card.addEventListener("click", play);

      card.addEventListener("keydown", event => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          play();
        }
      });

      container.appendChild(card);
    });
  }

  // ==============================
  // VIDEO PLAYER
  // ==============================

  function openMoviePlayer(movie) {
    currentItem = {
      ...movie,
      media_type: "movie"
    };

    currentServer = 0;
    playerUnlocked = false;

    openPlayer(
      getTitle(movie),
      `${getYear(movie)} · Movie`
    );
  }

  function openEpisode(index) {
    if (!currentSeries || !episodes[index]) return;

    episodeIndex = index;

    const episode = episodes[index];

    currentItem = {
      ...currentSeries,
      media_type: "tv"
    };

    currentServer = 0;
    playerUnlocked = false;

    openPlayer(
      `${getTitle(currentSeries)} - ${episode.name}`,
      `Season ${currentSeason} · Episode ${episode.episode_number}`
    );

    show($("episode-navigation"));
    updateEpisodeNavigation();
  }

  function openPlayer(title, subtitle) {
    setText("player-title", title);
    setText("player-subtitle", subtitle);
    setText("player-info", "Choose a server to start watching.");

    const video = $("video-container");

    if (video) {
      video.innerHTML = `
        <div class="play-now-message">
          <h2>READY TO WATCH?</h2>
          <p>Click below to load the video player.</p>
          <button class="play-now-btn" id="unlock-player">
            ▶ PLAY NOW
          </button>
        </div>
      `;

      const button = $("unlock-player");

      button.addEventListener("click", unlockPlayer);
    }

    document.querySelectorAll(".server-btn").forEach((button, index) => {
      button.classList.toggle("active", index === currentServer);
    });

    setText("server-name", SOURCES[currentServer].name);

    hide($("episode-navigation"));
    show(elements.modal);
    document.body.style.overflow = "hidden";
  }

  function unlockPlayer() {
    if (playerUnlocked) return;

    playerUnlocked = true;

    // Opens the configured advertising destination.
    const adWindow = window.open(AD_URL, "_blank", "noopener");

    if (!adWindow) {
      console.warn("The browser blocked the advertising tab.");
    }

    loadVideo();
  }

  function getVideoUrl() {
    if (!currentItem) return "";

    const source = SOURCES[currentServer];

    if (currentItem.media_type === "tv") {
      const episode = episodes[episodeIndex];

      if (!episode) return "";

      return source.tv(
        currentItem.id,
        currentSeason,
        episode.episode_number
      );
    }

    return source.movie(currentItem.id);
  }

  function loadVideo() {
    const video = $("video-container");
    if (!video) return;

    const src = getVideoUrl();

    if (!src) {
      video.textContent = "Video source unavailable.";
      return;
    }

    video.innerHTML = `
      <iframe
        src="${escapeHTML(src)}"
        title="Video Player"
        allowfullscreen
        referrerpolicy="origin"
        allow="autoplay; fullscreen; picture-in-picture"
      ></iframe>
    `;

    setText("server-name", SOURCES[currentServer].name);
    setText("player-info", "If the video does not load, try another server.");
  }

  function selectServer(index) {
    if (!SOURCES[index]) return;

    currentServer = index;

    document.querySelectorAll(".server-btn").forEach((button, i) => {
      button.classList.toggle("active", i === index);
    });

    setText("server-name", SOURCES[index].name);

    if (playerUnlocked) {
      loadVideo();
    }
  }

  function updateEpisodeNavigation() {
    setText(
      "episode-nav-label",
      `Episode ${episodeIndex + 1} of ${episodes.length}`
    );

    const previous = $("prev-episode-btn");
    const next = $("next-episode-btn");

    if (previous) previous.disabled = episodeIndex <= 0;
    if (next) next.disabled = episodeIndex >= episodes.length - 1;
  }

  function navigateEpisode(direction) {
    const nextIndex = episodeIndex + direction;

    if (nextIndex < 0 || nextIndex >= episodes.length) {
      return;
    }

    openEpisode(nextIndex);
  }

  function closeModal() {
    hide(elements.modal);

    const video = $("video-container");
    if (video) video.replaceChildren();

    document.body.style.overflow = "";
    playerUnlocked = false;
  }

  // ==============================
  // PLAYER BUTTON EVENTS
  // ==============================

  document.querySelectorAll(".server-btn").forEach(button => {
    button.addEventListener("click", () => {
      selectServer(Number(button.dataset.server));
    });
  });

  const closePlayerButton = document.querySelector(".modal-close");

  if (closePlayerButton) {
    closePlayerButton.addEventListener("click", closeModal);
  }

  if (elements.modal) {
    elements.modal.addEventListener("click", event => {
      if (event.target === elements.modal) {
        closeModal();
      }
    });
  }

  const previousButton = $("prev-episode-btn");
  const nextButton = $("next-episode-btn");

  if (previousButton) {
    previousButton.addEventListener("click", () => {
      navigateEpisode(-1);
    });
  }

  if (nextButton) {
    nextButton.addEventListener("click", () => {
      navigateEpisode(1);
    });
  }

  // ==============================
  // SEARCH
  // ==============================

  async function searchMovies(query) {
    const requestId = ++searchRequest;

    if (!query.trim()) {
      hide(elements.searchResults);
      show(elements.home);
      return;
    }

    show(elements.searchResults);
    hide(elements.home);
    hide(elements.details);

    const list = elements.searchList;
    if (!list) return;

    list.innerHTML = "<p class='search-message'>Searching...</p>";

    try {
      const data = await api("/search/multi", {
        query,
        include_adult: false
      });

      if (requestId !== searchRequest) return;

      const results = (data.results || []).filter(item =>
        ["movie", "tv"].includes(item.media_type)
      );

      list.replaceChildren();

      if (!results.length) {
        list.innerHTML = "<p class='search-message'>No results found.</p>";
        return;
      }

      results.forEach(item => {
        list.appendChild(createCard(item));
      });

    } catch (error) {
      console.error("Search error:", error);
      list.innerHTML = "<p class='search-message'>Search failed. Please try again.</p>";
    }
  }

  if (elements.searchInput) {
    elements.searchInput.addEventListener("input", event => {
      const query = event.target.value.trim();

      clearTimeout(searchTimer);

      searchTimer = setTimeout(() => {
        searchMovies(query);
      }, 350);
    });
  }

  const searchButton = $("search-btn");

  if (searchButton) {
    searchButton.addEventListener("click", () => {
      searchMovies(elements.searchInput.value.trim());
    });
  }

  // ==============================
  // SHARE POPUP
  // ==============================

  function openSharePopup() {
    const title = currentItem
      ? getTitle(currentItem)
      : "MovieFlixHD";

    setText("share-modal-title", `Share ${title}`);
    setText(
      "share-modal-description",
      "Share this movie or series with your friends."
    );

    show(elements.shareModal);
    document.body.style.overflow = "hidden";
  }

  function closeSharePopup() {
    hide(elements.shareModal);
    document.body.style.overflow = "";
  }

  function getShareLink() {
    if (!currentItem) return window.location.href;

    const url = new URL(window.location.href);
    url.search = "";

    if (currentItem.media_type === "tv") {
      url.searchParams.set("tv", currentItem.id);
    } else {
      url.searchParams.set("movie", currentItem.id);
    }

    return url.toString();
  }

  async function shareTo(platform) {
    const link = getShareLink();
    const title = currentItem ? getTitle(currentItem) : "MovieFlixHD";
    const encodedLink = encodeURIComponent(link);
    const encodedTitle = encodeURIComponent(title);

    const shareUrls = {
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedLink}`,
      messenger: `https://www.facebook.com/dialog/send?link=${encodedLink}&app_id=`,
      whatsapp: `https://wa.me/?text=${encodedTitle}%20${encodedLink}`,
      telegram: `https://t.me/share/url?url=${encodedLink}&text=${encodedTitle}`,
      x: `https://twitter.com/intent/tweet?url=${encodedLink}&text=${encodedTitle}`
    };

    if (platform === "copy") {
      try {
        await navigator.clipboard.writeText(link);
        setText("share-popup-feedback", "Link copied!");
      } catch (error) {
        setText(
          "share-popup-feedback",
          "Unable to copy automatically. Please copy the page link."
        );
      }
      return;
    }

    if (platform === "tiktok") {
      try {
        await navigator.clipboard.writeText(link);
        setText(
          "share-popup-feedback",
          "Link copied! You can paste it into TikTok."
        );
      } catch (error) {
        setText("share-popup-feedback", "Please copy the page link manually.");
      }
      return;
    }

    const destination = shareUrls[platform];

    if (destination) {
      window.open(destination, "_blank", "noopener,noreferrer");
    }
  }

  const shareButton = $("details-share-btn");

  if (shareButton) {
    shareButton.addEventListener("click", openSharePopup);
  }

  if (elements.shareModal) {
    elements.shareModal.addEventListener("click", event => {
      if (event.target === elements.shareModal) {
        closeSharePopup();
      }
    });
  }

  // ==============================
  // HOME / BACK BUTTON
  // ==============================

  function goHome() {
    currentItem = null;
    currentMovie = null;
    currentSeries = null;
    episodes = [];

    hide(elements.details);
    hide(elements.searchResults);
    show(elements.home);

    clearAddress();

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const backButton = document.querySelector(".back-btn");

  if (backButton) {
    backButton.addEventListener("click", goHome);
  }

  // ==============================
  // KEYBOARD SHORTCUTS
  // ==============================

  document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
      closeModal();
      closeSharePopup();
    }
  });

  // ==============================
  // DIRECT LINK ROUTING
  // ==============================

  async function handleDirectLink() {
    const params = new URLSearchParams(window.location.search);

    const movieId = params.get("movie");
    const tvId = params.get("tv");
    const season = params.get("season");

    if (movieId) {
      await openMovie(movieId, false);
    } else if (tvId) {
      await openSeries(
        tvId,
        false,
        season ? Number(season) : null
      );
    }
  }

  window.addEventListener("popstate", handleDirectLink);

  // ==============================
  // GLOBAL FUNCTIONS FOR HTML
  // ==============================

  window.selectServer = selectServer;
  window.shareTo = shareTo;
  window.closeModal = closeModal;
  window.openSharePopup = openSharePopup;
  window.closeSharePopup = closeSharePopup;

  // ==============================
  // START WEBSITE
  // ==============================

  loadHome();
  handleDirectLink();

})();
