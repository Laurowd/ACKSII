const labels: Record<string, string> = {
  REWARD_SETTLEMENT: 'Distribuição de XP e ouro', REWARD_RECEIVED: 'Recompensa recebida',
  ADVENTURE_SETTLEMENT: 'Aventura encerrada', XP_ADJUSTMENT: 'Correção de XP',
  LEVEL_ADVANCEMENT: 'Avanço de nível', SPELL_CAST: 'Magia conjurada', SPELL_REST: 'Descanso registrado',
  REPERTOIRE_REPLACED: 'Repertório atualizado', SPELL_FORMULA_ACQUIRED: 'Fórmula adquirida',
  SPELL_STUDY_STARTED: 'Estudo iniciado', SPELL_STUDY_COMPLETED: 'Estudo concluído', SPELL_STUDY_CANCELLED: 'Estudo cancelado',
  COMBAT_MODIFIERS_UPDATED: 'Modificadores de combate', MAGIC_ITEM_RECORDED: 'Item mágico atualizado',
  ITEM_CHARGE_USED: 'Cargas utilizadas', CHARACTER_IMPORTED: 'Ficha importada',
  PROFICIENCY_ORIGIN_UPDATED: 'Proficiências da origem conferidas',
  CLASS_CHOICES_UPDATED: 'Concessões da classe conferidas',
}
const format = (value: unknown) => Number(value || 0).toLocaleString('pt-BR')
export function presentAudit(log: any) {
  let details: any = null
  try { details = JSON.parse(log.details) } catch { /* Older entries contain readable text. */ }
  const title = labels[log.action] || 'Alteração registrada'
  const lines: string[] = []
  const awards = log.action === 'REWARD_SETTLEMENT' ? details?.awards : log.action === 'ADVENTURE_SETTLEMENT' ? details?.preview : null
  if (Array.isArray(awards)) for (const award of awards) {
    lines.push(`${award.name || 'Personagem'}: +${format(award.gained)} XP${award.gold != null ? ` · +${format(award.gold)} GP` : ''}`)
  }
  if (log.action === 'REWARD_RECEIVED' && details) {
    lines.push(`XP: ${format(details.beforeXp)} → ${format(details.xp)} (+${format(details.gained)})`)
    lines.push(`Ouro: ${format(details.beforeGold)} → ${format(details.coinGP)} (+${format(details.gold)} GP)`)
  }
  if (log.action === 'XP_ADJUSTMENT' && details) lines.push(`XP: ${format(details.before)} → ${format(details.after)} (${details.delta >= 0 ? '+' : ''}${format(details.delta)})`)
  if (log.action === 'SPELL_CAST' && details?.name) lines.push(details.name)
  if (log.action === 'LEVEL_ADVANCEMENT' && details?.preview) lines.push(`Nível ${details.preview.level} · ${format(details.preview.hpMax)} PV máximos`)
  if (details?.spell?.name) lines.push(details.spell.name)
  if (log.action === 'PROFICIENCY_ORIGIN_UPDATED' && details) {
    lines.push(`Origem: ${details.label}`)
    for (const [key, label] of [['added','Concedidas'], ['converted','Reclassificadas'], ['removed','Removidas']]) {
      if (details[key!]?.length) lines.push(`${label}: ${details[key!].map((p:any) => p.name).join(', ')}`)
    }
  }
  if (log.action === 'CLASS_CHOICES_UPDATED' && details) {
    for (const [key, label] of [['added','Concedidas'],['converted','Reclassificadas'],['removed','Removidas']]) if (details[key!]?.length) lines.push(`${label}: ${details[key!].map((p:any) => p.name).join(', ')}`)
    if (details.totemStatus) lines.push(`Totem: ${details.totemStatus.alive ? 'vivo' : 'morto'} · ${details.totemStatus.nearby ? 'próximo' : 'distante'}`)
  }
  if (details?.reason) lines.push(`Motivo: ${details.reason}`)
  if (!details && typeof log.details === 'string') lines.push(log.details)
  return { title, subject: log.character?.characterName || 'Campanha', lines }
}
