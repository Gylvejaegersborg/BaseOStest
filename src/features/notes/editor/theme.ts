import { EditorView } from '@codemirror/view'
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { tags as t } from '@lezer/highlight'

// Colours mirror tailwind.config.ts — the editor lives outside Tailwind's
// class system, so the tokens are restated here.
const c = {
  bg: '#0a0b0d',
  panel: '#141518',
  panel2: '#1a1b1d',
  line: '#26272a',
  line2: '#313337',
  text: '#c8d2dc',
  bright: '#e6ebf0',
  dim: '#6b7785',
  accent: '#c77591',
  accent1: '#e0b8c5',
  accent2: '#d496ad',
  amber: '#f0a020',
  violet2: '#ac92d9',
}

const CALLOUTS: Record<string, string> = {
  note: '99, 142, 230',
  abstract: '83, 190, 210',
  info: '99, 142, 230',
  todo: '99, 142, 230',
  tip: '83, 190, 210',
  success: '70, 211, 105',
  question: '236, 168, 72',
  warning: '240, 160, 32',
  failure: '224, 92, 103',
  danger: '224, 92, 103',
  bug: '224, 92, 103',
  example: '148, 110, 207',
  quote: '140, 150, 160',
}

const calloutVars = Object.fromEntries(
  Object.entries(CALLOUTS).map(([type, rgb]) => [`.cm-line[data-callout="${type}"]`, { '--callout': rgb }]),
)

const mono = '"JetBrains Mono", ui-monospace, monospace'

export const editorTheme = EditorView.theme(
  {
    '&': {
      color: c.text,
      backgroundColor: 'transparent',
      fontSize: '16px',
    },
    '&.cm-focused': { outline: 'none' },
    '.cm-scroller': {
      fontFamily: '"Inter", ui-sans-serif, system-ui, sans-serif',
      lineHeight: '1.75',
      // The page scrolls (so properties sit above the text, like
      // Obsidian); the editor just grows with its content.
      overflow: 'visible',
    },
    '.cm-content': { caretColor: c.accent, padding: '0' },
    '.cm-line': { padding: '0 4px' },
    '.cm-cursor, .cm-dropCursor': { borderLeftColor: c.accent, borderLeftWidth: '2px' },
    '&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection':
      { backgroundColor: 'rgba(199, 117, 145, 0.28)' },
    '.cm-placeholder': { color: c.dim, fontStyle: 'italic' },

    '.cm-gutters': { backgroundColor: 'transparent', border: 'none', color: c.dim },
    '.cm-foldGutter .cm-gutterElement': {
      opacity: '0',
      cursor: 'pointer',
      padding: '0 4px',
      transition: 'opacity 120ms',
    },
    '.cm-gutters:hover .cm-foldGutter .cm-gutterElement': { opacity: '0.8' },
    '.cm-foldPlaceholder': {
      backgroundColor: c.panel2,
      border: `1px solid ${c.line2}`,
      color: c.dim,
      borderRadius: '4px',
      padding: '0 6px',
      margin: '0 4px',
    },

    // headings
    '.cm-lp-h': { fontWeight: '700', lineHeight: '1.35' },
    '.cm-lp-h1': { fontSize: '1.9em', paddingTop: '0.55em', paddingBottom: '0.15em' },
    '.cm-lp-h2': { fontSize: '1.55em', paddingTop: '0.5em', paddingBottom: '0.1em' },
    '.cm-lp-h3': { fontSize: '1.3em', paddingTop: '0.45em' },
    '.cm-lp-h4': { fontSize: '1.12em', paddingTop: '0.4em' },
    '.cm-lp-h5': { fontSize: '1em', paddingTop: '0.35em' },
    '.cm-lp-h6': { fontSize: '0.92em', paddingTop: '0.35em', color: c.dim },

    // inline
    '.cm-lp-live': { cursor: 'pointer' },
    '.cm-lp-link, .cm-lp-link *': { color: c.violet2 },
    '.cm-lp-link': { textDecoration: 'underline', textDecorationColor: 'rgba(172, 146, 217, 0.4)', textUnderlineOffset: '3px' },
    '.cm-lp-link.cm-lp-live:hover': { textDecorationColor: c.violet2 },
    '.cm-lp-wikilink, .cm-lp-wikilink *': { color: c.accent2 },
    '.cm-lp-wikilink': { textDecoration: 'underline', textDecorationColor: 'rgba(212, 150, 173, 0.35)', textUnderlineOffset: '3px' },
    '.cm-lp-wikilink.cm-lp-live:hover': { textDecorationColor: c.accent2 },
    '.cm-lp-wikilink.is-unresolved': { opacity: '0.6', textDecorationStyle: 'dashed' },
    '.cm-lp-tag': {
      color: c.accent1,
      backgroundColor: 'rgba(199, 117, 145, 0.14)',
      borderRadius: '999px',
      padding: '1px 7px',
      fontSize: '0.86em',
    },
    '.cm-lp-tag.cm-lp-live:hover': { backgroundColor: 'rgba(199, 117, 145, 0.26)' },
    '.cm-lp-highlight': { backgroundColor: 'rgba(240, 160, 32, 0.28)', color: c.bright, borderRadius: '2px' },
    '.cm-lp-code': {
      fontFamily: mono,
      fontSize: '0.86em',
      color: c.amber,
      backgroundColor: c.panel2,
      borderRadius: '4px',
      padding: '0.12em 0.35em',
    },

    // lists and tasks
    '.cm-lp-indent': { letterSpacing: '0.55em' },
    '.cm-lp-bullet': { color: c.accent, fontWeight: '700', padding: '0 0.15em' },
    '.cm-lp-task': {
      accentColor: c.accent,
      width: '14px',
      height: '14px',
      margin: '0 0.4em 0 0.1em',
      verticalAlign: '-2px',
      cursor: 'pointer',
    },
    '.cm-lp-task-done': { textDecoration: 'line-through', color: c.dim },

    // quotes and callouts
    '.cm-lp-quote': { borderLeft: `3px solid ${c.line2}`, paddingLeft: '16px !important', color: '#aab4be' },
    '.cm-lp-callout': {
      backgroundColor: 'rgba(var(--callout), 0.08)',
      borderLeft: '3px solid rgba(var(--callout), 0.75)',
      padding: '0 14px 0 16px !important',
    },
    '.cm-lp-callout-first': { paddingTop: '8px !important', borderTopRightRadius: '6px', marginTop: '4px' },
    '.cm-lp-callout-last': { paddingBottom: '8px !important', borderBottomRightRadius: '6px', marginBottom: '4px' },
    '.cm-lp-callout-title': {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '8px',
      fontWeight: '600',
      color: 'rgb(var(--callout))',
    },
    '.cm-lp-callout-title svg': { flexShrink: '0' },
    ...calloutVars,

    // code blocks
    '.cm-lp-codeblock': {
      fontFamily: mono,
      fontSize: '0.86em',
      lineHeight: '1.65',
      backgroundColor: c.panel2,
      padding: '0 16px !important',
    },
    '.cm-lp-codeblock-first': { borderTopLeftRadius: '6px', borderTopRightRadius: '6px', paddingTop: '4px !important', marginTop: '6px' },
    '.cm-lp-codeblock-last': { borderBottomLeftRadius: '6px', borderBottomRightRadius: '6px', paddingBottom: '4px !important', marginBottom: '6px' },
    '.cm-lp-fence-hidden': { fontSize: '0', lineHeight: '6px' },
    '.cm-lp-code-header': {
      display: 'inline-flex',
      width: '100%',
      justifyContent: 'flex-end',
      gap: '10px',
      color: c.dim,
      fontSize: '11px',
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
    },
    '.cm-lp-code-copy': {
      background: 'none',
      border: `1px solid ${c.line2}`,
      borderRadius: '4px',
      color: c.dim,
      padding: '0 6px',
      font: 'inherit',
      cursor: 'pointer',
    },
    '.cm-lp-code-copy:hover': { color: c.accent1, borderColor: c.accent },

    // tables
    '.cm-lp-table': { position: 'relative', margin: '6px 0', padding: '0 22px 20px 0' },
    '.cm-lp-table-scroll': { overflowX: 'auto' },
    '.cm-lp-table-input': {
      width: '100%',
      minWidth: '60px',
      background: 'transparent',
      border: 'none',
      outline: 'none',
      color: c.bright,
      font: 'inherit',
      padding: '0',
    },
    '.cm-lp-table th:has(.cm-lp-table-input), .cm-lp-table td:has(.cm-lp-table-input)': {
      boxShadow: `inset 0 0 0 1px ${c.accent}`,
      backgroundColor: 'rgba(199, 117, 145, 0.08)',
    },
    '.cm-lp-table-add': {
      position: 'absolute',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      border: `1px dashed ${c.line2}`,
      borderRadius: '4px',
      background: 'transparent',
      color: c.dim,
      font: `600 13px/1 ${mono}`,
      cursor: 'pointer',
      opacity: '0',
      transition: 'opacity 120ms, background-color 120ms, color 120ms',
    },
    '.cm-lp-table:hover .cm-lp-table-add': { opacity: '1' },
    '.cm-lp-table-add:hover': { backgroundColor: 'rgba(199, 117, 145, 0.15)', color: c.accent1, borderColor: c.accent },
    '.cm-lp-table-add-row': { left: '0', right: '22px', bottom: '0', height: '16px' },
    '.cm-lp-table-add-col': { top: '0', bottom: '20px', right: '0', width: '16px' },
    '.cm-lp-table table': { borderCollapse: 'collapse', width: '100%', fontSize: '0.92em', lineHeight: '1.5' },
    '.cm-lp-table th, .cm-lp-table td': { border: `1px solid ${c.line2}`, padding: '6px 10px', cursor: 'text', minWidth: '60px' },
    '.cm-lp-table th': { backgroundColor: c.panel2, color: c.bright, fontWeight: '600' },
    '.cm-lp-table tr:nth-child(even) td': { backgroundColor: 'rgba(255, 255, 255, 0.015)' },
    '.cm-lp-table-src': { fontFamily: mono, fontSize: '0.86em' },

    // misc blocks
    '.cm-lp-hr': {
      display: 'inline-block',
      width: '100%',
      height: '1px',
      verticalAlign: 'middle',
      backgroundColor: c.line2,
    },
    '.cm-lp-image': { display: 'inline-block', maxWidth: '100%', borderRadius: '6px', margin: '4px 0', verticalAlign: 'top' },

    // search panel + autocomplete
    '.cm-panels': { backgroundColor: c.panel, color: c.text, borderColor: c.line },
    '.cm-panels.cm-panels-top': { borderBottom: `1px solid ${c.line}` },
    '.cm-search': { fontFamily: mono, fontSize: '12px', padding: '6px 10px' },
    '.cm-search label': { color: c.dim },
    '.cm-textfield': {
      backgroundColor: c.bg,
      border: `1px solid ${c.line2}`,
      borderRadius: '4px',
      color: c.text,
      padding: '2px 6px',
    },
    '.cm-button': {
      backgroundImage: 'none',
      backgroundColor: c.panel2,
      border: `1px solid ${c.line2}`,
      borderRadius: '4px',
      color: c.text,
    },
    '.cm-searchMatch': { backgroundColor: 'rgba(240, 160, 32, 0.22)' },
    '.cm-searchMatch.cm-searchMatch-selected': { backgroundColor: 'rgba(240, 160, 32, 0.45)' },
    '.cm-tooltip': {
      backgroundColor: c.panel,
      border: `1px solid ${c.line2}`,
      borderRadius: '6px',
      boxShadow: '0 8px 24px rgba(0,0,0,0.45)',
      overflow: 'hidden',
    },
    '.cm-tooltip-autocomplete > ul': { fontFamily: '"Inter", ui-sans-serif, system-ui, sans-serif', maxHeight: '16em' },
    '.cm-tooltip-autocomplete > ul > li': { padding: '4px 10px !important', lineHeight: '1.4' },
    '.cm-tooltip-autocomplete > ul > li[aria-selected]': { backgroundColor: 'rgba(199, 117, 145, 0.22)', color: c.bright },
    '.cm-completionDetail': { color: c.dim, fontStyle: 'normal', marginLeft: '10px', fontSize: '0.85em' },
    '.cm-completionMatchedText': { textDecoration: 'none', color: c.accent1, fontWeight: '600' },
    '.cm-completionIcon': { display: 'none' },
  },
  { dark: true },
)

export const markdownHighlight = syntaxHighlighting(
  HighlightStyle.define([
    { tag: [t.heading1, t.heading2], color: c.accent1, fontWeight: '700' },
    { tag: t.heading3, color: c.accent2, fontWeight: '700' },
    { tag: [t.heading4, t.heading5, t.heading6], color: c.bright, fontWeight: '700' },
    { tag: t.emphasis, fontStyle: 'italic' },
    { tag: t.strong, fontWeight: '700', color: c.bright },
    { tag: t.strikethrough, textDecoration: 'line-through', color: c.dim },
    { tag: t.processingInstruction, color: c.dim },
    { tag: [t.url, t.link], color: c.violet2 },
    { tag: t.contentSeparator, color: c.dim },
    { tag: t.quote, color: '#aab4be' },
    // fenced code
    { tag: t.keyword, color: '#c792ea' },
    { tag: [t.string, t.special(t.string)], color: '#c3e88d' },
    { tag: [t.number, t.bool, t.null], color: '#f78c6c' },
    { tag: [t.comment, t.lineComment, t.blockComment], color: c.dim, fontStyle: 'italic' },
    { tag: [t.function(t.variableName), t.function(t.propertyName)], color: '#82aaff' },
    { tag: [t.typeName, t.className], color: '#ffcb6b' },
    { tag: t.propertyName, color: '#89ddff' },
    { tag: [t.operator, t.punctuation], color: '#89ddff' },
    { tag: t.definition(t.variableName), color: c.bright },
    { tag: t.attributeName, color: '#ffcb6b' },
  ]),
)
