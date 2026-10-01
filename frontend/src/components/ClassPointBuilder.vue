<template>
  <details class="border border-gold/30 p-4 rounded-lg mb-5">
    <summary class="text-lg text-gold">Construir classe por pontos</summary>
    <p class="text-sm my-3">Calcula custos, limite racial, progressão, magia e trocas iniciais do Judge’s Journal. O mestre define os poderes, armas específicas e estilos disponíveis. Trocas de poderes por níveis futuros e variantes de magia usam o editor manual.</p>
    <p v-if="error" role="alert" class="text-red-400">{{ error }}</p><p v-if="notice" role="status" class="text-green-400">{{ notice }}</p>
    <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
      <label>Nome<input v-model="form.name" class="inp"/></label><label>Raça<select v-model="form.race" class="inp"><option value="human">Humano</option><option value="dwarf">Anão</option><option value="elf">Elfo</option><option value="nobiran">Nobirano</option><option value="zaharan">Zaharano</option></select></label>
      <label v-for="(label,key) in points" :key="key">{{ label }}<input v-model.number="form[key]" type="number" min="0" max="4" class="inp"/></label>
      <label>Fighting 1<select v-model="form.fightingVariant" class="inp"><option value="crusader">1a — Crusader</option><option value="thief">1b — Thief</option></select></label>
      <label>Reduções de armadura<input v-model.number="form.armorTrade" type="number" min="0" max="4" class="inp"/></label><label>Reduções de armas<input v-model.number="form.weaponTrade" type="number" min="0" max="3" class="inp"/></label><label>Estilos opcionais removidos<input v-model.number="form.styleTrade" type="number" min="0" max="3" class="inp"/></label>
      <label>Bônus de dano removido<select v-model="form.damageTrade" class="inp"><option value="none">Nenhum</option><option value="melee">Corpo a corpo</option><option value="missile">Projéteis</option><option value="both">Ambos</option></select></label>
      <label>Proficiência geral inicial<input v-model="form.startingProficiency" class="inp" list="builder-general"/><datalist id="builder-general"><option v-for="p in general" :key="p" :value="p"/></datalist></label>
      <label>Fortaleza<select v-model="form.stronghold" class="inp"><option v-for="s in strongholds" :key="s">{{ s }}</option></select></label>
    </div>
    <div class="flex flex-wrap gap-4 my-3"><label v-for="a in ['str','int','dex','wil','con','cha']" :key="a"><input v-model="form.keyAttributes" type="checkbox" :value="a"/> {{ a.toUpperCase() }} é atributo-chave</label><label><input v-model="form.smoothXp" type="checkbox"/> Arredondar XP do nível 7</label></div>
    <div class="grid md:grid-cols-3 gap-3"><label>Habilidades de ladrão (uma por linha)<textarea v-model="skillsText" rows="6" class="inp w-full" placeholder="Climbing&#10;Searching"/></label><label>Poderes das trocas (um por linha)<textarea v-model="powersText" rows="6" class="inp w-full"/></label><label>Lista de proficiências (uma escolha por linha)<textarea v-model="proficienciesText" rows="6" class="inp w-full"/></label></div>
    <p class="text-xs my-2">A lista soma 42 − nível máximo. Especializações de Art, Craft, Performance e Profession valem ½; separe as demais opções. Backstabbing custa duas habilidades. Poderes descritos aqui são referências para o mestre.</p>
    <button @click="preview" :disabled="busy" class="text-gold underline">Conferir construção</button>
    <div v-if="result" class="mt-4 space-y-3">
      <p>Salva como {{ result.summary.savingClass }} · máximo {{ result.summary.maxLevel }} · nível 2: {{ result.summary.xpSecond }} XP · {{ result.hitDie }} · {{ result.summary.powerBudget }} poderes de troca.</p>
      <p>Armas: {{ result.summary.weapons }} · armadura: {{ result.summary.armor }} · {{ result.summary.optionalStyles }} estilos opcionais · ferimentos mortais +{{ result.summary.mortalWoundsBonus }}.</p>
      <div class="overflow-auto"><table class="w-full text-sm"><thead><tr><th>Nível</th><th>XP</th><th>PV</th><th>Ataque</th><th>Magias/dia</th></tr></thead><tbody><tr v-for="(r,i) in result.creationRules.rules.levels" :key="r.level"><td>{{ r.level }}</td><td>{{ r.xp }}</td><td>{{ r.hitDice }}</td><td>{{ result.attackThrows[i] }}+</td><td>{{ r.spellSlots.join(' / ') }}</td></tr></tbody></table></div>
      <p class="text-xs">Salvar preserva a definição calculada. Para alterá-la depois, crie outra construção ou uma cópia no editor manual.</p>
      <button @click="save" :disabled="busy" class="px-4 py-2 bg-gold text-dark-bg rounded">Criar classe na campanha</button>
    </div>
  </details>
</template>
<script setup lang="ts">
import {ref,onMounted,watch} from 'vue'
import api from '../services/api'
import {errorMessage} from '../utils/catalog'
const props=defineProps<{campaignId:string}>(),emit=defineEmits<{created:[]}>()
const form=ref<any>({name:'',race:'human',racial:0,hd:2,fighting:2,thievery:0,divine:0,arcane:0,fightingVariant:'crusader',armorTrade:0,weaponTrade:0,styleTrade:0,damageTrade:'none',startingProficiency:'Manual of Arms',keyAttributes:['str'],stronghold:'Castle',smoothXp:true})
const points={hd:'Hit Dice',fighting:'Fighting',thievery:'Thievery',divine:'Divine',arcane:'Arcane',racial:'Valor racial'}
const strongholds=['Castle','Hideout','Fortified Church','Cloister','Sanctum','Dwarven Vault','Elven Fastness']
const skillsText=ref(''),powersText=ref(''),proficienciesText=ref(''),general=ref<string[]>([]),busy=ref(false),error=ref(''),notice=ref(''),result=ref<any>(null)
let reviewed:any
const lines=(text:string)=>text.split('\n').map(s=>s.trim()).filter(Boolean)
async function run(fn:()=>Promise<void>){if(busy.value)return;busy.value=true;error.value='';notice.value='';try{await fn()}catch(e){error.value=errorMessage(e,'Não foi possível construir a classe.')}finally{busy.value=false}}
async function preview(){await run(async()=>{reviewed={...JSON.parse(JSON.stringify(form.value)),thiefSkills:lines(skillsText.value),powers:lines(powersText.value),proficiencies:lines(proficienciesText.value)};result.value=(await api.post(`/api/class-builder/${props.campaignId}/preview`,reviewed)).data})}
async function save(){await run(async()=>{await api.post(`/api/class-builder/${props.campaignId}/create`,reviewed);result.value=null;notice.value='Classe criada.';emit('created')})}
watch([form,skillsText,powersText,proficienciesText],()=>result.value=null,{deep:true})
onMounted(async()=>{await run(async()=>{const data=(await api.get('/api/game-rules/metadata')).data;general.value=data.generalProficiencies;proficienciesText.value=data.classes.Fighter.proficiencies.flatMap((p:string)=>{const m=p.match(/^(.+?)\s*\(([^)]+)\)$/);return m&&m[2]!.includes(',')?m[2]!.split(',').map(s=>`${m[1]} (${s.trim()})`):[p]}).join('\n')})})
</script>
<style scoped>label .inp{display:block}th,td{text-align:left;padding:.4rem}</style>
