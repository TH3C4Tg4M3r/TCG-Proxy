import express from "express";
import fetch from "node-fetch";
import * as cheerio from "cheerio";

const app = express();
const PORT = process.env.PORT || 10000;

// Homepage with input box + auto https
app.get("/", (req, res) => {
  res.send(`
    <html>
      <head>
        <title>Web Proxy</title>
        <style>
          body { font-family: sans-serif; text-align: center; padding-top: 50px; }
          input { width: 300px; padding: 8px; font-size: 16px; }
          button { padding: 8px 16px; font-size: 16px; }
        </style>
      </head>
      <body>
        <h1>Enter a website to visit:</h1>
        <form id="proxyForm" action="/proxy" method="get">
          <input id="urlInput" name="url" placeholder="https://example.com" required/>
          <button type="submit">Go</button>
        </form>

        <script>
          const form = document.getElementById("proxyForm");
          const input = document.getElementById("urlInput");

          form.addEventListener("submit", function(e) {
            let val = input.value.trim();
            if (!val.startsWith("http://") && !val.startsWith("https://")) {
              input.value = "https://" + val;
            }
          });
        </script>
      </body>
    </html>
  `);
});

// Stable proxy route
app.get("/proxy", async (req, res) => {
  try {
    const target = req.query.url;
    if (!target) return res.send("Missing ?url=");

    const base = new URL(target);
    const response = await fetch(base.href, { headers: { "User-Agent": "Mozilla/5.0" } });
    const html = await response.text();
    const $ = cheerio.load(html, { decodeEntities: false });

    // Rewrite links and images
    $("a").each((_, el) => {
      const val = $(el).attr("href");
      if (!val) return;
      try { $(el).attr("href", `/proxy?url=${encodeURIComponent(new URL(val, base).href)}`); } catch {}
    });

    $("img").each((_, el) => {
      const val = $(el).attr("src");
      if (!val) return;
      try { $(el).attr("src", `/proxy?url=${encodeURIComponent(new URL(val, base).href)}`); } catch {}
    });

    $("link[rel='stylesheet']").each((_, el) => {
      const val = $(el).attr("href");
      if (!val) return;
      try { $(el).attr("href", `/proxy?url=${encodeURIComponent(new URL(val, base).href)}`); } catch {}
    });

    res.send($.html());
  } catch (err) {
    console.log(err);
    res.status(500).send("Proxy error");
  }
});

app.listen(PORT, () => {
  console.log(`Running on port ${PORT}`);
});
