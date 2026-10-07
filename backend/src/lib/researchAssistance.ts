import { abilityModifier } from './creationRules'
import { magicPools, type ClassRules } from './gameRules'

/** Revised Rulebook p. 390: direct assistants in the normal item-research flow. */
export function researchAssistantAllowance(rules: ClassRules | undefined, character: any, tradition: string, casterLevel: number) {
  const pool = rules && magicPools(rules, character).find(value => value.tradition === tradition)
  if (!pool?.studious) return { limit: 0, reason: 'Assistentes de pesquisa exigem um conjurador de estudo. Exceções de proficiências e poderes usam o projeto manual conferido pelo mestre.' }
  if (casterLevel < 5 || pool.casterLevel < casterLevel) return { limit: 0, reason: 'Para supervisionar assistentes, use um nível de conjurador de estudo válido e de pelo menos 5.' }
  return { limit: 1 + Math.max(0, abilityModifier(character.int)), reason: '' }
}

export function validateResearchAssistants(rules: ClassRules | undefined, character: any, input: any) {
  if (!input.assistants.length) return
  const allowance = researchAssistantAllowance(rules, character, input.tradition, input.casterLevel)
  if (!allowance.limit) throw new Error(allowance.reason)
  if (input.assistants.length > allowance.limit) throw new Error(`Limite de ${allowance.limit} assistente(s): um mais o bônus de INT (Rulebook p. 390).`)
  if (input.assistants.some((assistant: any) => !Number.isInteger(assistant.casterLevel) || assistant.casterLevel < 1 || assistant.casterLevel > 14)) throw new Error('Cada assistente direto precisa ter nível de conjurador entre 1 e 14.')
}
