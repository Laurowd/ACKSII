<template>
  <div class="min-h-screen lg:h-[calc(100vh-65px)] lg:min-h-0 flex flex-col lg:flex-row bg-dark-bg text-steel-light lg:overflow-hidden">
    <!-- Left Column: Search & Results -->
    <div class="min-w-0 flex-1 flex flex-col p-4 sm:p-6 border-r border-gold/10 lg:overflow-hidden relative">
      <div class="mb-6 flex-shrink-0">
        <h1 class="text-3xl font-[Cinzel] text-gold mb-2">Painel do Mestre (ACKS II)</h1>
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
        
        <div v-else class="flex flex-col items-center justify-center h-full text-steel/50 opacity-50">
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
          <p class="text-xs text-steel mb-4">Roll 2d6. Add Charisma modifier. Apply additional modifiers (e.g. +1 for speaking language).</p>
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
                <td class="py-2 font-bold text-emerald-400">Friendly</td>
                <td class="py-2 text-steel">Will not attack. Interested in trade, parley or alliance.</td>
              </tr>
              <tr class="border-b border-white/5">
                <td class="py-2 font-bold text-teal-400">12+</td>
                <td class="py-2 font-bold text-teal-400">Helpful</td>
                <td class="py-2 text-steel">Provides aid, information, shelter, or escorts party.</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- MORALE TAB -->
        <div v-if="activeTab === 'morale'">
          <h3 class="font-bold text-gold-light mb-3">Morale Rolls (2d6)</h3>
          <p class="text-xs text-steel mb-4">When required, roll 2d6. If roll > Morale Score, force retreats or surrenders.</p>
          
          <h4 class="font-bold text-white mb-2 text-xs">When to Check Morale (Monsters)</h4>
          <ul class="list-disc pl-5 text-xs space-y-1 mb-4 text-steel-light/90">
            <li>When the monster/group takes its first casualty or combatant drops to 0 hp.</li>
            <li>When half the monsters/group is incapacitated or have fled.</li>
            <li>When a lone monster is reduced to 1/3 hit points or less.</li>
          </ul>

          <h4 class="font-bold text-white mb-2 text-xs">When to Check Morale (Retainers)</h4>
          <ul class="list-disc pl-5 text-xs space-y-1 mb-4 text-steel-light/90">
            <li>First time they encounter a monster in a given adventure.</li>
            <li>When their party is reduced to half strength.</li>
            <li>If they begin a round subject to magical fear.</li>
          </ul>

          <div class="bg-dark-surface p-3 rounded text-xs border border-white/10 mt-6">
            <span class="font-bold text-gold">Base Retainer Morale:</span> 0<br>
            <span class="text-steel">Modified by employer's CHA.</span><br>
            <span class="font-bold text-gold mt-2 block">Typical Monster Morale:</span> 
            <span class="text-steel">Varies from -2 (Cowardly) to +4 (Fanatic). Undead/Constructs never check morale.</span>
          </div>
        </div>

        <!-- SURPRISE & INITIATIVE -->
        <div v-if="activeTab === 'combat'">
          <h3 class="font-bold text-gold-light mb-3">Surprise (1d6)</h3>
          <p class="text-xs text-steel mb-4">Roll 1d6 per side when encountering unexpectedly. 1-2 = Surprised (or 1-3 for unprepared out of cover). Cannot act during surprise round.</p>
          
          <h3 class="font-bold text-gold-light mb-3 mt-6">Initiative (1d6)</h3>
          <p class="text-xs text-steel mb-2">Roll 1d6 per combatant plus DEX & modifiers.</p>
          <ul class="list-disc pl-5 text-xs space-y-1 mb-4 text-steel-light/90">
            <li>Ties go to the combatant with higher raw die roll.</li>
            <li>If still tied, combatants act simultaneously.</li>
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
</template>

<script setup lang="ts">
import { ref, onBeforeUnmount } from 'vue'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import api from '../services/api'
import { errorMessage } from '../utils/catalog'

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
