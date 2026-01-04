import express from "express";
import fetch from "node-fetch";
import * as cheerio from "cheerio";
import { URL } from "url";

const app = express();
const PORT = process.env.PORT || 3000;

// Simple homepage with URL input
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
        <form action="/proxy" method="get">
          <input name="url" placeholder="https://example.com" required/>
          <button type="submit">Go</button>
        </form>
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

    // Rewrite all links, scripts, images, and CSS links
    $("a, img, script, link, iframe").each((_, el) => {
      const tag = el.name;
      let attr;

      if (tag === "a" || tag === "link") attr = "href";
      else if (tag === "img" || tag === "script" || tag === "iframe") attr = "src";
      else return;

      const val = $(el).attr(attr);
      if (!val) return;

      try {
        const abs = new URL(val, base).href;
        $(el).attr(attr, `/proxy?url=${encodeURIComponent(abs)}`);
      } catch {}
    });

    // Rewrite inline styles with url(...)
    $("*").each((_, el) => {
      const style = $(el).attr("style");
      if (style && style.includes("url(")) {
        const newStyle = style.replace(/url\((['"]?)(.*?)\1\)/g, (match, quote, path) => {
          try {
            const abs = new URL(path, base).href;
            return `url(${quote}/proxy?url=${encodeURIComponent(abs)}${quote})`;
          } catch {
            return match;
          }
        });
        $(el).attr("style", newStyle);
      }
    });

    res.send($.html());
  } catch (e) {
    console.log(e);
    res.status(500).send("Proxy error");
  }
});
