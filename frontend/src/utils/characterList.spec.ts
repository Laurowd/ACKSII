import { expect, it } from 'vitest'
import { filterCharacters, recentCharacters } from './characterList'
const characters = [
  { id: '1', characterName: 'Ária', className: 'Mage', level: 1, campaignId: null, updatedAt: '2026-10-01', user: { username: 'Lauro' } },
  { id: '2', characterName: 'Bardo', className: 'Bard', level: 3, campaignId: 'camp', updatedAt: '2026-10-02', user: { username: 'Ana' } },
]
it('combines accent-insensitive name/class/player search with campaign and stable sorting', () => {
  expect(filterCharacters(characters, 'ALL', 'aria MAGE', 'name').map(c => c.id)).toEqual(['1'])
  expect(filterCharacters(characters, 'camp', 'ana', 'updated').map(c => c.id)).toEqual(['2'])
  expect(filterCharacters(characters, '', '', 'level').map(c => c.id)).toEqual(['1'])
  expect(filterCharacters(characters, 'ALL', '', 'level').map(c => c.id)).toEqual(['2', '1'])
  expect(characters[0]!.id).toBe('1')
})
it('bounds and deduplicates recent characters and separates accounts', () => {
  const map = new Map<string, string>(), storage = { getItem: (k: string) => map.get(k) || null, setItem: (k: string, v: string) => { map.set(k, v) } }
  const recent = recentCharacters('owner', storage)
  for (let id = 0; id < 10; id++) recent.visit(String(id))
  recent.visit('7'); expect(recent.read()).toEqual(['7', '9', '8', '6', '5', '4'])
  expect(recentCharacters('other', storage).read()).toEqual([])
})
