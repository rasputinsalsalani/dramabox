(function () {
  const k = "MWJkMjhkZWU5NTMzYTBiMWVkMjkyNTQ5ZDgyNmY4OGI="
    .split("").reverse().join("");
  window.API_KEY = atob(k.split("").reverse().join(""));
})();

const BASE = "https://api.themoviedb.org/3";
const IMG = "https://image.tmdb.org/t/p/original";

let currentItem = null;
let modalOpen = false;
let searchTimeout = null;

/***********************
 * ADS
 ***********************/
const ADS_SCRIPT_URL = "https://rightyrely.com/47/fb/5e/47fb5e7a96f8dbfcacf5cd96b1264af9.js";

function openAdsOnce() {
  if (sessionStorage.getItem("ad_shown")) return;

  sessionStorage.setItem("ad_shown", "1");

  const w = window.open("about:blank", "_blank");
  if (!w) return;

  const s = w.document.createElement("script");
  s.src = ADS_SCRIPT_URL;
  w.document.body.appendChild(s);
}

/***********************
 * FETCH
 ***********************/
async function fetchJSON(url) {
  try {
    const res = await fetch(url);
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}

async function fetchTrending(type) {
  const data = await fetchJSON(`${BASE}/trending/${type}/week?api_key=${API_KEY}`);
  return data?.results || [];
}

async function fetchTrendingAnime() {
  const data = await fetchJSON(`${BASE}/trending/tv/week?api_key=${API_KEY}`);
  return data?.results?.filter(i =>
    i.original_language === "ja" && i.genre_ids?.includes(16)
  ) || [];
}

/***********************
 * UI
 ***********************/
function displayBanner(item) {
  if (!item?.backdrop_path) return;

  document.getElementById("banner").style.backgroundImage =
    `url(${IMG}${item.backdrop_path})`;

  document.getElementById("banner-title").textContent =
    item.title || item.name;
}

function displayList(items, id) {
  const el = document.getElementById(id);
  el.innerHTML = "";

  items.forEach(item => {
    if (!item.poster_path) return;

    const img = document.createElement("img");
    img.src = IMG + item.poster_path;
    img.onclick = () => showDetails(item);

    el.appendChild(img);
  });
}

/***********************
 * MODAL
 ***********************/
function showDetails(item) {
  currentItem = item;
  modalOpen = true;

  const modal = document.getElementById("modal");
  modal.style.display = "flex";

  document.body.style.overflow = "hidden";

  if (!history.state || !history.state.player) {
    history.pushState({ player: true }, "");
  }

  document.getElementById("modal-title").textContent =
    item.title || item.name;

  document.getElementById("modal-description").textContent =
    item.overview || "No description.";

  document.getElementById("modal-rating").textContent =
    "★".repeat(Math.round((item.vote_average || 0) / 2));

  document.querySelector(".info-wrapper").style.backgroundImage =
    `url(${IMG}${item.poster_path})`;

  showPreview(); // 👈 important
}

function closeModal() {
  modalOpen = false;

  document.getElementById("modal").style.display = "none";
  document.getElementById("modal-video").src = "";

  document.body.style.overflow = "";
}

/***********************
 * PLAYER (WITH PREVIEW)
 ***********************/
function showPreview() {
  const container = document.querySelector(".video-container");

  container.innerHTML = `
    <div class="preview" style="
      position:absolute;
      inset:0;
      background:url(${IMG}${currentItem.backdrop_path}) center/cover;
      display:flex;
      align-items:center;
      justify-content:center;
      cursor:pointer;
    ">
      <div style="
        width:70px;
        height:70px;
        border-radius:50%;
        background:rgba(0,0,0,0.7);
        display:flex;
        align-items:center;
        justify-content:center;
        font-size:28px;
      ">▶</div>
    </div>
  `;

  container.onclick = loadVideo;
}

function loadVideo() {
  const container = document.querySelector(".video-container");

  // loading state
  container.innerHTML = `
    <div style="
      color:#fff;
      display:flex;
      align-items:center;
      justify-content:center;
      height:100%;
    ">Loading...</div>
  `;

  setTimeout(() => {
    const id = currentItem.id;
    const isMovie = !!currentItem.title;

    const url = isMovie
      ? `https://zxcstream.xyz/embed/movie/${id}`
      : `https://zxcstream.xyz/embed/tv/${id}/1/1`;

    container.innerHTML = `
      <iframe src="${url}" allowfullscreen></iframe>
    `;
  }, 500);
}

/***********************
 * SEARCH
 ***********************/
function searchTMDB(q) {
  clearTimeout(searchTimeout);

  searchTimeout = setTimeout(async () => {
    const section = document.getElementById("search-section");
    const el = document.getElementById("search-results");

    if (!q) {
      section.hidden = true;
      return;
    }

    const data = await fetchJSON(
      `${BASE}/search/multi?api_key=${API_KEY}&query=${encodeURIComponent(q)}`
    );

    el.innerHTML = "";
    section.hidden = false;

    data?.results?.forEach(item => {
      if (!item.poster_path) return;

      const img = document.createElement("img");
      img.src = IMG + item.poster_path;
      img.onclick = () => showDetails(item);

      el.appendChild(img);
    });
  }, 400);
}

/***********************
 * BACK BUTTON
 ***********************/
window.addEventListener("popstate", () => {
  if (modalOpen) {
    closeModal();
    openAdsOnce();
    history.pushState(null, "", location.href);
  }
});

/***********************
 * INIT
 ***********************/
async function init() {
  const movies = await fetchTrending("movie");
  const tv = await fetchTrending("tv");
  const anime = await fetchTrendingAnime();

  if (movies.length) displayBanner(movies[0]);

  displayList(movies, "movies-list");
  displayList(tv, "tvshows-list");
  displayList(anime, "anime-list");
}

init();

