<template>
  <div class="space-y-6">
    <p class="text-sm text-steel-light">Regras do livro com prévia antes de registrar alterações. Os campos manuais da ficha continuam disponíveis para decisões do mestre.</p>
    <p v-if="error" role="alert" class="text-red-400">{{ error }}</p>
    <p v-if="notice" role="status" class="text-green-400">{{ notice }}</p>
    <fieldset :disabled="busy" class="min-w-0 space-y-6">
    <button @click="load" :disabled="busy" class="text-gold underline">Atualizar conferência</button>
    <RewardsPanel v-if="canCloseAdventure" :key="`${character.id}:${character.campaignId || 'unassigned'}`" :characters="participants" :campaign-id="character.campaignId" :selected-id="character.id" :prepare="prepare" :refresh="refresh" />
    <p v-else class="rounded-lg border border-gold/20 p-4 text-sm text-steel-light">O mestre registra o XP e o ouro da sessão. As recompensas aparecem automaticamente nesta ficha.</p>
    <template v-if="info.supported">
      <ClassChoicesPanel :character="character" :info="info" :can-manage="canCloseAdventure" :prepare="prepare" @changed="load" />
      <section v-if="info.rules.proficiencyOrigins?.length" class="rounded-xl border border-gold/30 bg-dark-card p-4 space-y-3">
        <h2 class="text-xl text-gold">Origem e proficiências naturais</h2>
        <p v-if="info.proficiencyOrigin" class="text-sm">{{ info.rules.proficiencyOrigins.find((origin:any) => origin.key === info.proficiencyOrigin)?.label }} · {{ info.grantedProficiencies.map((p:any) => p.name).join(', ') }} · sem gastar escolhas.</p>
        <p v-else class="text-sm text-steel-light">A origem ainda não foi registrada. O mestre pode conferir as concessões da classe sem recriar a ficha.</p>
        <template v-if="canCloseAdventure">
          <label class="block">Origem a conferir<select v-model="originChoice" @change="originPreview = null" aria-label="Origem a conferir" class="inp mt-1"><option value="">Selecione a origem</option><option v-for="origin in info.rules.proficiencyOrigins" :key="origin.key" :value="origin.key">{{ origin.label }}</option></select></label>
          <p class="text-xs text-steel-light">A prévia mostra inclusões, reclassificações e remoções de concessões anteriores. A primeira graduação já registrada passa para o grupo gratuito; escolhas adicionais permanecem. Alvos ajustados são preservados.</p>
          <button type="button" @click="previewOrigin" :disabled="busy || !originChoice" class="btn">Conferir proficiências da origem</button>
          <div v-if="originPreview" class="rounded-lg border border-gold/30 p-3 space-y-2">
            <p>{{ originPreview.label }}</p>
            <p>Conceder: {{ originPreview.added.map((p:any) => p.name).join(', ') || 'nenhuma' }}</p>
            <p>Mover para gratuitas: {{ originPreview.converted.map((p:any) => p.name).join(', ') || 'nenhuma' }}</p>
            <p>Remover concessões anteriores ou Adventuring redundante: {{ originPreview.removed.map((p:any) => p.name).join(', ') || 'nenhuma' }}</p>
            <p v-if="originPreview.issues.length" class="text-sm text-gold">Escolhas ainda para conferir: {{ originPreview.issues.join(' ') }}</p>
            <button type="button" @click="applyOrigin" :disabled="busy" class="btn">Confirmar proficiências da origem</button>
          </div>
        </template>
      </section>
      <details v-if="info.issues?.length" class="border border-gold/30 rounded p-3"><summary>Escolhas para conferir com o mestre ({{ info.issues.length }})</summary><ul class="list-disc pl-5"><li v-for="issue in info.issues" :key="issue">{{ issue }}</li></ul></details>
      <section class="bg-dark-card border border-steel-dark rounded-xl p-5 space-y-3">
        <h2 class="text-xl text-gold">Avanço de nível</h2>
        <p>Escolhas permitidas no nível atual: {{ info.budget?.class }} de classe e {{ info.budget?.general }} gerais. Adventuring e proficiências naturais não gastam essas escolhas.</p>
        <template v-if="info.next">
          <p>Próximo nível: {{ info.next.level }} · {{ info.next.xp }} XP · {{ info.next.hitDice }} PV, respeitando ganho mínimo de 1 PV.</p>
          <label>Resultados individuais dos dados<input v-model="diceText" class="inp" placeholder="4, 6, 3" /></label>
          <button @click="rollHp" :disabled="busy" class="text-gold underline">Rolar os dados do novo nível</button>
          <p class="text-sm">CON será aplicado por dado; o bônus fixo após nível 9 não recebe CON. Os ferimentos atuais serão preservados.</p>
          <button @click="previewAdvance" :disabled="busy" class="btn">Conferir avanço</button>
          <div v-if="advancePreview" class="border border-gold/40 p-3 space-y-2">
            <p>{{ advancePreview.title }} · nível {{ advancePreview.level }} · {{ advancePreview.hpMax }} PV máximos / {{ advancePreview.hpCurr }} atuais · ataque {{ advancePreview.attack }}+</p>
            <p>Após avançar: {{ advancePreview.proficiencies.class }} escolhas de classe e {{ advancePreview.proficiencies.general }} gerais no total.</p>
            <p>Salvamentos: {{ advancePreview.saves }}</p>
            <button @click="applyAdvance" :disabled="busy" class="btn">Confirmar avanço</button>
          </div>
        </template><p v-else>Nível máximo da classe.</p>
        <h3 class="text-gold">Preencher escolhas de proficiência pendentes</h3>
        <div class="flex flex-wrap gap-2"><select v-model="choice.category" aria-label="Categoria da escolha de proficiência" class="inp"><option value="class">Classe</option><option value="general">Geral</option></select><SearchableChoice v-model="choice.name" label="Nome da escolha de proficiência" :options="proficiencyOptions(choice.category==='class' ? info.rules.proficiencies : metadata.generalProficiencies).filter(name => name !== 'Adventuring')" :disabled="busy" placeholder="Proficiência ou especialização" class="flex-1"/><button @click="addProficiency" :disabled="busy || !choice.name.trim()" class="btn">Adicionar escolha</button></div>
        <p class="text-xs">As descrições individuais determinam especializações, requisitos e graduações permitidas.</p>
      </section>

      <div v-if="info.magic?.length" class="bg-dark-card border border-gold/20 rounded-xl p-4 flex flex-wrap gap-3 justify-between items-center"><p class="text-sm text-steel-light">Conjuração, repertório e descanso ficam na aba Magia.</p><button type="button" @click="emit('open-magic')" class="btn">Abrir Magia</button></div>
    </template><p v-else-if="info.reason">{{ info.reason }}</p>

    <details v-if="canCloseAdventure" id="adventure-settlement" class="bg-dark-card border border-steel-dark rounded-xl p-4 sm:p-5 space-y-3">
      <summary class="text-gold font-bold cursor-pointer">Calcular XP pelo livro (avançado)</summary>
      <section class="space-y-3 mt-4" aria-labelledby="adventure-title">
      <h2 id="adventure-title" class="text-xl text-gold">Fechar aventura</h2>
      <p class="text-sm">O mestre fecha aventuras de campanha. Selecione quem retornou à civilização e informe apenas tesouro elegível para XP. Moedas não serão gastas ou creditadas por esta operação.</p>
      <p v-if="!canCloseAdventure" class="text-sm text-gold">O mestre da campanha registra o fechamento e distribui o XP para os participantes.</p>
      <fieldset :disabled="!canCloseAdventure || busy" class="min-w-0 space-y-3">
      <label>Identificador único da aventura<input v-model="awardId" class="inp" placeholder="Aventura 01 — ruínas" /></label>
      <label>Valor do tesouro elegível (GP)<input v-model.number="treasureGp" type="number" min="0" step="0.01" class="inp" /></label>
      <div v-for="(m,i) in monsters" :key="i" class="flex flex-wrap gap-2"><label>HD (0 = menos de 1)<input v-model.number="m.hd" type="number" min="0" max="100" class="inp w-24" /></label><label><input v-model="m.bonusHd" type="checkbox" /> HD+</label><label>Habilidades (*)<input v-model.number="m.abilities" type="number" min="0" class="inp w-24" /></label><label>Quantidade<input v-model.number="m.count" type="number" min="1" class="inp w-24" /></label><button @click="monsters.splice(i,1)" class="text-red-400">Remover</button></div>
      <button @click="monsters.push({hd:1,bonusHd:false,abilities:0,count:1})" class="text-gold">+ Grupo de monstros derrotados</button>
      <div v-for="p in participants" :key="p.id" class="grid min-w-0 gap-3 rounded-lg border border-steel-dark p-3 sm:grid-cols-[minmax(0,1fr)_minmax(12rem,1fr)] sm:items-center"><label class="flex items-start gap-3 min-w-0"><input v-model="p.selected" type="checkbox" class="shrink-0 mt-1"/><span class="min-w-0 break-words"><strong class="block">{{ p.name }}</strong><span class="text-xs text-steel-light">{{ p.user?.username || 'Sem jogador' }} · {{ p.className }} · Nível {{ p.level }}</span></span></label><select v-model.number="p.share" :aria-label="`Cota de ${p.name}`" class="inp"><option :value="1">Personagem: 1 cota</option><option :value="0.5">Henchman com ficha: ½ cota</option></select></div>
      <button @click="previewAdventure" :disabled="busy || !awardId.trim()" class="btn">Conferir distribuição de XP</button>
      <div v-if="xpPreview" class="border border-gold/40 p-3 space-y-2"><p>Tesouro: {{ xpPreview.treasureGp }} XP · monstros: {{ xpPreview.monsterXp }} XP</p><div class="overflow-x-auto"><table class="w-full text-sm"><thead><tr><th>Personagem</th><th>Cota bruta</th><th>Atributos</th><th>XP ganho</th><th>Excesso limitado</th></tr></thead><tbody><tr v-for="a in xpPreview.awards" :key="a.id"><td>{{ a.name }}</td><td>{{ a.base.toFixed(2) }}</td><td>+{{ a.adjustment }}%</td><td>{{ a.gained }}</td><td>{{ a.capped }}</td></tr></tbody></table></div><button @click="applyAdventure" :disabled="busy" class="btn">Confirmar concessão de XP</button></div>
      </fieldset>
      </section>
    </details>
    <details v-if="canCloseAdventure" class="bg-dark-card border border-steel-dark rounded-xl p-4">
      <summary class="text-gold font-bold cursor-pointer">Ajuste excepcional de XP (mestre)</summary>
      <div class="space-y-3 mt-3">
        <p class="text-sm text-steel-light">Use para corrigir um lançamento anterior ou retirar XP. A justificativa fica no histórico. Para os ganhos da sessão, use Distribuir XP e ouro acima.</p>
        <label class="block text-sm">Ajuste de XP (positivo ou negativo)<input v-model.number="xpAdjustment.delta" type="number" step="1" class="inp mt-1" /></label>
        <label class="block text-sm">Justificativa<textarea v-model="xpAdjustment.reason" rows="2" maxlength="1000" class="inp w-full mt-1" /></label>
        <button type="button" @click="adjustXp" :disabled="busy || !xpAdjustment.reason.trim() || !xpAdjustment.delta" class="btn">Registrar ajuste de XP</button>
      </div>
    </details>
    <fieldset :disabled="busy" class="min-w-0"><CampaignWorkflows :character="character" :prepare="prepare" :refresh="refresh" /></fieldset>
    </fieldset>
  </div>
</template>
<script setup lang="ts">
import {ref,onMounted,onBeforeUnmount,watch,computed} from 'vue'
import api from '../../services/api'
import { getResource } from '../../services/resources'
import {errorMessage,proficiencyOptions} from '../../utils/catalog'
import { proficiencyValidation } from '../../utils/ruleChoices'
import CampaignWorkflows from './CampaignWorkflows.vue'
import RewardsPanel from '../RewardsPanel.vue'
import SearchableChoice from '../SearchableChoice.vue'
import ClassChoicesPanel from './ClassChoicesPanel.vue'
import { useAuthStore } from '../../stores/auth'
import { useCharacterOperations } from '../../composables/characterOperations'
const props=defineProps<{character:any;prepare:()=>Promise<boolean>;refresh:()=>Promise<void>;canManage?:boolean}>()
const emit=defineEmits(['open-magic'])
const authStore=useAuthStore()
const operations=useCharacterOperations()
const canCloseAdventure=computed(()=>authStore.isMaster && (!props.character.campaignId || props.canManage === true))
const info=ref<any>({}),metadata=ref<any>({}),busy=ref(false),error=ref(''),notice=ref('')
const originChoice=ref(''),originPreview=ref<any>(null)
const diceText=ref(''),advancePreview=ref<any>(null),advanceInput=ref<any>(null),choice=ref({name:'',category:'class'})
const awardId=ref(''),treasureGp=ref(0),monsters=ref<any[]>([]),participants=ref<any[]>([]),xpPreview=ref<any>(null),xpInput=ref<any>(null)
const xpAdjustment=ref({delta:0,reason:''})
let previewRevision=0
function invalidatePreviews(){previewRevision++;advancePreview.value=xpPreview.value=originPreview.value=null}
function checkPreview(revision:number){if(revision!==previewRevision)throw Error('Os dados mudaram durante a conferência. Confira novamente antes de confirmar.')}
onBeforeUnmount(invalidatePreviews)
const url=()=>`/api/game-rules/characters/${props.character.id}`
async function run(work:()=>Promise<void>){if(busy.value)return;busy.value=true;error.value='';notice.value='';try{await work()}catch(e){error.value=errorMessage(e,'Não foi possível concluir a operação.')}finally{busy.value=false}}
async function load(){await run(async()=>{const [r,m,c]=await Promise.all([api.get(url()),getResource('/api/game-rules/metadata'),api.get('/api/characters', { params: { view: 'summary' } })]);info.value=r.data;metadata.value=m.data;participants.value=c.data.characters.filter((p:any)=>p.campaignId===props.character.campaignId).map((p:any)=>({...p,name:p.characterName,share:1,selected:p.id===props.character.id}))})}
async function prepared(){if(!await props.prepare() || !await operations.retryPending())throw Error('Salve ou resolva o conflito da ficha antes de continuar.');const r=await api.get(url());info.value=r.data;return props.character.version}
async function complete(message:string){
  advancePreview.value=null;xpPreview.value=null;notice.value=message
  try{info.value=(await api.get(url())).data}
  catch(caught){error.value=errorMessage(caught,'A alteração foi registrada. Atualize a conferência para carregar os novos limites.')}
}
function rollHp(){const match=info.value.next.hitDice.match(/^(\d+)d(\d+)/),sides=Number(match[2]),ceiling=Math.floor(4294967296/sides)*sides;diceText.value=Array.from({length:Number(match[1])},()=>{const v=new Uint32Array(1);do{crypto.getRandomValues(v)}while(v[0]!>=ceiling);return v[0]!%sides+1}).join(', ');advancePreview.value=null}
async function previewAdvance(){await run(async()=>{
  advancePreview.value=null
  const version=await prepared(),revision=previewRevision
  advanceInput.value={version,dice:diceText.value.split(/[,;\s]+/).filter(Boolean).map(Number)}
  const data=(await api.post(`${url()}/advance/preview`,advanceInput.value)).data
  checkPreview(revision);advancePreview.value=data
})}
async function applyAdvance(){await run(async()=>{
  const input=JSON.parse(JSON.stringify(advanceInput.value))
  advancePreview.value=null
  const data=await operations.run('advance:apply',()=>api.post(`${url()}/advance/apply`,input))
  if(!data)throw operations.getLastError() || Error('A alteração não foi concluída. Confira os dados e tente novamente.')
  await complete('Nível atualizado. Confira as escolhas pendentes e o repertório.')
})}
async function addProficiency(){await run(async()=>{
  await prepared()
  const choices = [...(props.character.proficiencies || []).filter((p:any) => ['class','general','natural'].includes(p.category)), choice.value]
  const validation = proficiencyValidation(info.value.rules, props.character.int, choices, metadata.value.generalProficiencies, props.character.level, info.value.grantedProficiencies || [])
  if (validation.issues.length) throw Error(validation.issues.join(' '))
  const input={choices:[{...choice.value}]}
  const data=await operations.run('proficiencies:validated:add',version=>api.post(`${url()}/proficiencies`,{...input,version}))
  if(!data)throw operations.getLastError() || Error('A alteração não foi concluída. Confira os dados e tente novamente.')
  choice.value={name:'',category:'class'}
  info.value=(await api.get(url())).data
  notice.value='Proficiência adicionada.'
})}
async function previewOrigin(){await run(async()=>{
  originPreview.value=null
  const version=await prepared(),revision=previewRevision
  const data=(await api.post(`${url()}/proficiency-origin/preview`,{version,origin:originChoice.value})).data
  checkPreview(revision);originPreview.value=data
})}
async function applyOrigin(){await run(async()=>{
  const input={version:originPreview.value.version,origin:originPreview.value.origin}
  originPreview.value=null
  const data=await operations.run('proficiencies:origin:update',()=>api.post(`${url()}/proficiency-origin/apply`,input))
  if(!data)throw operations.getLastError() || Error('A origem não foi atualizada. Confira os dados e tente novamente.')
  await complete('Origem registrada. As concessões foram separadas das escolhas pagas.')
})}
async function previewAdventure(){await run(async()=>{
  xpPreview.value=null
  await prepared();const revision=previewRevision,current=(await api.get('/api/characters', { params: { view: 'summary' } })).data.characters
  xpInput.value={awardId:awardId.value,treasureGp:treasureGp.value,monsters:monsters.value.map(m=>({...m})),...(props.character.campaignId?{campaignId:props.character.campaignId}:{}),participants:participants.value.filter(p=>p.selected).map(p=>({id:p.id,share:p.share,version:current.find((c:any)=>c.id===p.id)?.version}))}
  const data=(await api.post('/api/game-rules/adventures/preview',xpInput.value)).data
  checkPreview(revision);xpPreview.value=data
})}
async function applyAdventure(){await run(async()=>{
  const input=JSON.parse(JSON.stringify(xpInput.value))
  xpPreview.value=null
  const data=await operations.run('adventure:apply',()=>api.post('/api/game-rules/adventures/apply',input))
  if(!data)throw operations.getLastError() || Error('A alteração não foi concluída. Confira os dados e tente novamente.')
  await complete('XP concedido. A aventura ficou registrada no histórico.')
})}
watch([diceText,awardId,treasureGp,monsters,participants],invalidatePreviews,{deep:true,flush:'sync'})
watch(()=>props.character.version,invalidatePreviews,{flush:'sync'})
onMounted(load)
async function adjustXp(){await run(async()=>{
  const sent={...xpAdjustment.value}
  const data=await operations.run('xp:adjust',version=>api.post(`${url()}/xp/adjust`,{...sent,version}))
  if(!data)throw operations.getLastError() || Error('A alteração não foi concluída. Confira os dados e tente novamente.')
  xpAdjustment.value={delta:0,reason:''}
  notice.value='Ajuste de XP registrado no histórico.'
})}
</script>
<style scoped>
.btn { padding: .5rem 1rem; background: #c6a052; color: #171717; border-radius: .4rem; font-weight: 700; }
.btn:disabled { opacity: .5; }
th, td { padding: .4rem; text-align:left; }
</style>
