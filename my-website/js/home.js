(function () {
  const k = "MWJkMjhkZWU5NTMzYTBiMWVkMjkyNTQ5ZDgyNmY4OGI="
    .split("").reverse().join("");
  window.API_KEY = atob(k.split("").reverse().join(""));
})();

const BASE = "https://api.themoviedb.org/3";
const IMG = "https://image.tmdb.org/t/p/original";

let currentItem=null;
let bannerItem=null;
let adClicked=false;

/* FETCH */
async function fetchJSON(url){
  try{
    const r=await fetch(url);
    return r.ok?await r.json():null;
  }catch{return null;}
}

async function fetchTrending(type){
  const d=await fetchJSON(`${BASE}/trending/${type}/week?api_key=${API_KEY}`);
  return d?.results||[];
}

/* BANNER */
function displayBanner(item){
  if(!item)return;

  document.getElementById("banner").style.backgroundImage=`url(${IMG}${item.backdrop_path})`;
  document.getElementById("banner-title").textContent=item.title||item.name;
  document.getElementById("banner-desc").textContent=item.overview||"Watch now";

  bannerItem=item;
}

function openFromBanner(){
  if(bannerItem) showDetails(bannerItem);
}

/* LIST */
function displayList(items,id){
  const el=document.getElementById(id);
  el.innerHTML="";

  items.forEach(i=>{
    if(!i.poster_path)return;
    const img=document.createElement("img");
    img.src=IMG+i.poster_path;
    img.onclick=()=>showDetails(i);
    el.appendChild(img);
  });
}

/* MODAL */
function showDetails(item){
  currentItem=item;
  adClicked=false;

  document.getElementById("modal").style.display="flex";

  document.getElementById("modal-title").textContent=item.title||item.name;
  document.getElementById("modal-description").textContent=item.overview;

  showPreview();
}

function closeModal(){
  document.getElementById("modal").style.display="none";
  document.querySelector(".video-container").innerHTML="";
}

/* PLAYER */
function showPreview(){
  const c=document.querySelector(".video-container");

  c.innerHTML=`<div style="background:url(${IMG}${currentItem.backdrop_path}) center/cover;height:100%;display:flex;align-items:center;justify-content:center;cursor:pointer">▶</div>`;

  c.onclick=loadVideo;
}

function loadVideo(){
  const c=document.querySelector(".video-container");

  if(!adClicked){
    adClicked=true;
    window.open("ads link here","_blank");
    return;
  }

  const id=currentItem.id;
  const url=currentItem.title
  ?`https://zxcstream.xyz/embed/movie/${id}`
  :`https://zxcstream.xyz/embed/tv/${id}/1/1`;

  c.innerHTML=`<iframe src="${url}" allowfullscreen></iframe>`;
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

  d.results.forEach(i=>{
    if(!i.poster_path)return;
    const img=document.createElement("img");
    img.src=IMG+i.poster_path;
    img.onclick=()=>showDetails(i);
    el.appendChild(img);
  });
}

/* INIT */
async function init(){
  const m=await fetchTrending("movie");
  const tv=await fetchTrending("tv");

  if(m.length) displayBanner(m[0]);
  displayList(m,"movies-list");
  displayList(tv,"tvshows-list");
}

init();
