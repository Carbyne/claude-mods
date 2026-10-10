import { spawnSync } from 'node:child_process'
import { cpSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

// Claude's runner loads every *.test.ts in the plugin folder and cannot
// import bun:test. Give it the hooks and its own tests in an isolated copy.
const root = dirname(dirname(fileURLToPath(import.meta.url)))
const fixture = mkdtempSync(join(tmpdir(), 'mermaid-plugin-tests-'))
try {
  for (const folder of ['.claude-plugin', 'hooks']) {
    cpSync(join(root, folder), join(fixture, folder), { recursive: true })
  }
  mkdirSync(join(fixture, 'tests'))
  cpSync(join(root, 'tests/render.test.ts'), join(fixture, 'tests/render.test.ts'))
  const result = spawnSync('claude', ['plugin', 'test', fixture], {
    stdio: 'inherit',
    env: { ...process.env, CLAUDE_CODE_ENABLE_FUNCTION_HOOKS: '1' },
  })
  if (result.error) console.error(result.error.message)
  process.exitCode = result.status ?? 1
} finally {
  rmSync(fixture, { recursive: true, force: true })
}
