<template>
  <div class="space-y-4">
    <section class="rounded-xl border border-gold/25 bg-dark-card p-4 sm:p-5 space-y-4">
      <div class="flex flex-wrap justify-between gap-3"><h2 class="text-xl text-gold">Durante a sessão</h2><span class="text-sm text-steel-light">CA {{ metrics.armorClass.noShield }} / {{ metrics.armorClass.withShield }} com escudo · Iniciativa {{ signed(metrics.initiative) }}</span></div>
      <div class="flex flex-wrap items-end gap-3">
        <strong class="text-xl text-gold py-2">{{ character.hpCurr }} / {{ character.hpMax }} PV</strong>
        <label class="text-sm">Quantidade de PV<input id="session-hp-amount" v-model.number="amount" type="number" min="1" max="1000000" class="inp w-28 mt-1" /></label>
        <button type="button" @click="changeHp(-amount)" :disabled="!valid || busy" class="ui-button ui-button-danger">Registrar dano</button>
        <button type="button" @click="changeHp(amount)" :disabled="!valid || busy" class="ui-button ui-button-secondary">Registrar cura</button>
      </div>
      <p class="text-xs text-steel-light">Cura limitada aos PV máximos. Dano pode deixar os PV negativos; ferimentos mortais continuam a critério do mestre.</p>
      <dl class="grid grid-cols-2 sm:grid-cols-5 gap-2 text-sm"><div v-for="save in saves" :key="save.key" class="rounded-lg bg-dark-bg/50 p-3"><dt class="text-steel-light">{{ save.label }}</dt><dd class="font-bold text-gold">{{ character[save.key] }}</dd></div></dl>
      <div class="grid gap-2 sm:grid-cols-2"><article v-for="weapon in character.weapons" :key="weapon.id" class="rounded-lg border border-steel-dark p-3 text-sm"><strong class="text-gold">{{ weapon.name }}</strong><p>Alvo de ataque {{ weapon.attackThrow }} + CA do adversário − ({{ signed(attackBonus(weapon)) }})</p><p>Dano {{ weapon.damage }} <span class="text-steel-light">· classe {{ signed(effects.weaponDamageBonusFor(weapon)) }}</span></p><p v-if="!weapon.automaticDamage" class="text-xs text-steel-light">Dano manual: confira se já inclui o bônus da classe.</p></article></div>
      <p v-if="!character.weapons?.length" class="text-sm text-steel-light">Registre armas em Geral & Combate para consultar os ataques aqui.</p>
    </section>
    <SpellcastingPanel v-if="character.isSpellcaster || character.spells?.length" :character="character" :prepare="prepare" :refresh="refresh" :repertoire-draft="repertoireDraft" compact :spell-descriptions="descriptions" :descriptions-loading="descriptionsLoading" :descriptions-error="descriptionsError" @retry-descriptions="loadDescriptions" />
  </div>
</template>
<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import api from '../../services/api'
import SpellcastingPanel from './SpellcastingPanel.vue'
import { calculateCharacterMetrics } from '../../utils/characterMetrics'
import { getModifier, getWeaponAbilityModifier } from '../../utils/mechanics'
import { classEffects } from '../../utils/classEffects'
import type { RepertoireDraft } from '../../utils/spellcasting'
const props = defineProps<{ character: any; definition?: any; prepare: () => Promise<boolean>; refresh: () => Promise<void>; repertoireDraft: RepertoireDraft; busy: boolean }>()
const emit = defineEmits<{ save: [] }>()
const amount = ref(1), valid = computed(() => Number.isInteger(amount.value) && amount.value > 0 && amount.value <= 1000000)
const metrics = computed(() => calculateCharacterMetrics(props.character, props.definition))
const signed = (value: number) => `${value >= 0 ? '+' : ''}${value}`
const effects=computed(()=>classEffects(props.character,props.definition?.ruleProfile))
const attackBonus = (weapon: any) => Number(weapon.attackBonus || 0) + getWeaponAbilityModifier(weapon, getModifier(props.character.str), getModifier(props.character.dex),effects.value.finesseFor(weapon))
const saves = [{ key: 'saveDeath', label: 'Morte' }, { key: 'saveImplements', label: 'Implementos' }, { key: 'saveParalysis', label: 'Paralisia' }, { key: 'saveBlast', label: 'Explosão' }, { key: 'saveSpells', label: 'Magias' }]
function changeHp(delta: number) { if (!valid.value || props.busy) return; props.character.hpCurr = Math.max(-2147483648, Math.min(Number(props.character.hpMax), Number(props.character.hpCurr) + delta)); emit('save') }
const descriptions = ref<any[]>([]), descriptionsLoading = ref(false), descriptionsError = ref('')
async function loadDescriptions() { descriptionsLoading.value = true; descriptionsError.value = ''; try { descriptions.value = (await api.get('/api/compendium/search', { params: { type: 'spell', limit: 500 } })).data.entries || [] } catch { descriptionsError.value = 'Não foi possível carregar as descrições.' } finally { descriptionsLoading.value = false } }
onMounted(loadDescriptions)
</script>
