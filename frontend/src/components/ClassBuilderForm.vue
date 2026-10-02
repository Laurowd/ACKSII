<template>
  <details :open="open" class="border border-gold/30 p-4 md:p-5 rounded-xl mb-5 bg-dark-card">
    <summary class="text-lg text-gold cursor-pointer">Construir classe por pontos</summary>
    <p class="text-sm text-steel-light my-3">Judge’s Journal, pp. 289–306. Distribua os pontos, escolha as capacidades e confira a progressão antes de salvar.</p>
    <p v-if="error" role="alert" class="text-red-400 mb-3">{{ error }} <button v-if="!ready" @click="loadMetadata" class="underline">Tentar carregar novamente</button></p>
    <p v-if="notice" role="status" class="text-green-400 mb-3">{{ notice }}</p>
    <p v-if="busy" role="status" class="text-steel-light">{{ saving ? 'Salvando classe…' : 'Conferindo dados…' }}</p>
    <fieldset :disabled="busy || !ready" class="space-y-5 disabled:opacity-70">
      <section class="space-y-3">
        <h3 class="text-gold text-lg">1. Conceito e pontos</h3>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <label>Nome<input v-model="form.name" maxlength="80" class="inp"/></label>
          <label>Raça<select v-model="form.race" class="inp"><option value="human">Humano</option><option value="dwarf">Anão</option><option value="elf">Elfo</option><option value="halfling">Halfling</option><option value="nobiran">Nobirano</option><option value="zaharan">Zaharano</option></select></label>
          <label v-for="(label,key) in points" :key="key">{{ label }}<input v-model.number="form[key]" type="number" min="0" max="4" :disabled="key==='racial' && form.race==='human'" class="inp"/></label>
        </div>
        <p class="text-sm" :class="validPoints ? 'text-steel-light' : 'text-red-400'">{{ corePoints }} / 4 pontos básicos · {{ totalPoints }} pontos totais · nível máximo {{ maxLevel || '—' }}. {{ form.race==='human' ? 'Humanos usam exatamente 4 pontos básicos.' : 'Raças usam até 4 pontos básicos e de 4 a 8 no total.' }}</p>
        <div class="flex flex-wrap gap-4"><label v-for="a in ['str','int','dex','wil','con','cha']" :key="a"><input v-model="form.keyAttributes" type="checkbox" :value="a"/> {{ a.toUpperCase() }} é atributo-chave</label><label><input v-model="form.smoothXp" type="checkbox"/> Arredondar XP do nível 7</label></div>
      </section>
      <section class="space-y-3 border-t border-steel-dark pt-4">
        <h3 class="text-gold text-lg">2. Combate, magia e fortaleza</h3>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <label v-if="form.fighting===1">Fighting 1<select v-model="form.fightingVariant" class="inp"><option value="crusader">1a — Crusader</option><option value="thief">1b — Thief</option></select></label>
          <label>Reduções de armadura<input v-model.number="form.armorTrade" type="number" min="0" :max="originalArmor" class="inp"/></label>
          <label>Reduções de armas<input v-model.number="form.weaponTrade" type="number" min="0" :max="originalWeapons" class="inp"/></label>
          <label>Estilos opcionais removidos<input v-model.number="form.styleTrade" type="number" min="0" :max="originalStyles" class="inp"/></label>
          <label>Bônus de dano removido<select v-model="form.damageTrade" :disabled="form.fighting<2" class="inp"><option value="none">Nenhum</option><option value="melee">Corpo a corpo</option><option value="missile">Projéteis</option><option value="both">Ambos</option></select></label>
          <label>Fortaleza<select v-model="form.stronghold" class="inp"><option v-for="s in strongholds" :key="s">{{ s }}</option></select></label>
        </div>
        <p class="text-sm text-steel-light">Single Weapon e Missile Weapon são obrigatórios. Selecione {{ originalStyles-form.styleTrade }} estilos opcionais:</p>
        <div class="flex flex-wrap gap-4"><label v-for="style in optionalStyles" :key="style"><input v-model="form.fightingStyles" type="checkbox" :value="style" :disabled="style==='Weapon and Shield' && originalArmor-form.armorTrade===0"/> {{ style }}</label></div>
        <label class="block">Seleção de armas e restrições raciais<textarea v-model="form.weaponSelection" rows="2" class="inp" placeholder="Informe as armas ou categorias escolhidas conforme Fighting e a raça"/></label>
        <div class="flex flex-wrap gap-4"><label><input v-model="form.delayedArcane" type="checkbox"/> Usar magia arcana adiada (valor efetivo 1–3)</label><label v-if="divineValue"><input v-model="form.tradeRebuking" type="checkbox"/> Trocar afastar mortos-vivos por {{ divineValue }} poderes</label></div>
        <label v-if="divineValue" class="block">Código de conduta divina<textarea v-model="form.codeOfBehavior" rows="2" class="inp" placeholder="Obrigações e restrições; devem aumentar com o valor Divine"/></label>
        <details v-if="divineValue" class="border border-steel-dark rounded-lg p-3"><summary class="text-gold cursor-pointer">Repertório religioso: {{ divineListSize }} magias por nível</summary><p class="text-sm text-steel-light my-2">Escolha a lista da classe conforme a sua ordem religiosa. Ela limita as magias divinas disponíveis para seus personagens.</p><div class="grid sm:grid-cols-2 gap-3"><label v-for="level in [1,2,3,4,5]" :key="level">Magias divinas de nível {{ level }} · {{ form.divineSpellList.filter((s:any)=>s.level===level).length }} / {{ divineListSize }}<select multiple :value="form.divineSpellList.filter((s:any)=>s.level===level).map((s:any)=>s.name)" @change="chooseDivine(level,$event)" size="6" class="inp"><option v-for="spell in spells.filter(s=>s.tradition==='divine'&&s.level===level)" :key="spell.name" :value="spell.name">{{ spell.name }}</option></select></label></div></details>
        <div v-if="hasStrongholdPower" class="grid sm:grid-cols-2 gap-3"><label>Poder de moral no nível 5<input v-model="form.strongholdPower" class="inp"/></label><label>Descrição do poder de moral<textarea v-model="form.strongholdDescription" rows="2" class="inp"/></label></div>
      </section>
      <section class="space-y-3 border-t border-steel-dark pt-4">
        <h3 class="text-gold text-lg">3. Poderes e habilidades</h3>
        <div class="grid sm:grid-cols-2 gap-3"><label>Proficiência geral inicial<input v-model="form.startingProficiency" class="inp" list="builder-general"/></label><label>Descrição da proficiência inicial<textarea v-model="form.startingDescription" rows="2" class="inp" placeholder="Efeito concedido pela classe"/></label></div>
        <p class="text-sm text-steel-light">O poder inicial gratuito não consome a escolha de proficiência do personagem. Backstabbing custa duas habilidades. Trocas para níveis futuros respeitam a tabela e o nível máximo da classe.</p>
        <div v-if="form.thievery" class="space-y-2"><p>Habilidades de ladrão iniciais: {{ skillCost }} / {{ form.thievery*4 }} escolhas</p><div class="flex flex-wrap gap-x-4 gap-y-2"><label v-for="skill in metadata.thiefSkills" :key="skill"><input v-model="form.thiefSkills" type="checkbox" :value="skill"/> {{ skill }}{{ skill==='Backstabbing'?' (2)':'' }}</label></div></div>
        <div v-if="form.race==='halfling'"><p>Escolha {{ form.racial }} habilidades halfling:</p><div class="flex flex-wrap gap-x-4 gap-y-2"><label v-for="skill in metadata.halflingSkills" :key="skill"><input v-model="form.halflingSkills" type="checkbox" :value="skill"/> {{ skill }}</label></div></div>
        <p :class="usedPowers===powerBudget ? 'text-steel-light' : 'text-red-400'">Trocas e habilidades convertidas: {{ usedPowers }} / {{ powerBudget }} escolhas atribuídas.</p>
        <div v-for="(_choice,i) in form.powerSelections" :key="`power-${i}`" class="space-y-1"><ClassPowerChoice v-model="form.powerSelections[i]" :level="1" :trades="metadata.powerTrades"/><button @click="form.powerSelections.splice(i,1)" class="text-red-400 text-sm">Remover poder {{ Number(i)+1 }}</button></div>
        <button @click="form.powerSelections.push({name:'',description:'',kind:'power'})" class="text-gold underline">Adicionar poder de troca</button>
        <div v-for="(_choice,i) in form.thiefSelections" :key="`thief-${i}`" class="space-y-1"><ClassPowerChoice v-model="form.thiefSelections[i]" :level="1" :trades="metadata.powerTrades" allow-skills/><button @click="form.thiefSelections.splice(i,1)" class="text-red-400 text-sm">Remover escolha de Thievery {{ Number(i)+1 }}</button></div>
        <button v-if="form.thievery" @click="form.thiefSelections.push({name:'',description:'',kind:'skill'})" class="text-gold underline">Distribuir escolhas de Thievery por nível</button>
      </section>
      <section class="space-y-3 border-t border-steel-dark pt-4">
        <h3 class="text-gold text-lg">4. Lista de proficiências e títulos</h3>
        <p class="text-sm text-steel-light">A lista deve somar {{ maxLevel ? 42-maxLevel : '42 − nível máximo' }} escolhas. Art, Craft, Performance e Profession especializados valem ½. A lista pode incluir proficiências aprovadas pelo mestre.</p>
        <div class="grid sm:grid-cols-2 gap-3"><label>Lista de proficiências (uma escolha por linha)<textarea v-model="proficienciesText" rows="8" class="inp"/><span class="text-sm">{{ listWeight }} escolhas na lista</span></label><label>Títulos por nível (opcional, um por linha)<textarea v-model="titlesText" rows="8" class="inp" placeholder="Em branco: nome da classe e nível"/></label></div>
      </section>
      <button @click="preview" class="px-4 py-2 border border-gold text-gold rounded-lg">Conferir construção</button>
    </fieldset>
    <section v-if="result" class="mt-5 border-t border-gold/30 pt-4 space-y-3" aria-label="Prévia da classe">
      <h3 class="text-xl text-gold">{{ result.name }}</h3>
      <p>Salva como {{ result.summary.savingClass }} · máximo {{ result.summary.maxLevel }} · nível 2: {{ result.summary.xpSecond }} XP · {{ result.hitDie }} · {{ result.summary.powerBudget }} poderes de troca.</p>
      <p>Armas: {{ result.summary.weapons }} · armadura: {{ result.summary.armor }} · {{ result.summary.optionalStyles }} estilos opcionais · ferimentos mortais +{{ result.summary.mortalWoundsBonus }}.</p>
      <div class="grid sm:grid-cols-2 gap-2"><div v-for="(p,i) in result.creationRules.powers" :key="i" class="flex items-center gap-2 rounded-lg border border-steel-dark p-2"><HelpTooltip :label="p.name">{{ p.description || 'Poder definido pelo mestre.' }}</HelpTooltip><span>{{ p.name }} <span v-if="p.minimumLevel>1" class="text-steel-light text-sm">· nível {{ p.minimumLevel }}</span></span></div></div>
      <div class="overflow-auto"><table class="w-full text-sm"><thead><tr><th>Nível</th><th>XP</th><th>Título</th><th>PV</th><th>Ataque</th><th>Morte</th><th>Paralisia</th><th>Blast</th><th>Implementos</th><th>Spells</th><th>Magias/dia</th></tr></thead><tbody><tr v-for="(r,i) in result.creationRules.rules.levels" :key="r.level"><td>{{ r.level }}</td><td>{{ r.xp.toLocaleString('pt-BR') }}</td><td>{{ result.titles[i] }}</td><td>{{ r.hitDice }}</td><td>{{ result.attackThrows[i] }}+</td><td v-for="key in ['death','paralysis','blast','implements','spells']" :key="key">{{ result.savingThrows[i][key] }}+</td><td>{{ r.spellSlots.join(' / ') }}</td></tr></tbody></table></div>
      <p class="text-xs text-steel-light">Ao salvar, a classe entra no catálogo e no assistente de personagens. A definição calculada fica preservada; o editor livre permite criar variantes.</p>
      <button @click="save" :disabled="busy" class="px-4 py-2 bg-gold text-dark-bg rounded-lg">Criar classe na campanha</button>
    </section>
    <datalist id="builder-general"><option v-for="p in general" :key="p" :value="p"/></datalist><datalist id="builder-skills"><option v-for="p in metadata.thiefSkills" :key="p" :value="p"/></datalist>
  </details>
</template>
<script setup lang="ts">
import {ref,onMounted,watch,computed} from 'vue'
import {onBeforeRouteLeave} from 'vue-router'
import api from '../services/api'
import { getResource } from '../services/resources'
import {errorMessage,proficiencyOptions} from '../utils/catalog'
import ClassPowerChoice from './ClassPowerChoice.vue'
import HelpTooltip from './HelpTooltip.vue'
const props=defineProps<{campaignId:string;open?:boolean}>(),emit=defineEmits<{created:[id:string]}>()
const form=ref<any>({name:'',race:'human',racial:0,hd:2,fighting:2,thievery:0,divine:0,arcane:0,fightingVariant:'crusader',armorTrade:0,weaponTrade:0,styleTrade:0,damageTrade:'none',startingProficiency:'Manual of Arms',startingDescription:'Reconhece símbolos, equipamentos e patentes militares da terra natal. Para outros reinos: teste 11+. Pode lutar como tropa regular em unidades formadas ou abertas; organização militar inicial a critério do mestre.',keyAttributes:['str'],stronghold:'Castle',smoothXp:true,thiefSkills:[],powerSelections:[],thiefSelections:[],halflingSkills:[],delayedArcane:false,tradeRebuking:false,codeOfBehavior:'',fightingStyles:['Dual Weapon','Two-Handed Weapon','Weapon and Shield'],weaponSelection:'',strongholdPower:'Battlefield Prowess',strongholdDescription:'Retentores e mercenários sob o comando do personagem recebem +1 de moral em batalha.'})
const points={hd:'Hit Dice',fighting:'Fighting',thievery:'Thievery',divine:'Divine',arcane:'Arcane',racial:'Valor racial'}
const optionalStyles=['Dual Weapon','Two-Handed Weapon','Weapon and Shield']
const corePoints=computed(()=>['hd','fighting','thievery','divine','arcane'].reduce((n,k)=>n+Number(form.value[k]||0),0))
const totalPoints=computed(()=>corePoints.value+Number(form.value.racial||0))
const validPoints=computed(()=>corePoints.value<=4&&totalPoints.value>=4&&totalPoints.value<=8&&(form.value.race!=='human'||corePoints.value===4&&form.value.racial===0))
const maxLevel=computed(()=>validPoints.value?(form.value.race==='human'?14:({4:13,5:12,6:11,7:10,8:8} as Record<number,number>)[totalPoints.value]!+(form.value.race==='nobiran'?1:0)):0)
const originalArmor=computed(()=>form.value.fighting>=2||form.value.fighting===1&&form.value.fightingVariant==='crusader'?4:form.value.fighting===1?2:0)
const originalWeapons=computed(()=>form.value.fighting>=2?3:form.value.fighting===1?(form.value.fightingVariant==='thief'?2:1):0)
const originalStyles=computed(()=>form.value.fighting>=2?3:form.value.fighting===1?2:1)
const divineValue=computed(()=>form.value.race==='nobiran'?form.value.racial:form.value.divine)
const arcaneValue=computed(()=>form.value.arcane+(['elf','zaharan'].includes(form.value.race)?form.value.racial:0))
const strongholds=computed(()=>{const options=[...(form.value.fighting?['Castle']:[]),...(form.value.thievery?['Hideout']:[]),...(divineValue.value>=2?['Fortified Church']:[]),...(divineValue.value>=3?['Cloister']:[]),...(arcaneValue.value>=2?['Sanctum']:[]),...(form.value.race==='dwarf'?['Dwarven Vault']:[]),...(form.value.race==='elf'&&form.value.fighting>=2?['Elven Fastness']:[])];return options.length?options:['None']})
const hasStrongholdPower=computed(()=>form.value.stronghold==='Castle'||['Dwarven Vault','Elven Fastness'].includes(form.value.stronghold)&&form.value.fighting&&!arcaneValue.value&&!divineValue.value)
const skillCost=computed(()=>form.value.thiefSkills.reduce((n:number,s:string)=>n+(s==='Backstabbing'?2:1),0))
const powerBudget=computed(()=>form.value.armorTrade+([0,1,3,4][originalWeapons.value]||0)-([0,1,3,4][originalWeapons.value-form.value.weaponTrade]||0)+form.value.styleTrade+(form.value.damageTrade==='both'?2:form.value.damageTrade==='none'?0:1)+form.value.thievery*4-skillCost.value+(form.value.tradeRebuking?divineValue.value:0))
const metadata=ref<any>({powerTrades:[],thiefSkills:[],halflingSkills:[]})
const spells=ref<{name:string;level:number;tradition:string}[]>([])
form.value.divineSpellList=[]
const divineListSize=computed(()=>[0,5,10,12,15][divineValue.value]||0)
function chooseDivine(level:number,event:Event){form.value.divineSpellList=[...form.value.divineSpellList.filter((s:any)=>s.level!==level),...Array.from((event.target as HTMLSelectElement).selectedOptions).map(option=>({name:option.value,level,tradition:'divine'}))]}
const choiceCost=(c:any)=>c.trade?(metadata.value.powerTrades.find((t:any)=>t.id===c.trade)?.cost||0):c.kind==='skill'&&c.name==='Backstabbing'?2:1
const usedPowers=computed(()=>[...form.value.powerSelections,...form.value.thiefSelections].reduce((n:number,c:any)=>n+choiceCost(c),0))
const proficienciesText=ref(''),titlesText=ref(''),general=ref<string[]>([]),busy=ref(false),saving=ref(false),ready=ref(false),error=ref(''),notice=ref(''),result=ref<any>(null)
const lines=(value:string)=>value.split('\n').map(s=>s.trim()).filter(Boolean)
const listWeight=computed(()=>lines(proficienciesText.value).reduce((n,p)=>n+(/^(Art|Craft|Performance|Profession)\s*\(/.test(p)?0.5:1),0))
let reviewed:any, revision=0
let dirty=false
onBeforeRouteLeave(()=>!dirty||window.confirm('Sair e descartar a construção desta classe?'))
async function run(fn:()=>Promise<void>){if(busy.value)return;busy.value=true;error.value='';notice.value='';try{await fn()}catch(e){error.value=errorMessage(e,'Não foi possível construir a classe.')}finally{busy.value=false;saving.value=false}}
async function preview(){await run(async()=>{result.value=null;const version=revision,campaign=props.campaignId;const payload={...JSON.parse(JSON.stringify(form.value)),powers:[],proficiencies:lines(proficienciesText.value),...(titlesText.value.trim()?{titles:lines(titlesText.value)}:{})};const response=await api.post(`/api/class-builder/${campaign}/preview`,payload);if(version===revision&&campaign===props.campaignId){reviewed=payload;result.value=response.data}})}
async function save(){if(!result.value||!reviewed)return;await run(async()=>{saving.value=true;const campaign=props.campaignId;const created=(await api.post(`/api/class-builder/${campaign}/create`,reviewed)).data;if(campaign===props.campaignId){result.value=null;reviewed=null;notice.value='Classe criada.';dirty=false;emit('created',created.id)}})}
watch([form,proficienciesText,titlesText],()=>{if(ready.value)dirty=true;revision++;result.value=null;reviewed=null},{deep:true,flush:'sync'})
watch(()=>props.campaignId,()=>{revision++;result.value=null;reviewed=null;notice.value='';error.value=''})
watch(()=>form.value.race,()=>{if(form.value.race==='human')form.value.racial=0;if(form.value.race!=='halfling')form.value.halflingSkills=[]})
watch(()=>form.value.fighting,()=>{if(form.value.fighting<2)form.value.damageTrade='none'})
watch(()=>form.value.startingProficiency,()=>{form.value.startingDescription=''})
watch(divineValue,value=>{if(!value)form.value.tradeRebuking=false})
async function loadMetadata(){await run(async()=>{const results=await Promise.allSettled([getResource('/api/game-rules/metadata'),getResource('/api/class-builder/metadata')]);const failed=results.find(r=>r.status==='rejected');if(failed?.status==='rejected')throw failed.reason;const data=(results[0] as PromiseFulfilledResult<any>).value.data;metadata.value=(results[1] as PromiseFulfilledResult<any>).value.data;general.value=data.generalProficiencies;spells.value=data.spells;if(!proficienciesText.value)proficienciesText.value=proficiencyOptions(data.classes.Fighter.proficiencies).join('\n');ready.value=true})}
onMounted(loadMetadata)
</script>
<style scoped>label .inp{display:block;width:100%;margin-top:.25rem}th,td{text-align:left;padding:.5rem;white-space:nowrap}tbody tr{border-top:1px solid var(--color-steel-dark)}</style>
