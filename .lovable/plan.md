## Goal
Aapki site Google search results mein dikhe (sirf direct URL se nahi).

## Why it's not showing
Google ko naye sites discover, crawl, aur index karne mein time lagta hai. Aapki site abhi tak Google ke index mein nahi hai (ya partially hai). Direct link kaam karta hai kyunki browser seedha site khol raha hai — Google ka role nahi.

## Steps

### 1. Sitemap aur robots.txt setup
- `src/routes/sitemap[.]xml.ts` banayenge — saare public routes (`/`, `/auth`, `/dashboard`) include karega, `https://desiplayy.lovable.app` base URL ke saath
- `public/robots.txt` banayenge — `Allow: /` aur `Sitemap:` directive ke saath

### 2. Per-route SEO metadata strengthen
- `/auth` aur `/dashboard` route files mein `head()` add karenge with unique title + description + og tags
- Currently sirf `/` aur root pe meta hai

### 3. Google Search Console verification (aapko karna hoga, main guide karunga)
- Google Search Console mein property add karein: `https://desiplayy.lovable.app`
- Verification meta tag generate hoga
- Main woh tag aapke `__root.tsx` ke head mein add kar dunga
- Verify karne ke baad sitemap submit karein: `https://desiplayy.lovable.app/sitemap.xml`
- "Request indexing" use karke pages submit karein

### 4. Expectations set karna
- Verification ke baad bhi Google ko **2-4 weeks** lag sakte hain pages ko rank karne mein
- "DesiPlay" naam pe rank karne ke liye backlinks aur traffic chahiye hoga
- Brand naam search jaise "desiplay games" — yeh pehle dikhna shuru hoga

## What I'll need from you
- Google Search Console pe jaake verification meta tag generate karna (ya bolo toh Google Search Console connector use karke main automate kar dunga)

## Technical notes
- TanStack Start server route for sitemap (dynamic, route-aware)
- robots.txt as static file in `public/`
- Meta tags via per-route `head()` in `createFileRoute`
- Canonical tags leaf routes pe (root pe nahi — duplicate hoga)
