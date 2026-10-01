<template>
  <div class="judge-page text-steel-light">
    <header class="judge-page-header">
      <div>
        <p class="eyebrow">Preparar, acompanhar, consultar</p>
        <h1 class="text-2xl sm:text-3xl text-gold">Painel do Mestre</h1>
        <p class="mt-2 text-sm text-steel-light">Os recursos do grupo e as regras da sessão em um só lugar.</p>
      </div>
      <div class="view-switch" aria-label="Visões do painel">
        <button :aria-pressed="view === 'session'" @click="view = 'session'">Sessão da campanha</button>
        <button :aria-pressed="view === 'rules'" @click="view = 'rules'">Consultar regras</button>
      </div>
    </header>
    <JudgeSessionOverview v-if="view === 'session'" />
    <div v-else class="judge-rules-layout flex flex-col lg:flex-row bg-dark-bg lg:overflow-hidden">
    <!-- Left Column: Search & Results -->
    <div class="min-w-0 flex-1 flex flex-col p-4 sm:p-6 border-r border-gold/10 lg:overflow-hidden relative">
      <div class="mb-6 flex-shrink-0">
        <h2 class="text-xl text-gold mb-2">Compêndio de regras</h2>
        <p class="text-sm">Pesquise por qualquer regra, classe, magia, ou monstro do livro oficial.</p>
      </div>

      <!-- Search Bar -->
      <div class="relative mb-6 flex-shrink-0">
        <input 
          v-model="searchQuery" 
          @input="handleSearch"
          type="text" 
          aria-label="Pesquisar regras" autocomplete="off"
          placeholder="Ex: 'Reaction rolls', 'Morale', 'Charge'..." 
          class="w-full bg-dark-surface border border-gold/30 rounded-lg px-4 py-3 text-white placeholder-steel focus:border-gold focus:outline-none transition-colors"
        />
        <div v-if="isSearching" role="status" aria-label="Pesquisando regras" class="absolute right-3 top-3.5 w-5 h-5 border-2 border-gold/20 border-t-gold rounded-full animate-spin"></div>
      </div>

      <!-- Results List -->
      <div class="flex-1 overflow-y-auto pr-2 custom-scrollbar">
        <div v-if="searchError" role="alert" class="border border-red-400 rounded p-4">
          <p>{{ searchError }}</p><button @click="handleSearch" class="text-gold underline mt-2">Tentar novamente</button>
        </div>
        <div v-else-if="results.length === 0 && searchQuery.trim().length > 2 && !isSearching" class="text-center py-10 text-steel">
          Nenhuma regra encontrada para "{{ searchQuery }}".
        </div>
        
        <div v-else-if="results.length > 0" class="space-y-6">
          <div v-for="(rule, idx) in results" :key="idx" class="bg-dark-card border border-gold/10 rounded-lg p-5">
            <div class="text-xs text-gold/60 uppercase tracking-widest mb-1">{{ rule.chapter }}</div>
            <h2 class="text-xl font-bold text-gold-light mb-3 font-[Cinzel]" v-html="highlightText(rule.heading)"></h2>
            <div class="markdown-body text-sm leading-relaxed font-serif text-steel-light" v-html="renderMarkdown(rule.content)"></div>
          </div>
        </div>
        
        <div v-else class="flex flex-col items-center justify-center min-h-52 h-full text-steel">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-16 h-16 mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
          </svg>
          <p>O compêndio de regras aguarda sua consulta.</p>
        </div>
      </div>
    </div>

    <!-- Right Column: Quick Tables Master Screen -->
    <div class="w-full lg:w-[450px] lg:shrink-0 bg-dark-card flex flex-col overflow-hidden">
      <div class="p-4 border-b border-gold/20 flex-shrink-0 bg-dark-surface">
        <h2 class="text-lg font-bold text-gold font-[Cinzel] flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>
          Escudo do Mestre
        </h2>
      </div>
      
      <!-- Tabs -->
      <div class="flex border-b border-gold/10 bg-dark-bg text-sm flex-shrink-0 overflow-x-auto">
        <button v-for="tab in tabs" :key="tab.id" @click="activeTab = tab.id"
          class="px-4 py-2 font-medium whitespace-nowrap transition-colors"
          :class="activeTab === tab.id ? 'text-gold border-b-2 border-gold bg-dark-surface/50' : 'text-steel hover:text-steel-light hover:bg-dark-surface'">
          {{ tab.label }}
        </button>
      </div>
      
      <!-- Tab Content Area -->
      <div class="flex-1 overflow-y-auto p-4 custom-scrollbar text-sm">
        
        <!-- MONSTER REACTION TAB -->
        <div v-if="activeTab === 'reaction'">
          <h3 class="font-bold text-gold-light mb-3">Encounter Reactions (2d6)</h3>
          <p class="text-xs text-steel mb-4">Role 2d6 e aplique o modificador de Carisma do porta-voz, seus poderes e os ajustes definidos pelo mestre. Um 2 natural limita a reação a Unfriendly ou pior; um 12 natural garante Indifferent ou melhor.</p>
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="border-b border-gold/20 text-gold text-xs">
                <th class="py-2">Roll</th>
                <th class="py-2">Reaction</th>
                <th class="py-2">Description</th>
              </tr>
            </thead>
            <tbody class="text-xs">
              <tr class="border-b border-white/5">
                <td class="py-2 font-bold text-crimson-light">2-</td>
                <td class="py-2 font-bold text-crimson-light">Hostile</td>
                <td class="py-2 text-steel">Attacks, tracks, traps, threatens.</td>
              </tr>
              <tr class="border-b border-white/5">
                <td class="py-2 font-bold text-orange-400">3-5</td>
                <td class="py-2 font-bold text-orange-400">Unfriendly</td>
                <td class="py-2 text-steel">Will attack if advantageous. Insults, demands, intimidates.</td>
              </tr>
              <tr class="border-b border-white/5">
                <td class="py-2 font-bold text-amber-200">6-8</td>
                <td class="py-2 font-bold text-amber-200">Neutral</td>
                <td class="py-2 text-steel">Uncertain. Waits to see what party does. Ignores or observes.</td>
              </tr>
              <tr class="border-b border-white/5">
                <td class="py-2 font-bold text-emerald-400">9-11</td>
                <td class="py-2 font-bold text-emerald-400">Indifferent</td>
                <td class="py-2 text-steel">Ignora o grupo se não for abordado; aceita conversar.</td>
              </tr>
              <tr class="border-b border-white/5">
                <td class="py-2 font-bold text-teal-400">12+</td>
                <td class="py-2 font-bold text-teal-400">Friendly</td>
                <td class="py-2 text-steel">Busca cooperar de forma benéfica para ambos os lados.</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- MORALE TAB -->
        <div v-if="activeTab === 'morale'">
          <h3 class="font-bold text-gold-light mb-3">Morale Rolls (2d6)</h3>
          <p class="text-xs text-steel mb-4">Role 2d6, some o valor de moral e os ajustes da situação, e consulte o resultado abaixo. Moral é um modificador, não um número-alvo.</p>
          
          <h4 class="font-bold text-white mb-2 text-xs">When to Check Morale (Monsters)</h4>
          <ul class="list-disc pl-5 text-xs space-y-1 mb-4 text-steel-light/90">
            <li>Grupo: ao fim da rodada em que um terço foi morto ou incapacitado, e nas rodadas seguintes em que outra criatura do grupo cair.</li>
            <li>Criatura solitária: quando perder um terço dos PV, e nas rodadas seguintes em que sofrer dano.</li>
            <li>Também verifique ao fim da primeira rodada em que os aventureiros fugirem, para determinar perseguição.</li>
          </ul>

          <table class="w-full text-left text-xs border-collapse"><thead><tr class="border-b border-gold/20 text-gold"><th class="py-2" scope="col">2d6 + ajustes</th><th class="py-2" scope="col">Resultado</th></tr></thead><tbody>
            <tr class="border-b border-steel-dark"><td class="py-2">2 ou menos</td><td>Retirada amedrontada</td></tr>
            <tr class="border-b border-steel-dark"><td class="py-2">3–5</td><td>Moral vacilante</td></tr>
            <tr class="border-b border-steel-dark"><td class="py-2">6–8</td><td>Continua combatendo</td></tr>
            <tr class="border-b border-steel-dark"><td class="py-2">9–11</td><td>Avança e persegue</td></tr>
            <tr><td class="py-2">12 ou mais</td><td>Vitória ou morte</td></tr>
          </tbody></table>
          <div class="bg-dark-surface p-3 rounded text-xs border border-steel-dark mt-6">
            <p>A moral de monstros varia de −6 a +4. Para contratados, use a moral da profissão ou tropa e os bônus de quem os lidera; obediência e lealdade usam tabelas próprias.</p>
          </div>
        </div>

        <!-- SURPRISE & INITIATIVE -->
        <div v-if="activeTab === 'combat'">
          <h3 class="font-bold text-gold-light mb-3">Surprise (1d6)</h3>
          <p class="text-xs text-steel mb-4">Consulte a matriz de surpresa conforme conhecimento prévio e linha de visão. Quando exigida, a rolagem de 1d6 ajustada resulta em surpresa com 1–2. Uma criatura surpresa não pode agir até a próxima rodada.</p>
          
          <h3 class="font-bold text-gold-light mb-3 mt-6">Initiative (1d6)</h3>
          <p class="text-xs text-steel mb-2">Roll 1d6 per combatant plus DEX & modifiers.</p>
          <ul class="list-disc pl-5 text-xs space-y-1 mb-4 text-steel-light/90">
            <li>Empates são resolvidos em sequência. Aliados escolhem sua ordem de ação.</li>
            <li>Entre lados opostos, o lado com menos combatentes escolhe agir antes ou depois. Em números iguais, o mestre escolhe para os monstros.</li>
          </ul>
          
          <h3 class="font-bold text-gold-light mb-3 mt-6">Combat Sequence</h3>
          <ol class="list-decimal pl-5 text-xs space-y-1 mb-4 text-steel-light/90">
            <li>Assess Readiness (Surprise check if needed)</li>
            <li>Determine Initiative</li>
            <li>Combat Rounds Begin (highest Init to lowest)
              <ul class="list-disc pl-4 mt-1 text-steel">
                <li>Movement Action (or full move)</li>
                <li>Combat Action (Attack, cast spell, use item, etc)</li>
              </ul>
            </li>
          </ol>
        </div>
      </div>
    </div>
  </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onBeforeUnmount } from 'vue'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import api from '../services/api'
import { errorMessage } from '../utils/catalog'
import JudgeSessionOverview from '../components/JudgeSessionOverview.vue'

const view = ref<'session' | 'rules'>('session')

marked.use({
  breaks: true,
  gfm: true
})

const searchQuery = ref('')
const results = ref<Array<{chapter: string, heading: string, content: string}>>([])
const isSearching = ref(false)
let searchTimeout: ReturnType<typeof setTimeout> | null = null
let searchId = 0
const searchError = ref('')
onBeforeUnmount(() => { searchId++; if (searchTimeout) clearTimeout(searchTimeout) })

const activeTab = ref('reaction')
const tabs = [
  { id: 'reaction', label: 'Reactions' },
  { id: 'morale', label: 'Morale' },
  { id: 'combat', label: 'Combat & Init' }
]

async function handleSearch() {
  if (searchTimeout) clearTimeout(searchTimeout)
  const id = ++searchId
  const query = searchQuery.value.trim()
  searchError.value = ''
  results.value = []
  
  if (searchQuery.value.trim().length <= 2) {
    results.value = []
    isSearching.value = false
    return
  }

  isSearching.value = true
  
  // Debounce API calls
  searchTimeout = setTimeout(async () => {
    try {
      const resp = await api.get('/api/rules/search', {
        params: { q: query },
      })
      if (id === searchId) results.value = resp.data
    } catch (err) {
      if (id === searchId) searchError.value = errorMessage(err, 'Não foi possível pesquisar as regras.')
    } finally {
      if (id === searchId) isSearching.value = false
    }
  }, 400)
}

function highlightText(text: string) {
  text = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  if (!searchQuery.value || searchQuery.value.trim().length <= 2) return text;
  
  try {
    const escapedQuery = searchQuery.value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escapedQuery})`, 'gi');
    return text.replace(regex, '<span class="bg-gold/40 text-gold-light rounded px-1 font-bold shadow-[0_0_8px_rgba(212,175,55,0.4)]">$1</span>');
  } catch (e) {
    return text; // Fallback se a regex falhar
  }
}

function renderMarkdown(content: string) {
  if (!content) return '';
  // Convert basic \n to \n\n if they are not already double to enforce paragraph breaks if needed,
  // but marked with 'breaks: true' will turn single \n into <br>.
  
  // First, parse the raw markdown BEFORE highlighting
  // Highlighting first can break markdown syntax (like tables or bold tags)
  let html = '';
  try {
    html = marked.parse(content) as string;
  } catch (e) {
    html = content;
  }
  
  // Now apply highlighting to the generated HTML text carefully
  if (searchQuery.value && searchQuery.value.trim().length > 2) {
    try {
      const escapedQuery = searchQuery.value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      // We need to avoid highlighting text inside HTML tags (like <span class="..."> or href="...")
      // A simple regex to replace outside tags:
      const regex = new RegExp(`(?![^<]*>)(${escapedQuery})`, 'gi');
      html = html.replace(regex, '<span class="bg-gold/40 text-gold-light rounded px-1 font-bold shadow-[0_0_8px_rgba(212,175,55,0.4)]">$1</span>');
    } catch (e) {
      console.error(e);
    }
  }
  
  return DOMPurify.sanitize(html);
}
</script>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.2);
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(212, 175, 55, 0.3);
  border-radius: 4px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(212, 175, 55, 0.5);
}

/* Markdown Rendering Styles */
:deep(.markdown-body table) {
  width: 100%;
  border-collapse: collapse;
  margin: 1rem 0;
  font-family: inherit;
  font-size: 0.85rem;
}
:deep(.markdown-body th), :deep(.markdown-body td) {
  border: 1px solid rgba(212, 175, 55, 0.2);
  padding: 0.5rem 0.75rem;
  text-align: left;
}
:deep(.markdown-body th) {
  background: rgba(0, 0, 0, 0.3);
  color: #c9a95c;
  font-weight: bold;
}
:deep(.markdown-body tr:nth-child(even)) {
  background: rgba(255, 255, 255, 0.02);
}
:deep(.markdown-body p) {
  margin-bottom: 0.75rem;
}
:deep(.markdown-body ul) {
  list-style-type: disc;
  padding-left: 1.5rem;
  margin-bottom: 0.75rem;
}
:deep(.markdown-body ol) {
  list-style-type: decimal;
  padding-left: 1.5rem;
  margin-bottom: 0.75rem;
}
:deep(.markdown-body blockquote) {
  border-left: 4px solid rgba(212, 175, 55, 0.5);
  padding-left: 1rem;
  font-style: italic;
  color: rgba(255,255,255,0.7);
}
</style>
