export function parseCharacterImport(text: string) {
  if (new TextEncoder().encode(text).length > 240 * 1024) throw new Error('O arquivo deve ter até 240 KB.')
  let document: any
  try { document = JSON.parse(text) } catch { throw new Error('O arquivo não contém JSON válido.') }
  if (document?.format !== 'acks-ii-character' || document.version !== 1 || !document.character || typeof document.character !== 'object' || Array.isArray(document.character)) {
    throw new Error('Selecione uma exportação JSON de personagem do ACKS II (versão 1).')
  }
  return document
}
