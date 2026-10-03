<template>
  <section class="rounded-xl border border-gold/25 bg-dark-card p-4 sm:p-5 space-y-4" aria-labelledby="rewards-title">
    <div><h2 id="rewards-title" class="text-xl text-gold">Distribuir XP e ouro</h2>
      <p class="mt-2 text-sm text-steel-light">O mestre define o que cada personagem recebe. XP e moedas são lançados separadamente nas fichas.</p>
    </div>
    <p v-if="error" role="alert" class="text-red-400 text-sm">{{ error }}</p>
    <p v-if="notice" role="status" class="text-green-400 text-sm">{{ notice }}</p>
    <div v-if="recovery" class="rounded-lg border border-gold/30 p-3 text-sm space-y-2">
      <p>Há um lançamento guardado neste navegador. Recupere-o e confira os saldos antes de confirmar novamente.</p>
      <button type="button" @click="restore" :disabled="busy" class="text-gold underline">Recuperar lançamento</button>
      <button type="button" @click="discard" :disabled="busy" class="ml-4 text-steel-light underline">Descartar rascunho</button>
    </div>
    <fieldset :disabled="busy || !!recovery" class="min-w-0 space-y-4">
      <label class="block text-sm">Sessão ou motivo (opcional)<input v-model="reason" maxlength="1000" class="inp mt-1" placeholder="Ex.: retorno das ruínas" /></label>
      <details class="rounded-lg border border-steel-dark p-3">
        <summary class="cursor-pointer text-sm text-gold">Preencher o mesmo valor para os selecionados</summary>
        <div class="mt-3 grid gap-3 sm:grid-cols-3 sm:items-end">
          <label class="text-sm">XP por personagem<input v-model.number="bulk.xp" type="number" min="0" max="2147483647" step="1" class="inp mt-1" /></label>
          <label class="text-sm">Ouro por personagem (GP)<input v-model.number="bulk.gold" type="number" min="0" max="2147483647" step="1" class="inp mt-1" /></label>
          <button type="button" @click="fillSelected" class="reward-button" :disabled="!selected.length">Preencher selecionados</button>
        </div>
      </details>
      <div class="flex flex-wrap justify-between gap-2 text-sm"><p>{{ selected.length }} de {{ rows.length }} personagens selecionados</p>
        <button type="button" @click="selectAll" class="text-gold underline">{{ rows.every(r => r.selected) ? 'Desmarcar todos' : 'Selecionar todos' }}</button>
      </div>
      <div class="space-y-2">
        <div v-for="row in rows" :key="row.id" class="grid min-w-0 gap-3 rounded-lg border p-3 sm:grid-cols-[minmax(0,1fr)_9rem_9rem] sm:items-center" :class="row.selected ? 'border-gold/25 bg-dark-bg/40' : 'border-steel-dark'">
          <label class="flex min-w-0 items-start gap-3"><input v-model="row.selected" type="checkbox" class="mt-1 shrink-0" :aria-label="`Selecionar ${row.name}`" />
            <span class="min-w-0"><strong class="block break-words">{{ row.name }}</strong><span class="block text-xs text-steel-light break-words">{{ row.player }} · {{ row.className }} · Nível {{ row.level }}</span></span>
          </label>
          <label class="text-xs text-steel-light">XP a receber<input v-model.number="row.xp" :aria-label="`XP para ${row.name}`" :disabled="!row.selected" type="number" min="0" max="2147483647" step="1" class="inp mt-1" /></label>
          <label class="text-xs text-steel-light">Ouro a receber (GP)<input v-model.number="row.gold" :aria-label="`Ouro para ${row.name}`" :disabled="!row.selected" type="number" min="0" max="2147483647" step="1" class="inp mt-1" /></label>
        </div>
      </div>
      <p class="text-xs text-steel-light">Informe o XP final, já com os ajustes decididos pelo mestre. Esta opção não converte ouro em XP, não reaplica bônus de atributos e não avança níveis automaticamente.</p>
      <button type="button" @click="checkRewards" :disabled="!valid" class="reward-button">{{ busy ? 'Conferindo…' : 'Conferir recompensas' }}</button>
      <div v-if="preview" class="rounded-lg border border-gold/40 p-3 space-y-3" aria-label="Prévia das recompensas">
        <h3 class="text-gold font-bold">Confira antes de registrar</h3>
        <div v-for="award in preview.awards" :key="award.id" class="border-b border-steel-dark pb-2 text-sm">
          <strong class="break-words">{{ award.name }}</strong>
          <p>XP: {{ format(award.beforeXp) }} + {{ format(award.gained) }} = <strong>{{ format(award.xp) }}</strong></p>
          <p>Ouro: {{ format(award.beforeGold) }} + {{ format(award.gold) }} = <strong>{{ format(award.coinGP) }} GP</strong></p>
        </div>
        <button type="button" @click="applyRewards" class="reward-button">Confirmar XP e ouro</button>
      </div>
    </fieldset>
  </section>
</template>

<script setup lang="ts">
import { computed, inject, onBeforeUnmount, ref, watch } from 'vue'
import api from '../services/api'
import { characterOperationsKey } from '../composables/characterOperations'
import { createLocalDraft } from '../utils/localDrafts'
import { errorMessage } from '../utils/catalog'
import { useAuthStore } from '../stores/auth'

const props = defineProps<{ characters: any[]; campaignId?: string | null; selectedId?: string; prepare?: () => Promise<boolean>; refresh?: () => Promise<void> }>()
const operations = inject(characterOperationsKey, null)
const auth = useAuthStore()
const draft = createLocalDraft<any>(auth.user?.id || '', `rewards:${props.campaignId || 'unassigned'}`)
const recovery = ref(draft.read())
const reason = ref(''), receipt = ref(crypto.randomUUID()), busy = ref(false), error = ref(''), notice = ref('')
const bulk = ref({ xp: 0, gold: 0 })
const rows = ref<any[]>([]), preview = ref<any>(null), snapshot = ref<any>(null)
let revision = 0, disposed = false
const format = (value: number) => Number(value).toLocaleString('pt-BR')
const amount = (value: unknown) => Number.isInteger(value) && Number(value) >= 0 && Number(value) <= 2147483647
const selected = computed(() => rows.value.filter(row => row.selected))
const valid = computed(() => selected.value.length > 0 && selected.value.every(row => amount(row.xp) && amount(row.gold)) && selected.value.some(row => row.xp || row.gold))
watch(() => props.characters, characters => {
  const old = new Map(rows.value.map(row => [row.id, row]))
  rows.value = characters.map(character => ({ id: character.id, name: character.characterName || character.name || 'Sem nome',
    player: character.user?.username || 'Sem jogador', className: character.className || 'Classe livre', level: character.level || 1,
    selected: old.get(character.id)?.selected ?? (!props.selectedId || character.id === props.selectedId),
    xp: old.get(character.id)?.xp ?? 0, gold: old.get(character.id)?.gold ?? 0,
  }))
  revision++; preview.value = null
}, { immediate: true, deep: true })
watch([rows, reason], () => { revision++; preview.value = null }, { deep: true, flush: 'sync' })
onBeforeUnmount(() => { disposed = true; revision++ })
function selectAll() { const selected = !rows.value.every(row => row.selected); rows.value.forEach(row => { row.selected = selected }) }
function fillSelected() {
  if (!amount(bulk.value.xp) || !amount(bulk.value.gold)) { error.value = 'Use números inteiros positivos ou zero.'; return }
  selected.value.forEach(row => { row.xp = bulk.value.xp; row.gold = bulk.value.gold })
}
function restore() {
  const saved = recovery.value?.data
  if (!saved || typeof saved.awardId !== 'string' || saved.awardId.length > 160 || !Array.isArray(saved.rows)) { error.value = 'O lançamento guardado não é válido.'; return }
  receipt.value = saved.awardId; reason.value = typeof saved.reason === 'string' ? saved.reason.slice(0, 1000) : ''
  for (const row of rows.value) {
    const recovered = saved.rows.find((value: any) => value.id === row.id)
    if (recovered && amount(recovered.xp) && amount(recovered.gold)) Object.assign(row, { selected: recovered.selected === true, xp: recovered.xp, gold: recovered.gold })
  }
  recovery.value = null
}
function discard() {
  if (!window.confirm('Confira no histórico e nos saldos se esta recompensa já foi registrada antes de descartar o rascunho. Deseja descartar?')) return
  draft.remove(); recovery.value = null
}
async function checkRewards() {
  if (busy.value || !valid.value) return
  busy.value = true; error.value = ''; notice.value = ''; preview.value = null
  try {
    if (props.prepare && !await props.prepare()) throw Error('Salve ou resolva as alterações da ficha antes de conferir as recompensas.')
    if (operations && !await operations.retryPending()) throw Error('Resolva a alteração pendente da ficha antes de conferir as recompensas.')
    // Save the receipt before requesting anything. Reloading never changes its
    // identity, so a lost response cannot credit the same reward a second time.
    const persisted = draft.write({ awardId: receipt.value, reason: reason.value, rows: rows.value })
    if (!persisted) throw Error('Não foi possível guardar o lançamento neste navegador. Libere armazenamento antes de registrar as recompensas.')
    const current = (await api.get('/api/characters', { params: { view: 'summary' } })).data.characters
    const checked = revision
    snapshot.value = { awardId: receipt.value, reason: reason.value.trim() || 'Recompensa de sessão',
      ...(props.campaignId && { campaignId: props.campaignId }),
      participants: selected.value.map(row => ({ id: row.id, version: current.find((c: any) => c.id === row.id)?.version, xp: row.xp, gold: row.gold })),
    }
    const result = (await api.post('/api/game-rules/rewards/preview', snapshot.value)).data
    if (disposed || revision !== checked) throw Error('Os valores mudaram durante a conferência. Confira novamente.')
    preview.value = result
  } catch (caught) {
    if ((caught as any)?.response?.data?.code === 'REWARD_ALREADY_RECORDED') {
      committed(); notice.value = 'Esta recompensa já foi registrada. Os saldos foram atualizados, sem duplicar XP ou ouro.'
    } else error.value = errorMessage(caught, 'Não foi possível conferir as recompensas.')
  }
  finally { busy.value = false }
}
function committed() {
  draft.remove(); recovery.value = null; receipt.value = crypto.randomUUID(); preview.value = null
  rows.value.forEach(row => { row.xp = 0; row.gold = 0 }); reason.value = ''
  notice.value = 'XP e ouro registrados nas fichas e no histórico.'
  if (props.refresh) void props.refresh().catch(caught => { error.value = errorMessage(caught, 'As recompensas foram registradas. Atualize o grupo para conferir os saldos.') })
}
async function applyRewards() {
  if (busy.value || !preview.value) return
  const input = JSON.parse(JSON.stringify(snapshot.value))
  busy.value = true; error.value = ''; preview.value = null
  try {
    if (operations) {
      const result = await operations.run('rewards:apply', () => api.post('/api/game-rules/rewards/apply', input), committed)
      if (!result) throw operations.getLastError() || Error('Confira os saldos antes de tentar novamente.')
    } else { await api.post('/api/game-rules/rewards/apply', input); committed() }
  } catch (caught) { error.value = errorMessage(caught, 'Não foi possível confirmar. Confira novamente usando este mesmo lançamento para evitar duplicação.') }
  finally { busy.value = false }
}
</script>

<style scoped>
.reward-button { padding: .65rem 1rem; border-radius: .5rem; background: var(--color-gold); color: var(--color-dark-bg); font-weight: 700; }
.reward-button:disabled { opacity: .5; }
</style>
