export interface Note {
  id: string
  title: string
  /** Slash-separated folder path ("Music/Mixing"); '' is the vault root. */
  folder: string
  tags: string[]
  updated: string // ISO date
  created?: string // ISO date — falls back to `updated` when absent
  /** Markdown body. The title lives in `title`, not in a leading `# H1`. */
  body: string
}

// A small demo vault. Each note shows off one piece of the Obsidian-style
// editor so it's easy to check that everything renders and behaves right.
// Order doesn't matter — the explorer sorts them.

interface Seed {
  id: string
  title: string
  folder: string
  tags: string[]
  /** Minutes before "now" — keeps the modified/created sorts meaningful. */
  ago: number
  body: string
}

const SEEDS: Seed[] = [
  {
    id: 'vault-welcome',
    title: 'Welcome',
    folder: '',
    tags: ['start'],
    ago: 5,
    body: `This vault works like Obsidian. There is no edit or read mode. Notes always look rendered, and the markdown shows up only on the line your cursor is on.

> [!tip] Try it
> Click into any **bold**, *italic* or [[Links and backlinks|link]] text to see its markdown. Move the cursor away and it renders again.

## Tour
Every note below shows one feature:

- [[Formatting]]: headings, emphasis, ==highlights==, code and dividers
- [[Lists and tasks]]: bullets, numbered lists and clickable checkboxes
- [[Links and backlinks]]: \`[[wikilinks]]\`, aliases, heading links and external links
- [[Callouts]]: \`> [!note]\` blocks in every flavour
- [[Tables and code]]: rendered tables and highlighted code blocks
- [[Tags]]: inline #tags and nested tags like #music/mixing
- [[Shortcuts]]: keyboard shortcuts for the editor and the explorer

## The explorer
The left panel is a folder tree. **Right-click** anything in it for more options: rename, duplicate, move, copy path, view tags, delete. **Drag** notes and folders to move them. The sliders button changes sorting and layout.
`,
  },
  {
    id: 'vault-formatting',
    title: 'Formatting',
    folder: 'Guides',
    tags: ['guide'],
    ago: 40,
    body: `# Heading 1
## Heading 2
### Heading 3
#### Heading 4

Plain paragraph text, with **bold**, *italic*, ***both at once***, ~~strikethrough~~, ==highlighted text== and \`inline code\`.

Put your cursor on a heading line to see its \`#\` marks. Hover a heading and click the arrow in the gutter to fold its section.

---

A horizontal rule sits above this line. It renders as a divider until you put your cursor on it.

![Waveform](/notes/waveform.svg)

Images render in place too. See [[Tables and code]] for bigger blocks.
`,
  },
  {
    id: 'vault-lists',
    title: 'Lists and tasks',
    folder: 'Guides',
    tags: ['guide', 'todo'],
    ago: 75,
    body: `## Bullets
- Press **Enter** at the end of a list item to continue the list
- Press **Tab** to indent and **Shift-Tab** to outdent
  - Nested items get their own bullets
    - As deep as you like

## Numbered
1. Numbers continue automatically
2. Just like in Obsidian
3. Backspace on an empty item ends the list

## Tasks
- [x] Click a checkbox to tick it
- [ ] Or put the cursor on the line and press **Ctrl/Cmd + Enter**
- [ ] Ticked tasks get struck through
  - [ ] Subtasks work too
`,
  },
  {
    id: 'vault-links',
    title: 'Links and backlinks',
    folder: 'Guides',
    tags: ['guide', 'reference'],
    ago: 110,
    body: `## Internal links
- A plain wikilink: [[Formatting]]
- With an alias: [[Callouts|pretty callout boxes]]
- To a heading: [[Lists and tasks#Tasks]]
- By full path: [[Music/Mixing/Vocal chain]]
- To a note that doesn't exist yet: [[Studio session plan]]. It shows faded, and clicking it creates the note.

Type \`[[\` anywhere to get suggestions for note names.

Click a rendered link to follow it. To edit the link text instead, move into it with the arrow keys, or **Ctrl/Cmd-click** whenever the markdown is showing.

## External links
- Markdown link: [Obsidian help](https://help.obsidian.md)
- Bare URL: https://codemirror.net
- These open in a new tab.

## Backlinks
The **backlinks** button at the bottom right of each note lists every note that links to it. [[Welcome]] links here, so this note's backlinks include Welcome.
`,
  },
  {
    id: 'vault-callouts',
    title: 'Callouts',
    folder: 'Guides',
    tags: ['guide'],
    ago: 150,
    body: `A callout is a blockquote whose first line is \`> [!type] Optional title\`.

> [!note]
> The default callout. Click inside it to see the source.

> [!tip] Custom titles
> Anything after the type becomes the title.

> [!warning] Careful
> Warnings get a warm colour.

> [!danger]
> For things that break.

> [!success] Done
> Green for good news.

> [!question] Why callouts?
> They make notes easy to scan.

> [!quote]
> "Simplicity is prerequisite for reliability." — Edsger W. Dijkstra

> A plain blockquote without a type stays a plain quote.
`,
  },
  {
    id: 'vault-tables',
    title: 'Tables and code',
    folder: 'Guides',
    tags: ['guide', 'reference'],
    ago: 190,
    body: `## Tables
Tables render as tables. Click one to edit its markdown.

| Plugin | Stage | Notes |
| --- | --- | --- |
| **EQ** | Pre | cut mud around 250 Hz |
| Compressor | Pre | 3:1, medium attack |
| *De-esser* | Post | see [[Vocal chain]] |

## Code
Fenced code blocks get syntax highlighting for the language you name:

\`\`\`ts
export function bpmToMs(bpm: number, division = 4): number {
  return (60_000 / bpm) * (4 / division)
}
\`\`\`

\`\`\`bash
docker compose up -d copyparty
\`\`\`
`,
  },
  {
    id: 'vault-tags',
    title: 'Tags',
    folder: 'Guides',
    tags: ['guide'],
    ago: 230,
    body: `Tags come from two places:

1. **The tag bar** at the bottom of each note. Start typing and it suggests tags that already exist.
2. **Inline tags** in the text, like #idea or #beats. Nested tags use a slash: #music/mixing.

Click an inline tag to filter the explorer by it. The **#** button next to the search box shows every tag in the vault, with note counts.

Search also understands operators:
- \`tag:idea\` finds notes with that tag
- \`path:music\` finds notes whose folder path matches
- \`file:vocal\` searches titles only
- \`"exact phrase"\` searches for an exact phrase
`,
  },
  {
    id: 'vault-shortcuts',
    title: 'Shortcuts',
    folder: 'Guides',
    tags: ['guide', 'reference'],
    ago: 270,
    body: `## Editor
| Keys | Action |
| --- | --- |
| \`Ctrl/Cmd + B\` | Bold |
| \`Ctrl/Cmd + I\` | Italic |
| \`Ctrl/Cmd + K\` | Insert link |
| \`Ctrl/Cmd + Shift + H\` | Highlight |
| \`Ctrl/Cmd + Enter\` | Toggle checkbox |
| \`Ctrl/Cmd + F\` | Find in note |
| \`Ctrl/Cmd + Z\` / \`Shift + Z\` | Undo / redo |
| \`Tab\` / \`Shift + Tab\` | Indent / outdent |
| \`Ctrl/Cmd + click\` | Follow the link under the cursor |

## Explorer
| Keys | Action |
| --- | --- |
| \`F2\` | Rename the selected note |
| \`Right-click\` | Context menu |
| \`Alt + ←\` / \`Alt + →\` | Back / forward through visited notes |
`,
  },
  {
    id: 'vault-vocal-chain',
    title: 'Vocal chain',
    folder: 'Music/Mixing',
    tags: ['mixing'],
    ago: 600,
    body: `My default vocal chain. It's a starting point, not a rule. #music/mixing

1. **Clip gain**: even out the phrases first
2. **EQ**: high-pass around 80–100 Hz, cut mud where needed
3. **Compressor**: gentle, 3:1
4. **De-esser**
5. **Saturation**: a little, for presence
6. **Sends**: plate reverb + slap delay

> [!warning] Don't over-compress
> If the breaths are louder than the words, back off.

Related: [[Release checklist]] · [[Tables and code]]
`,
  },
  {
    id: 'vault-release-checklist',
    title: 'Release checklist',
    folder: 'Music/Releases',
    tags: ['release', 'todo'],
    ago: 900,
    body: `## Before
- [x] Final mix bounced
- [x] Master approved
- [ ] Cover art exported at 3000×3000
- [ ] Credits and splits written down

## Upload
- [ ] Distributor upload, at least 3 weeks ahead
- [ ] Pitch to editorial playlists
- [ ] Canvas / short loop ready

## Launch day
- [ ] Post teaser clips #release
- [ ] Update the artist page

See [[Vocal chain]] for the mix notes.
`,
  },
  {
    id: 'vault-journal',
    title: '2026-09-26',
    folder: 'Journal',
    tags: ['journal'],
    ago: 20,
    body: `Daily note. #journal

- Rebuilt the notes tab. See [[Welcome]]
- Worked on [[Vocal chain]] settings for the new single
- Next: [[Studio session plan]] (doesn't exist yet. Click the link to create it)

> [!todo] Tomorrow
> - [ ] Bounce stems
> - [ ] Check the [[Release checklist]]
`,
  },
  {
    id: 'vault-copyparty',
    title: 'Copyparty setup',
    folder: 'Tech/Homeserver',
    tags: ['homeserver', 'infra'],
    ago: 2000,
    body: `Copyparty serves the beat library on the home server.

\`\`\`yaml
services:
  copyparty:
    image: copyparty/ac
    ports: ["3923:3923"]
    volumes:
      - /srv/beats:/w
\`\`\`

Docs: [copyparty on GitHub](https://github.com/9001/copyparty)

> [!info]
> Nested folders in the explorer (\`Tech/Homeserver\`) can go as deep as you want. Drag this note to another folder to move it.
`,
  },
  {
    id: 'vault-old-ideas',
    title: 'Old ideas',
    folder: 'Archive',
    tags: ['idea'],
    ago: 9000,
    body: `Scraps kept for later. #idea

## Track concepts
- Glitchy vocal chops over half-time drums
- A 140 BPM version of the lo-fi loop

## Folding
Hover a heading and click its gutter arrow to fold everything under it.

### Deeper detail
This paragraph folds away with its heading.
`,
  },
]

function generate(): Note[] {
  const now = Date.now()
  return SEEDS.map(({ ago, ...s }) => {
    const iso = new Date(now - ago * 60 * 1000).toISOString()
    return { ...s, updated: iso, created: iso }
  })
}

export const NOTES: Note[] = generate()

export const NOTE_FOLDERS = [...new Set(SEEDS.map((s) => s.folder).filter(Boolean))]
export const NOTE_TAGS = [...new Set(SEEDS.flatMap((s) => s.tags))]
