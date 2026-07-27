import { readdir, readFile } from 'node:fs/promises'
import { extname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const sourceRoot = fileURLToPath(new URL('../../src/', import.meta.url))
const bannedPhrases = [
  'welcome back',
  "here's what's happening",
  'here’s what’s happening',
  'everything you need',
  'all-in-one',
  'loading your private poker data',
  'this private link controls only your invitation',
  'private receipt evidence',
  'private results, bankroll',
]

async function sourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const path = join(directory, entry.name)
      if (entry.isDirectory()) return sourceFiles(path)
      return ['.ts', '.tsx'].includes(extname(entry.name)) ? [path] : []
    }),
  )
  return nested.flat()
}

const failures = []
for (const file of await sourceFiles(sourceRoot)) {
  const contents = (await readFile(file, 'utf8')).toLowerCase()
  for (const phrase of bannedPhrases) {
    if (contents.includes(phrase)) {
      failures.push(`${relative(sourceRoot, file)}: "${phrase}"`)
    }
  }
}

if (failures.length) {
  console.error(`Removed filler copy found:\n${failures.join('\n')}`)
  process.exitCode = 1
} else {
  console.log('Content check passed.')
}
