<template>
  <main class="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
    <router-link to="/dashboard" class="text-gold">← Meus personagens</router-link>
    <h1 class="text-3xl font-bold text-gold">Criar personagem</h1>
    <ol class="flex flex-wrap gap-3" aria-label="Etapas de criação"><li v-for="(label, i) in steps" :key="label" :aria-current="step === i ? 'step' : undefined" :class="step === i ? 'text-gold font-bold' : 'text-steel-light'">{{ i + 1 }}. {{ label }}</li></ol>
    <p class="mt-3 text-sm text-steel-light">Criação sem templates (Rulebook p. 13). As listas e quantidades são conferidas; o mestre define disponibilidade de equipamento, especializações e repertórios religiosos.</p>
    <label>Modo de criação<select v-model="draft.rulesMode" class="inp"><option value="standard">Regras do livro</option><option value="manual">Ajustes aprovados pelo mestre</option></select></label>
    <label v-if="draft.rulesMode === 'manual'" class="block">Decisão do mestre (obrigatória)<input v-model="draft.exceptionReason" class="inp" maxlength="1000" /></label>
    <div v-if="klass && !supportsStandard" class="rounded border border-gold/50 p-3 space-y-2" role="status">
      <p>A classe “{{ klass.name }}” da campanha é uma definição livre, sem regras automatizadas. Para usá-la, selecione ajustes aprovados pelo mestre e registre a decisão.</p>
      <button v-if="draft.rulesMode !== 'manual'" type="button" @click="draft.rulesMode = 'manual'; error = ''" class="text-gold underline">Usar ajustes aprovados pelo mestre</button>
      <p v-if="catalogAlternative">Existe também “{{ catalogAlternative.name }}” no catálogo base. Essa é outra definição de classe; confira com o mestre antes de trocar.</p>
      <button v-if="catalogAlternative" type="button" @click="draft.classKey = catalogAlternative.id; error = ''" class="text-gold underline">Selecionar {{ catalogAlternative.name }} do catálogo base</button>
    </div>
    <p v-if="loadingResources" role="status">Carregando regras e equipamentos...</p>
    <div v-if="resourceError" role="alert" class="text-red-400">{{ resourceError }} <button type="button" @click="loadResources" class="underline">Tentar carregar regras novamente</button></div>
    <p v-if="error" role="alert" class="text-red-400">{{ error }}</p>
    <form @submit.prevent="next" class="bg-dark-card border border-steel-dark rounded-xl p-4 md:p-6 space-y-5">
      <template v-if="step === 0">
        <h2 class="text-xl text-gold">Campanha e atributos</h2>
        <label class="block">Campanha<select v-model="draft.campaignId" class="inp mt-1"><option value="">Sem campanha</option><option v-for="c in campaigns" :key="c.id" :value="c.id">{{ c.name }}</option></select></label>
        <p class="text-sm text-steel-light">Informe os valores aprovados pelo mestre ou use a rolagem de 3d6, se esse método for permitido na sua mesa.</p>
        <p class="text-sm">Regra padrão: 5d6 (melhores 3, mínimo 13) no atributo principal; 4d6 (melhores 3, mínimo 9) em dois secundários; 3d6 nos demais.</p>
        <div class="grid md:grid-cols-3 gap-3"><label v-for="(_, i) in priorities" :key="i">{{ i === 0 ? 'Principal' : 'Secundário ' + i }}<select v-model="priorities[i]" class="inp"><option v-for="a in attributes" :key="a.key" :value="a.key">{{ a.label }}</option></select></label></div>
        <button type="button" @click="rollAttributes" class="text-gold underline">Rolar atributos pelo método padrão</button>
        <div class="grid grid-cols-2 md:grid-cols-3 gap-4"><label v-for="a in attributes" :key="a.key">{{ a.label }}<input v-model.number="draft[a.key]" type="number" min="3" max="18" required class="inp" /><span class="text-sm text-steel-light">Modificador {{ formatMod(getModifier(draft[a.key])) }}</span></label></div>
        <p v-if="rollLog" class="text-sm">{{ rollLog }}</p>
      </template>
      <template v-if="step === 1">
        <h2 class="text-xl text-gold">Escolha sua classe</h2>
        <p class="text-sm text-steel-light">As classes da campanha aparecem junto às bases. Confirme os requisitos de atributos e as regras opcionais com o mestre.</p>
        <p v-if="loadingClasses">Carregando catálogo...</p>
        <button v-if="!loadingClasses && !classes.length" type="button" @click="loadClasses" class="text-gold underline">Tentar carregar catálogo novamente</button>
        <label class="block">Classe<select v-model="draft.classKey" required class="inp"><option value="">Selecione</option><option v-for="c in classes" :key="c.id" :value="c.id">{{ c.name }} — {{ c.source === 'catalog' ? 'catálogo base' : creationSettings(c).rules ? 'campanha' : 'campanha · modo manual' }}</option></select></label>
        <template v-if="klass"><p>{{ klass.description }}</p><p>Dado de vida: {{ klass.hitDie }} · {{ klass.conBonus ? 'Aplica CON' : 'Sem bônus de CON' }} · XP para nível 2: {{ classRows(klass)[1]?.xp ?? 'nível máximo' }}</p><p v-if="klass.classFeatures" class="whitespace-pre-wrap text-sm">{{ klass.classFeatures }}</p></template>
        <router-link to="/classes" class="text-gold underline">Consultar catálogo completo</router-link>
        <p v-if="requirementErrors.length" role="alert" class="text-red-400">Requisitos pendentes: {{ requirementErrors.join(', ') }}</p>
      </template>
      <template v-if="step === 2">
        <h2 class="text-xl text-gold">Identidade e escolhas iniciais</h2>
        <div class="grid md:grid-cols-2 gap-4">
          <label>Nome<input v-model="draft.characterName" required maxlength="200" class="inp" /></label>
          <label>Terra natal<input v-model="draft.birthplace" maxlength="200" class="inp" /></label>
          <label>Alinhamento<select v-model="draft.alignment" class="inp"><option value="">A definir</option><option>Lawful</option><option>Neutral</option><option>Chaotic</option></select></label>
          <label>PV iniciais<input v-model.number="draft.hpMax" type="number" min="1" max="1000" required class="inp" /><button type="button" @click="rollHp" class="text-gold underline">Rolar dado da classe (mínimo 4) + CON</button></label>
          <label v-if="subclasses.length">Subclasse<select v-model="draft.subclass" class="inp"><option value="">A definir</option><option v-for="s in subclasses" :key="s">{{ s }}</option></select></label>
          <label>Idiomas<input v-model="draft.languagesKnown" maxlength="2000" class="inp" /></label>
        </div>
        <label class="flex gap-2"><input v-model="draft.isSpellcaster" type="checkbox" /> Este personagem usa magia</label>
        <p class="text-sm text-steel-light">Escolha as proficiências e magias iniciais. O modo do livro confere as listas e os limites; idiomas, especializações e repertórios religiosos devem ser conferidos com o mestre.</p>
        <h3 class="text-gold">Proficiências</h3>
        <p v-if="draft.rulesMode === 'standard'" class="text-sm">Adventuring e seus cinco testes serão incluídos automaticamente. Escolha ao menos 1 proficiência de classe e 1 geral. Limites: 1 de classe e {{ 1 + (klass?.rules?.bonusGeneral || 0) + Math.max(0, getModifier(draft.int)) }} gerais.</p>
        <p v-else class="text-sm">Adventuring e seus cinco testes serão incluídos automaticamente. Registre as proficiências aprovadas pelo mestre para esta classe.</p>
        <datalist id="creation-class-profs"><option v-for="name in proficiencyOptions(klass?.rules?.proficiencies || [])" :key="name" :value="name" /></datalist>
        <datalist id="creation-general-profs"><option v-for="name in proficiencyOptions(metadata.generalProficiencies || [])" :key="name" :value="name" /></datalist>
        <div v-for="(p, i) in draft.proficiencies" :key="i" class="flex flex-wrap gap-2"><input v-model="p.name" :list="p.category === 'class' ? 'creation-class-profs' : 'creation-general-profs'" aria-label="Nome da proficiência" required maxlength="200" class="inp flex-1" /><select v-model="p.category" aria-label="Categoria" class="inp flex-1"><option value="general">Geral</option><option value="class">Classe</option></select><button type="button" @click="draft.proficiencies.splice(i, 1)" class="text-red-400">Remover</button></div>
        <button type="button" @click="draft.proficiencies.push({ name: '', category: 'general' })" class="text-gold">+ Proficiência</button>
        <template v-if="draft.isSpellcaster">
          <h3 class="text-gold">Magias iniciais</h3><p class="text-sm">Escolha o repertório de estudo ou as magias concedidas pela ordem, conforme sua classe.</p>
          <div v-for="(s,i) in draft.spells" :key="i" class="flex gap-2"><select v-model="s.tradition" class="inp"><option value="arcane">Arcana</option><option value="divine">Divina</option></select><select v-model="s.name" class="inp"><option value="">Escolha</option><option v-for="spell in metadata.spells?.filter((e:any)=>e.level===1 && e.tradition===s.tradition) || []" :key="spell.name">{{ spell.name }}</option></select><button type="button" @click="draft.spells.splice(i,1)">Remover</button></div>
          <button type="button" class="text-gold" @click="draft.spells.push({name:'',level:1,tradition:klass?.rules?.magic?.includes('divine') ? 'divine' : 'arcane'})">+ Magia inicial</button>
        </template>
      </template>
      <template v-if="step === 3">
        <h2 class="text-xl text-gold">Equipamento inicial</h2>
        <label class="flex gap-2"><input v-model="useBudget" type="checkbox" /> Comprar com orçamento de 3d6 × 10 GP</label>
        <template v-if="useBudget">
          <label>Ouro inicial<input v-model.number="startingGold" class="inp" type="number" min="30" max="180" step="10" /></label><button type="button" class="text-gold underline" @click="startingGold = (rollDie(6)+rollDie(6)+rollDie(6))*10">Rolar ouro inicial</button>
          <p :class="budgetRemaining < 0 ? 'text-red-400' : ''">Saldo após compras: {{ budgetRemaining.toFixed(2) }} GP</p>
          <div v-for="(p,i) in draft.purchases" :key="i" class="flex flex-wrap gap-2"><select v-model="p.entryId" aria-label="Equipamento comprado" required class="inp min-w-0 flex-1"><option value="">Equipamento</option><option v-for="entry in equipment" :key="entry.id" :value="entry.id">{{ entry.name }} — {{ entry.costGp }} GP</option></select><input v-model.number="p.quantity" required class="inp w-24" type="number" min="1" max="100" aria-label="Quantidade comprada"/><button type="button" @click="draft.purchases.splice(i,1)">Remover</button></div>
          <button type="button" class="text-gold" @click="draft.purchases.push({entryId:'',quantity:1})">+ Comprar equipamento</button>
        </template>
        <p class="text-sm text-steel-light">Registre o equipamento recebido e o dinheiro restante após as compras. Aqui os itens entram no inventário; ataques e armadura equipada são configurados na ficha.</p>
        <label v-if="!useBudget" class="block">Moedas de ouro restantes<input v-model.number="draft.coinGP" type="number" min="0" max="2147483647" required class="inp" /></label>
        <div v-for="(item, i) in draft.items" :key="i" class="grid grid-cols-2 md:grid-cols-4 gap-2">
          <label>Item<input v-model="item.name" required maxlength="200" class="inp" /></label>
          <label>Quantidade<input v-model.number="item.quantity" required type="number" min="1" max="10000" class="inp" /></label>
          <label>Peso unitário (stone)<input v-model.number="item.weight" required type="number" min="0" max="10000" step="0.01" class="inp" /></label>
          <button type="button" @click="draft.items.splice(i, 1)" class="text-red-400">Remover</button>
        </div>
        <button type="button" @click="draft.items.push({ name: '', quantity: 1, weight: 0 })" class="text-gold">+ Item</button>
        <label class="block">Notas<textarea v-model="draft.notes" maxlength="10000" rows="3" class="inp" /></label>
      </template>
      <template v-if="step === 4">
        <h2 class="text-xl text-gold">Revisar personagem</h2>
        <p class="text-2xl">{{ draft.characterName }} · {{ klass?.name }} · Nível 1</p>
        <p>{{ campaigns.find(c => c.id === draft.campaignId)?.name || 'Sem campanha' }} · {{ draft.hpMax }} PV · {{ useBudget ? `${purchasesSummary.coins.gp} GP · ${purchasesSummary.coins.sp} SP · ${purchasesSummary.coins.cp} CP` : `${draft.coinGP} GP` }}</p>
        <p>Modo: {{ draft.rulesMode === 'standard' ? 'Regras do livro' : 'Ajustes aprovados pelo mestre' }}. Classe: {{ klass?.source === 'catalog' ? 'catálogo base' : 'campanha' }}.</p>
        <p v-if="draft.rulesMode === 'manual'">Decisão do mestre: {{ draft.exceptionReason }}</p>
        <dl class="grid grid-cols-3 gap-3"><div v-for="a in attributes" :key="a.key"><dt>{{ a.label }}</dt><dd class="text-gold">{{ draft[a.key] }} ({{ formatMod(getModifier(draft[a.key])) }})</dd></div></dl>
        <p>Idiomas: {{ draft.languagesKnown || 'A definir' }} · {{ draft.proficiencies.length }} proficiências · {{ draft.items.length }} registros de itens recebidos · {{ useBudget ? draft.purchases.length : 0 }} compras</p>
        <ul class="list-disc pl-5"><li v-for="(p,i) in draft.proficiencies" :key="`p${i}`">{{ p.name }} ({{ p.category }})</li><li v-for="(item,i) in draft.items" :key="`i${i}`">{{ item.quantity }} × {{ item.name }}</li></ul>
        <template v-if="useBudget"><p>Ouro inicial: {{ startingGold }} GP · Compras: {{ purchasesSummary.spentGp.toFixed(2) }} GP</p><ul class="list-disc pl-5"><li v-for="(purchase,i) in purchasesSummary.lines" :key="i">{{ purchase.quantity }} × {{ purchase.name }} — {{ purchase.costGp.toFixed(2) }} GP</li></ul></template>
        <p class="text-sm text-steel-light">A ficha será criada somente ao confirmar. Título, XP do próximo nível e salvamentos vêm da classe selecionada.</p>
      </template>
      <div class="flex justify-between pt-4 border-t border-steel-dark"><button type="button" :disabled="step === 0 || submitting" @click="step--" class="text-gold disabled:opacity-40">Voltar</button><button type="submit" :disabled="initializing || submitting || loadingClasses || loadingResources || !!resourceError" class="rounded bg-gold text-dark-bg font-bold px-5 py-2 disabled:opacity-40">{{ submitting ? 'Criando...' : step === 4 ? 'Confirmar e abrir ficha' : 'Continuar' }}</button></div>
    </form>
  </main>
</template>
<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router'
import api from '../services/api'
import { classRows, errorMessage, proficiencyOptions, type CatalogClass } from '../utils/catalog'
import { formatMod, getModifier } from '../utils/mechanics'
import { getClassFeats } from '../utils/classFeats'
import { creationSettings, purchaseSummary } from '../utils/creation'
const route = useRoute(), router = useRouter()
const steps = ['Atributos', 'Classe', 'Identidade', 'Equipamento', 'Revisão']
const attributes = [{ key: 'str', label: 'Força' }, { key: 'int', label: 'Intelecto' }, { key: 'dex', label: 'Destreza' }, { key: 'wil', label: 'Vontade' }, { key: 'con', label: 'Constituição' }, { key: 'cha', label: 'Carisma' }] as const
const draft = ref({ campaignId: String(route.query.campaignId || ''), classKey: String(route.query.classKey || ''),
  rulesMode:'standard', exceptionReason:'', purchases:[] as {entryId:string;quantity:number}[], spells:[] as {name:string;level:number;tradition:string}[],
  characterName: '', birthplace: '', alignment: '', subclass: '', languagesKnown: '', notes: '',
  str: 10, int: 10, dex: 10, wil: 10, con: 10, cha: 10, hpMax: 1, coinGP: 0, isSpellcaster: false,
  proficiencies: [] as { name: string; category: string }[], items: [] as { name: string; quantity: number; weight: number }[],
})
const step = ref(0), error = ref(''), rollLog = ref(''), submitting = ref(false), loadingClasses = ref(false)
const metadata = ref<any>({}), equipment = ref<any[]>([]), useBudget = ref(false), startingGold = ref(100)
const loadingResources = ref(true), resourceError = ref('')
const initializing = ref(true)
const purchasesSummary = computed(() => purchaseSummary(startingGold.value, draft.value.purchases, equipment.value))
const budgetRemaining = computed(() => purchasesSummary.value.remainingGp)
function rollDie(sides:number) { const values=new Uint32Array(1), ceiling=Math.floor(4294967296/sides)*sides; do {crypto.getRandomValues(values)} while(values[0]!>=ceiling);return values[0]!%sides+1 }
const campaigns = ref<{ id: string; name: string }[]>([]), classes = ref<CatalogClass[]>([])
const klass = computed(() => classes.value.find(c => c.id === draft.value.classKey))
const priorities = ref(['str', 'dex', 'con'])
const chosenRules = computed(() => creationSettings(klass.value))
const supportsStandard = computed(() => !!chosenRules.value.rules)
const catalogAlternative = computed(() => classes.value.find(c => c.source === 'catalog' && c.name === klass.value?.name))
const requirementErrors = computed(() => {
  const minimums: Record<string, number> = { ...chosenRules.value?.minimumAttributes }
  for (const key of chosenRules.value?.keyAttributes ?? []) minimums[key] = Math.max(9, minimums[key] ?? 3)
  return Object.entries(minimums).filter(([k,v]) => Number((draft.value as any)[k]) < v).map(([k,v]) => `${k.toUpperCase()} ≥ ${v}`)
})
const subclasses = computed(() => getClassFeats(klass.value?.name || '', 1).availableSubclasses || [])
let loaded = false, dirty = false, created = false, sequence = 0
watch(draft, () => { if (loaded) dirty = true }, { deep: true })
watch(() => draft.value.campaignId, () => { draft.value.classKey = ''; void loadClasses() })
watch(klass, (value) => {
  draft.value.subclass = ''
  draft.value.isSpellcaster = chosenRules.value?.spellcaster ?? false
  if (value) draft.value.hpMax = Math.max(1, 4 + (value.conBonus ? getModifier(draft.value.con) : 0)) + Number(value.rules?.levels[0]?.hitDice.match(/\+(\d+)/)?.[1] || 0)
})
async function loadClasses() {
  const id = ++sequence
  loadingClasses.value = true; error.value = ''
  try {
    const res = await api.get('/api/classes/catalog', { params: { campaignId: draft.value.campaignId || undefined } })
    if (id === sequence) { classes.value = res.data; if (!klass.value) draft.value.classKey = '' }
  } catch(e) { if (id === sequence) { classes.value = []; error.value = errorMessage(e, 'Não foi possível carregar classes.') } }
  finally { if (id === sequence) loadingClasses.value = false }
}
function rollAttributes() {
  if (new Set(priorities.value).size !== 3) { error.value = 'Escolha três atributos diferentes.'; return }
  error.value = ''
  const d6 = () => { const v = new Uint32Array(1); do { crypto.getRandomValues(v) } while (v[0]! >= 4294967292); return v[0]! % 6 + 1 }
  rollLog.value = attributes.map(a => {
    const priority = priorities.value.indexOf(a.key)
    const count = priority === 0 ? 5 : priority > 0 ? 4 : 3
    const dice = Array.from({ length: count }, d6)
    const sum = [...dice].sort((a,b) => b-a).slice(0,3).reduce((a,b) => a+b, 0)
    draft.value[a.key] = Math.max(priority === 0 ? 13 : priority > 0 ? 9 : 3, sum)
    return `${a.label}: ${dice.join(', ')} → ${draft.value[a.key]}`
  }).join(' · ')
}
function rollHp() {
  if (!klass.value) return
  const sides = Number(klass.value.hitDie.slice(2))
  const values = new Uint32Array(1)
  const ceiling = Math.floor(4294967296 / sides) * sides
  do { crypto.getRandomValues(values) } while (values[0]! >= ceiling)
  draft.value.hpMax = Math.max(1, Math.max(4, values[0]! % sides + 1) + (klass.value.conBonus ? getModifier(draft.value.con) : 0)) + Number(klass.value.rules?.levels[0]?.hitDice.match(/\+(\d+)/)?.[1] || 0)
}
async function next() {
  if (initializing.value || submitting.value || loadingClasses.value || loadingResources.value || resourceError.value) return
  error.value = ''
  if (step.value >= 1 && !klass.value) { error.value = 'Escolha uma classe disponível.'; step.value = 1; return }
  if (step.value >= 1 && draft.value.rulesMode === 'standard' && !supportsStandard.value) {
    error.value = 'Esta classe da campanha exige modo manual e a decisão do mestre, ou a escolha de outra classe com regras automatizadas.'; step.value = 1; return
  }
  if (step.value >= 1 && draft.value.rulesMode === 'manual' && !draft.value.exceptionReason.trim()) {
    error.value = 'Registre a decisão do mestre antes de continuar no modo manual.'; return
  }
  if (step.value >= 1 && requirementErrors.value.length) { error.value = `Requisitos: ${requirementErrors.value.join(', ')}`; return }
  if (step.value >= 2 && draft.value.rulesMode === 'standard') {
    const missing = ['class', 'general'].filter(category => !draft.value.proficiencies.some(p => p.category === category && p.name.trim()))
    if (missing.length) { error.value = `Escolha ao menos uma proficiência ${missing.map(c => c === 'class' ? 'de classe' : 'geral').join(' e ')}.`; step.value = 2; return }
    const con = klass.value!.conBonus ? getModifier(draft.value.con) : 0
    const racial = Number(chosenRules.value.rules?.levels[0]?.hitDice.match(/\+(\d+)/)?.[1] || 0)
    const min = Math.max(1, 4 + con) + racial, max = Number(klass.value!.hitDie.slice(2)) + con + racial
    if (draft.value.hpMax < min || draft.value.hpMax > max) { error.value = `PV iniciais devem estar entre ${min} e ${max} para esta classe.`; step.value = 2; return }
  }
  if (step.value >= 3 && useBudget.value) {
    if (!Number.isInteger(startingGold.value) || startingGold.value < 30 || startingGold.value > 180 || startingGold.value % 10) {
      error.value = 'O ouro inicial deve ser múltiplo de 10, entre 30 e 180 GP.'; step.value = 3; return
    }
    if (!purchasesSummary.value.valid) { error.value = 'Selecione o equipamento e uma quantidade inteira de 1 a 100 em cada compra.'; step.value = 3; return }
    if (budgetRemaining.value < 0) { error.value = `As compras excedem o ouro inicial em ${(-budgetRemaining.value).toFixed(2)} GP. Revise as compras ou o orçamento aprovado.`; step.value = 3; return }
  }
  if (step.value < 4) { step.value++; return }
  if (!klass.value || !draft.value.characterName.trim()) { error.value = 'Preencha nome e classe antes de confirmar.'; return }
  submitting.value = true
  try {
    const res = await api.post('/api/characters/guided', { ...draft.value, purchases:useBudget.value ? draft.value.purchases : [], ...(useBudget.value ? {startingGoldGp:startingGold.value}:{}), campaignId: draft.value.campaignId || null })
    created = true
    await router.push(`/character/${res.data.character.id}`)
  } catch (e) { error.value = errorMessage(e, 'Não foi possível criar a ficha. Suas escolhas foram preservadas.') }
  finally { submitting.value = false }
}
onBeforeRouteLeave(() => created || !dirty || window.confirm('Sair e descartar as escolhas deste personagem?'))
async function loadResources() {
  loadingResources.value = true; resourceError.value = ''
  try {
    const [rules, items, weapons] = await Promise.all([
      api.get('/api/game-rules/metadata'),
      api.get('/api/compendium/search', { params: { type: 'item', limit: 500 } }),
      api.get('/api/compendium/search', { params: { type: 'weapon', limit: 500 } }),
    ])
    metadata.value = rules.data; equipment.value = [...weapons.data.entries, ...items.data.entries]
  } catch (e) { resourceError.value = errorMessage(e, 'Não foi possível carregar as regras e os equipamentos.') }
  finally { loadingResources.value = false }
}
onMounted(async () => {
  await loadResources()
  try { campaigns.value = (await api.get('/api/campaigns')).data }
  catch(e) { error.value = errorMessage(e, 'Não foi possível carregar campanhas.') }
  await loadClasses(); loaded = true; initializing.value = false
})
</script>
