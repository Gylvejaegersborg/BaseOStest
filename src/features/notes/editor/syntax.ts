import type { MarkdownConfig, InlineContext, Element } from '@lezer/markdown'
import { tags } from '@lezer/highlight'
import { TAG_BODY } from '../vault'

// Obsidian syntax the stock markdown parser doesn't know: [[wikilinks]]
// (and ![[embeds]]), inline #tags and ==highlights==. Each becomes a real
// syntax node, so the live-preview decorations can treat them exactly like
// built-in links and emphasis.

const OPEN = 91 // [
const CLOSE = 93 // ]
const BANG = 33 // !
const HASH = 35 // #
const EQ = 61 // =
const NEWLINE = 10

export const WikiLinks: MarkdownConfig = {
  defineNodes: [
    { name: 'WikiLink', style: tags.link },
    { name: 'WikiEmbed', style: tags.link },
    { name: 'WikiMark', style: tags.processingInstruction },
    { name: 'WikiTarget' },
    { name: 'WikiAlias' },
  ],
  parseInline: [
    {
      name: 'WikiLink',
      before: 'Link',
      parse(cx: InlineContext, next: number, pos: number) {
        const start = pos
        const embed = next === BANG
        if (embed) pos += 1
        else if (next !== OPEN) return -1
        if (cx.char(pos) !== OPEN || cx.char(pos + 1) !== OPEN) return -1
        const open = pos + 2
        let end = -1
        for (let i = open; i < cx.end; i++) {
          const c = cx.char(i)
          if (c === NEWLINE || c === OPEN) return -1
          if (c === CLOSE) {
            if (cx.char(i + 1) !== CLOSE) return -1
            end = i
            break
          }
        }
        if (end <= open) return -1
        const bar = cx.slice(open, end).indexOf('|')
        const children: Element[] = [cx.elt('WikiMark', start, open)]
        if (bar === -1) {
          children.push(cx.elt('WikiTarget', open, end))
        } else {
          if (bar > 0) children.push(cx.elt('WikiTarget', open, open + bar))
          children.push(cx.elt('WikiMark', open + bar, open + bar + 1))
          if (open + bar + 1 < end) children.push(cx.elt('WikiAlias', open + bar + 1, end))
        }
        children.push(cx.elt('WikiMark', end, end + 2))
        return cx.addElement(cx.elt(embed ? 'WikiEmbed' : 'WikiLink', start, end + 2, children))
      },
    },
  ],
}

const TAG_AT_START = new RegExp(`^${TAG_BODY.source}`, 'u')

export const HashTags: MarkdownConfig = {
  defineNodes: [{ name: 'HashTag', style: tags.special(tags.labelName) }, { name: 'HashTagMark' }],
  parseInline: [
    {
      name: 'HashTag',
      parse(cx: InlineContext, next: number, pos: number) {
        if (next !== HASH) return -1
        if (pos > cx.offset) {
          const prev = String.fromCharCode(cx.char(pos - 1))
          if (!/[\s(]/.test(prev)) return -1
        }
        const m = TAG_AT_START.exec(cx.slice(pos + 1, cx.end))
        if (!m) return -1
        const end = pos + 1 + m[0].length
        return cx.addElement(cx.elt('HashTag', pos, end, [cx.elt('HashTagMark', pos, pos + 1)]))
      },
    },
  ],
}

const Punctuation = /[!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~\xA1‐-‧]/
const HighlightDelim = { resolve: 'Highlight', mark: 'HighlightMark' }

export const Highlights: MarkdownConfig = {
  defineNodes: [
    { name: 'Highlight', style: { 'Highlight/...': tags.special(tags.emphasis) } },
    { name: 'HighlightMark', style: tags.processingInstruction },
  ],
  parseInline: [
    {
      name: 'Highlight',
      parse(cx: InlineContext, next: number, pos: number) {
        if (next !== EQ || cx.char(pos + 1) !== EQ || cx.char(pos + 2) === EQ) return -1
        const before = cx.slice(pos - 1, pos)
        const after = cx.slice(pos + 2, pos + 3)
        const sBefore = /\s|^$/.test(before)
        const sAfter = /\s|^$/.test(after)
        const pBefore = Punctuation.test(before)
        const pAfter = Punctuation.test(after)
        return cx.addDelimiter(
          HighlightDelim,
          pos,
          pos + 2,
          !sAfter && (!pAfter || sBefore || pBefore),
          !sBefore && (!pBefore || sAfter || pAfter),
        )
      },
      after: 'Emphasis',
    },
  ],
}

export const obsidianSyntax = [WikiLinks, HashTags, Highlights]
