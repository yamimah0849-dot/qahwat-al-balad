# Qahwat Al-Balad · قهوة البلد

A one-page bilingual (Arabic / English) demo website for a heritage café in Historic Jeddah, designed by Kayaba.

**Live:** https://yamimah0849-dot.github.io/qahwat-al-balad/

## What's in it

- Arabic (RTL) by default, with an English toggle that remembers the visitor's choice
- Menu with prices in SAR (VAT included), calories, walking minutes, caffeine and allergen tags
- Live "open now / closed" badge in Jeddah time, Google Map, WhatsApp ordering, gallery lightbox
- Plain HTML, CSS and JavaScript: no build step, works on any static host

## Editing

- **Text:** every visible string in `index.html` is a pair: `<span data-l="ar">…</span><span data-l="en">…</span>`. Change both.
- **Menu:** copy or delete a whole `<li class="menu-item">` block (instructions are in a comment above the menu).
- **Hours:** change the visible text *and* the `data-days` / `data-open` / `data-close` attributes of each row.
- **WhatsApp / phone:** search for `wa.me/` and `tel:` and replace the number.
- **Map:** change the coordinates in the map `iframe`, the "Get directions" link and the `geo` block near the top.

## Before using it for a real client

This is a demo. Remove the `<meta name="robots" content="noindex">` line and the `DEMO STRIP` block in `index.html` when a real site goes live.
