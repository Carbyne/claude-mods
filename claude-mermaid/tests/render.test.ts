import { test, expect } from 'claude-code/testing'
import type { RenderNode } from 'claude-code'

// The engine's own drawing of an assistant block stands in for the bottom of
// the chain here: the kit needs one, and the plugin's tree replaces it.
const PLUGIN = 'mermaid-draw'
const REPLY = 'A prompt flows to a reply.\n\n```mermaid\nflowchart LR\n  A[Prompt] --> B[Reply]\n```\n\nThat is all.'
const VIEWPORT = { columns: 100, rows: 40 }
const COMMAND_CONTEXT = { origin: { kind: 'composer' } as const,
  presentation: { isFullscreen: false, columns: VIEWPORT.columns } }
const CJK_REPLY = 'Before.\n\n```mermaid\nflowchart LR\n  A["中文标签"] --> B["结束"]\n```\n\nAfter.'
const textOf = (node: RenderNode): string => typeof node === 'string' ? node
  : 'children' in node ? (node.children ?? []).map(textOf).join('') : ''

test('a reply with a mermaid fence is drawn as a tree with coloured borders (terminal, colour on)', async ($, on) => {
  on('ui.render', { component: 'AssistantMessage' }, (_$, e) => ({ type: 'Markdown', props: { text: e.props.text } }))
  const ui = await $.ui.mount({ plugin: PLUGIN, surface: 'terminal', component: 'AssistantMessage',
    props: { text: REPLY, isFirstOfReply: true }, viewport: VIEWPORT })
  const tree = await ui.drawn()
  expect(tree).toMatchObject({ type: 'Box' })
  expect(await ui.find({ type: 'Markdown', text: /A prompt flows/ })).toBeDefined()
  expect(await ui.find({ type: 'Markdown', text: /That is all/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /Prompt/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /⏺/ })).toBeDefined()
  const json = JSON.stringify(tree)
  expect(json).toContain('"color":"cyan"')
  expect(json).toContain('"color":"yellow"')
  expect(json).not.toContain('\u001b')
  expect(json).not.toContain('```mermaid')
})

test('a reply without a fence passes through untouched', async ($, on) => {
  on('ui.render', { component: 'AssistantMessage' }, (_$, e) => ({ type: 'Markdown', props: { text: e.props.text } }))
  const ui = await $.ui.mount({ plugin: PLUGIN, surface: 'terminal', component: 'AssistantMessage',
    props: { text: 'Just words.', isFirstOfReply: true }, viewport: VIEWPORT })
  expect(await ui.drawn()).toMatchObject({ type: 'Markdown', props: { text: 'Just words.' } })
})

test('with colour off the fence becomes a plain text fence, no escapes (terminal)', async ($, on) => {
  on('ui.render', { component: 'AssistantMessage' }, (_$, e) => ({ type: 'Markdown', props: { text: e.props.text } }))
  await $.command.run({ ...COMMAND_CONTEXT, command: 'mermaid', args: 'color off' })
  const ui = await $.ui.mount({ plugin: PLUGIN, surface: 'terminal', component: 'AssistantMessage',
    props: { text: REPLY, isFirstOfReply: true }, viewport: VIEWPORT })
  const tree = await ui.drawn()
  const json = JSON.stringify(tree)
  expect(tree).toMatchObject({ type: 'Markdown' })
  expect(json).toContain('```text')
  expect(json).not.toContain('\u001b')
  await $.command.run({ ...COMMAND_CONTEXT, command: 'mermaid', args: 'color on' })
})

test('on a remote surface the plain rewrite is used even with colour on (desktop)', async ($, on) => {
  on('ui.render', { component: 'AssistantMessage' }, (_$, e) => ({ type: 'Markdown', props: { text: e.props.text } }))
  const ui = await $.ui.mount({ plugin: PLUGIN, surface: 'desktop', component: 'AssistantMessage',
    props: { text: REPLY, isFirstOfReply: true }, viewport: VIEWPORT })
  const json = JSON.stringify(await ui.drawn())
  expect(json).toContain('```text')
  expect(json).not.toContain('\u001b')
})

test('coloured CJK labels contain no layout padding and keep their box width', async ($, on) => {
  on('ui.render', { component: 'AssistantMessage' }, (_$, e) => ({ type: 'Markdown', props: { text: e.props.text } }))
  const ui = await $.ui.mount({ plugin: PLUGIN, surface: 'terminal', component: 'AssistantMessage',
    props: { text: CJK_REPLY, isFirstOfReply: false }, viewport: VIEWPORT })
  const tree = await ui.drawn()
  const json = JSON.stringify(tree)
  expect(tree).toMatchObject({ type: 'Box' })
  expect(await ui.find({ type: 'Text', text: /中文标签/ })).toBeDefined()
  expect(json).not.toContain('\uE000')
  expect(json).not.toContain('⏺')
  if (tree.type !== 'Box') throw new Error('expected the coloured reply tree')
  const body = tree.children?.[1]
  if (!body || typeof body === 'string' || body.type !== 'Box') throw new Error('expected the reply body')
  const art = body.children?.find(child => typeof child !== 'string' && child.type === 'Box')
  if (!art || typeof art === 'string' || art.type !== 'Box') throw new Error('expected the diagram box')
  const columnsOf = (text: string) => [...text].reduce((n, ch) => n + (/[ᄀ-ᅟ⺀-〾ぁ-꓏가-힣豈-﫿︰-﹏＀-｠￠-￦]/.test(ch) ? 2 : 1), 0)
  const widths = (art.children ?? []).map(line => columnsOf(textOf(line)))
  expect(new Set(widths).size).toBe(1)
})

test('plain terminal CJK labels contain no layout padding', async ($, on) => {
  on('ui.render', { component: 'AssistantMessage' }, (_$, e) => ({ type: 'Markdown', props: { text: e.props.text } }))
  await $.command.run({ ...COMMAND_CONTEXT, command: 'mermaid', args: 'color off' })
  const ui = await $.ui.mount({ plugin: PLUGIN, surface: 'terminal', component: 'AssistantMessage',
    props: { text: CJK_REPLY, isFirstOfReply: true }, viewport: VIEWPORT })
  const tree = await ui.drawn()
  const json = JSON.stringify(tree)
  expect(tree).toMatchObject({ type: 'Markdown' })
  expect(json).toContain('中文标签')
  expect(json).toContain('```text')
  expect(json).not.toContain('\uE000')
  expect(json).not.toContain('\u001b')
})

test('desktop CJK labels contain no layout padding', async ($, on) => {
  on('ui.render', { component: 'AssistantMessage' }, (_$, e) => ({ type: 'Markdown', props: { text: e.props.text } }))
  const ui = await $.ui.mount({ plugin: PLUGIN, surface: 'desktop', component: 'AssistantMessage',
    props: { text: CJK_REPLY, isFirstOfReply: true }, viewport: VIEWPORT })
  const json = JSON.stringify(await ui.drawn())
  expect(json).toContain('中文标签')
  expect(json).toContain('```text')
  expect(json).not.toContain('\uE000')
})

test('long prose falls back to a plain rewrite without losing text or CJK labels', async ($, on) => {
  on('ui.render', { component: 'AssistantMessage' }, (_$, e) => ({ type: 'Text',
    children: [e.props.text.slice(0, 10_000), e.props.text.slice(10_000)] }))
  const prose = 'x'.repeat(10_001)
  const ui = await $.ui.mount({ plugin: PLUGIN, surface: 'terminal', component: 'AssistantMessage',
    props: { text: prose + '\n\n' + CJK_REPLY, isFirstOfReply: true }, viewport: VIEWPORT })
  const tree = await ui.drawn()
  const json = JSON.stringify(tree)
  expect(tree).toMatchObject({ type: 'Text' })
  expect(textOf(tree)).toContain(prose)
  expect(json).toContain('中文标签')
  expect(json).toContain('```text')
  expect(json).not.toContain('\uE000')
  expect(json).not.toContain('\u001b')
})
