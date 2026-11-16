# Campus Sentinel

Anonymous symptom reporting and a live cluster dashboard for campus syndromic surveillance. Class project, not an official ASU service.

Built with plain HTML, CSS and JavaScript. Reports are stored in Firebase Cloud Firestore and the site is hosted free on GitHub Pages.

This project and associated documentation was generated with Anthropic’s Claude LLM.

## Files

| File | What it does |
|---|---|
| `index.html` | The whole app: survey, dashboard (including the Research export tab), method page, and all the logic |
| `firebase-config.js` | Your Firebase project settings (you fill this in) |
| `firestore.rules` | Database security rules (paste into the Firebase console) |
| `seed.html` | Loads 38 example reports for demos |
| `feed.html` | Demo social feed classmates post to during the live demo |
| `worker/` | Python NLP worker for social and news signals (see [The Python worker](#the-python-worker-social-and-news-signals)). Only needed for the live feed and news parts of the demo |
| `wastewater-config.js` | Wastewater targets (viruses, bacteria) and sampling sites with map coordinates. Edit to match your facility |
| `wastewater-import.html` | Signed-in uploaders add wastewater results and SARS-CoV-2 lineage results (CSV), or example data |
| `manifest.webmanifest`, `icon-*.png` | Make "Add to Home Screen" work like an app |

## Setup (about 15 minutes)

### 1. Create the database (Firebase)

1. Go to <https://console.firebase.google.com> and sign in with a Google account.
2. Click **Create a project**. Name it `campus-sentinel`. You can turn off Google Analytics.
3. In the left menu, open **Build → Firestore Database** and click **Create database**.
   - Pick a location close to Arizona, such as `us-west2 (Los Angeles)`. You can't change this later.
   - Choose **Start in production mode**.
4. Open the **Rules** tab. Delete what's there, paste everything from `firestore.rules`, and click **Publish**.
5. Click the gear icon → **Project settings**. Under **Your apps**, click the web icon `</>`. Name it `sentinel` and skip Firebase Hosting.
6. Firebase shows a `firebaseConfig` block. Copy its values into `firebase-config.js`, replacing each `PASTE_...` value.

Firebase's menus change now and then, so the labels may differ slightly.

### 2. Put the site online (GitHub Pages)

1. Create a free account at <https://github.com> if you don't have one.
2. Click **New repository**. Name it `campus-sentinel`, set it to **Public**, and create it.
3. Click **uploading an existing file** and drag in every file from this folder, including your edited `firebase-config.js`. Click **Commit changes**.
4. Go to **Settings → Pages**. Under **Branch**, choose `main` and `/ (root)`, then **Save**.
5. After a minute or two your site is live at `https://YOUR-USERNAME.github.io/campus-sentinel/`.

### 3. Try it

1. Open `https://YOUR-USERNAME.github.io/campus-sentinel/seed.html` and click **Add 38 example reports**.
2. Open the main address and go to the **Dashboard** tab. You should see "Live" in the top corner and the example clusters.
3. On an iPhone: open the site in **Safari** → **Share** → **Add to Home Screen**. It opens full screen with its own icon.

## Wastewater surveillance

The dashboard has a **Wastewater signals** panel with a map. For each sampling site and target, it compares the geometric mean of the last 7 days with the 28 days before. A 2x rise is *elevated* and 4x is *high*; a first detection after only non-detects is *elevated*. When a signal has the same syndrome and place as a symptom cluster, the cluster card shows **+ wastewater**. A signal with no matching cluster is a possible early warning.

The map (Leaflet + OpenStreetMap) shows one circle per sampling site, colored by its strongest signal. Tap a circle for details. Site locations are the `lat` and `lng` values in `wastewater-config.js`.

### More wastewater features

- **Sparklines:** each row of the wastewater table shows the last 5 weeks of samples (log scale), with the baseline as a dashed line.
- **Lead time ("Did wastewater see it first?"):** for each symptom cluster with a matching wastewater signal, the days from the wastewater rise (first sample at 2x baseline or more) to the first symptom onset, with a mini timeline. Rising signals with no matching cluster are listed as possible early warnings.
- **SARS-CoV-2 genomics** (collapsible panel): lineage shares per sample from sequencing (Freyja), as stacked bars per site, plus genetic diversity: the effective number of lineages, e^H, where H is the Shannon index.
- **At a glance:** a short plain-language summary at the bottom of the dashboard, built by rules from the numbers above it.

Lineage names shown in color are listed in `WW_LINEAGES` in `wastewater-config.js` (up to 5, in color order); others count as "Other". To load lineage data, use the second section of `wastewater-import.html`: a CSV with `date,site,lineage,abundance` (one row per lineage, abundance as a fraction), or **Add example lineage data**. The example lineage names are real 2025 Pango lineages used for illustration only; they are not current results.

### One-time setup: who can upload lab data

Anyone can submit a symptom report, but only listed accounts can add wastewater samples. One fake sample would show a "high" alert on every dashboard.

1. Firebase console → **Build → Authentication → Get started**.
2. **Sign-in method** tab → **Google** → **Enable** → choose a support email → **Save**.
3. **Settings** tab → **Authorized domains** → **Add domain** → your GitHub Pages domain, e.g. `yourname.github.io` (no `https://`, no folder).
4. In **Firestore Database → Rules**, paste `firestore.rules` (it now covers `reports`, `wastewater` and `lineages`), replace `YOUR-EMAIL@asu.edu` in `isLabUploader()` with the uploader's Google or ASU email (add teammates comma-separated, each in quotes), and click **Publish**. You can leave the placeholder in the GitHub copy so your email isn't public; the console copy is the one that counts.

### Loading data

1. Edit `wastewater-config.js` so the sites, coordinates and targets match your facility. The included sites and coordinates are placeholders.
2. Open `.../wastewater-import.html` and **Sign in with Google**.
3. Click **Add example wastewater data** and **Add example lineage data** to demo (run `seed.html` too: the examples line up with its Hassayampa and Taylor Place clusters, plus one wastewater-only Salmonella signal at West Valley). For real data, paste or upload a CSV with `date,site,target,copies_per_l,pmmov_copies_per_l`.
4. Samples already stored (same site, target and date) are skipped, so uploading twice is safe.
5. Each site and target needs at least 2 samples this week and 2 in the prior four weeks before it shows up.

Wastewater data is public to read: do not upload anything confidential.

## Social & media signals (NLP)

The dashboard's **Social & media signals** panel shows illness posts found by natural language processing in a demo social feed (`feed.html`), news, school notices and other sources. A Python worker in the `worker/` folder reads each post with OpenAI (or a keyword method as a fallback), extracts symptoms, place, timing and any named disease, and writes only those fields to Firestore (`media_extracted`). The dashboard labels them with the same syndrome and pathogen rules as survey reports, and marks when symptom reports and wastewater agree. Setup and commands are in [The Python worker](#the-python-worker-social-and-news-signals) below.

## The Python worker (social and news signals)

Reads text (demo feed posts, news, school notices, social posts, video transcripts), extracts **whether it describes illness, which symptoms, which place and when**, and writes those fields to Firestore. The dashboard turns them into syndromes and pathogen types with the same rules it uses for survey reports.

| File | What it does |
| --- | --- |
| `extract.py` | The extraction: OpenAI with a strict JSON schema, plus a keyword method (fallback and baseline) |
| `sentinel_worker.py` | Runs it: `live` (demo feed), `rss` (news feeds), `ingest` (a CSV of collected posts), `test` (one sentence) |
| `news_extract.py` | The news extractor: screens each story for health news first, then disease, place and region |
| `news_eval.csv` | 28 labeled news stories for `evaluate.py --news` (written by the developer, so scores are optimistic) |
| `newsfeed.py` | Reads RSS and Atom news feeds (Python standard library only, nothing to install) |
| `demo-news.xml` | Practice news feed: 12 made-up stories from a made-up outlet, for testing and the demo |
| `evaluate.py` | Scores an extractor against hand-labeled posts: precision, recall, F1 |
| `eval_set.csv` | 33 starter labeled posts (written by the developer, so scores on it are optimistic) |
| `requirements.txt` | Python packages |

### Worker setup (about 15 minutes, once)

You need Python 3.10 or newer.

**1. Install the packages.** In a terminal, inside this `worker` folder:

```
pip install -r requirements.txt
```

**2. Get a Firebase service-account key.** The worker writes results with the Firebase Admin SDK, which needs a private key.

1. Firebase console → gear icon → **Project settings** → **Service accounts** → **Generate new private key**.
2. Save the file in this folder as `service-account.json`.
3. **Never upload this file to GitHub.** Anyone with it has full control of your database. The `.gitignore` file in the repository keeps it out of commits, but GitHub's web uploader ignores `.gitignore`, so never drag this file into the browser either.

**3. Set the environment variables.** Do this in the terminal where you'll run the worker.

Mac / Linux:
```
export GOOGLE_APPLICATION_CREDENTIALS="$PWD/service-account.json"
export OPENAI_API_KEY="sk-..."
export OPENAI_BASE_URL="https://openai.rc.asu.edu/v1"   # ASU's gateway
export OPENAI_MODEL="gpt-4o-mini"                       # use a name from: python sentinel_worker.py models
```

Windows (PowerShell):
```
$env:GOOGLE_APPLICATION_CREDENTIALS = "$PWD\service-account.json"
$env:OPENAI_API_KEY = "sk-..."
$env:OPENAI_BASE_URL = "https://openai.rc.asu.edu/v1"
$env:OPENAI_MODEL = "gpt-4o-mini"
```

Check which model names your key can use, and pick one for `OPENAI_MODEL`:

```
python sentinel_worker.py models
```

If the gateway doesn't support strict Structured Outputs, the worker switches to plain JSON mode automatically (it prints a note once); every field is still checked before it's saved.

**4. Publish the new `firestore.rules`** in the Firebase console. They add `media_posts` (demo feed) and `media_extracted` (results).

### Try the worker

```
python sentinel_worker.py test "half my floor at hassy has been throwing up since last night"
python sentinel_worker.py test "this new track is sick" --keywords
python evaluate.py              # keyword method
python evaluate.py --openai     # OpenAI method
```

### Live social feed demo

1. Before class, start the worker and leave it running:
   ```
   python sentinel_worker.py live
   ```
2. Put the dashboard on the projector. Classmates scan the **demo feed** QR code and post.
3. Each post is tagged within a few seconds on the feed ("Detected: vomiting · Hassayampa"), and the **Social & media signals** panel updates. Eight or so stomach-illness posts about one place in 30 minutes produce a **Spike**.
4. If the OpenAI connection fails, the worker switches to the keyword method on its own and prints a warning. Add `--keywords` to use it from the start.

Afterwards, clear the demo: Firebase console → Firestore → `media_posts` and `media_extracted` → **⋮ → Delete collection**.

### News feeds (RSS)

An RSS feed is an XML file a news site keeps updated with its latest stories. Each story is an `<item>` with a `<title>`, `<link>`, `<description>` (short summary), `<pubDate>` and `<guid>` (unique id). The worker reads the headline and summary (plus the start of the article if the summary is short) and saves the result with `source: "news"`.

News gets its own extractor (`news_extract.py`), because stories name diseases and places but rarely list symptoms. It screens each story in steps:

| Field | Values |
| --- | --- |
| `health_topic` | `infectious_disease`, `other_health` (heat, overdoses, gambling, cancer...), `not_health` |
| `report_type` | `cases_or_outbreak`, `exposure_warning`, `advisory_or_prevention`, `research_or_policy`, `past_event`, `none` |
| `pathogen`, `syndrome` | the disease named, and the illness pattern even with no symptoms (a potluck that sickened 12 = stomach) |
| `region`, `place` | `asu_campus` (a hall or campus is named), `arizona`, `elsewhere_us`, `outside_us`; a city like "Tempe" is not a campus |
| `case_count` | the number of sick people, if given |

Only **infectious disease + current cases or an exposure** counts as an illness signal. The log marks each story `SIGNAL`, `health` (health news that isn't a signal) or `skip`.

```
py sentinel_worker.py rss demo-news.xml --dry-run       # practice feed, print only (no Firebase needed)
py sentinel_worker.py rss demo-news.xml                 # practice feed, saved as example data
py sentinel_worker.py rss demo-news.xml --drip 2        # live demo: one practice story every 2 minutes
py sentinel_worker.py rss https://www.abc15.com/index.rss --every 30    # a real feed, checked every 30 minutes
```

- **Which feed?** A station's home feed (like ABC15's `index.rss`) holds a few featured stories that can be weeks old. A Google News search feed is fresher and already focused on illness, for example
  `https://news.google.com/rss/search?q=(norovirus OR flu OR outbreak OR measles) Arizona when:7d&hl=en-US&gl=US&ceid=US:en`
  (put the address in quotes in PowerShell). `when:7d` keeps it to the last 7 days.
- `--max-age 365` also analyzes stories up to a year old. Use it with `--dry-run` to test on older stories; saved stories older than 14 days won't show on the dashboard anyway.
- You can list several feed addresses after `rss`. Each story is processed **once** (its id comes from the feed's `<guid>`), and stories older than 14 days are skipped.
- `--every 30` re-checks every 30 minutes and asks the site "anything new since last time?" (ETag / Last-Modified), so an unchanged feed costs almost nothing. Please don't check more often than every 15 minutes.
- The practice feed is marked as example data, so **Include example data** on the dashboard hides it. Its dates are moved up so the newest story is "now".
- For illness stories only, the **public headline and link** are saved, so the dashboard can list them under **Social & news → News headlines**. The article text is never stored.
- News doesn't count toward the social-media spike rule (one story can stand for many people, and outlets repeat each other's stories). It counts as its own source in **Where the signals agree**.
- Most news names a city, not a campus, so most stories show "Place not named". That is the place check working as intended.

### Adding collected data

Put posts in a CSV with a header row `source,posted_at,text` (optionally `demo` as true/false):

```
source,posted_at,text
news,2026-10-18T14:05:00Z,"Stomach illness reported at an ASU residence hall"
reddit,2026-10-18T16:40:00Z,"anyone else at manzy sick? whole floor is coughing"
```

`source` is one of: `news`, `school`, `reddit`, `x`, `tiktok`, `youtube`, `journal`, `other`. For video, put the transcript in `text`.

```
python sentinel_worker.py ingest posts.csv
```

Running the same file twice adds nothing new. **The text and the author are never stored**: only the source type, time and extracted fields, under an id made by hashing the post.

### Measuring news accuracy

```
py evaluate.py --news            # keyword news screen on news_eval.csv
py evaluate.py --news --openai   # the model
```

It scores the health filter (right `health_topic`), the illness signal (precision, recall, F1), the disease named and the place. It does **not** score symptoms. For an honest score, add real headlines to `news_eval.csv` (for example the ABC15 ones from a `--max-age 365` dry run) and label them before running it.

### Measuring accuracy (days 10–11)

`eval_set.csv` was written alongside the keyword list, so the keyword method scores unrealistically well on it. For a fair score:

1. Collect about 200 posts **written by other people**: demo feed posts from a rehearsal, plus real posts from your sources.
2. Label each one by hand (`is_illness`, `symptoms`, `place`) **before** running the extractor on it.
3. Run `python evaluate.py yourfile.csv --openai` and `python evaluate.py yourfile.csv`, and compare.

## Research data export

The dashboard's **Research** tab lets someone studying specific illnesses and places pull everything the system holds on them.

1. **Pick syndromes** (all six are selected by default) and **places** (grouped by campus; tick a whole group or single halls).
2. **Pick a date range** (presets for 30 days to a year, or any dates) and the **sources**: symptom reports, wastewater samples, SARS-CoV-2 lineages, social posts, news stories.
3. Click **Pull data**. The page reads every matching record straight from Firestore, so it is not limited to the last 70 or 14 days the live dashboard keeps.
4. Preview the first rows, then download CSV files one at a time, or **Download everything (.zip)**.

What you get:

| File | One row per | Notes |
|---|---|---|
| `symptom_reports.csv` | survey report | onset date and MMWR week, residence, campuses, syndrome, pathogen category and confidence, symptoms, severity, exposures |
| `wastewater_samples.csv` | site, target and date | copies per L, PMMoV and the PMMoV-normalized value, site location and scope |
| `sars2_lineages.csv` | sample and lineage | reported and rescaled share, diversity of the sample |
| `social_posts.csv` | illness post | extracted fields only (the post text is never stored) |
| `news_stories.csv` | illness story | outlet, headline, link, region, case count |
| `daily_summary.csv` | date and syndrome | counts from reports, social posts and news |
| `data_dictionary.csv`, `query.json` | (ZIP only) | what every column means, and the exact filters used, so the pull can be repeated and cited |

How the filters work:

- **Syndrome:** reports, posts and stories use their assigned syndrome. A wastewater target is included when it is linked to a selected syndrome in `wastewater-config.js` (for example norovirus, rotavirus, Salmonella and Cryptosporidium for Gastrointestinal). Lineage data is included when SARS-CoV-2's linked syndromes are selected.
- **Place:** reports match the residence chosen. Posts and stories match the place their text names; one that names only a campus counts when you pick an on-campus residence there, and `place_level` says which it was. A wastewater site is included when its sewer line covers a selected residence, or its whole campus when the site is campus-wide.
- **Example data** is left out unless you tick the box. If every syndrome and place is selected, nothing is filtered on them, so posts with no named place are kept.
- Only illness-related posts and stories have a syndrome, so only those are exported.

Notes:

- No Firestore rule changes are needed: the tab only reads collections that are already public.
- Each pull reads every matching document (the free plan allows 50,000 reads a day), so keep ranges as narrow as the question allows.
- Text cells that start with `=`, `+`, `-` or `@` get a leading apostrophe so spreadsheets can't run them as formulas.
- Reports are anonymous, but a count of 1 to 4 in one residence can point to real people. Combine places or weeks, or suppress small counts, before publishing.
- The ZIP uses JSZip from cdnjs. If it doesn't load, the individual CSV buttons still work.

## Setting up the demo

Everything below runs from your live site. The example data uses dates relative to the day you load it, so **do steps 1 to 4 on the day of the demo** (or the evening before).

### Demo A: the dashboard (about 10 minutes, no Python)

1. **Check the basics.** Open your site and go to the **Dashboard** tab. The top corner should say **Live**. If it doesn't, see "If something doesn't work" below.
2. **Load the example reports.** Open `…/seed.html` and click **Add 38 example reports**. It adds a stomach-illness cluster at Hassayampa (9 reports), a flu-like cluster at Gordon Commons in Downtown Phoenix (7), a few more stomach illnesses elsewhere on the Tempe campus, and scattered background illness.
3. **Load the example wastewater data.** Open `…/wastewater-import.html`, **Sign in with Google** (the account must be listed in `firestore.rules`, see "One-time setup: who can upload lab data"), then click **Add example wastewater data** and **Add example lineage data**. The surges are planted to line up with the reports: norovirus rising in Hassayampa's wastewater, influenza A rising in Downtown's, and Salmonella rising at West Valley with no reports at all (an early warning).
4. **Open the Dashboard** and make sure **Include example data** is checked. You should see about 5 potential clusters, 2 at alert level, the wastewater map and table, the lead-time panel (did wastewater see it first?) and the SARS-CoV-2 genomics panel.
5. **Show the research export.** Open the **Research** tab, tick **Include example (demo) data**, pick Gastrointestinal and the Tempe residences, click **Pull data**, and download the ZIP.

### Demo B: audience takes part

1. Put the **Dashboard** on the projector. It shows a QR code that opens the survey.
2. Classmates scan it and submit reports on their phones. Each report appears on the dashboard within seconds.
3. When three people pick the same residence and similar symptoms, a cluster alert appears. To set one off on purpose, ask everyone to pick the same residence hall and tap vomiting and diarrhea.

### Demo C: live social feed and news (needs the Python worker)

This part is optional. It needs a laptop that stays on during the demo.

1. Do the one-time [worker setup](#worker-setup-about-15-minutes-once) (packages, service-account key, publish the latest `firestore.rules`). An OpenAI key is optional: add `--keywords` to use the keyword method instead.
2. Before class, start the worker and leave it running:
   ```
   python sentinel_worker.py live
   ```
3. Classmates scan the **demo feed** QR code on the dashboard and post things like "half my floor at hassy has been throwing up since last night". Each post is tagged within seconds on the feed, and the **Social & media signals** panel updates.
4. For news, run the practice feed in a second terminal: `python sentinel_worker.py rss demo-news.xml --drip 2` (one practice story every 2 minutes).

### Day-of checklist

- [ ] Site loads and the Dashboard says **Live** (hard-refresh once to avoid a stale cached copy)
- [ ] `seed.html` run today; wastewater and lineage examples loaded
- [ ] **Include example data** is checked on the Dashboard
- [ ] Survey and demo-feed QR codes scan from the back of the room
- [ ] (Demo C) worker running, and a test post gets tagged
- [ ] Phone on Wi-Fi or data, in case the room's network blocks sites

### If something doesn't work

| What you see | Likely cause and fix |
|---|---|
| The corner says local mode, or a message about `firebase-config.js` | The file is missing, has a typo, or still has `PASTE_` values. It must sit next to `index.html` and start with `window.FIREBASE_CONFIG = {` |
| "Disconnected (permission-denied)", or a seed or upload that fails | The published Firestore rules are out of date. Paste the latest `firestore.rules` into the Firebase console and click **Publish** |
| Sign-in on the wastewater page is refused | Add your GitHub Pages domain (like `yourname.github.io`) under Authentication → Settings → Authorized domains, and put your Google email in `isLabUploader()` in the console copy of the rules |
| No clusters on the dashboard | The reports are older than 7 days (run `seed.html` on the day), or **Include example data** is unchecked |
| `seed.html` says the reports are already loaded | They are. To reload with new dates, delete the `reports` collection in the Firebase console, then run it again |
| Posts on the demo feed never get a "Detected" tag | The worker isn't running, or it can't reach OpenAI. Restart with `--keywords` |
| The page looks old after you pushed a change | Hard-refresh (Ctrl/Cmd+Shift+R). On a phone's home-screen copy, close it fully and reopen |

### After the presentation

- To clear the example data, in the Firebase console open Firestore Database → Data and delete these collections with **⋮ → Delete collection**: `reports`, `wastewater`, `lineages`, `media_posts`, `media_extracted`. Or leave them and untick **Include example data**.
- The free Firebase plan allows 50,000 reads and 20,000 writes a day, which is far more than a class demo needs.

## Security notes

- The values in `firebase-config.js` are meant to be public. They name your project; they don't grant access.
- Access is controlled by `firestore.rules`: anyone can read reports and add a well-formed report; only listed, signed-in accounts can add wastewater samples; nobody can edit or delete either from the website.
- Anyone with the link could still submit fake reports. A real deployment would add sign-in (for example ASU single sign-on) and rate limits.

## How the code is organized

`index.html` has a numbered script:

1. **Config**: campuses, residences, symptoms (edit these lists to change the survey)
2. **Classifier**: symptoms → syndrome, and point-based rules → pathogen category
3. **Cluster detection**: counts by residence and campus over a 7-day window
4. **Data storage**: Firebase `add()` to save and `onSnapshot()` for live updates
5. **Survey form**
6. **Dashboard rendering**, including a hand-drawn SVG epidemic curve; section 6b is the research export (filtering, CSV and ZIP files)
7. **Startup**

Only section 4 talks to Firebase (including `fetchResearchData()` for the research export). Switching to another database means rewriting just that section.
