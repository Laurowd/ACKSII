import type { CatalogClass } from './catalog'
import { calculateCharacterMetrics } from './characterMetrics'
import {classDefinitionFeats} from './classDefinitionFeats'

const privateFields = new Set(['id', 'userId', 'campaignId', 'characterId', 'createdAt', 'updatedAt', 'user', 'auditLogs', 'version'])
function portable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(portable)
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).filter(([key]) => !privateFields.has(key)).map(([key, child]) => [key, portable(child)]))
  return value
}

export function characterExport(character: Record<string, unknown>, definition?: CatalogClass, automaticProgression = true) {
  const metrics = calculateCharacterMetrics(character, definition)
  if (!automaticProgression) metrics.xpNext = Number(character.xpNext) || 0
  const { armorClass: ac, encumbrance: movement } = metrics
  const current = { ...character, xpNext: automaticProgression ? metrics.xpNext : character.xpNext,
    acNoArmor: ac.noArmor, acNoShield: ac.noShield, acWithShield: ac.withShield,
    initiative: metrics.initiative, moveExploration: movement.moveExploration, moveCombat: movement.moveCombat,
    moveCharge: movement.moveCharge, moveExpedition: movement.moveExpedition, moveStealth: movement.moveStealth }
  return { format: 'acks-ii-character', version: 1, exportedAt: new Date().toISOString(),
    classDefinition: definition ? portable(definition) : null, character: portable(current), computed: metrics }
}

const escapeHtml = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
const labels: Record<string, string> = {
  characterName: 'Nome', className: 'Classe', subclass: 'Subclasse', title: 'Título', birthplace: 'Terra natal',
  chroniclesOf: 'Crônicas', alignment: 'Alinhamento', age: 'Idade', size: 'Tamanho', gender: 'Gênero',
  level: 'Nível', xp: 'XP', xpNext: 'XP do próximo nível', hpMax: 'PV máximos', hpCurr: 'PV atuais', hitDice: 'Dado de vida',
  str: 'Força', int: 'Intelecto', dex: 'Destreza', wil: 'Vontade', con: 'Constituição', cha: 'Carisma',
  notes: 'Notas', classFeatures: 'Poderes e características', languagesKnown: 'Idiomas',
  weapons: 'Armas', proficiencies: 'Proficiências', items: 'Inventário', spells: 'Magias', rituals: 'Rituais', magicFormulae: 'Fórmulas mágicas',
  henchmen: 'Seguidores', domain: 'Domínio', scars: 'Ferimentos', activities: 'Atividades', armyUnits: 'Unidades militares',
  magicItemResearch: 'Pesquisa mágica', mercantileVentures: 'Empreendimentos',
  name: 'Nome', quantity: 'Quantidade', weight: 'Peso', slot: 'Local', category: 'Categoria',
  acNoArmor: 'CA sem armadura', acNoShield: 'CA sem escudo', acWithShield: 'CA com escudo', armorName: 'Armadura', armorWeight: 'Peso da armadura', armorAcBonus: 'Bônus da armadura',
  saveDeath: 'Morte', saveParalysis: 'Paralisia', saveBlast: 'Explosão', saveImplements: 'Implementos', saveSpells: 'Magias',
  initiative: 'Iniciativa', healingRate: 'Recuperação', mortalWounds: 'Ferimentos mortais', cleaves: 'Trespasses',
  moveExploration: 'Exploração (pés/turno)', moveCombat: 'Combate (pés/rodada)', moveCharge: 'Carga (pés/rodada)', moveExpedition: 'Expedição (milhas/dia)', moveStealth: 'Furtividade (pés/rodada)',
  coinPP: 'Platina', coinGP: 'Ouro', coinEP: 'Electro', coinSP: 'Prata', coinCP: 'Cobre', gemsJewelry: 'Gemas e joias',
  isSpellcaster: 'Usa magia', spellbook: 'Grimório', learnedSpells: 'Magias aprendidas', researchQueue: 'Fila de pesquisa',
  attackThrow: 'Jogada de ataque', damage: 'Dano', range: 'Alcance', throwTarget: 'Valor alvo',
}

export function characterPrintHtml(character: Record<string, unknown>, definition?: CatalogClass, automaticProgression = true) {
  const exported = characterExport(character, definition, automaticProgression)
  const powers=definition ? classDefinitionFeats(definition,String(character.className||''),Number(character.level)||1,String(character.subclass||'')).powers : []
  const clean = exported.character as Record<string, unknown>
  clean.healingRate = exported.computed.healingRate
  delete clean.classKey
  const display = (value: unknown): string => {
    if (typeof value === 'boolean') return value ? 'Sim' : 'Não'
    if (Array.isArray(value)) return value.length ? `<ul>${value.map(v => `<li>${display(v)}</li>`).join('')}</ul>` : '—'
    if (value && typeof value === 'object') return `<dl>${Object.entries(value).map(([k,v]) => `<dt>${escapeHtml(labels[k] || k)}</dt><dd>${display(v)}</dd>`).join('')}</dl>`
    return escapeHtml(value || (value === 0 ? 0 : '—'))
  }
  // Keep the core sheet compact; longer inventories and notes flow across pages.
  const groups: [string, string[]][] = [
    ['Identidade', ['characterName', 'className', 'subclass', 'title', 'level', 'alignment', 'birthplace', 'age', 'size', 'gender']],
    ['Atributos', ['str', 'int', 'dex', 'wil', 'con', 'cha']],
    ['Combate e experiência', ['hpCurr', 'hpMax', 'hitDice', 'xp', 'xpNext', 'acNoArmor', 'acNoShield', 'acWithShield', 'armorName', 'armorAcBonus', 'armorWeight', 'initiative', 'healingRate', 'cleaves']],
    ['Salvamentos', ['saveDeath', 'saveParalysis', 'saveBlast', 'saveImplements', 'saveSpells']],
    ['Movimento', ['moveExploration', 'moveCombat', 'moveCharge', 'moveExpedition', 'moveStealth']],
    ['Tesouro', ['coinPP', 'coinGP', 'coinEP', 'coinSP', 'coinCP', 'gemsJewelry']],
  ]
  const grouped = new Set(groups.flatMap(([, keys]) => keys))
  const core = groups.map(([title, keys]) => {
    const values = Object.fromEntries(keys.filter(k => k in clean).map(k => [k, clean[k]]))
    return Object.keys(values).length ? `<section class="core"><h2>${title}</h2>${display(values)}</section>` : ''
  }).join('')
  const remaining = Object.entries(clean).filter(([k]) => !grouped.has(k))
  const otherScalars = Object.fromEntries(remaining.filter(([,v]) => typeof v !== 'object' && typeof v !== 'string'))
  const details = remaining.filter(([,v]) => v !== null && v !== '' && (Array.isArray(v) ? v.length > 0 : typeof v === 'object' || typeof v === 'string')).map(([k,v]) => `<section><h2>${escapeHtml(labels[k] || k)}</h2>${display(v)}</section>`).join('')
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(character.characterName)} — ACKS II</title><style>
  body{font:14px system-ui,sans-serif;color:#222;max-width:960px;margin:24px auto;padding:0 20px}h1,h2{font-family:Georgia,serif}h1{border-bottom:3px solid #9b7b31;padding-bottom:12px}section{margin:14px 0}.core{break-inside:avoid}h2{font-size:16px;margin-bottom:6px;color:#614b1d;break-after:avoid}dl{display:grid;grid-template-columns:minmax(120px,1fr) 3fr;gap:5px 15px}dt{font-weight:bold}dd{margin:0;white-space:pre-wrap;overflow-wrap:anywhere}li{margin-bottom:8px}button{padding:10px 16px;cursor:pointer}p{white-space:pre-wrap}@media print{button,.hint{display:none}body{margin:0;max-width:none}h2{color:#222}@page{margin:15mm}}
  </style></head><body><button onclick="window.print()">Imprimir / salvar em PDF</button><p class="hint">Use a opção Salvar como PDF na janela de impressão.</p><h1>${escapeHtml(character.characterName || 'Personagem')} — ACKS II</h1>
  ${definition ? `<p>Classe: ${escapeHtml(definition.name)} · ${definition.source === 'catalog' ? 'Catálogo base' : 'Campanha'}</p>` : ''}
  ${core}${powers.length?`<section><h2>Poderes da classe</h2><ul>${powers.map(p=>`<li><strong>${escapeHtml(p.name)}</strong><p>${escapeHtml(p.description)}</p></li>`).join('')}</ul></section>`:''}${definition?.classFeatures&&definition.classFeatures!==character.classFeatures?`<section><h2>Características e restrições da classe</h2><p>${escapeHtml(definition.classFeatures)}</p></section>`:''}${Object.keys(otherScalars).length ? `<section><h2>Outros valores</h2>${display(otherScalars)}</section>` : ''}${details}
  </body></html>`
}

export function downloadCharacter(content: string, name: string, extension: 'json' | 'html') {
  const blob = new Blob([content], { type: extension === 'json' ? 'application/json;charset=utf-8' : 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = `${name.replace(/[^\p{L}\p{N}_-]+/gu, '-').slice(0,80) || 'personagem'}.${extension}`
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
