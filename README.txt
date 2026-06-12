# This is a game
## You make words on a cube

Open `index.html` in a browser to play 3D Word Cube.

### Dictionary

Word list source: `page/cubex_words.txt`

After editing the word list, rebuild the embedded dictionary:

```bash
python3 scripts/build_dictionary.py
```

Verify the built file is up to date:

```bash
python3 scripts/build_dictionary.py --check
```

The build writes `cubex_dictionary.js` in the repo root, which `index.html` loads at runtime.

### Vercel

Vercel serves the site from the repository root. `index.html` and `cubex_dictionary.js` must live at the root (not inside `page/`). No build step is required for deployment.
