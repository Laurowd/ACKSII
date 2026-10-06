<template>
  <section v-if="info.rules?.classChoices?.length" class="space-y-3" aria-label="Concessões da classe">
    <fieldset :disabled="busy" class="min-w-0 space-y-3">
    <ClassChoicesForm v-model="choices" :rules="info.rules" :character="character" :can-approve="canManage" :locked="initial" :show-errors="reviewed" />
    <div v-if="info.rules.className === 'Shaman' && choices.totem" class="rounded-xl border border-steel-dark p-4 space-y-2 text-sm">
      <h3 class="text-gold font-bold">Estado do animal totêmico</h3>
      <label class="block"><input v-model="totem.alive" type="checkbox" /> O animal está vivo</label>
      <label class="block"><input v-model="totem.nearby" type="checkbox" :disabled="!totem.alive" /> Está a até 30 pés do Shaman</label>
      <p>A proficiência do totem fica disponível enquanto ambas as condições estiverem confirmadas.</p>
      <p v-if="!totem.alive" class="text-gold">Se o totem morreu, faça o salvamento de Death: em caso de falha, registre dano igual aos PV máximos do animal. Ele não pode ser ressuscitado; um novo do mesmo tipo aparece ao ganhar um nível.</p>
    </div>
    <template v-if="canManage">
      <label v-if="info.rules.className === 'Dwarven Craftpriest'" class="block text-sm"><input v-model="reconcile" type="checkbox" /> Conferir também o bônus de +3 nos alvos antigos de Adventuring, preservando seus ajustes</label>
      <label class="block text-sm">Justificativa da revisão<textarea v-model="reason" rows="2" maxlength="1000" class="inp mt-1" placeholder="Obrigatória ao trocar uma escolha já registrada" /></label>
    </template>
    <p v-if="error" role="alert" class="text-sm text-red-400">{{ error }}</p>
    <p v-if="notice" role="status" class="text-sm text-gold">{{ notice }}</p>
    <button type="button" @click="review" :disabled="busy" class="btn">Conferir concessões da classe</button>
    <div v-if="preview" class="rounded-xl border border-gold/30 p-4 space-y-2 text-sm">
      <p>Conceder: {{ names(preview.added) }}</p><p>Reclassificar como gratuitas: {{ names(preview.converted) }}</p><p>Remover concessões anteriores: {{ names(preview.removed) }}</p>
      <p v-if="preview.targets?.length">Conferir alvos: {{ preview.targets.map((row:any) => `${row.name} ${row.throwTarget}+`).join(', ') }}</p>
      <p v-if="preview.issues?.length" class="text-gold">Ainda para conferir: {{ preview.issues.join(' ') }}</p>
      <p class="text-xs text-steel-light">Os alvos de entradas reclassificadas são preservados. O histórico registra a revisão.</p>
      <button type="button" @click="apply" :disabled="busy" class="btn">Confirmar concessões da classe</button>
    </div>
    </fieldset>
  </section>
</template>
<script setup lang="ts">
import { ref, watch } from 'vue'
import ClassChoicesForm from '../ClassChoicesForm.vue'
import { selectionsFor, abilityState, type ClassSelections } from '../../../../backend/src/lib/classAbilities'
import api from '../../services/api'
import { errorMessage } from '../../utils/catalog'
import { useCharacterOperations } from '../../composables/characterOperations'
import { createLocalDraft } from '../../utils/localDrafts'
import { useAuthStore } from '../../stores/auth'
const props = defineProps<{ character: any; info: any; canManage?: boolean; prepare: () => Promise<boolean> }>()
const emit = defineEmits<{ changed: [] }>()
const operations = useCharacterOperations()
const initial = ref<ClassSelections>({}), choices = ref<ClassSelections>({}), totem = ref({alive:true,nearby:true}), reconcile = ref(false), reason = ref('')
const busy = ref(false), reviewed = ref(false), preview = ref<any>(null), payload = ref<any>(null), error = ref(''), notice = ref('')
const draftStore = createLocalDraft<{choices:ClassSelections;totem:{alive:boolean;nearby:boolean};reason:string;reconcile:boolean}>(useAuthStore().user?.id || '', `class-choices:${props.character.id}:${props.character.classKey}`)
let draftRevision = 0, restored = false, resetting = false, baseline = ''
const snapshot = () => JSON.stringify([choices.value,totem.value,reconcile.value,reason.value])
function reset() { resetting=true; initial.value = {...selectionsFor(props.character)}; choices.value = {...initial.value}; const status = abilityState(props.character).totemStatus; totem.value = {alive: status?.alive ?? true, nearby: status?.nearby ?? true}; reconcile.value = false; reason.value = ''; baseline=snapshot(); resetting=false }
watch(() => JSON.stringify([props.info.classChoices,props.info.totemStatus]), () => {
  if (busy.value) return
  if (restored && snapshot() !== baseline) { preview.value = null; error.value = 'A ficha foi atualizada. Suas escolhas locais foram preservadas; confira novamente antes de confirmar.'; return }
  const saved = draftStore.read()?.data
  reset()
  if (saved?.choices && typeof saved.choices === 'object' && !Array.isArray(saved.choices)) { choices.value={...saved.choices}; if (typeof saved.totem?.alive==='boolean' && typeof saved.totem?.nearby==='boolean') totem.value={...saved.totem}; reason.value=typeof saved.reason==='string'?saved.reason:''; reconcile.value=saved.reconcile===true; notice.value='Rascunho de concessões recuperado. Confira a prévia antes de registrar.' }
  restored = true
}, {immediate:true})
watch([choices,totem,reconcile,reason], () => { draftRevision++; preview.value = null; if(restored && !resetting) { if(snapshot() !== baseline) draftStore.write({choices:{...choices.value},totem:{...totem.value},reason:reason.value,reconcile:reconcile.value}); else draftStore.remove() } }, {deep:true,flush:'sync'})
watch(() => props.character.version, () => { preview.value = null }, {flush:'sync'})
const names = (rows: any[] = []) => rows.map(row => row.name).join(', ') || 'nenhuma'
const url = () => `/api/game-rules/characters/${props.character.id}/class-choices`
async function review() {
  if (busy.value) return
  busy.value = true; reviewed.value = true; preview.value = null; error.value = ''; notice.value = ''
  try {
    if (!await props.prepare() || !await operations.retryPending()) throw Error('Salve ou resolva as alterações pendentes antes de conferir as concessões.')
    const current = (await api.get(`/api/game-rules/characters/${props.character.id}`)).data
    payload.value = {version:current.version,choices:{...choices.value},reason:reason.value,...(reconcile.value?{reconcileAdventuring:true}:{}),...(props.info.rules.className === 'Shaman' && choices.value.totem ? {totemStatus:{...totem.value}} : {})}
    const revision = draftRevision
    const response = (await api.post(`${url()}/preview`,payload.value)).data
    if (props.character.version !== payload.value.version || draftRevision !== revision) throw Error('A ficha ou as escolhas mudaram durante a conferência. Confira novamente.')
    preview.value = response
  } catch (caught) { error.value = errorMessage(caught,'Não foi possível conferir as concessões.') }
  finally { busy.value = false }
}
async function apply() {
  if (busy.value || !preview.value) return
  const input = JSON.parse(JSON.stringify(payload.value)); busy.value = true; preview.value = null; error.value = ''
  try {
    const response = await operations.run('class-choices:update',()=>api.post(`${url()}/apply`,input),undefined,{retainDraft:true})
    if (!response) throw operations.getLastError() || Error('Confira a ficha antes de repetir a revisão.')
    reset(); draftStore.remove(); notice.value = 'Concessões da classe registradas.'; emit('changed')
  } catch (caught) { error.value = errorMessage(caught,'Não foi possível registrar as concessões. As escolhas foram preservadas.') }
  finally { busy.value = false }
}
</script>
<style scoped>.btn { padding:.5rem 1rem; background:#c6a052; color:#171717; border-radius:.4rem; font-weight:700 }.btn:disabled { opacity:.5 }</style>
