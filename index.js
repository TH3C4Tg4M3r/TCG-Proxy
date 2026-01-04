import express from "express";
import fetch from "node-fetch";
import * as cheerio from "cheerio";
import { URL } from "url";

const app = express();
const PORT = process.env.PORT || 3000;

// Homepage with smart URL input
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

app.get("/proxy", async (req, res) => {
  try {
    const target = req.query.url;
    if (!target) return res.send("Missing ?url=");

    const base = new URL(target);

    const response = await fetch(base.href, {
      headers: { "User-Agent": "Mozilla/5.0" }
    });

    let html = await response.text();
    const $ = cheerio.load(html, { decodeEntities: false });

    // Only rewrite CSS links and images
    $("link[rel='stylesheet'], img").each((_, el) => {
      const attr = el.name === "link" ? "href" : "src";
      const val = $(el).attr(attr);
      if (!val) return;

      try {
        const abs = new URL(val, base).href;
        $(el).attr(attr, `/proxy?url=${encodeURIComponent(abs)}`);
      } catch {}
    });

    // Rewrite <a> links to go through proxy
    $("a").each((_, el) => {
      const val = $(el).attr("href");
      if (!val) return;

      try {
        const abs = new URL(val, base).href;
        $(el).attr("href", `/proxy?url=${encodeURIComponent(abs)}`);
      } catch {}
    });

    res.send($.html());
  } catch (e) {
    console.log(e);
    res.status(500).send("Proxy error");
  }
});
