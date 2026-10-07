<template>
  <div class="space-y-6">
    <p v-if="error" role="alert" class="text-red-400">{{ error }}</p><p v-if="notice" role="status" class="text-green-400">{{ notice }}</p>
    <fieldset :disabled="busy" class="min-w-0 space-y-6">
    <MagicItems :character="character" :prepare="prepare" :refresh="refresh" />
    <section v-if="character.domain" class="panel space-y-3">
      <h2 class="text-xl text-gold">Fechamento mensal do domínio</h2>
      <p class="text-sm">Receitas e despesas usam os valores da aba Domínio. Informe crescimento e perdas já rolados, incluindo os efeitos da moral. Eventos e pagamentos atrasados são decisões do mestre.</p>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
        <label>Ano<input v-model.number="month.year" type="number" min="1" class="inp"/></label><label>Mês<input v-model.number="month.month" type="number" min="1" max="12" class="inp"/></label>
        <label>Moral base<input v-model.number="month.baseMorale" type="number" min="-4" max="4" class="inp"/></label><label>Ajuste de eventos<input v-model.number="month.eventMorale" type="number" min="-20" max="20" class="inp"/></label>
        <label>Moral: primeiro d6<input v-model.number="month.moraleDice[0]" type="number" min="1" max="6" class="inp"/></label><label>Moral: segundo d6<input v-model.number="month.moraleDice[1]" type="number" min="1" max="6" class="inp"/></label>
        <label>Famílias ganhas<input v-model.number="month.growth" type="number" min="0" class="inp"/></label><label>Famílias perdidas<input v-model.number="month.losses" type="number" min="0" class="inp"/></label>
        <label>Famílias por eventos (±)<input v-model.number="month.eventFamilies" type="number" class="inp"/></label><label>Tributo pago (GP)<input v-model.number="month.tributeGp" type="number" min="0" step="any" class="inp"/></label>
        <label>Área (hexes)<input v-model.number="month.hexes" type="number" min="1" class="inp"/></label><label>Classificação<select v-model="month.classification" class="inp"><option value="outlands">Ermo</option><option value="borderlands">Fronteira</option><option value="civilized">Civilizado</option></select></label>
      </div>
      <label class="block"><input v-model="month.administered" type="checkbox"/> Administração pessoal cumprida</label><label class="block"><input v-model="month.repressed" type="checkbox"/> Domínio sob repressão</label>
      <button @click="previewDomain" :disabled="busy" class="btn">Conferir mês</button>
      <div v-if="domainPreview" class="space-y-2 border border-gold/30 p-3">
        <p>População: {{ domainPreview.population }} / {{ domainPreview.capacity }} famílias · moral: {{ domainPreview.morale }} · tesouro: {{ domainPreview.treasury.toFixed(2) }} GP</p>
        <p>Receita: {{ domainPreview.revenue.toFixed(2) }} · despesas: {{ domainPreview.expenses.toFixed(2) }} · saldo: {{ domainPreview.balance.toFixed(2) }} GP</p>
        <p>Teste de moral: {{ domainPreview.roll }} natural / {{ domainPreview.adjusted }} ajustado.</p>
        <ul class="text-sm"><li v-for="s in domainPreview.sources" :key="s.source">{{ s.source }}: {{ s.value }}</li></ul>
        <p v-if="domainPreview.overflow">{{ domainPreview.overflow }} famílias excedem a capacidade territorial.</p>
        <button @click="applyDomain" :disabled="busy" class="btn">Confirmar fechamento mensal</button>
      </div>
    </section>
    <section class="panel space-y-3">
      <h2 class="text-xl text-gold">Pesquisa acompanhada de itens mágicos</h2>
      <p class="text-sm">Cadastre o projeto na fila da aba Magia. Neste fluxo, materiais são pagos ao iniciar, dias são registrados por período e componentes são consumidos no resultado final. Avançar o calendário não registra trabalho nestes projetos.</p>
      <select v-model="projectId" class="inp" aria-label="Projeto de pesquisa"><option value="">Selecione um projeto</option><option v-for="p in character.magicItemResearch" :key="p.id" :value="p.id">{{ p.itemName }} — {{ p.status }} ({{ p.remainingDays }} dias)</option></select>
      <template v-if="project?.status==='QUEUED'">
        <div class="grid grid-cols-2 md:grid-cols-3 gap-3">
          <label>Nível de conjurador<input v-model.number="plan.casterLevel" type="number" min="1" max="14" class="inp"/></label>
          <label>Tradição<select v-model="plan.tradition" class="inp"><option value="arcane">Arcana</option><option value="divine">Divina</option></select></label>
          <label>Bônus de produtividade (%)<input v-model.number="plan.rateBonusPercent" type="number" min="0" max="100" class="inp"/></label>
          <label>Dedicação<select v-model="plan.dedication" class="inp"><option value="dedicated">Integral</option><option value="ancillary">Secundária (⅛)</option></select></label>
          <label>Duração do efeito<select v-model="plan.duration" class="inp"><option value="instant">Instantânea</option><option value="round">Rodadas</option><option value="turn">Turnos</option><option value="hour">Horas</option><option value="day">Dias</option><option value="concentration">Concentração</option></select></label>
          <label>Tipo de item<select v-model="plan.itemKind" class="inp"><option value="other">Outro</option><option value="wand">Wand</option><option value="rod">Rod</option><option value="staff">Staff</option></select></label>
        </div>
        <p class="text-sm text-steel-light">{{ assistantAllowance.limit ? `Assistentes diretos: ${plan.assistants.length} / ${assistantAllowance.limit}. Cada assistente precisa ter pelo menos nível de conjurador 1.` : assistantAllowance.reason }}</p>
        <div v-for="(a,i) in plan.assistants" :key="i" class="flex flex-wrap gap-2"><input v-model="a.name" placeholder="Assistente" class="inp"/><label>Nível<input v-model.number="a.casterLevel" type="number" min="1" max="14" class="inp w-20"/></label><label>Bônus %<input v-model.number="a.rateBonusPercent" type="number" min="0" max="100" class="inp w-20"/></label><select v-model="a.dedication" class="inp"><option value="dedicated">Integral</option><option value="ancillary">Secundária</option></select><button @click="plan.assistants.splice(i,1)">Remover</button></div>
        <button @click="plan.assistants.push({name:'',casterLevel:1,rateBonusPercent:0,dedication:'dedicated'})" :disabled="busy || plan.assistants.length >= assistantAllowance.limit" class="text-gold disabled:opacity-40">+ Assistente</button>
        <label class="block"><input v-model="plan.affectsUser" type="checkbox"/> Efeito atinge somente o usuário</label><label class="block"><input v-model="plan.esoteric" type="checkbox"/> Magia esotérica</label><label class="block"><input v-model="plan.healing" type="checkbox"/> Efeito de cura</label>
        <label class="block"><input v-model="plan.eligible" type="checkbox"/> Mestre conferiu elegibilidade, efeito, assistência e condições de trabalho</label>
        <p v-if="assistantError" role="alert" class="text-sm text-red-400">{{ assistantError }}</p>
        <button @click="previewResearch" :disabled="busy || !plan.eligible || !!assistantError" class="btn">Conferir início da pesquisa</button>
        <div v-if="planPreview" class="border border-gold/30 p-3 space-y-2"><p>Materiais pagos agora: {{ planPreview.materialsPaidGp }} GP · componentes ao concluir: {{ planPreview.componentCostGp }} GP · {{ planPreview.daysRequired }} dias a {{ planPreview.researchRateGp }} GP/dia.</p><button @click="startResearch" :disabled="busy" class="btn">Pagar materiais e iniciar</button></div>
      </template>
      <template v-if="tracked && project?.status==='IN_PROGRESS'">
        <label>Período de trabalho (identificador único)<input v-model="work.period" class="inp" placeholder="Ano 1, mês 2, semana 3"/></label><label>Dias trabalhados<input v-model.number="work.days" type="number" min="1" max="365" class="inp"/></label><button @click="recordWork" :disabled="busy || !work.period.trim()" class="btn">Registrar trabalho</button>
      </template>
      <template v-if="tracked && project?.status==='READY'">
        <h3 class="text-gold">Componentes e resolução</h3><p class="text-xs">Valor e adequação de cada componente devem ser conferidos pelo mestre. Todos os componentes selecionados serão consumidos, inclusive se o teste falhar.</p>
        <div v-for="(c,i) in finish.components" :key="i" class="flex flex-wrap gap-2"><select v-model="c.itemId" class="inp" aria-label="Componente"><option value="">Item do inventário</option><option v-for="item in character.items" :key="item.id" :value="item.id">{{ item.name }} ({{ item.quantity }})</option></select><label>Qtd.<input v-model.number="c.quantity" type="number" min="1" class="inp w-20"/></label><label>GP/unidade<input v-model.number="c.valueGp" type="number" min="0.01" step="any" class="inp w-24"/></label><label><input v-model="c.appropriate" type="checkbox"/> Adequado</label><button @click="finish.components.splice(i,1)">Remover</button></div>
        <button @click="finish.components.push({itemId:'',quantity:1,valueGp:1,appropriate:true})" class="text-gold">+ Componente</button>
        <div class="grid grid-cols-2 gap-3"><label>Resultado do d20 (0 com fórmula)<input v-model.number="finish.roll" type="number" min="0" max="20" class="inp"/></label><label>Magical Engineering: graduação<input v-model.number="finish.engineeringRank" type="number" min="0" max="10" class="inp"/></label><label>Outros ajustes ao teste<input v-model.number="finish.otherBonus" type="number" min="-30" max="30" class="inp"/></label><label>Peso do item produzido (st)<input v-model.number="finish.itemWeight" type="number" min="0" step="any" class="inp"/></label></div>
        <button @click="previewOutcome" :disabled="busy" class="btn">Conferir resultado</button>
        <div v-if="outcome" class="border border-gold/30 p-3 space-y-2"><p>{{ outcome.success?'Sucesso':'Falha' }} · {{ outcome.formula?'Fórmula e componentes adequados':`alvo ${outcome.target}+, bônus ${outcome.bonus}, d20 ${outcome.roll}` }} · {{ outcome.consumedValueGp }} GP em componentes consumidos.</p><button @click="finishResearch" :disabled="busy" class="btn">Consumir componentes e registrar resultado</button></div>
      </template>
      <details v-if="tracked && ['IN_PROGRESS','READY'].includes(project?.status)"><summary>Cancelar este projeto</summary><p>Materiais já pagos não serão devolvidos; componentes ainda no inventário serão preservados.</p><button @click="cancelResearch" :disabled="busy" class="text-red-400">Confirmar cancelamento</button></details>
    </section>
    </fieldset>
  </div>
</template>
<script setup lang="ts">
import {ref,computed,watch,onBeforeUnmount,type Ref} from 'vue'
import api from '../../services/api'
import {errorMessage} from '../../utils/catalog'
import MagicItems from './MagicItems.vue'
import { useCharacterOperations } from '../../composables/characterOperations'
import { researchAssistantAllowance, validateResearchAssistants } from '../../../../backend/src/lib/researchAssistance'
import { magicPools, type ClassRules } from '../../../../backend/src/lib/gameRules'
const props=defineProps<{character:any;rules?:ClassRules;prepare:()=>Promise<boolean>;refresh:()=>Promise<void>}>()
const operations=useCharacterOperations()
const busy=ref(false),error=ref(''),notice=ref(''),projectId=ref('')
const project=computed(()=>props.character.magicItemResearch?.find((p:any)=>p.id===projectId.value))
const tracked=computed(()=>{try{return !!JSON.parse(props.character.rulesState||'{}').research?.[projectId.value]}catch{return false}})
const month=ref({year:1,month:1,baseMorale:0,moraleDice:[3,4],growth:0,losses:0,eventFamilies:0,eventMorale:0,administered:false,repressed:false,classification:'outlands',hexes:1,tributeGp:0})
const plan=ref({casterLevel:Math.min(14,props.character.level),tradition:'arcane',rateBonusPercent:0,dedication:'dedicated',assistants:[] as any[],duration:'instant',affectsUser:false,esoteric:false,healing:false,eligible:false,itemKind:'other'})
const assistantAllowance=computed(()=>researchAssistantAllowance(props.rules,props.character,plan.value.tradition,plan.value.casterLevel))
const assistantError=computed(()=>{try{validateResearchAssistants(props.rules,props.character,plan.value);return ''}catch(error){return (error as Error).message}})
watch(()=>props.rules,rules=>{if(rules){const pools=magicPools(rules,props.character);if(pools.length && !pools.some(pool=>pool.tradition===plan.value.tradition)){plan.value.tradition=pools[0]!.tradition;plan.value.casterLevel=pools[0]!.casterLevel}}},{immediate:true})
const work=ref({days:1,period:''}),finish=ref({components:[] as any[],roll:0,engineeringRank:0,otherBonus:0,itemWeight:1/6})
const domainPreview=ref<any>(null),planPreview=ref<any>(null),outcome=ref<any>(null)
let domainInput:any,planInput:any,finishInput:any
let revision=0
function invalidate(){revision++;domainPreview.value=planPreview.value=outcome.value=null}
onBeforeUnmount(invalidate)
const root=()=>`/api/campaign-rules/characters/${props.character.id}`
const research=()=>`${root()}/research/${projectId.value}`
async function run(fn:()=>Promise<void>){if(busy.value)return;busy.value=true;error.value='';notice.value='';try{await fn()}catch(e){error.value=errorMessage(e,'Não foi possível concluir.')}finally{busy.value=false}}
async function version(){if(!await props.prepare() || !await operations.retryPending())throw Error('Resolva o salvamento da ficha antes de continuar.');return props.character.version}
async function done(message:string){domainPreview.value=planPreview.value=outcome.value=null;notice.value=message}
async function preview(endpoint:string,values:Ref<any>,target:Ref<any>){
  target.value=null
  const currentVersion=await version(),currentRevision=revision
  const input={...JSON.parse(JSON.stringify(values.value)),version:currentVersion}
  const data=(await api.post(endpoint,input)).data
  if(currentRevision!==revision)throw Error('Os dados mudaram durante a conferência. Confira novamente antes de confirmar.')
  target.value=data
  return input
}
function requireResult(data:any){if(!data)throw operations.getLastError() || Error('Não foi possível concluir a operação.')}
async function previewDomain(){await run(async()=>{domainInput=await preview(`${root()}/domain/preview`,month,domainPreview)})}
async function applyDomain(){await run(async()=>{
  const input={...domainInput,fingerprint:domainPreview.value.fingerprint}
  domainPreview.value=null
  const data=await operations.run('domain:month:apply',()=>api.post(`${root()}/domain/apply`,input))
  requireResult(data);await done('Mês registrado no histórico do domínio.')
})}
async function previewResearch(){await run(async()=>{planInput=await preview(`${research()}/preview`,plan,planPreview)})}
async function startResearch(){await run(async()=>{
  const input={...planInput,fingerprint:planPreview.value.fingerprint},endpoint=`${research()}/start`
  planPreview.value=null
  const data=await operations.run(`research:${projectId.value}:start`,()=>api.post(endpoint,input))
  requireResult(data);await done('Materiais pagos; pesquisa iniciada.')
})}
async function recordWork(){await run(async()=>{
  const input={...work.value},endpoint=`${research()}/work`
  const data=await operations.run(`research:${projectId.value}:work`,version=>api.post(endpoint,{...input,version}))
  requireResult(data)
  work.value.period=''
  await done('Período de trabalho registrado.')
})}
async function previewOutcome(){await run(async()=>{finishInput=await preview(`${research()}/outcome`,finish,outcome)})}
async function finishResearch(){await run(async()=>{
  const input={...finishInput,fingerprint:outcome.value.fingerprint},endpoint=`${research()}/finish`
  outcome.value=null
  const data=await operations.run(`research:${projectId.value}:finish`,()=>api.post(endpoint,input))
  requireResult(data);await done('Resultado registrado e inventário atualizado.')
})}
async function cancelResearch(){await run(async()=>{
  const endpoint=`${research()}/cancel`
  const data=await operations.run(`research:${projectId.value}:cancel`,version=>api.post(endpoint,{version}))
  requireResult(data);await done('Projeto cancelado; materiais pagos preservados no histórico.')
})}
watch([month,plan,finish],invalidate,{deep:true,flush:'sync'})
watch([projectId,()=>props.character.version],invalidate,{flush:'sync'})
</script>
<style scoped>
.panel{padding:1.25rem;border:1px solid #484b50;border-radius:.75rem}.btn{padding:.5rem 1rem;background:#c6a052;color:#171717;border-radius:.4rem;font-weight:700}.btn:disabled{opacity:.5}label .inp{display:block;width:100%}
</style>
