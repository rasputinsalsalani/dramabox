(function () {
  const k = "MWJkMjhkZWU5NTMzYTBiMWVkMjkyNTQ5ZDgyNmY4OGI="
    .split("").reverse().join("");
  window.API_KEY = atob(k.split("").reverse().join(""));
})();

const BASE="https://api.themoviedb.org/3";
const IMG="https://image.tmdb.org/t/p/w500";

let currentItem=null;
let bannerItem=null;

/* FETCH */
async function fetchJSON(url){
  try{
    const r=await fetch(url);
    return r.ok?await r.json():null;
  }catch{return null;}
}

/* CATEGORY */
async function fetchMovies(){
  return (await fetchJSON(`${BASE}/trending/movie/week?api_key=${API_KEY}`))?.results||[];
}
async function fetchTV(){
  const d=await fetchJSON(`${BASE}/trending/tv/week?api_key=${API_KEY}`);
  return (d?.results||[]).filter(i=>!(i.genre_ids||[]).includes(16));
}
async function fetchAnime(){
  const d=await fetchJSON(`${BASE}/trending/tv/week?api_key=${API_KEY}`);
  return (d?.results||[]).filter(i=>(i.genre_ids||[]).includes(16));
}

/* BANNER */
function displayBanner(item){
  document.getElementById("banner").style.backgroundImage=`url(${IMG}${item.backdrop_path})`;
  document.getElementById("banner-title").textContent=item.title||item.name;
  document.getElementById("banner-desc").textContent=(item.overview||"Watch now").slice(0,100)+"...";
  bannerItem=item;
}

function openFromBanner(){
  if(bannerItem) showDetails(bannerItem);
}

/* LIST */
function displayList(items,id){
  const el=document.getElementById(id);
  el.innerHTML="";

  items.slice(0,18).forEach(i=>{
    if(!i.poster_path)return;

    const img=document.createElement("img");
    img.src=IMG+i.poster_path;
    img.onclick=()=>showDetails(i);
    el.appendChild(img);
  });
}

/* MODAL + MOVIE PLAYER */
function showDetails(item){
  currentItem=item;

  document.getElementById("modal").style.display="flex";
  document.getElementById("modal-title").textContent=item.title||item.name;
  document.getElementById("modal-description").textContent=item.overview||"No description";

  const type=item.title ? "movie" : "tv";
  const id=item.id;

  let url = type==="movie"
    ? `https://zxcstream.xyz/embed/movie/${id}?autoplay=1`
    : `https://zxcstream.xyz/embed/tv/${id}/1/1?autoplay=1`;

  const c=document.querySelector(".video-container");

  c.innerHTML=`
    <iframe 
      src="${url}" 
      allowfullscreen 
      allow="autoplay; fullscreen"
    ></iframe>
  `;
}

function closeModal(){
  document.getElementById("modal").style.display="none";
  document.querySelector(".video-container").innerHTML="";
}

/* SEARCH */
async function searchTMDB(q){
  if(!q){
    document.getElementById("search-section").hidden=true;
    return;
  }

  const d=await fetchJSON(`${BASE}/search/multi?api_key=${API_KEY}&query=${q}`);
  const el=document.getElementById("search-results");

  el.innerHTML="";
  document.getElementById("search-section").hidden=false;

  (d?.results||[]).forEach(i=>{
    if(!i.poster_path)return;
    const img=document.createElement("img");
    img.src=IMG+i.poster_path;
    img.onclick=()=>showDetails(i);
    el.appendChild(img);
  });
}

/* INIT */
async function init(){
  const m=await fetchMovies();
  const tv=await fetchTV();
  const anime=await fetchAnime();

  if(m.length) displayBanner(m[0]);

  displayList(m,"movies-list");
  displayList(tv,"tvshows-list");
  displayList(anime,"anime-list");
}

init();
