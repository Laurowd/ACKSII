<template>
  <main class="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
    <router-link to="/dashboard" class="text-gold">← Meus personagens</router-link>
    <h1 class="text-3xl font-bold text-gold">Criar personagem</h1>
    <div v-if="recovery" role="status" class="rounded-xl border border-gold/30 bg-dark-card p-4 space-y-2">
      <p>Há escolhas de criação guardadas neste navegador ({{ new Date(recovery.savedAt).toLocaleString('pt-BR') }}).</p>
      <div class="flex flex-wrap gap-4"><button type="button" @click="restoreCreation" :disabled="initializing || loadingClasses" class="text-gold underline disabled:opacity-40">Recuperar criação</button><button type="button" @click="discardCreation" class="text-steel-light underline">Descartar rascunho</button></div>
    </div>
    <p v-if="storageWarning" role="alert" class="text-gold">O navegador não conseguiu guardar o rascunho. Mantenha esta página aberta até concluir a criação.</p>
    <ol class="flex flex-wrap gap-3" aria-label="Etapas de criação"><li v-for="(label, i) in steps" :key="label" :aria-current="step === i ? 'step' : undefined" :class="step === i ? 'text-gold font-bold' : 'text-steel-light'">{{ i + 1 }}. {{ label }}</li></ol>
    <p class="mt-3 text-sm text-steel-light">Criação sem templates (Rulebook p. 13). As listas e quantidades são conferidas; o mestre define disponibilidade de equipamento, especializações e repertórios religiosos.</p>
    <label>Modo de criação<select v-model="draft.rulesMode" :disabled="submitting" class="inp"><option value="standard">Regras do livro</option><option value="manual">Ajustes aprovados pelo mestre</option></select></label>
    <label v-if="draft.rulesMode === 'manual'" class="block">Decisão do mestre (obrigatória)<input v-model="draft.exceptionReason" :disabled="submitting" class="inp" maxlength="1000" /></label>
    <div v-if="klass && !supportsStandard" class="rounded border border-gold/50 p-3 space-y-2" role="status">
      <p>A classe “{{ klass.name }}” da campanha é uma definição livre, sem regras automatizadas. Para usá-la, selecione ajustes aprovados pelo mestre e registre a decisão.</p>
      <button v-if="draft.rulesMode !== 'manual'" type="button" @click="draft.rulesMode = 'manual'; error = ''" class="text-gold underline">Usar ajustes aprovados pelo mestre</button>
      <p v-if="catalogAlternative">Existe também “{{ catalogAlternative.name }}” no catálogo base. Essa é outra definição de classe; confira com o mestre antes de trocar.</p>
      <button v-if="catalogAlternative" type="button" @click="draft.classKey = catalogAlternative.id; error = ''" class="text-gold underline">Selecionar {{ catalogAlternative.name }} do catálogo base</button>
    </div>
    <p v-if="loadingResources" role="status">Carregando regras e equipamentos...</p>
    <div v-if="resourceError" role="alert" class="text-red-400">{{ resourceError }} <button type="button" @click="loadResources" class="underline">Tentar carregar regras novamente</button></div>
    <p v-if="error" ref="errorAlert" role="alert" tabindex="-1" class="text-red-400">{{ error }}</p>
    <form @submit.prevent="next" class="bg-dark-card border border-steel-dark rounded-xl p-4 md:p-6 space-y-5">
      <fieldset :disabled="submitting" class="min-w-0 space-y-5">
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
          <label v-if="subclasses.length && !chosenRules.rules?.classChoices?.some((choice:any) => choice.id === 'tradition')">Subclasse<select v-model="draft.subclass" class="inp"><option value="">A definir</option><option v-for="s in subclasses" :key="s">{{ s }}</option></select></label>
          <label>Idiomas<input v-model="draft.languagesKnown" maxlength="2000" class="inp" /></label>
        </div>
        <label class="flex gap-2"><input v-model="draft.isSpellcaster" type="checkbox" :disabled="draft.rulesMode === 'standard'" /> Este personagem usa magia</label>
        <p v-if="draft.rulesMode === 'standard'" class="text-sm text-steel-light">O uso de magia é definido pela classe. {{ availableMagic.length ? 'As tradições disponíveis neste nível aparecem abaixo.' : 'Esta classe não possui magias disponíveis no nível 1.' }}</p>
        <p class="text-sm text-steel-light">Escolha as proficiências e magias iniciais. O modo do livro confere as listas e os limites; idiomas, especializações e repertórios religiosos devem ser conferidos com o mestre.</p>
        <section v-if="proficiencyOrigins.length" class="rounded-xl border border-gold/30 p-4 space-y-2" aria-labelledby="creation-origin-title">
          <h3 id="creation-origin-title" class="text-gold">Proficiências naturais do bárbaro</h3>
          <label class="block">Origem do bárbaro<select v-model="draft.proficiencyOrigin" @change="changeOrigin" aria-label="Origem do bárbaro" :aria-required="draft.rulesMode === 'standard'" class="inp mt-1"><option value="">Selecione a origem</option><option v-for="origin in proficiencyOrigins" :key="origin.key" :value="origin.key">{{ origin.label }}</option></select></label>
          <p class="text-sm text-steel-light">Origem cultural, independente da cidade natal. As duas proficiências são concedidas pela classe e não gastam escolhas (Rulebook p. 49).</p>
          <p v-if="automaticNotice" role="status" class="text-sm text-gold">{{ automaticNotice }}</p>
        </section>
        <ClassChoicesForm v-model="draft.classChoices" :rules="chosenRules.rules" :character="{...draft, level:1}" :can-approve="canApproveChoices" :show-errors="choicesReviewed" />
        <h3 class="text-gold">Proficiências</h3>
        <p v-if="draft.rulesMode === 'standard'" class="text-sm">Adventuring e seus cinco testes serão incluídos automaticamente. Escolha ao menos 1 proficiência de classe e 1 geral. Limites: {{ proficiencyCheck.limits.class }} de classe e {{ proficiencyCheck.limits.general }} gerais.</p>
        <p v-else class="text-sm">Adventuring e seus cinco testes serão incluídos automaticamente. Registre as proficiências aprovadas pelo mestre para esta classe.</p>
        <div class="rounded-lg border border-steel-dark p-3 text-sm space-y-1" role="region" aria-label="Proficiências concedidas automaticamente">
          <p class="font-semibold text-gold">Concedidas automaticamente · sem gastar escolhas</p>
          <p>Adventuring · todos os personagens</p>
          <p v-for="(grant,i) in naturalGrants" :key="`${grant.name}:${i}`">{{ grant.name }} · {{ grant.source }}<span v-if="grant.ranks > 1"> · {{ grant.ranks }} graduações</span><span v-if="grant.conditional"> · benefício condicionado ao totem</span></p>
        </div>
        <div v-for="(p, i) in draft.proficiencies" :key="i" class="space-y-1">
          <div class="grid items-start grid-cols-[minmax(0,1fr)_auto] sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] gap-2">
            <SearchableChoice v-model="p.name" @change="choicesReviewed = true" :options="paidProficiencyOptions(p.category)" label="Nome da proficiência" :aria-invalid="choicesReviewed && !!proficiencyCheck.rows[i]" :aria-describedby="`creation-prof-error-${i}`" required maxlength="200" class="col-span-2 sm:col-span-1" />
            <select v-model="p.category" @change="choicesReviewed = true" aria-label="Categoria" class="inp min-w-0"><option value="general">Geral</option><option value="class">Classe</option></select>
            <button type="button" @click="draft.proficiencies.splice(i, 1)" :aria-label="`Remover proficiência ${i + 1}`" class="text-red-400">Remover</button>
          </div>
          <p :id="`creation-prof-error-${i}`" v-if="choicesReviewed && proficiencyCheck.rows[i]" class="text-sm text-red-400">{{ proficiencyCheck.rows[i] }}</p>
        </div>
        <button type="button" @click="draft.proficiencies.push({ name: '', category: 'general' })" class="text-gold">+ Proficiência</button>
        <template v-if="draft.isSpellcaster || draft.spells.length">
          <h3 class="text-gold">Magias iniciais</h3><p class="text-sm">Escolha o repertório de estudo ou as magias concedidas pela ordem, conforme sua classe.</p>
          <p v-for="pool in availableMagic" :key="pool.tradition" class="text-sm text-steel-light">{{ traditionName(pool.tradition) }} · nível 1 · {{ pool.repertoire[0] == null ? 'repertório definido pela ordem' : `limite de ${pool.repertoire[0]} magias` }}{{ pool.studious ? ' · escolha ao menos uma magia inicial' : '' }}</p>
          <div v-for="(s,i) in draft.spells" :key="i" class="space-y-1">
            <div class="grid items-start grid-cols-[minmax(0,1fr)_auto] sm:grid-cols-[8rem_minmax(0,1fr)_auto] gap-2">
              <select v-model="s.tradition" @change="s.name = ''; choicesReviewed = true" :aria-label="`Tradição da magia inicial ${i + 1}`" class="inp min-w-0 col-span-2 sm:col-span-1">
                <option v-if="draft.rulesMode === 'standard' && !availableMagic.some(p => p.tradition === s.tradition)" :value="s.tradition">{{ traditionName(s.tradition) }} · indisponível</option>
                <option v-for="tradition in draft.rulesMode === 'manual' ? ['arcane', 'divine'] : availableMagic.map(p => p.tradition)" :key="tradition" :value="tradition">{{ traditionName(tradition) }}</option>
              </select>
              <SearchableChoice v-model="s.name" @change="choicesReviewed = true" :options="initialSpellOptions(s.tradition).map((spell: any) => ({ value: spell.name, hint: spell.campaignSpellId ? 'Magia de campanha' : 'Catálogo do livro' }))" :label="`Nome da magia inicial ${i + 1}`" :disabled="loadingCampaignSpells" :aria-invalid="choicesReviewed && !!spellCheck.rows[i]" :aria-describedby="`creation-spell-error-${i}`" required maxlength="200" />
              <button type="button" @click="draft.spells.splice(i,1)" :aria-label="`Remover magia inicial ${i + 1}`" class="text-red-400">Remover</button>
            </div>
            <p :id="`creation-spell-error-${i}`" v-if="choicesReviewed && spellCheck.rows[i]" class="text-sm text-red-400">{{ spellCheck.rows[i] }}</p>
          </div>
          <datalist v-for="tradition in ['arcane', 'divine']" :key="tradition" :id="`creation-spells-${tradition}`"><option v-for="spell in initialSpellOptions(tradition)" :key="spell.name" :value="spell.name" /></datalist>
          <button type="button" class="text-gold disabled:opacity-40" :disabled="draft.rulesMode === 'standard' && !availableMagic.length" @click="draft.spells.push({name:'',level:1,tradition:availableMagic[0]?.tradition || 'arcane'})">+ Magia inicial</button>
          <p v-if="loadingCampaignSpells" role="status" class="text-sm text-steel-light">Carregando magias disponíveis na campanha...</p>
          <p v-if="campaignSpellError" role="alert" class="text-sm text-red-400">{{ campaignSpellError }} <button type="button" @click="loadCampaignSpells" class="underline">Tentar carregar magias novamente</button></p>
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
        <p>Idiomas: {{ draft.languagesKnown || 'A definir' }} · {{ draft.proficiencies.length }} escolhas de proficiência · Adventuring{{ naturalGrants.length ? ` e ${naturalGrants.length} proficiências naturais gratuitas` : ' automática' }} · {{ draft.items.length }} registros de itens recebidos · {{ useBudget ? draft.purchases.length : 0 }} compras</p>
        <p v-if="selectedOrigin">Origem do bárbaro: {{ selectedOrigin.label }} · {{ naturalGrants.map(grant => grant.name).join(', ') }} (concedidas)</p>
        <ul v-if="classChoiceSummary.length" class="list-disc pl-5"><li v-for="choice in classChoiceSummary" :key="choice">{{ choice }}</li></ul>
        <ul class="list-disc pl-5"><li v-for="(p,i) in draft.proficiencies" :key="`p${i}`">{{ p.name }} ({{ p.category === 'class' ? 'classe' : 'geral' }})</li><li v-for="(grant,i) in naturalGrants" :key="`g${i}`">{{ grant.name }} (gratuita{{ grant.ranks > 1 ? ` · ${grant.ranks} graduações` : '' }})</li><li v-for="(item,i) in draft.items" :key="`i${i}`">{{ item.quantity }} × {{ item.name }}</li></ul>
        <p>Magias iniciais: {{ draft.spells.length }}.</p><ul v-if="draft.spells.length" class="list-disc pl-5"><li v-for="(spell, i) in draft.spells" :key="i">{{ spell.name }} · {{ traditionName(spell.tradition) }} · nível {{ spell.level }}</li></ul>
        <template v-if="useBudget"><p>Ouro inicial: {{ startingGold }} GP · Compras: {{ purchasesSummary.spentGp.toFixed(2) }} GP</p><ul class="list-disc pl-5"><li v-for="(purchase,i) in purchasesSummary.lines" :key="i">{{ purchase.quantity }} × {{ purchase.name }} — {{ purchase.costGp.toFixed(2) }} GP</li></ul></template>
        <p class="text-sm text-steel-light">A ficha será criada somente ao confirmar. Título, XP do próximo nível e salvamentos vêm da classe selecionada.</p>
      </template>
      <div class="flex justify-between pt-4 border-t border-steel-dark"><button type="button" :disabled="step === 0 || submitting" @click="step--" class="text-gold disabled:opacity-40">Voltar</button><button type="submit" :disabled="initializing || submitting || loadingClasses || loadingResources || !!resourceError" class="rounded bg-gold text-dark-bg font-bold px-5 py-2 disabled:opacity-40">{{ submitting ? 'Criando...' : step === 4 ? 'Confirmar e abrir ficha' : 'Continuar' }}</button></div>
      </fieldset>
    </form>
  </main>
</template>
<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { onBeforeRouteLeave, onBeforeRouteUpdate, useRoute, useRouter } from 'vue-router'
import api from '../services/api'
import { getResource } from '../services/resources'
import { classRows, errorMessage, proficiencyOptions, type CatalogClass } from '../utils/catalog'
import { formatMod, getModifier } from '../utils/mechanics'
import { getClassFeats } from '../utils/classFeats'
import { creationSettings, purchaseSummary, absorbAutomaticProficiencies } from '../utils/creation'
import { choiceMagicPools, proficiencyValidation, spellValidation, traditionName } from '../utils/ruleChoices'
import { useAuthStore } from '../stores/auth'
import { createLocalDraft } from '../utils/localDrafts'
import SearchableChoice from '../components/SearchableChoice.vue'
import ClassChoicesForm from '../components/ClassChoicesForm.vue'
import { classGrants, classChoiceIssues, relevantChoices, choiceOptions, type ClassSelections } from '../../../backend/src/lib/classAbilities'
const route = useRoute(), router = useRouter()
const steps = ['Atributos', 'Classe', 'Identidade', 'Equipamento', 'Revisão']
const attributes = [{ key: 'str', label: 'Força' }, { key: 'int', label: 'Intelecto' }, { key: 'dex', label: 'Destreza' }, { key: 'wil', label: 'Vontade' }, { key: 'con', label: 'Constituição' }, { key: 'cha', label: 'Carisma' }] as const
const draft = ref({ campaignId: String(route.query.campaignId || ''), classKey: String(route.query.classKey || ''),
  rulesMode:'standard', exceptionReason:'', purchases:[] as {entryId:string;quantity:number}[], spells:[] as {name:string;level:number;tradition:string}[],
  characterName: '', birthplace: '', alignment: '', subclass: '', languagesKnown: '', notes: '', proficiencyOrigin: '', classChoices: {} as ClassSelections,
  str: 10, int: 10, dex: 10, wil: 10, con: 10, cha: 10, hpMax: 1, coinGP: 0, isSpellcaster: false,
  proficiencies: [] as { name: string; category: string }[], items: [] as { name: string; quantity: number; weight: number }[],
})
const step = ref(0), error = ref(''), rollLog = ref(''), submitting = ref(false), loadingClasses = ref(false)
const errorAlert = ref<HTMLElement | null>(null)
watch(error, async value => { if (value) { await nextTick(); errorAlert.value?.focus() } })
const metadata = ref<any>({}), equipment = ref<any[]>([]), useBudget = ref(false), startingGold = ref(100)
const campaignSpells = ref<any[]>([]), loadingCampaignSpells = ref(false), campaignSpellError = ref('')
const spellCatalog = computed(() => [...(metadata.value.spells || []), ...campaignSpells.value])
let campaignSpellRequest = 0
async function loadCampaignSpells() {
  const request = ++campaignSpellRequest, id = draft.value.campaignId
  campaignSpells.value = []; campaignSpellError.value = ''; loadingCampaignSpells.value = !!id
  if (!id) return
  try { const response = await api.get(`/api/campaigns/${id}/spell-options`); if (request === campaignSpellRequest) campaignSpells.value = response.data.spells }
  catch (caught) { if (request === campaignSpellRequest) campaignSpellError.value = errorMessage(caught, 'Não foi possível carregar as magias de campanha.') }
  finally { if (request === campaignSpellRequest) loadingCampaignSpells.value = false }
}
watch(() => draft.value.campaignId, loadCampaignSpells, { immediate: true })
const loadingResources = ref(true), resourceError = ref('')
const initializing = ref(true)
const purchasesSummary = computed(() => purchaseSummary(startingGold.value, draft.value.purchases, equipment.value))
const budgetRemaining = computed(() => purchasesSummary.value.remainingGp)
function rollDie(sides:number) { const values=new Uint32Array(1), ceiling=Math.floor(4294967296/sides)*sides; do {crypto.getRandomValues(values)} while(values[0]!>=ceiling);return values[0]!%sides+1 }
const campaigns = ref<{ id: string; name: string; masterId?: string }[]>([]), classes = ref<CatalogClass[]>([])
const canApproveChoices = computed(() => useAuthStore().isMaster && (!draft.value.campaignId || campaigns.value.some(campaign => campaign.id === draft.value.campaignId && campaign.masterId === useAuthStore().user?.id)))
const klass = computed(() => classes.value.find(c => c.id === draft.value.classKey || c.legacyIds?.includes(draft.value.classKey)))
const priorities = ref(['str', 'dex', 'con'])
const chosenRules = computed(() => creationSettings(klass.value))
const proficiencyOrigins = computed<{ key: string; label: string; proficiencies: string[] }[]>(() => chosenRules.value.rules?.proficiencyOrigins || [])
const selectedOrigin = computed(() => proficiencyOrigins.value.find(origin => origin.key === draft.value.proficiencyOrigin))
const naturalGrants = computed(() => classGrants(chosenRules.value.rules || {}, {...draft.value,level:1}))
const classChoiceSummary = computed(() => relevantChoices(chosenRules.value.rules || {}, draft.value).filter(choice => draft.value.classChoices[choice.id]).map(choice => `${choice.label}: ${choiceOptions(choice,draft.value).find(option => option.key === draft.value.classChoices[choice.id])?.label || draft.value.classChoices[choice.id]}`))
const automaticNotice = ref('')
function changeOrigin() {
  const previous = draft.value.proficiencies.length
  draft.value.proficiencies = absorbAutomaticProficiencies(draft.value.proficiencies, naturalGrants.value)
  automaticNotice.value = previous > draft.value.proficiencies.length ? 'As entradas já concedidas foram movidas para o grupo automático. Suas escolhas restantes foram preservadas.' : ''
  choicesReviewed.value = true; error.value = ''
}
function paidProficiencyOptions(category: string) {
  const single = ['Climbing','Riding','Running','Endurance','Expanded Repertoire','Combat Reflexes','Combat Ferocity','Ambushing','Alertness']
  return proficiencyOptions(category === 'class' ? chosenRules.value.rules?.proficiencies || [] : metadata.value.generalProficiencies || []).filter(name => name !== 'Adventuring' && !(single.includes(name) && naturalGrants.value.some(grant => grant.name === name && !grant.conditional)))
}
const choicesReviewed = ref(false)
type CreationDraft = { draft: typeof draft.value; step: number; useBudget: boolean; startingGold: number; priorities: string[]; rollLog: string }
const localDraft = createLocalDraft<CreationDraft>(useAuthStore().user?.id || '', `creation:${String(route.query.campaignId || '')}:${String(route.query.classKey || '')}`)
const recovery = ref(localDraft.read())
const storageWarning = ref(false)
let restoring = false
function persistCreation() {
  if (!loaded || created || recovery.value || !dirty) return
  storageWarning.value = !localDraft.write({ draft: JSON.parse(JSON.stringify(draft.value)), step: step.value, useBudget: useBudget.value, startingGold: startingGold.value, priorities: priorities.value, rollLog: rollLog.value })
}
function discardCreation() { recovery.value = null; localDraft.remove(); persistCreation() }
async function restoreCreation() {
  const saved = recovery.value?.data
  if (!saved || !saved.draft || !['proficiencies', 'items', 'spells', 'purchases'].every(key => Array.isArray((saved.draft as any)[key]))) { discardCreation(); return }
  restoring = true
  try {
    const copy = saved.draft
    draft.value.campaignId = campaigns.value.some(c => c.id === copy.campaignId) ? copy.campaignId : ''
    await nextTick(); await loadClasses()
    for (const key of Object.keys(draft.value)) if (key !== 'campaignId' && key in copy) (draft.value as any)[key] = (copy as any)[key]
    if (!klass.value) { draft.value.classKey = ''; error.value = 'A classe guardada não está disponível. Escolha uma classe e confira as escolhas recuperadas.' }
    step.value = Math.max(0, Math.min(4, Number(saved.step) || 0)); useBudget.value = saved.useBudget === true
    startingGold.value = Number.isFinite(saved.startingGold) ? saved.startingGold : 100
    if (Array.isArray(saved.priorities) && saved.priorities.length === 3 && saved.priorities.every(key => attributes.some(a => a.key === key))) priorities.value = saved.priorities
    rollLog.value = typeof saved.rollLog === 'string' ? saved.rollLog : ''
    await nextTick(); recovery.value = null; dirty = true
  } finally { restoring = false; persistCreation() }
}
const magic = computed(() => choiceMagicPools(chosenRules.value.rules, draft.value.int, 1, {...draft.value,level:1}))
const availableMagic = computed(() => magic.value.filter(pool => pool.slots[0]))
const proficiencyCheck = computed(() => draft.value.rulesMode === 'standard' && chosenRules.value.rules ? proficiencyValidation(chosenRules.value.rules, draft.value.int, draft.value.proficiencies, metadata.value.generalProficiencies, 1, naturalGrants.value) : { rows: [] as string[], issues: [] as string[], limits: { class: 0, general: 0 } })
const spellCheck = computed(() => draft.value.rulesMode === 'standard' ? spellValidation(magic.value, draft.value.spells, spellCatalog.value) : { rows: [] as string[], issues: [] as string[] })
function initialSpellOptions(tradition: string): any[] { const pool = magic.value.find(p=>p.tradition===tradition); return spellCatalog.value.filter((spell: any) => spell.level === 1 && spell.tradition === tradition && (!pool?.spellList || spell.campaignSpellId || pool.spellList.some((entry:any)=>entry.name===spell.name&&entry.level===spell.level))) }
const supportsStandard = computed(() => !!chosenRules.value.rules)
const catalogAlternative = computed(() => classes.value.find(c => c.source === 'catalog' && c.name === klass.value?.name))
const requirementErrors = computed(() => {
  const minimums: Record<string, number> = { ...chosenRules.value?.minimumAttributes }
  for (const key of chosenRules.value?.keyAttributes ?? []) minimums[key] = Math.max(9, minimums[key] ?? 3)
  return Object.entries(minimums).filter(([k,v]) => Number((draft.value as any)[k]) < v).map(([k,v]) => `${k.toUpperCase()} ≥ ${v}`)
})
const subclasses = computed(() => {const base=klass.value?.source==='catalog'?klass.value:classes.value.find(c=>c.source==='catalog'&&c.id===klass.value?.baseClassKey);return base ? getClassFeats(base.name,1).availableSubclasses || [] : []})
let loaded = false, dirty = false, created = false, sequence = 0
watch([draft, step, useBudget, startingGold, priorities], () => { if (loaded && !restoring) { dirty = true; persistCreation() } }, { deep: true })
watch(() => draft.value.campaignId, () => { if (!restoring) { draft.value.classKey = ''; void loadClasses() } })
watch(klass, (value) => {
  if (restoring) return
  draft.value.subclass = ''
  draft.value.proficiencyOrigin = ''; automaticNotice.value = ''
  draft.value.classChoices = {}
  draft.value.isSpellcaster = chosenRules.value?.spellcaster ?? false
  if (value) draft.value.hpMax = Math.max(1, 4 + (value.conBonus ? getModifier(draft.value.con) : 0)) + Number(chosenRules.value.rules?.levels[0]?.hitDice.match(/\+(\d+)/)?.[1] || 0)
})
watch(() => draft.value.classChoices, () => { if (!restoring) { changeOrigin(); draft.value.subclass = draft.value.classChoices.tradition || '' } }, {deep:true})
watch(() => draft.value.rulesMode, mode => { if (!restoring && mode === 'standard') draft.value.isSpellcaster = chosenRules.value.spellcaster ?? false })
async function loadClasses() {
  const id = ++sequence
  loadingClasses.value = true; error.value = ''
  try {
    const res = await getResource('/api/classes/catalog', { params: { campaignId: draft.value.campaignId || undefined } })
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
  draft.value.hpMax = Math.max(1, Math.max(4, values[0]! % sides + 1) + (klass.value.conBonus ? getModifier(draft.value.con) : 0)) + Number(chosenRules.value.rules?.levels[0]?.hitDice.match(/\+(\d+)/)?.[1] || 0)
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
    choicesReviewed.value = true
    if (proficiencyOrigins.value.length && !selectedOrigin.value) { error.value = 'Escolha a origem do bárbaro para receber suas proficiências naturais.'; step.value = 2; return }
    const missing = ['class', 'general'].filter(category => !draft.value.proficiencies.some(p => p.category === category && p.name.trim()))
    if (missing.length) { error.value = `Escolha ao menos uma proficiência ${missing.map(c => c === 'class' ? 'de classe' : 'geral').join(' e ')}.`; step.value = 2; return }
    const issues = [...classChoiceIssues(chosenRules.value.rules, {...draft.value,level:1}, draft.value.classChoices, true, canApproveChoices.value), ...proficiencyCheck.value.issues, ...spellCheck.value.issues]
    for (const pool of availableMagic.value) if (pool.studious && !draft.value.spells.some(spell => spell.tradition === pool.tradition)) issues.push(`Escolha sua primeira magia ${traditionName(pool.tradition)}.`)
    if (issues.length) { error.value = issues.join(' '); step.value = 2; return }
    const con = klass.value!.conBonus ? getModifier(draft.value.con) : 0
    const racial = Number(chosenRules.value.rules?.levels[0]?.hitDice.match(/\+(\d+)/)?.[1] || 0)
    const min = Math.max(1, 4 + con) + racial, max = Math.max(4, Number(klass.value!.hitDie.slice(2))) + con + racial
    if (draft.value.hpMax < min || draft.value.hpMax > max) { error.value = `PV iniciais devem estar entre ${min} e ${max} para esta classe.`; step.value = 2; return }
  }
  if (step.value >= 2 && (!draft.value.characterName.trim() || draft.value.proficiencies.some(p => !p.name.trim()) || draft.value.spells.some(s => !s.name.trim()))) { error.value = 'Preencha os nomes do personagem e das escolhas adicionadas.'; step.value = 2; return }
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
    localDraft.remove()
    await router.push(`/character/${res.data.character.id}`)
  } catch (e) {
    error.value = errorMessage(e, 'Não foi possível criar a ficha. Suas escolhas foram preservadas.')
    const failedStep = (e as any)?.response?.data?.step
    if ([1, 2, 3].includes(failedStep)) { step.value = failedStep; choicesReviewed.value = true }
  }
  finally { submitting.value = false }
}
function confirmDiscard(){const allowed = created || !dirty || window.confirm('Sair e descartar as escolhas deste personagem?'); if (allowed && dirty) localDraft.remove(); return allowed}
onBeforeRouteLeave(confirmDiscard)
onBeforeRouteUpdate((to,from)=>to.fullPath.split('#')[0]===from.fullPath.split('#')[0] || confirmDiscard())
function beforeUnload(event: BeforeUnloadEvent) { persistCreation(); if (dirty && !created) { event.preventDefault(); event.returnValue = '' } }
onMounted(() => window.addEventListener('beforeunload', beforeUnload))
onBeforeUnmount(() => window.removeEventListener('beforeunload', beforeUnload))
async function loadResources() {
  loadingResources.value = true; resourceError.value = ''
  try {
    const [rules, items, weapons] = await Promise.all([
      getResource('/api/game-rules/metadata'),
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
