<template>
  <div class="space-y-6">
    <p class="text-sm text-steel-light">Regras do livro com prévia antes de registrar alterações. Os campos manuais da ficha continuam disponíveis para decisões do mestre.</p>
    <p v-if="error" role="alert" class="text-red-400">{{ error }}</p>
    <p v-if="notice" role="status" class="text-green-400">{{ notice }}</p>
    <button @click="load" :disabled="busy" class="text-gold underline">Atualizar conferência</button>
    <template v-if="info.supported">
      <details v-if="info.issues?.length" class="border border-gold/30 rounded p-3"><summary>Escolhas para conferir com o mestre ({{ info.issues.length }})</summary><ul class="list-disc pl-5"><li v-for="issue in info.issues" :key="issue">{{ issue }}</li></ul></details>
      <section class="bg-dark-card border border-steel-dark rounded-xl p-5 space-y-3">
        <h2 class="text-xl text-gold">Avanço de nível</h2>
        <p>Proficiências permitidas no nível atual: {{ info.budget?.class }} de classe e {{ info.budget?.general }} gerais.</p>
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
        <div class="flex flex-wrap gap-2"><select v-model="choice.category" class="inp"><option value="class">Classe</option><option value="general">Geral</option></select><input v-model="choice.name" list="rule-proficiencies" class="inp" placeholder="Proficiência ou especialização"/><datalist id="rule-proficiencies"><option v-for="name in proficiencyOptions(choice.category==='class' ? info.rules.proficiencies : metadata.generalProficiencies)" :key="name" :value="name" /></datalist><button @click="addProficiency" :disabled="busy || !choice.name.trim()" class="btn">Adicionar escolha</button></div>
        <p class="text-xs">As descrições individuais determinam especializações, requisitos e graduações permitidas.</p>
      </section>

      <section v-if="info.magic?.length" class="bg-dark-card border border-steel-dark rounded-xl p-5 space-y-3">
        <h2 class="text-xl text-gold">Magia por classe e nível</h2>
        <div v-for="pool in info.magic" :key="pool.tradition">
          <h3 class="text-gold">{{ pool.tradition === 'arcane' ? 'Arcana' : 'Divina' }} · conjurador {{ pool.casterLevel }} · {{ pool.studious ? 'Estudo' : 'Oração' }}</h3>
          <table class="w-full text-sm"><thead><tr><th>Nível</th><th>Usos restantes / dia</th><th>Limite do repertório</th></tr></thead><tbody><tr v-for="(slots,i) in pool.slots" :key="i"><td>{{ Number(i)+1 }}</td><td>{{ Math.max(0,slots-(info.used[`${pool.tradition}:${Number(i)+1}`]||0)) }} / {{ slots }}</td><td>{{ pool.repertoire[i] ?? 'Definido pela ordem' }}</td></tr></tbody></table>
        </div>
        <div v-for="spell in character.spells" :key="spell.id" class="flex gap-2 items-center"><span>{{ spell.name }} · {{ spell.tradition || 'tipo a definir' }} {{ spell.level }}</span><button @click="cast(spell.id)" :disabled="busy" class="text-gold underline">Gastar uso</button></div>
        <p class="text-xs">Magias interrompidas também gastam um uso. Não há preparação prévia de magias.</p>
        <details class="border border-steel-dark p-3 rounded"><summary @click="editSpells">Editar repertório com validação</summary>
          <div v-for="(s,i) in repertoire" :key="i" class="flex flex-wrap gap-2 mt-2"><select v-model="s.tradition" class="inp"><option v-for="pool in info.magic" :key="pool.tradition" :value="pool.tradition">{{ pool.tradition }}</option></select><input v-model.number="s.level" type="number" min="1" max="6" class="inp w-20" aria-label="Nível da magia"/><input v-model="s.name" :list="`spell-list-${i}`" class="inp" placeholder="Nome da magia"/><datalist :id="`spell-list-${i}`"><option v-for="sug in metadata.spells?.filter((e:any)=>e.level===s.level && e.tradition===s.tradition)" :key="sug.name" :value="sug.name"/></datalist><button @click="repertoire.splice(i,1)" class="text-red-400">Remover</button></div>
          <button @click="repertoire.push({name:'',level:1,tradition:info.magic[0].tradition})" class="text-gold mt-2">+ Magia</button>
          <label class="block mt-2"><input v-model="orderApproved" type="checkbox"/> Repertório religioso conferido com o mestre, quando aplicável.</label>
          <p class="text-xs mt-2">Salvar substitui a lista de magias da ficha por esta lista. Magias pesquisadas ou variantes de campanha podem ser registradas no editor manual.</p>
          <button @click="saveRepertoire" :disabled="busy" class="btn mt-2">Salvar este repertório</button>
        </details>
        <div class="border-t border-steel-dark pt-3 space-y-2"><h3 class="text-gold">Recuperar usos</h3><label>Dia de jogo (contagem contínua)<input v-model.number="restDay" type="number" min="0" class="inp w-28" /></label><label class="block"><input v-model="restConfirmed" type="checkbox"/> Foram cumpridas 8 horas de sono, 24 horas desde a recuperação anterior e os requisitos de estudo/oração.</label><button @click="rest" :disabled="busy || !restConfirmed" class="btn">Registrar descanso</button></div>
      </section>
    </template><p v-else-if="info.reason">{{ info.reason }}</p>

    <section class="bg-dark-card border border-steel-dark rounded-xl p-5 space-y-3">
      <h2 class="text-xl text-gold">Fechar aventura</h2>
      <p class="text-sm">O mestre fecha aventuras de campanha. Selecione quem retornou à civilização e informe apenas tesouro elegível para XP. Moedas não serão gastas ou creditadas por esta operação.</p>
      <label>Identificador único da aventura<input v-model="awardId" class="inp" placeholder="Aventura 01 — ruínas" /></label>
      <label>Valor do tesouro elegível (GP)<input v-model.number="treasureGp" type="number" min="0" step="0.01" class="inp" /></label>
      <div v-for="(m,i) in monsters" :key="i" class="flex flex-wrap gap-2"><label>HD (0 = menos de 1)<input v-model.number="m.hd" type="number" min="0" max="100" class="inp w-24" /></label><label><input v-model="m.bonusHd" type="checkbox" /> HD+</label><label>Habilidades (*)<input v-model.number="m.abilities" type="number" min="0" class="inp w-24" /></label><label>Quantidade<input v-model.number="m.count" type="number" min="1" class="inp w-24" /></label><button @click="monsters.splice(i,1)" class="text-red-400">Remover</button></div>
      <button @click="monsters.push({hd:1,bonusHd:false,abilities:0,count:1})" class="text-gold">+ Grupo de monstros derrotados</button>
      <div v-for="p in participants" :key="p.id" class="flex gap-3 items-center"><label><input v-model="p.selected" type="checkbox"/> {{ p.name }}</label><select v-model.number="p.share" class="inp"><option :value="1">Personagem: 1 cota</option><option :value="0.5">Henchman com ficha: ½ cota</option></select></div>
      <button @click="previewAdventure" :disabled="busy || !awardId.trim()" class="btn">Conferir distribuição de XP</button>
      <div v-if="xpPreview" class="border border-gold/40 p-3 space-y-2"><p>Tesouro: {{ xpPreview.treasureGp }} XP · monstros: {{ xpPreview.monsterXp }} XP</p><table class="w-full text-sm"><thead><tr><th>Personagem</th><th>Cota bruta</th><th>Atributos</th><th>XP ganho</th><th>Excesso limitado</th></tr></thead><tbody><tr v-for="a in xpPreview.awards" :key="a.id"><td>{{ a.name }}</td><td>{{ a.base.toFixed(2) }}</td><td>+{{ a.adjustment }}%</td><td>{{ a.gained }}</td><td>{{ a.capped }}</td></tr></tbody></table><button @click="applyAdventure" :disabled="busy" class="btn">Confirmar concessão de XP</button></div>
    </section>
    <fieldset :disabled="busy" class="min-w-0"><CampaignWorkflows :character="character" :prepare="prepare" :refresh="refresh" /></fieldset>
  </div>
</template>
<script setup lang="ts">
import {ref,onMounted,watch} from 'vue'
import api from '../../services/api'
import {errorMessage,proficiencyOptions} from '../../utils/catalog'
import CampaignWorkflows from './CampaignWorkflows.vue'
const props=defineProps<{character:any;prepare:()=>Promise<boolean>;refresh:()=>Promise<void>}>()
const info=ref<any>({}),metadata=ref<any>({}),busy=ref(false),error=ref(''),notice=ref('')
const diceText=ref(''),advancePreview=ref<any>(null),advanceInput=ref<any>(null),choice=ref({name:'',category:'class'})
const repertoire=ref<any[]>([]),orderApproved=ref(false),restDay=ref(1),restConfirmed=ref(false)
const awardId=ref(''),treasureGp=ref(0),monsters=ref<any[]>([]),participants=ref<any[]>([]),xpPreview=ref<any>(null),xpInput=ref<any>(null)
const url=()=>`/api/game-rules/characters/${props.character.id}`
async function run(work:()=>Promise<void>){if(busy.value)return;busy.value=true;error.value='';notice.value='';try{await work()}catch(e){error.value=errorMessage(e,'Não foi possível concluir a operação.')}finally{busy.value=false}}
async function load(){await run(async()=>{const [r,m,c]=await Promise.all([api.get(url()),api.get('/api/game-rules/metadata'),api.get('/api/characters')]);info.value=r.data;metadata.value=m.data;restDay.value=Math.max(restDay.value,(r.data.lastRestDay??-1)+1);participants.value=c.data.characters.filter((p:any)=>p.campaignId===props.character.campaignId).map((p:any)=>({id:p.id,name:p.characterName,version:p.version,share:1,selected:p.id===props.character.id}))})}
async function prepared(){if(!await props.prepare())throw Error('Salve ou resolva o conflito da ficha antes de continuar.');const r=await api.get(url());info.value=r.data;return r.data.version}
async function complete(message:string){advancePreview.value=null;xpPreview.value=null;await props.refresh();info.value=(await api.get(url())).data;notice.value=message}
function rollHp(){const match=info.value.next.hitDice.match(/^(\d+)d(\d+)/),sides=Number(match[2]),ceiling=Math.floor(4294967296/sides)*sides;diceText.value=Array.from({length:Number(match[1])},()=>{const v=new Uint32Array(1);do{crypto.getRandomValues(v)}while(v[0]!>=ceiling);return v[0]!%sides+1}).join(', ');advancePreview.value=null}
async function previewAdvance(){await run(async()=>{advanceInput.value={version:await prepared(),dice:diceText.value.split(/[,;\s]+/).filter(Boolean).map(Number)};advancePreview.value=(await api.post(`${url()}/advance/preview`,advanceInput.value)).data})}
async function applyAdvance(){await run(async()=>{await api.post(`${url()}/advance/apply`,advanceInput.value);await complete('Nível atualizado. Confira as escolhas pendentes e o repertório.')})}
async function addProficiency(){await run(async()=>{await api.post(`${url()}/proficiencies`,{version:await prepared(),choices:[choice.value]});choice.value={name:'',category:'class'};await complete('Proficiência adicionada.')})}
function editSpells(){repertoire.value=props.character.spells.map((s:any)=>({name:s.name,level:s.level,tradition:s.tradition|| (info.value.magic.length===1?info.value.magic[0].tradition:'')}))}
async function saveRepertoire(){await run(async()=>{await api.post(`${url()}/magic/repertoire`,{version:await prepared(),spells:repertoire.value,orderApproved:orderApproved.value});await complete('Repertório registrado.')})}
async function cast(spellId:string){await run(async()=>{await api.post(`${url()}/magic/cast`,{version:await prepared(),spellId});await complete('Uso de magia registrado.')})}
async function rest(){await run(async()=>{await api.post(`${url()}/magic/rest`,{version:await prepared(),day:restDay.value,hours:8,requirementsMet:true});restConfirmed.value=false;await complete('Usos de magia recuperados.')})}
async function previewAdventure(){await run(async()=>{await prepared();const current=(await api.get('/api/characters')).data.characters;xpInput.value={awardId:awardId.value,treasureGp:treasureGp.value,monsters:monsters.value.map(m=>({...m})),...(props.character.campaignId?{campaignId:props.character.campaignId}:{}),participants:participants.value.filter(p=>p.selected).map(p=>({id:p.id,share:p.share,version:current.find((c:any)=>c.id===p.id)?.version}))};xpPreview.value=(await api.post('/api/game-rules/adventures/preview',xpInput.value)).data})}
async function applyAdventure(){await run(async()=>{await api.post('/api/game-rules/adventures/apply',xpInput.value);await complete('XP concedido. A aventura ficou registrada no histórico.')})}
watch(diceText,()=>advancePreview.value=null)
watch([awardId,treasureGp,monsters,participants],()=>xpPreview.value=null,{deep:true})
onMounted(load)
</script>
<style scoped>
.btn { padding: .5rem 1rem; background: #c6a052; color: #171717; border-radius: .4rem; font-weight: 700; }
.btn:disabled { opacity: .5; }
th, td { padding: .4rem; text-align:left; }
</style>
