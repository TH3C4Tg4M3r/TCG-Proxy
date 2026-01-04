import express from "express";
import fetch from "node-fetch";
import * as cheerio from "cheerio";
import { URL } from "url";

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/proxy", async (req, res) => {
  try {
    const target = req.query.url;
    if (!target) return res.send("Missing ?url=");

    const base = new URL(target);

    const response = await fetch(base.href, {
      headers: { "User-Agent": "Mozilla/5.0" }
    });

    let html = await response.text();
    const $ = cheerio.load(html);

    $("a, img, script, link").each((_, el) => {
      const attr =
        el.name === "a" ? "href" :
        el.name === "img" ? "src" :
        el.name === "script" ? "src" :
        "href";

      const val = $(el).attr(attr);
      if (!val) return;

      try {
        const abs = new URL(val, base).href;
        $(el).attr(attr, `/proxy?url=${encodeURIComponent(abs)}`);
      } catch {}
    });

    res.send($.html());
  } catch {
    res.status(500).send("Proxy error");
  }
});

app.listen(PORT, () => {
  console.log("Running on port " + PORT);
});
