<template>
  <section class="border border-steel-dark rounded-xl p-5 space-y-3">
    <h2 class="text-xl text-gold">Identificação e cargas de itens</h2>
    <p class="text-sm">Registre os resultados de identificação e avaliação obtidos em jogo. Os valores são definidos pelo mestre; a ativação gasta cargas, mas não aplica automaticamente o efeito ao combate.</p>
    <p v-if="error" role="alert" class="text-red-400">{{ error }}</p><p v-if="notice" role="status" class="text-green-400">{{ notice }}</p>
    <fieldset :disabled="busy" class="min-w-0 space-y-3">
    <select v-model="itemId" class="inp" aria-label="Item mágico"><option value="">Escolha no inventário</option><option v-for="item in character.items" :key="item.id" :value="item.id">{{ item.name }}</option></select>
    <template v-if="item">
      <label class="block"><input v-model="details.identified" type="checkbox"/> Identificado em jogo</label>
      <label class="block">Efeito conhecido<textarea v-model="details.effect" class="inp w-full" rows="2" maxlength="4000"/></label>
      <div class="grid grid-cols-2 gap-3"><label>Valor aparente (GP)<input v-model.number="details.apparentValueGp" type="number" min="0" step="any" class="inp"/></label><label>Valor identificado (GP)<input v-model.number="details.identifiedValueGp" type="number" min="0" step="any" class="inp"/></label></div>
      <label class="block"><input v-model="charged" type="checkbox"/> Item com cargas (uma unidade por entrada)</label><label v-if="charged" class="block">Cargas registradas<input v-model.number="details.charges" type="number" min="0" class="inp"/></label>
      <button @click="save" :disabled="busy" class="text-gold underline">Salvar identificação e valores</button>
      <div v-if="stored.identified && stored.charges!=null" class="border-t border-steel-dark pt-3 flex flex-wrap gap-3 items-center"><span>Cargas disponíveis: {{ stored.charges }}</span><label>Gastar<input v-model.number="spend" type="number" min="1" :max="stored.charges" class="inp w-20"/></label><button @click="use" :disabled="busy || !validSpend" class="text-gold underline">Ativar e gastar cargas</button></div>
    </template>
    </fieldset>
  </section>
</template>
<script setup lang="ts">
import {ref,computed,watch} from 'vue'
import api from '../../services/api'
import {errorMessage} from '../../utils/catalog'
import { useCharacterOperations } from '../../composables/characterOperations'
const props=defineProps<{character:any;prepare:()=>Promise<boolean>;refresh:()=>Promise<void>}>()
const operations=useCharacterOperations()
const itemId=ref(''),busy=ref(false),error=ref(''),notice=ref(''),charged=ref(false),spend=ref(1)
const item=computed(()=>props.character.items?.find((i:any)=>i.id===itemId.value))
const stored=computed(()=>{try{return JSON.parse(item.value?.magicDetails||'{}')}catch{return {}}})
const details=ref<any>({identified:false,charges:0,effect:'',apparentValueGp:0,identifiedValueGp:0})
const validSpend=computed(()=>Number.isInteger(spend.value) && spend.value>=1 && spend.value<=stored.value.charges)
let baseline:any=null,baselineItem=''
watch([itemId,stored],()=>{
  const d=stored.value,next={identified:d.identified||false,charges:d.charges||0,effect:d.effect||d.effectType||'',apparentValueGp:d.apparentValueGp||0,identifiedValueGp:d.identifiedValueGp||0},nextCharged=d.charges!=null
  if(!baseline || baselineItem!==itemId.value){details.value=next;charged.value=nextCharged;error.value='';notice.value=''}
  else {
    for(const key of Object.keys(next) as (keyof typeof next)[]) if(details.value[key]===baseline[key])details.value[key]=next[key]
    if(charged.value===baseline.charged)charged.value=nextCharged
  }
  baseline={...next,charged:nextCharged};baselineItem=itemId.value
},{immediate:true})
async function run(fn:()=>Promise<boolean>){if(busy.value)return;busy.value=true;error.value='';notice.value='';try{if(!await fn())throw operations.getLastError() || Error('Não foi possível atualizar o item.');notice.value='Item atualizado.'}catch(e){error.value=errorMessage(e,'Não foi possível atualizar o item.')}finally{busy.value=false}}
const url=()=>`/api/campaign-rules/characters/${props.character.id}/items/${itemId.value}`
async function save(){await run(async()=>{
  const endpoint=`${url()}/magic`,input={details:{...details.value,charges:charged.value?details.value.charges:null}}
  return !!await operations.run(`items:${itemId.value}:magic:update`,version=>api.post(endpoint,{...input,version}),undefined,{retainDraft:true})
})}
async function use(){if(!validSpend.value)return;await run(async()=>{
  const endpoint=`${url()}/charge`,charges=spend.value
  return !!await operations.run(`items:${itemId.value}:charge`,version=>api.post(endpoint,{version,charges}))
})}
</script>
