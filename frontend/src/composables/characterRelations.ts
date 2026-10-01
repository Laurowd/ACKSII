import api from '../services/api'
import { mergeUnchangedDraft, useCharacterOperations } from './characterOperations'

export function useCharacterRelations(getCharacter: () => any) {
  const operations = useCharacterOperations()
  const base = () => `/api/characters/${getCharacter().id}`

  function add(path: string, collection: string, result: string, input: Record<string, any> = {}, suffix = '') {
    const sent = structuredClone(input)
    return operations.run(`${path}:add:${suffix}`, (version) => api.post(`${base()}/${path}`, { ...sent, version }), (data) => {
      const character = getCharacter()
      if (!character[collection]) character[collection] = []
      character[collection].push(data[result])
    })
  }

  function update(path: string, entity: any, input: Record<string, any>, result: string) {
    const sent = JSON.parse(JSON.stringify(input))
    return operations.run(`${path}:${entity.id}:update`, (version) => api.put(`${base()}/${path}/${entity.id}`, { ...sent, version }), (data) => {
      mergeUnchangedDraft(entity, sent, data[result])
    }, { retainDraft: true })
  }

  function remove(path: string, collection: string, id: string) {
    return operations.run(`${path}:${id}:remove`, (version) => api.delete(`${base()}/${path}/${id}`, { data: { version } }), () => {
      getCharacter()[collection] = (getCharacter()[collection] || []).filter((entry: any) => entry.id !== id)
    })
  }

  return { ...operations, add, update, remove }
}
