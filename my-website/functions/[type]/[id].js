
export async function onRequest(context) {
  const { request, params, env } = context;
  const type = params.type;
  const id = params.id;

  if (!["movie", "tv"].includes(type) || !/^\d+$/.test(id)) {
    return new Response("Not found", { status: 404 });
  }

  const incomingUrl = new URL(request.url);
  const season = incomingUrl.searchParams.get("season");
  const apiKey = env.TMDB_API_KEY;

  if (!apiKey) {
    return new Response("TMDB_API_KEY is not configured.", {
      status: 500
    });
  }

  try {
    const endpoint = type === "movie" ? "movie" : "tv";
    const tmdbUrl = new URL(
      `https://api.themoviedb.org/3/${endpoint}/${id}`
    );

    tmdbUrl.searchParams.set("api_key", apiKey);
    tmdbUrl.searchParams.set("language", "en-US");

    const response = await fetch(tmdbUrl);

    if (!response.ok) {
      return new Response("Movie not found.", { status: 404 });
    }

    const item = await response.json();
    const title = item.title || item.name || "MovieFlixHD";
    const description =
      item.overview || "Discover this movie on MovieFlixHD.";

    const poster = item.poster_path
      ? `https://image.tmdb.org/t/p/w780${item.poster_path}`
      : "https://placehold.co/500x750/151515/ffffff?text=No+Poster";

    const shareUrl = incomingUrl.origin + `/${type}/${id}` +
      (type === "tv" && season !== null
        ? `?season=${encodeURIComponent(season)}`
        : "");

    const destination = new URL("/", incomingUrl.origin);

    if (type === "movie") {
      destination.searchParams.set("movie", id);
    } else {
      destination.searchParams.set("tv", id);

      if (season !== null) {
        destination.searchParams.set("season", season);
      }
    }

    const safe = value => String(value).replace(/[&<>"']/g, char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    })[char]);

    const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${safe(title)} | MovieFlixHD</title>
  <meta name="description" content="${safe(description)}">

  <meta property="og:type" content="video.movie">
  <meta property="og:site_name" content="MovieFlixHD">
  <meta property="og:title" content="${safe(title)}">
  <meta property="og:description" content="${safe(description)}">
  <meta property="og:image" content="${safe(poster)}">
  <meta property="og:image:secure_url" content="${safe(poster)}">
  <meta property="og:image:width" content="780">
  <meta property="og:image:alt" content="${safe(title)} poster">
  <meta property="og:url" content="${safe(shareUrl)}">

  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${safe(title)}">
  <meta name="twitter:description" content="${safe(description)}">
  <meta name="twitter:image" content="${safe(poster)}">

  <link rel="canonical" href="${safe(shareUrl)}">

  <script>
    window.location.replace(${JSON.stringify(destination.toString())});
  </script>
</head>
<body>
  <p>Opening ${safe(title)}...</p>
  <p><a href="${safe(destination.toString())}">Continue to MovieFlixHD</a></p>
</body>
</html>`;

    return new Response(html, {
      headers: {
        "Content-Type": "text/html; charset=UTF-8",
        "Cache-Control": "public, max-age=300"
      }
    });

  } catch (error) {
    console.error("Share page error:", error);

    return new Response("Unable to create movie preview.", {
      status: 500
    });
  }
}

