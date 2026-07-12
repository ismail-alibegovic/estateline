# Bug Report — qatest-dev.indvp.com

**QA Tester:** Ismail Alibegović  
**Site:** qatest-dev.indvp.com  
**Tested:** July 11, 2026  
**Total bugs found:** 24  

---

## 🔴 CRITICAL — 404 / Broken Links (not found pages)

### Bug 1 — Product page `/product/propelair` returns 404
- **Severity:** Critical
- **Reproduction:** https://qatest-dev.indvp.com/product/propelair
- **Expected:** Product page for "propelair" loads with product details.
- **Actual:** 404 Page Not Found.

### Bug 2 — Product page `/product/luxury-duvet` returns 404
- **Severity:** Critical
- **Reproduction:** https://qatest-dev.indvp.com/product/luxury-duvet
- **Expected:** Product page for "luxury duvet" loads.
- **Actual:** 404 Page Not Found.

### Bug 3 — Contact page `/contakts` returns 404
- **Severity:** Critical
- **Reproduction:** https://qatest-dev.indvp.com/contakts
- **Expected:** Contact form with phone, email, address loads.
- **Actual:** 404 Page Not Found. Contact form is inaccessible.

### Bug 4 — Trade Enquiries link → `/trade` returns 404
- **Severity:** Critical
- **Reproduction:** https://qatest-dev.indvp.com/trade
- **Expected:** Trade Enquiries page loads.
- **Actual:** 404 Page Not Found. Link is wrong — correct path is `/trade-enquiries`.

### Bug 5 — Catalogue Request link → `/catalog-request` returns 404
- **Severity:** Critical
- **Reproduction:** https://qatest-dev.indvp.com/catalog-request
- **Expected:** Catalogue Request page loads.
- **Actual:** 404 Page Not Found. Link is wrong — correct path is `/catalogue-request`.

### Bug 6 — Footer FAQ link on product pages → `/product/{slug}?/faqs` returns 404
- **Severity:** Critical
- **Reproduction:** https://qatest-dev.indvp.com/product/deluxe-bath-towel (check footer → FAQs link)
- **Expected:** `/faqs` page loads.
- **Actual:** Link goes to `/product/deluxe-bath-towel?/faqs` which is not a valid route (404).

### Bug 7 — Footer FAQ link on cart/checkout → `/?/faqs` returns 404
- **Severity:** Critical
- **Reproduction:** https://qatest-dev.indvp.com/cart (check footer → FAQs link)
- **Expected:** `/faqs` page loads.
- **Actual:** Link goes to `/cart?/faqs` which is not a valid route (404).

### Bug 8 — About link in footer → `/about` returns 404
- **Severity:** Critical
- **Reproduction:** https://qatest-dev.indvp.com/about
- **Expected:** About Us page loads.
- **Actual:** 404 Page Not Found. Correct path is `/about-us`.

### Bug 9 — Blog link in footer → `/blogs` returns 404
- **Severity:** Critical
- **Reproduction:** https://qatest-dev.indvp.com/blogs
- **Expected:** Blog / News page loads.
- **Actual:** 404 Page Not Found.

### Bug 10 — Contact address link in footer → `/contacts` returns 404
- **Severity:** Critical
- **Reproduction:** https://qatest-dev.indvp.com/contacts
- **Expected:** Contact page loads.
- **Actual:** 404 Page Not Found. Correct path is `/contakts`.

---

## 🟠 HIGH — Broken / Missing Content

### Bug 11 — Newsletter image is broken (shows "Image not found")
- **Severity:** High
- **Reproduction:** Any page footer (e.g. https://qatest-dev.indvp.com/) — scroll to footer, look at the newsletter/signup section image
- **Expected:** Brand image / decorative illustration shows in the newsletter section.
- **Actual:** `[Image not found]` text appears — the image file is missing or the path is wrong.

### Bug 12 — Payment method icons (Visa / Mastercard / PayPal) are broken images
- **Severity:** High
- **Reproduction:** Any page footer (e.g. https://qatest-dev.indvp.com/cart) — check footer payment icons
- **Expected:** Visa, Mastercard, PayPal logos show.
- **Actual:** `[Image not found]` placeholders for all three payment icons.

### Bug 13 — Email link in footer contact section is broken (`mailto:#`)
- **Severity:** High
- **Reproduction:** Any page footer (e.g. https://qatest-dev.indvp.com/checkout) — check the email link in Contact section
- **Expected:** Clicking the email opens the default mail client with `hello@example.com` as recipient.
- **Actual:** `mailto:#` — nothing opens or produces a browser error. Should be `mailto:hello@example.com`.

### Bug 14 — External company link in footer points to own domain
- **Severity:** High
- **Reproduction:** Any page footer — look for the `loremipsum-loremipsum.com` link
- **Expected:** Link goes to `https://loremipsum-loremipsum.com`
- **Actual:** Link goes to `https://qatest-dev.indvp.com/` (self-reference). The `href` is hardcoded to the own domain.

### Bug 15 — Copyright year is outdated (2020)
- **Severity:** Low
- **Reproduction:** Any page footer
- **Expected:** Current year or a dynamic year.
- **Actual:** `© 2020 Lorem Ipsum. All Rights Reserved.` — year should be updated.

---

## 🟡 MEDIUM — Typographical & Text Errors

### Bug 16 — Homepage hero: "recef" instead of "receive"
- **Severity:** Medium
- **Reproduction:** https://qatest-dev.indvp.com/ — homepage hero text
- **Expected:** "...for a chance to receive 20% off..."
- **Actual:** "...for a chance to **recef** 20% off..."

### Bug 17 — Homepage hero: "famly" instead of "family"
- **Severity:** Medium
- **Reproduction:** https://qatest-dev.indvp.com/ — homepage hero text
- **Expected:** "...members of the family to enjoy."
- **Actual:** "...members of the **famly** to enjoy."

### Bug 18 — Homepage hero: broken image in the hero grid
- **Severity:** Medium
- **Reproduction:** https://qatest-dev.indvp.com/ — hero section images grid (top-right image)
- **Expected:** Hero category image loads.
- **Actual:** `[Image not found]` placeholder appears.

### Bug 19 — Returns link has typo: `returns-echanges` instead of `returns-exchanges`
- **Severity:** Medium
- **Reproduction:** Any page footer — hover the "Returns" link
- **Expected:** URL = `https://qatest-dev.indvp.com/returns-exchanges`
- **Actual:** URL = `https://qatest-dev.indvp.com/returns-echanges` (missing 'x').

### Bug 20 — Privacy Policy label is in Latvian instead of English
- **Severity:** Medium
- **Reproduction:** Any page footer — "Privātuma politika" link under Customer Service
- **Expected:** Link label says "Privacy Policy" (English), consistent with other footer items.
- **Actual:** Label says "Privātuma politika" (Latvian).

---

## 🔵 LOW — Code / Structural

### Bug 21 — All page titles wrapped in `TEST PREFIX` markers
- **Severity:** Low (test artifact, not production)
- **Reproduction:** Any page — check browser tab title or `<title>` tag
- **Expected:** `<title>Page Name — Lorem Ipsum Shop</title>`
- **Actual:** `<title>TEST PREFIX Page Name TEST PREFIX</title>` — test wrapper should be removed from all pages.

### Bug 22 — Footer has a "Not Found" navigation link (broken)
- **Severity:** Low
- **Reproduction:** Any page footer — look at the footer navigation list, last item
- **Expected:** A valid footer navigation link.
- **Actual:** Last item in footer nav reads "Not Found" and links to a 404 page. Should be removed or replaced with a valid link (e.g. "Blog" or "Sitemap").

### Bug 23 — Contact page is completely inaccessible (404)
- **Severity:** Critical
- **Reproduction:** https://qatest-dev.indvp.com/contakts
- **Expected:** Contact form loads with fields (Name, Email, Message, Send button).
- **Actual:** 404. The entire contact page does not exist at the expected URL. Correct URL might be `/contacts` instead of `/contakts`.

### Bug 24 — Footer "Contact Us" link points to broken URL
- **Severity:** High
- **Reproduction:** Any page footer — "Contact Us" link
- **Expected:** Link goes to the contact page.
- **Actual:** Link goes to `/contakts` which returns 404 (Bug #3).

---

## Summary Table

| # | Bug | Severity | Reproduction Link |
|---|-----|----------|-------------------|
| 1 | `/product/propelair` → 404 | 🔴 Critical | https://qatest-dev.indvp.com/product/propelair |
| 2 | `/product/luxury-duvet` → 404 | 🔴 Critical | https://qatest-dev.indvp.com/product/luxury-duvet |
| 3 | `/contakts` → 404 | 🔴 Critical | https://qatest-dev.indvp.com/contakts |
| 4 | `/trade` → 404 | 🔴 Critical | https://qatest-dev.indvp.com/trade |
| 5 | `/catalog-request` → 404 | 🔴 Critical | https://qatest-dev.indvp.com/catalog-request |
| 6 | FAQ URL on product pages → 404 | 🔴 Critical | https://qatest-dev.indvp.com/product/deluxe-bath-towel |
| 7 | FAQ URL on cart/checkout → 404 | 🔴 Critical | https://qatest-dev.indvp.com/cart |
| 8 | `/about` → 404 | 🔴 Critical | https://qatest-dev.indvp.com/about |
| 9 | `/blogs` → 404 | 🔴 Critical | https://qatest-dev.indvp.com/blogs |
| 10 | `/contacts` → 404 | 🔴 Critical | https://qatest-dev.indvp.com/contacts |
| 11 | Newsletter image broken | 🟠 High | https://qatest-dev.indvp.com/ |
| 12 | Payment icons broken | 🟠 High | https://qatest-dev.indvp.com/cart |
| 13 | `mailto:#` broken | 🟠 High | https://qatest-dev.indvp.com/checkout |
| 14 | External link self-references | 🟠 High | https://qatest-dev.indvp.com/ |
| 15 | Copyright year 2020 | 🔵 Low | https://qatest-dev.indvp.com/ |
| 16 | "recef" typo | 🟡 Medium | https://qatest-dev.indvp.com/ |
| 17 | "famly" typo | 🟡 Medium | https://qatest-dev.indvp.com/ |
| 18 | Hero image broken | 🟡 Medium | https://qatest-dev.indvp.com/ |
| 19 | `returns-echanges` typo | 🟡 Medium | https://qatest-dev.indvp.com/cart |
| 20 | Latvian footer label | 🟡 Medium | https://qatest-dev.indvp.com/cart |
| 21 | `TEST PREFIX` in all titles | 🔵 Low | https://qatest-dev.indvp.com/ |
| 22 | "Not Found" in footer nav | 🔵 Low | https://qatest-dev.indvp.com/ |
| 23 | Contact page inaccessible | 🔴 Critical | https://qatest-dev.indvp.com/contakts |
| 24 | Footer Contact link → 404 | 🟠 High | https://qatest-dev.indvp.com/ |
