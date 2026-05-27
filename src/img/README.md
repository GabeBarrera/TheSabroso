# src/img/

Drop restaurant and recipe photos in here. To make them appear in the
**Insert photo** picker inside the description editor, add an entry to
`manifest.json`:

```json
[
  { "file": "salt-and-ember-snapper.jpg", "label": "Snapper, salt crust" }
]
```

- `file` — filename relative to `src/img/`
- `label` — display label + image alt text

If you type a filename manually in the editor's photo dialog, the path
`src/img/<filename>` is added automatically. You can also upload a file
from your device — it will be inlined as a data URI in the entry so it
works offline. To host that image properly on GitHub Pages, commit the
file into this folder and replace the data URI with `src/img/<file>`.
