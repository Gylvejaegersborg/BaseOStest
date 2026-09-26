import { stringifyYaml, type Props } from '@/features/notes/frontmatter'

export interface Note {
  id: string
  title: string
  /** Slash-separated folder path ("Music/Mixing"); '' is the vault root. */
  folder: string
  /** Legacy/agent tag list. Tags normally live in the `tags` property
   *  (frontmatter); the store merges both into the derived `tags`. */
  tags: string[]
  updated: string // ISO date
  created?: string // ISO date — falls back to `updated` when absent
  /** 'markdown' (default), or a canvas/base whose body is JSON. */
  kind?: 'markdown' | 'canvas' | 'base'
  /** Markdown body, starting with an optional YAML frontmatter block
   *  (properties). The title lives in `title`, not in a leading `# H1`. */
  body: string
  /** Parsed frontmatter — derived by the store, never persisted. */
  props?: Props
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
  kind?: Note['kind']
  /** Frontmatter properties (tags are added from `tags`). */
  props?: Props
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
- [[Slash commands]]: type \`/\` to insert tables, code blocks, callouts and new notes
- [[Properties]]: note metadata, shown at the top of a note
- [[Song catalog]]: a **base**. It turns properties into a table and cards you can sort, filter and edit
- [[Release plan]]: a **canvas** with cards, arrows, shapes and hand drawing

## Search the whole vault
Press **Ctrl/Cmd + Shift + F** (or the magnifier in the explorer) to search inside every note at once. It finds words even when you don't know which note mentions them, and it tolerates typos.

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
Tables render as tables, and you edit them in place like in Confluence:

- **Click a cell** to edit it. **Tab** moves to the next cell, **Enter** to the cell below, and **Esc** finishes
- **Hover the table** for the **+** bars: the bottom one adds a row, the right one adds a column
- **Right-click a cell** to insert or delete rows and columns, or change alignment
- Move into the table with the arrow keys to see its raw markdown

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

1. **The \`tags\` property**, edited in [[Properties]] or in the tag bar at the bottom of each note. Start typing and it suggests tags that already exist.
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
| \`/\` | Slash commands (see [[Slash commands]]) |
| \`Ctrl/Cmd + Shift + F\` | Search inside every note |

## Explorer
| Keys | Action |
| --- | --- |
| \`F2\` | Rename the selected note |
| \`Right-click\` | Context menu |
| \`Alt + ←\` / \`Alt + →\` | Back / forward through visited notes |
`,
  },
  {
    id: 'vault-slash',
    title: 'Slash commands',
    folder: 'Guides',
    tags: ['guide'],
    ago: 35,
    body: `Type \`/\` at the start of a line, or after a space, to open the command menu. Keep typing to filter it, then press **Enter**.

| Command | Inserts |
| --- | --- |
| \`/table\` | A 3×3 table, ready to edit |
| \`/code\` | A fenced code block |
| \`/callout\`, \`/tip\`, \`/warning\` | A callout |
| \`/task\`, \`/bullet\`, \`/numbered\` | Lists |
| \`/h1\`, \`/h2\`, \`/h3\` | Headings |
| \`/divider\`, \`/quote\`, \`/image\` | Blocks |
| \`/link\`, \`/embed\` | A \`[[link]]\` with note suggestions |
| \`/date\`, \`/time\` | Today's date or the current time |
| \`/property\` | Adds a property to this note |
| \`/new note\` | Creates a new note and opens it |
| \`/link to new note\` | Creates a note and links to it here |
| \`/new canvas\`, \`/new base\` | Creates a canvas or a base |

Try it on the empty line below:

`,
  },
  {
    id: 'vault-properties',
    title: 'Properties',
    folder: 'Guides',
    tags: ['guide', 'reference'],
    ago: 55,
    props: { aliases: ['Frontmatter', 'Metadata'], status: 'reference', rating: 5, reviewed: true, updated: '2026-09-26' },
    body: `Properties are structured data at the top of a note, like the panel above this text. They are stored as YAML frontmatter, the same way Obsidian stores them, so the notes stay portable.

- **Click a value** to edit it. Each property has a type: text, list, number, checkbox, date or date & time
- **Click a property's icon** to change its type, rename it or remove it
- **+ Add property** suggests property names already used in the vault
- \`tags\` is a property too. The tag bar at the bottom edits the same list
- \`aliases\` gives a note other names, so [[Frontmatter]] also links here

Properties power [[Song catalog]], a **base** that lists notes as a table or as cards.
`,
  },
  {
    id: 'vault-song-neon',
    title: 'Neon Rain',
    folder: 'Music/Songs',
    tags: ['single'],
    ago: 90,
    props: { status: 'mixing', bpm: 128, key: 'F minor', release: '2026-10-24', rating: 4, featured: true, cover: '/notes/waveform.svg' },
    body: `Lead single. The vocal chain is in [[Vocal chain]].

- [ ] Recall the mix after the car test
- [ ] Print stems for the remix pack
`,
  },
  {
    id: 'vault-song-glass',
    title: 'Glass Hearts',
    folder: 'Music/Songs',
    tags: ['single'],
    ago: 400,
    props: { status: 'recording', bpm: 140, key: 'A minor', release: '2026-12-05', rating: 3, featured: false },
    body: `Needs a second verse. The hook is in the voice memo from Tuesday.
`,
  },
  {
    id: 'vault-song-tide',
    title: 'Low Tide',
    folder: 'Music/Songs',
    tags: ['album'],
    ago: 3000,
    props: { status: 'released', bpm: 92, key: 'D major', release: '2026-06-14', rating: 5, featured: true },
    body: `Out now. Released following the [[Release checklist]].
`,
  },
  {
    id: 'vault-song-static',
    title: 'Static Bloom',
    folder: 'Music/Songs',
    tags: ['idea'],
    ago: 1500,
    props: { status: 'idea', bpm: 170, key: 'C# minor', rating: 2, featured: false },
    body: `Half-time drum and bass sketch. Might become a B-side.
`,
  },
  {
    id: 'vault-songs-base',
    title: 'Song catalog',
    folder: 'Music',
    tags: [],
    ago: 60,
    kind: 'base',
    body: JSON.stringify(
      {
        formulas: {
          countdown: 'if(empty(release), "–", if(daysUntil(release) >= 0, daysUntil(release) + " days", "out"))',
          stars: 'repeat("★", rating)',
        },
        views: [
          {
            id: 'view-table',
            name: 'All songs',
            type: 'table',
            filters: [{ prop: 'file.folder', op: 'starts with', value: 'Music/Songs' }],
            match: 'all',
            sort: [{ prop: 'release', dir: 'asc' }],
            groupBy: null,
            columns: ['file.name', 'status', 'bpm', 'key', 'release', 'formula.countdown', 'formula.stars', 'featured'],
          },
          {
            id: 'view-board',
            name: 'Board',
            type: 'cards',
            filters: [{ prop: 'file.folder', op: 'starts with', value: 'Music/Songs' }],
            match: 'all',
            sort: [{ prop: 'rating', dir: 'desc' }],
            groupBy: 'status',
            columns: ['file.name', 'bpm', 'key', 'formula.stars'],
            cardImage: 'cover',
          },
          {
            id: 'view-fast',
            name: 'Fast (>120 BPM)',
            type: 'table',
            filters: [
              { prop: 'file.folder', op: 'starts with', value: 'Music/Songs' },
              { prop: 'bpm', op: '>', value: '120' },
            ],
            match: 'all',
            sort: [{ prop: 'bpm', dir: 'desc' }],
            groupBy: null,
            columns: ['file.name', 'bpm', 'status'],
          },
        ],
      },
      null,
      2,
    ),
  },
  {
    id: 'vault-release-canvas',
    title: 'Release plan',
    folder: 'Music/Releases',
    tags: [],
    ago: 45,
    kind: 'canvas',
    body: JSON.stringify(
      {
        nodes: [
          { id: 'g1', type: 'group', x: -40, y: -60, width: 860, height: 380, label: 'Neon Rain rollout', color: '6' },
          { id: 'n1', type: 'text', x: 0, y: 0, width: 240, height: 130, text: '## Week 1\nTeaser clips and a pre-save link', color: '5' },
          { id: 'n2', type: 'text', x: 300, y: 0, width: 240, height: 160, text: '## Week 2\n**Release day**\n- Canvas loop live\n- Update the artist page' },
          { id: 'n3', type: 'file', x: 580, y: 0, width: 220, height: 260, noteId: 'vault-release-checklist' },
          { id: 'n4', type: 'text', x: 300, y: 205, width: 240, height: 100, text: 'Double-click empty space to add a card. Drag the dots on a card edge to connect it.', color: '3' },
          { id: 'n5', type: 'link', x: 0, y: 190, width: 240, height: 90, url: 'https://help.obsidian.md/Plugins/Canvas' },
        ],
        edges: [
          { id: 'e1', fromNode: 'n1', fromSide: 'right', toNode: 'n2', toSide: 'left', label: 'then' },
          { id: 'e2', fromNode: 'n2', fromSide: 'right', toNode: 'n3', toSide: 'left' },
        ],
        strokes: [
          { id: 's1', tool: 'pen', color: '#e0b8c5', width: 3, points: [20, 360, 60, 372, 110, 366, 160, 380, 210, 370, 260, 384] },
          { id: 's2', tool: 'highlighter', color: '#f0a020', width: 14, points: [300, 150, 420, 150, 520, 152] },
        ],
        shapes: [
          { id: 'sh1', type: 'ellipse', x1: 560, y1: 350, x2: 760, y2: 430, color: '#53bed2', width: 2 },
          { id: 'sh2', type: 'arrow', x1: 480, y1: 400, x2: 555, y2: 392, color: '#53bed2', width: 2 },
        ],
        viewport: { x: 120, y: 140, zoom: 0.9 },
      },
      null,
      2,
    ),
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
  return SEEDS.map(({ ago, props, tags, ...s }) => {
    const iso = new Date(now - ago * 60 * 1000).toISOString()
    if (s.kind && s.kind !== 'markdown') return { ...s, tags, updated: iso, created: iso }
    // Tags live in the frontmatter, like any other property.
    const all = { ...(tags.length ? { tags } : {}), ...props }
    const body = Object.keys(all).length ? `---\n${stringifyYaml(all)}\n---\n${s.body}` : s.body
    return { ...s, body, tags: [], updated: iso, created: iso }
  })
}

export const NOTES: Note[] = generate()

export const NOTE_FOLDERS = [...new Set(SEEDS.map((s) => s.folder).filter(Boolean))]
export const NOTE_TAGS = [...new Set(SEEDS.flatMap((s) => s.tags))]
