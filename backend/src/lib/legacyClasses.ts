import { DEFAULT_CLASSES, RAW_DEFAULT_CLASSES, PREVIOUS_DEFAULT_CLASSES } from '../utils/seedClasses'

// Old campaign seeding copied these arrays verbatim, without any custom metadata.
// Never hide a same-name class with actual changes or campaign-specific features.
export function legacyBaseName(c: any): string | null {
  if (c.description || c.classFeatures || c.baseClassKey) return null
  try {
    if (Object.keys(JSON.parse(c.creationRules || '{}')).length) return null
    if (JSON.parse(c.thiefSkills || '[]').length || JSON.parse(c.rebukingUndead || '[]').length) return null
    const matches = [RAW_DEFAULT_CLASSES, PREVIOUS_DEFAULT_CLASSES, DEFAULT_CLASSES].flat().filter(base => base.name === c.name)
    return matches.some(base => c.hitDie === base.hitDie && c.conBonus === base.conBonus &&
      ['xpPerLevel', 'titles', 'attackThrows', 'savingThrows'].every(key =>
        JSON.stringify(JSON.parse(c[key])) === JSON.stringify((base as any)[key]))) ? c.name : null
  } catch { return null }
}
