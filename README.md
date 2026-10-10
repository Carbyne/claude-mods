# gal-mods

Mods for Claude Code: plugins built on **function hooks**, TypeScript that
runs inside Claude Code's own process. Early access, so each needs
`CLAUDE_CODE_ENABLE_FUNCTION_HOOKS=1` and the API can change between releases.

| mod | what it does |
| --- | --- |
| [mermaid-draw](claude-mermaid/README.md) | every ```` ```mermaid ```` block Claude writes is drawn as box art inline in the transcript |
| [prompt-queue](claude-queue/README.md) | `/q <text>` while Claude is working waits in a stack above the prompt and goes out when the turn ends |

## Install

Turn function hooks on, in `~/.claude/settings.json`:

```json
{ "env": { "CLAUDE_CODE_ENABLE_FUNCTION_HOOKS": "1" } }
```

The repository is a marketplace. Add it once, then install either mod:

```sh
claude plugin marketplace add galElmalah/claude-mods
claude plugin install mermaid-draw@gal-mods
claude plugin install prompt-queue@gal-mods
```

Or load one straight from a clone, for one session (the repo's own
`.claude/settings.json` sets the variable for sessions started inside it):

```sh
git clone https://github.com/galElmalah/claude-mods
cd claude-mods
claude --plugin-dir claude-mermaid
claude --plugin-dir claude-queue
```

## Migrating from the old names

Claude Code 2.1.287 reserves the old plugin names `claude-mermaid` and
`claude-queue`, and the marketplace name `claude-mods`. The install IDs are
now `mermaid-draw@gal-mods` and `prompt-queue@gal-mods`. The repository URL,
local plugin folders, and `/mermaid` and `/q` commands stay the same.

Finish or copy any queued prompts before switching. Uninstall whichever
old plugins you installed, remove the old marketplace, then add it again
under its new name:

```sh
claude plugin uninstall claude-mermaid@claude-mods
claude plugin uninstall claude-queue@claude-mods
claude plugin marketplace remove claude-mods
claude plugin marketplace add galElmalah/claude-mods
claude plugin install mermaid-draw@gal-mods
claude plugin install prompt-queue@gal-mods
```

Install only the mods you use, then restart Claude Code. Mermaid preferences
are stored under the plugin's name; reapply any `/mermaid` settings you
changed. If you configured the queue's `joined` option, change its
`pluginConfigs` key to `prompt-queue@gal-mods` (`prompt-queue` for a local
`--plugin-dir` session), preserving the options inside it.

## Layout

Each mod is a folder of its own with the same shape: `.claude-plugin/plugin.json`,
`hooks/hooks.json` naming the hooks module `hooks/register.ts`, its own
`package.json`, tests under `tests/`, and a README. The root holds the
marketplace manifest and `.claude/`, where `/plugin-types` writes the
declarations both typecheck against.

## License

MIT.
