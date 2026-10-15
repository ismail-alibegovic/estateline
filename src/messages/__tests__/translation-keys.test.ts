import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

const root = path.resolve(__dirname, '../../..')
const messages: Record<string, any> = {
  bs: JSON.parse(fs.readFileSync(path.join(root, 'src/messages/bs.json'), 'utf8')),
  en: JSON.parse(fs.readFileSync(path.join(root, 'src/messages/en.json'), 'utf8')),
}

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(full, out)
    else if (entry.name.endsWith('.tsx')) out.push(full)
  }
  return out
}

function lookup(obj: any, dotted: string): unknown {
  return dotted.split('.').reduce((o, k) => (o && typeof o === 'object' ? o[k] : undefined), obj)
}

describe('translation keys used in components exist in both languages', () => {
  it('has no missing keys', () => {
    const missing: string[] = []
    for (const file of walk(path.join(root, 'src'))) {
      const text = fs.readFileSync(file, 'utf8')
      const translators = Array.from(text.matchAll(/const (\w+) = useTranslations\('([\w.]+)'\)/g))
      for (const [, variable, namespace] of translators) {
        const uses = Array.from(text.matchAll(new RegExp(`\\b${variable}\\('([\\w.]+)'`, 'g')))
        for (const [, key] of uses) {
          for (const lang of ['bs', 'en']) {
            if (lookup(messages[lang], `${namespace}.${key}`) === undefined) {
              missing.push(`${path.relative(root, file)}: ${lang} ${namespace}.${key}`)
            }
          }
        }
      }
    }
    expect(missing).toEqual([])
  })
})
