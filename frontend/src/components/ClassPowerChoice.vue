<template>
  <div class="rounded-lg border border-steel-dark p-3 space-y-2">
    <label class="block text-sm">Aquisição no nível {{ level }}
      <select :value="modelValue.trade || ''" :aria-label="`Aquisição no nível ${level}`" @change="setTrade(($event.target as HTMLSelectElement).value)" class="inp mt-1">
        <option value="">Poder neste nível</option>
        <option v-for="trade in availableTrades" :key="trade.id" :value="trade.id">Trocar {{ trade.cost }} escolha(s) por níveis {{ trade.levels.join(', ') }}</option>
      </select>
    </label>
    <template v-if="!modelValue.trade">
      <label v-if="allowSkills" class="block text-sm">Tipo<select v-model="modelValue.kind" class="inp"><option value="power">Poder de classe</option><option value="skill">Habilidade de ladrão</option></select></label>
      <label class="block text-sm">Nome do poder<input v-model="modelValue.name" :list="modelValue.kind === 'skill' ? 'builder-skills' : undefined" class="inp"/></label>
      <label class="block text-sm">Descrição do poder<textarea v-model="modelValue.description" rows="2" maxlength="4000" class="inp" placeholder="Efeito, condições e teste aplicável"/></label>
    </template>
    <div v-else class="space-y-2 pl-2 border-l border-gold/30">
      <ClassPowerChoice v-for="(child,i) in modelValue.children" :key="i" :model-value="child" :level="selectedTrade!.levels[i]!" :trades="trades" :allow-skills="allowSkills" @update:model-value="modelValue.children![i] = $event"/>
    </div>
  </div>
</template>
<script setup lang="ts">
import { computed } from 'vue'
type Choice={name?:string;description?:string;kind?:'power'|'skill';trade?:string;children?:Choice[]}
type Trade={id:string;from:number;cost:number;levels:number[]}
const props=defineProps<{modelValue:Choice;level:number;trades:Trade[];allowSkills?:boolean}>()
const emit=defineEmits<{ 'update:modelValue':[Choice] }>()
const availableTrades=computed(()=>props.trades.filter(t=>t.from===props.level&&(props.level===1||t.cost===1)))
const selectedTrade=computed(()=>props.trades.find(t=>t.id===props.modelValue.trade))
function setTrade(id:string){
  const trade=props.trades.find(t=>t.id===id)
  emit('update:modelValue',trade?{trade:id,children:trade.levels.map(()=>({name:'',description:'',kind:'power'}))}:{name:'',description:'',kind:'power'})
}
</script>
