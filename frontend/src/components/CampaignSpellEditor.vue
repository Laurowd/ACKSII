<template>
  <section class="bg-dark-card border border-gold/20 p-4 sm:p-6 rounded-xl mb-8" aria-labelledby="campaign-spells-title">
    <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
      <div><h2 id="campaign-spells-title" class="text-xl font-bold text-gold">Magias de campanha</h2><p class="text-sm text-steel-light mt-1">Crie efeitos próprios e escolha quem pode descobri-los.</p></div>
      <div class="flex flex-wrap gap-4 items-center"><button type="button" @click="load" :disabled="busy || loading" class="text-sm text-gold underline">Atualizar magias de campanha</button><button type="button" @click="start()" :disabled="busy || loading" class="btn">Nova magia de campanha</button></div>
    </div>
    <p v-if="error" role="alert" class="text-sm text-red-400 mb-3">{{ error }}</p><p v-if="notice" role="status" class="text-sm text-green-400 mb-3">{{ notice }}</p>
    <p v-if="loading" role="status" class="text-steel-light">Carregando magias de campanha...</p>
    <button v-if="loadFailed" type="button" @click="load" :disabled="loading || busy" class="text-gold underline mb-3">Tentar carregar magias novamente</button>
    <form v-if="draft" @submit.prevent="save" class="rounded-xl border border-gold/30 bg-dark-bg/30 p-4 mb-5 space-y-4">
      <h3 class="text-gold font-bold">{{ editing ? 'Editar magia de campanha' : 'Criar magia de campanha' }}</h3>
      <fieldset :disabled="busy" class="min-w-0 space-y-4">
        <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <label class="sm:col-span-2 text-sm">Nome da magia de campanha<input v-model="draft.name" required maxlength="160" class="inp mt-1" /></label>
          <label class="text-sm">Nível da magia de campanha<select v-model.number="draft.level" class="inp mt-1"><option v-for="level in 6" :key="level" :value="level">Nível {{ level }}</option></select></label>
          <label class="text-sm">Tradição da magia de campanha<select v-model="draft.tradition" class="inp mt-1"><option value="arcane">Arcana</option><option value="divine">Divina</option></select></label>
          <label class="sm:col-span-2 text-sm">Alcance<input v-model="draft.range" maxlength="300" class="inp mt-1" placeholder="Ex.: 60 pés" /></label>
          <label class="sm:col-span-2 text-sm">Duração<input v-model="draft.duration" maxlength="300" class="inp mt-1" placeholder="Ex.: 1 turno" /></label>
        </div>
        <label class="block text-sm">Descrição e efeitos<textarea v-model="draft.description" required maxlength="10000" rows="5" class="inp mt-1" placeholder="Descreva o efeito, os alvos e as condições da magia." /></label>
        <label class="block text-sm">Visibilidade<select v-model="draft.visibility" aria-label="Visibilidade" class="inp mt-1"><option value="SECRET">Secreta — somente o mestre</option><option value="CAMPAIGN">Disponível para toda a campanha</option><option value="CHARACTERS">Revelada para personagens específicos</option></select></label>
        <p class="text-xs text-steel-light">Disponibilizar permite consultar e escolher; não ensina a magia automaticamente. A conjuração usa os limites da classe, do repertório e os usos diários.</p>
        <fieldset v-if="draft.visibility === 'CHARACTERS'" class="rounded-lg border border-steel-dark p-3 space-y-2">
          <legend class="text-sm text-gold px-1">Personagens que podem ver e escolher</legend>
          <label v-for="character in characters" :key="character.id" class="flex items-start gap-2 text-sm"><input v-model="draft.characterIds" type="checkbox" :value="character.id" class="mt-1" /><span>{{ character.characterName || 'Sem nome' }} <span class="text-xs text-steel-light">· {{ character.user?.username || 'Sem jogador' }} · {{ character.className }}</span></span></label>
          <p v-if="!characters.length" class="text-sm text-steel-light">Crie uma ficha nesta campanha antes de revelar individualmente.</p>
        </fieldset>
        <p v-if="editing" class="text-xs text-steel-light">Uma magia já aprendida precisa ser removida das fichas antes de ocultá-la ou alterar nome, nível e tradição.</p>
        <div class="flex flex-wrap gap-4"><button type="submit" :disabled="!draft.name.trim() || !draft.description.trim() || (draft.visibility === 'CHARACTERS' && !draft.characterIds.length)" class="btn">Salvar magia de campanha</button><button type="button" @click="draft = null; editing = null" class="text-steel-light underline">Cancelar edição</button></div>
      </fieldset>
    </form>
    <label v-if="spells.length" class="block text-sm mb-4">Buscar magia de campanha<input v-model="search" type="search" class="inp mt-1" placeholder="Nome ou descrição" /></label>
    <div class="grid sm:grid-cols-2 gap-3">
      <article v-for="spell in filtered" :key="spell.id" class="rounded-lg border border-steel-dark bg-dark-bg/30 p-4">
        <div class="flex items-center gap-2"><HelpTooltip :label="spell.name">{{ [spell.range && `Alcance: ${spell.range}`, spell.duration && `Duração: ${spell.duration}`, spell.description].filter(Boolean).join('\n\n') }}</HelpTooltip><strong class="text-gold break-words">{{ spell.name }}</strong></div>
        <p class="text-xs text-steel-light mt-2">{{ spell.tradition === 'divine' ? 'Divina' : 'Arcana' }} · Nível {{ spell.level }} · {{ visibilityLabel(spell.visibility) }}<span v-if="spell.visibility === 'CHARACTERS'"> ({{ spell.characterIds.length }})</span></p>
        <div class="flex gap-4 mt-3 text-sm"><button type="button" @click="start(spell)" :disabled="busy" class="text-gold underline">Editar {{ spell.name }}</button><button type="button" @click="removing = removing === spell.id ? '' : spell.id" :disabled="busy" class="text-red-400">Excluir {{ spell.name }}</button></div>
        <div v-if="removing === spell.id" class="mt-3 text-sm"><p>Excluir o cadastro desta magia?</p><div class="flex gap-4 mt-2"><button type="button" @click="remove(spell)" :disabled="busy" class="text-red-400 underline">Confirmar exclusão</button><button type="button" @click="removing = ''" class="text-steel-light">Cancelar</button></div></div>
      </article>
    </div>
    <p v-if="!loading && !loadFailed && !spells.length" class="text-sm text-steel-light">Nenhuma magia de campanha cadastrada. Novas magias começam secretas.</p>
    <p v-else-if="spells.length && !filtered.length" class="text-sm text-steel-light">Nenhuma magia corresponde à busca.</p>
  </section>
</template>
<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import api from '../services/api'
import HelpTooltip from './HelpTooltip.vue'
import { errorMessage } from '../utils/catalog'
const props = defineProps<{ campaignId: string }>()
const spells = ref<any[]>([]), characters = ref<any[]>([]), draft = ref<any>(null), editing = ref<any>(null)
const loading = ref(false), loadFailed = ref(false), busy = ref(false), error = ref(''), notice = ref(''), search = ref(''), removing = ref('')
const base = () => `/api/campaigns/${props.campaignId}/spells`
const visibilityLabel = (value: string) => ({ SECRET: 'Secreta', CAMPAIGN: 'Toda a campanha', CHARACTERS: 'Personagens escolhidos' }[value] || value)
const filtered = computed(() => spells.value.filter(spell => `${spell.name} ${spell.description}`.toLocaleLowerCase().includes(search.value.trim().toLocaleLowerCase())))
function start(spell?: any) {
  editing.value = spell ? { id: spell.id, version: spell.version } : null
  draft.value = spell ? { name: spell.name, level: spell.level, tradition: spell.tradition, description: spell.description, range: spell.range, duration: spell.duration, visibility: spell.visibility, characterIds: [...spell.characterIds] }
    : { name: '', level: 1, tradition: 'arcane', description: '', range: '', duration: '', visibility: 'SECRET', characterIds: [] }
  error.value = ''; notice.value = ''; removing.value = ''
}
async function load() {
  loading.value = true; loadFailed.value = false; error.value = ''
  try { const [rows, sheets] = await Promise.all([api.get(base()), api.get('/api/characters', { params: { view: 'summary' } })]); spells.value = rows.data.spells; characters.value = sheets.data.characters.filter((c: any) => c.campaignId === props.campaignId) }
  catch (caught) { loadFailed.value = true; error.value = errorMessage(caught, 'Não foi possível carregar as magias da campanha.') }
  finally { loading.value = false }
}
async function save() {
  if (busy.value || !draft.value) return
  busy.value = true; error.value = ''; notice.value = ''
  try {
    const input = JSON.parse(JSON.stringify(draft.value))
    const response = editing.value ? await api.put(`${base()}/${editing.value.id}`, { ...input, version: editing.value.version }) : await api.post(base(), input)
    const spell = response.data.spell
    spells.value = [...spells.value.filter(row => row.id !== spell.id), spell].sort((a, b) => a.name.localeCompare(b.name))
    notice.value = spell.visibility === 'SECRET' ? 'Magia salva como secreta. Jogadores não recebem o nome nem a descrição.' : 'Magia disponibilizada. Os personagens autorizados podem consultar e escolher.'
    draft.value = editing.value = null
  } catch (caught) { error.value = errorMessage(caught, 'Não foi possível salvar a magia; a edição foi preservada.') }
  finally { busy.value = false }
}
async function remove(spell: any) {
  if (busy.value) return
  busy.value = true; error.value = ''; notice.value = ''
  try { await api.delete(`${base()}/${spell.id}`, { data: { version: spell.version } }); spells.value = spells.value.filter(row => row.id !== spell.id); removing.value = ''; if (editing.value?.id === spell.id) { editing.value = draft.value = null }; notice.value = 'Magia de campanha excluída.' }
  catch (caught) { error.value = errorMessage(caught, 'Não foi possível excluir a magia.') }
  finally { busy.value = false }
}
onMounted(load)
watch(() => props.campaignId, () => { spells.value = []; draft.value = editing.value = null; void load() })
</script>
<style scoped>
.btn { padding: .6rem 1rem; background: #c6a052; color: #171717; border-radius: .5rem; font-weight: 700; }
.btn:disabled { opacity: .5; }
</style>
