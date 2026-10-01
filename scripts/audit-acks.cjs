// Read-only checks. No database client is loaded and no network is used.
// Run from the project root: node scripts/audit-acks.cjs
const fs = require('node:fs')
const vm = require('node:vm')
const assert = require('node:assert/strict')
const ts = require('../backend/node_modules/typescript')
function loadTS(file) {
  const exports = {}
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText
  vm.runInNewContext(code, { exports })
  return exports
}
const mechanics = loadTS('frontend/src/utils/mechanics.ts')
const classes = loadTS('backend/src/utils/seedClasses.ts').DEFAULT_CLASSES
assert.equal(mechanics.calculateAttackThrow(10, 6, 0), 16)
assert.equal(mechanics.calculateAttackThrow(10, 6, 2), 14)
assert.equal(mechanics.getEncumbranceMovement(100).moveExploration, 0)
assert.equal(mechanics.calculateHealingRate(), '1d3')
assert.equal(classes.find(c => c.name === 'Elven Spellsword').xpPerLevel.length, 10)
assert.equal(classes.find(c => c.name === 'Dwarven Vaultguard').xpPerLevel.length, 13)
console.log('Ataque, carga máxima, cura e limites raciais: OK.')
console.log('Para persistência, autorização e transações: npm.cmd test em backend.')
