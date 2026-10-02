<template>
  <dialog ref="dialog" class="w-[min(36rem,calc(100%-2rem))] rounded-2xl border border-gold/30 bg-dark-card p-5 sm:p-7 text-dark-text shadow-2xl backdrop:bg-black/60" @cancel="onCancel" @click="onBackdrop">
    <form @submit.prevent="importCharacter" class="space-y-5">
      <div class="flex items-start justify-between gap-4">
        <div><h2 class="text-2xl font-serif text-gold">Importar personagem</h2><p class="mt-2 text-sm text-steel-light">Cria uma nova ficha na sua conta a partir da exportação JSON.</p></div>
        <button type="button" aria-label="Fechar importação" :disabled="busy" @click="close" class="rounded p-2 text-steel-light hover:text-gold">×</button>
      </div>
      <label class="block space-y-2"><span>Arquivo JSON</span><input type="file" accept="application/json,.json" @change="chooseFile" :disabled="busy" class="block w-full text-sm file:mr-3 file:rounded file:border-0 file:bg-gold file:px-3 file:py-2 file:font-semibold file:text-dark-bg" /></label>
      <label class="block space-y-2"><span>Campanha de destino</span><select v-model="campaignId" :disabled="busy" class="w-full rounded-lg bg-dark-bg border border-steel-dark p-3"><option value="">Sem campanha</option><option v-for="campaign in campaigns" :key="campaign.id" :value="campaign.id">{{ campaign.name }}</option></select></label>
      <p v-if="reading" role="status" class="text-sm text-steel-light">Lendo arquivo...</p>
      <div v-if="document" class="rounded-xl border border-gold/20 bg-dark-bg p-4">
        <p class="font-bold text-gold break-words">{{ document.character.characterName || 'Personagem sem nome' }}</p>
        <p class="text-sm text-steel-light mt-1">{{ document.character.className || 'Classe livre' }} · Nível {{ document.character.level || 1 }}</p>
        <p class="text-xs text-steel-light mt-3">Itens, magias e demais registros recebem novos identificadores. Classes de campanha precisam existir no destino. O histórico de aventuras e financeiro permanece na ficha original.</p>
        <p v-if="document.drafts?.repertoire" class="text-sm text-gold mt-3">O arquivo também guarda um rascunho de repertório não enviado. Serão importadas as magias registradas; as escolhas pendentes ficam em drafts.repertoire no JSON para revisão na aba Magia.</p>
      </div>
      <p v-if="error" role="alert" class="text-red-400 text-sm">{{ error }}</p>
      <div class="flex justify-end gap-3"><button type="button" @click="close" :disabled="busy" class="px-4 py-2 text-steel-light">Cancelar</button><button type="submit" :disabled="!document || reading || busy" class="rounded-lg bg-gold px-4 py-2 font-bold text-dark-bg disabled:opacity-50">{{ busy ? 'Importando...' : 'Criar ficha importada' }}</button></div>
    </form>
  </dialog>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref } from 'vue'
import api from '../services/api'
import { errorMessage } from '../utils/catalog'
import { parseCharacterImport } from '../utils/characterImport'
const props = defineProps<{ campaigns: any[]; initialCampaignId?: string }>()
const emit = defineEmits<{ close: []; imported: [id: string, warnings: string[]] }>()
const dialog = ref<HTMLDialogElement>(), document = ref<any>(null), campaignId = ref(props.initialCampaignId || ''), error = ref(''), busy = ref(false)
const reading=ref(false)
let fileRequest=0
onBeforeUnmount(()=>{fileRequest++})
onMounted(() => dialog.value?.showModal())
function close() { if (!busy.value) { dialog.value?.close(); emit('close') } }
function onCancel(event: Event) { if (busy.value) event.preventDefault(); else emit('close') }
function onBackdrop(event: MouseEvent) { if (event.target === dialog.value) { const box = dialog.value.getBoundingClientRect(); if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) close() } }
async function chooseFile(event: Event) {
  const request=++fileRequest
  error.value = ''; document.value = null
  const file = (event.target as HTMLInputElement).files?.[0]
  reading.value=!!file
  if (!file) return
  try { if (file.size > 240 * 1024) throw new Error('O arquivo deve ter até 240 KB.'); const text=await file.text();if(request===fileRequest)document.value = parseCharacterImport(text) }
  catch (caught) { if(request===fileRequest)error.value = (caught as Error).message }
  finally {if(request===fileRequest)reading.value=false}
}
async function importCharacter() {
  if (!document.value || reading.value || busy.value) return
  busy.value = true; error.value = ''
  try { const response = await api.post('/api/characters/import', { document: document.value, campaignId: campaignId.value || null }); emit('imported', response.data.character.id, response.data.warnings || []) }
  catch (caught) { error.value = errorMessage(caught, 'Não foi possível importar a ficha. Confira os dados e tente novamente.') }
  finally { busy.value = false }
}
</script>
