(function () {
  const k = "MWJkMjhkZWU5NTMzYTBiMWVkMjkyNTQ5ZDgyNmY4OGI="
    .split("").reverse().join("");
  window.API_KEY = atob(k.split("").reverse().join(""));
})();

const BASE="https://api.themoviedb.org/3";
const IMG="https://image.tmdb.org/t/p/original";

let currentItem=null;
let bannerItem=null;

/* FETCH */
async function fetchJSON(url){
  try{
    const r=await fetch(url);
    return r.ok?await r.json():null;
  }catch{return null;}
}

/* FETCH TRAILER */
async function getTrailer(id,type){
  const d=await fetchJSON(`${BASE}/${type}/${id}/videos?api_key=${API_KEY}`);
  const v=(d?.results||[]).find(v=>v.type==="Trailer" && v.site==="YouTube");
  return v ? `https://www.youtube.com/embed/${v.key}?autoplay=1&mute=1` : null;
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
async function displayBanner(item){
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

/* MODAL */
async function showDetails(item){
  currentItem=item;

  document.getElementById("modal").style.display="flex";
  document.getElementById("modal-title").textContent=item.title||item.name;
  document.getElementById("modal-description").textContent=item.overview||"No description";

  const type=item.title?"movie":"tv";
  const trailer=await getTrailer(item.id,type);

  const c=document.querySelector(".video-container");

  if(trailer){
    c.innerHTML=`<iframe src="${trailer}" allowfullscreen></iframe>`;
  }else{
    c.innerHTML=`<p style="padding:20px">No trailer available</p>`;
  }
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
