# This is a game
## You make words on a cube

Open `page/cubex.html` in a browser to play 3D Word Cube.

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

The build writes `page/cubex_dictionary.js`, which `cubex.html` loads at runtime.
