<template>
  <dialog ref="dialog" aria-labelledby="class-revision-title" class="w-[min(42rem,calc(100%-2rem))] max-h-[90vh] overflow-auto rounded-2xl border border-gold/30 bg-dark-card p-5 sm:p-7 text-dark-text backdrop:bg-black/60" @cancel="cancel">
    <form @submit.prevent="review" class="space-y-4">
      <div class="flex justify-between gap-4"><h2 id="class-revision-title" class="text-2xl text-gold">Revisar classe e concessões</h2><button type="button" :disabled="busy" aria-label="Fechar revisão de classe" @click="close">×</button></div>
      <p class="text-sm text-steel-light">{{ character.className }} → {{ target.name }}. XP, PV, moedas, magias e escolhas pagas são preservados. Confira os poderes gratuitos e as pendências antes de confirmar.</p>
      <fieldset :disabled="busy" class="space-y-4 min-w-0">
        <ClassChoicesForm v-if="target.rules?.classChoices?.length" v-model="choices" :rules="target.rules" :character="{...character,className:target.name,classChoices:choices,subclass:''}" :can-approve="true" />
        <label v-if="target.rules?.proficiencyOrigins?.length" class="block">Origem das proficiências<select v-model="origin" class="inp mt-1"><option value="">Escolha pendente</option><option v-for="entry in target.rules.proficiencyOrigins" :key="entry.key" :value="entry.key">{{ entry.label }}</option></select></label>
        <fieldset v-if="natural.length" class="border border-steel-dark rounded-lg p-3 space-y-2"><legend class="text-gold px-1">Manter concessões como exceções do mestre</legend><p class="text-xs text-steel-light">Poderes pertencentes à nova classe são mantidos automaticamente. Marque apenas exceções que você deseja aprovar.</p><label v-for="row in natural" :key="row.id" class="flex items-center gap-2"><input v-model="keep" type="checkbox" :value="row.id" />{{ row.name }} · alvo {{ row.throwTarget }}+</label></fieldset>
        <label class="block">Justificativa do mestre<textarea v-model="reason" required minlength="3" maxlength="1000" rows="2" class="inp mt-1" /></label>
        <button type="submit" :disabled="reason.trim().length<3" class="btn">Conferir revisão de classe</button>
      </fieldset>
      <p v-if="error" role="alert" class="text-red-400 text-sm">{{ error }}</p>
      <div v-if="preview" class="border border-gold/30 rounded-lg p-4 space-y-2 text-sm">
        <p>Adicionar: {{ names(preview.added) }}.</p><p>Remover concessões antigas: {{ names(preview.removed) }}.</p><p>Exceções aprovadas: {{ names(preview.retained) }}.</p>
        <p v-if="preview.targets.length">Alvos: {{ preview.targets.map((row:any)=>`${row.name} ${row.throwTarget}+`).join(', ') }}.</p>
        <ul v-if="preview.issues.length" class="list-disc pl-5 text-gold"><li v-for="issue in preview.issues" :key="issue">{{ issue }}</li></ul>
        <button type="button" :disabled="busy" @click="apply" class="btn">Confirmar revisão de classe</button>
      </div>
      <button type="button" :disabled="busy" @click="close" class="text-steel-light underline">Cancelar</button>
    </form>
  </dialog>
</template>
<script setup lang="ts">
import {computed,onMounted,ref,watch} from 'vue'
import ClassChoicesForm from './ClassChoicesForm.vue'
import {abilityState,selectionsFor} from '../../../backend/src/lib/classAbilities'
import api from '../services/api'
import {useCharacterOperations} from '../composables/characterOperations'
import {errorMessage} from '../utils/catalog'
const props=defineProps<{character:any;target:any;prepare:()=>Promise<boolean>}>()
const emit=defineEmits<{close:[];changed:[]}>(), operations=useCharacterOperations()
const dialog=ref<HTMLDialogElement>(),busy=ref(false),error=ref(''),preview=ref<any>(null),payload=ref<any>(null)
const same=props.character.classKey===props.target.id || props.target.legacyIds?.includes(props.character.classKey) || (!props.character.classKey && props.character.className===props.target.name)
const allowedKeys=(props.target.rules?.classChoices || []).flatMap((definition:any)=>[definition.id,...['name','description','level'].map(suffix=>`${definition.id}-${suffix}`)])
const choices=ref<Record<string,string>>(same?Object.fromEntries(Object.entries(selectionsFor(props.character,props.target.rules)).filter(([key])=>allowedKeys.includes(key))):{}),origin=ref(same?abilityState(props.character).proficiencyOrigin || '':''),keep=ref<string[]>([]),reason=ref('')
const natural=computed(()=>props.character.proficiencies.filter((row:any)=>row.category==='natural'))
const names=(rows:any[])=>rows.map(row=>row.name).join(', ') || 'nenhuma'
const url=()=>`/api/game-rules/characters/${props.character.id}/class-revision`
onMounted(()=>dialog.value?.showModal())
function close(){if(!busy.value){dialog.value?.close();emit('close')}}
function cancel(event:Event){event.preventDefault();close()}
watch([choices,origin,keep,reason,()=>props.character.version],()=>{preview.value=null},{deep:true,flush:'sync'})
async function review(){
  if(busy.value)return
  busy.value=true;error.value='';preview.value=null
  try{
    if(!await props.prepare() || !await operations.retryPending())throw Error('Salve ou resolva as alterações pendentes antes de conferir.')
    payload.value={version:props.character.version,classKey:props.target.id,choices:{...choices.value},origin:origin.value,keepNaturalIds:[...keep.value],reason:reason.value.trim()}
    const response=(await api.post(`${url()}/preview`,payload.value)).data
    if(response.version!==props.character.version)throw Error('A ficha mudou durante a conferência. Confira novamente.')
    preview.value=response
  }catch(caught){error.value=errorMessage(caught,'Não foi possível conferir a revisão.')}
  finally{busy.value=false}
}
async function apply(){
  if(busy.value || !preview.value)return
  busy.value=true;error.value='';const input=JSON.parse(JSON.stringify(payload.value));preview.value=null
  try{const response=await operations.run('class-revision:update',()=>api.post(`${url()}/apply`,input),undefined,{retainDraft:true});if(!response)throw operations.getLastError() || Error('Confira a ficha antes de repetir a revisão.');emit('changed');emit('close')}
  catch(caught){error.value=errorMessage(caught,'Não foi possível registrar. As escolhas foram preservadas.')}
  finally{busy.value=false}
}
</script>
<style scoped>.btn{padding:.5rem 1rem;background:#c6a052;color:#171717;border-radius:.5rem;font-weight:700}.btn:disabled{opacity:.5}</style>
