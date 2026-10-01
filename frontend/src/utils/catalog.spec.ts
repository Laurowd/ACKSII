import { describe, expect, it } from 'vitest'
import { selectedClass, type CatalogClass } from './catalog'
import { characterExport, characterPrintHtml } from './characterExport'

const base = { id: 'catalog:fighter', name: 'Fighter', source: 'catalog' } as CatalogClass
const custom = { id: 'custom1', name: 'Fighter', source: 'campaign' } as CatalogClass

describe('Class identity and portable sheets', () => {
  it('preserves campaign classes on legacy sheets with matching base names', () => {
    expect(selectedClass([base, custom], { className: 'Fighter' })).toBe(custom)
    expect(selectedClass([base, custom], { classKey: base.id, className: 'Fighter' })).toBe(base)
  })
  it('finds a renamed class by ID and never falls back from a missing ID', () => {
    expect(selectedClass([custom], { classKey: custom.id, className: 'Old name' })).toBe(custom)
    expect(selectedClass([base], { classKey: 'deleted', className: 'Fighter' })).toBeUndefined()
  })
  it('exports inventory, magic and domain data without account metadata or mutating the sheet', () => {
    const character = { id: 'ch1', characterName: 'Ada', userId: 'u1', user: { username: 'secret' },
      items: [{ id: 'i1', characterId: 'ch1', name: 'Corda', quantity: 1 }],
      spells: [{ name: 'Luz' }], domain: { id: 'd1', name: 'Torre' },
    }
    const result = characterExport(character, custom)
    expect(result).toMatchObject({ format: 'acks-ii-character', version: 1,
      character: { characterName: 'Ada', items: [{ name: 'Corda', quantity: 1 }], spells: [{ name: 'Luz' }], domain: { name: 'Torre' } },
      classDefinition: { name: 'Fighter', source: 'campaign' },
    })
    expect(JSON.stringify(result)).not.toContain('secret')
    expect(JSON.stringify(result)).not.toContain('characterId')
    expect(character.items[0]!.id).toBe('i1')
  })
  it('prints all relations and escapes HTML in names, notes and items', () => {
    const html = characterPrintHtml({ characterName: '<script>alert(1)</script>', notes: '<img src=x onerror=alert(2)>',
      items: [{ name: '"<b>Corda</b>' }], hpCurr: 0, isSpellcaster: false, domain: { name: 'Torre' },
    })
    expect(html).not.toContain('<script>')
    expect(html).not.toContain('<img')
    expect(html).toContain('&lt;script&gt;')
    expect(html).toContain('&quot;&lt;b&gt;Corda&lt;/b&gt;')
    expect(html).toContain('Torre')
    expect(html).toContain('Não')
    expect(html).toContain('window.print()')
  })
})
