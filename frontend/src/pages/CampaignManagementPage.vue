<template>
  <div class="max-w-6xl mx-auto p-6 animate-fade-in">
    <div class="flex flex-wrap items-center gap-4 mb-8">
      <button @click="$router.push('/campaigns')" class="text-steel hover:text-gold transition-colors">
        ← Voltar
      </button>
      <h1 class="text-3xl font-bold text-gold">Gerenciamento da Campanha</h1>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
      <div class="bg-dark-card border border-gold/20 p-6 rounded-xl md:col-span-2">
        <div class="flex flex-wrap items-center justify-between gap-2 mb-4 border-b border-steel-dark pb-2">
          <h2 class="text-xl font-bold text-gold">Regras Opcionais e Calendário</h2>
          <button @click="saveSettings" class="text-sm px-3 py-1 bg-gold text-dark-bg font-bold rounded w-full sm:w-auto">Salvar Configurações</button>
        </div>
        <div v-if="settingsStatus" class="text-xs text-steel-light mb-3">
          {{ settingsStatus }}
        </div>
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div class="lg:col-span-2">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
              <label v-for="rule in optionalRuleOptions" :key="rule.key" class="flex items-center justify-between gap-2 text-sm text-steel-light bg-dark-bg border border-steel-dark/40 rounded p-2">
                <span>{{ rule.label }}</span>
                <input type="checkbox" v-model="settings.optionalRules[rule.key]" @change="onRuleToggle" />
              </label>
            </div>
          </div>
          <div class="space-y-3">
            <div class="grid grid-cols-3 gap-2">
              <div>
                <label class="block text-xs text-steel mb-1">Ano</label>
                <input v-model.number="settings.currentYear" type="number" min="1" class="w-full px-3 py-1.5 bg-dark-bg border border-steel-dark rounded text-gold" />
              </div>
              <div>
                <label class="block text-xs text-steel mb-1">Mês</label>
                <input v-model.number="settings.currentMonth" type="number" min="1" max="12" class="w-full px-3 py-1.5 bg-dark-bg border border-steel-dark rounded text-gold" />
              </div>
              <div>
                <label class="block text-xs text-steel mb-1">Semana</label>
                <input v-model.number="settings.currentWeek" type="number" min="1" max="4" class="w-full px-3 py-1.5 bg-dark-bg border border-steel-dark rounded text-gold" />
              </div>
            </div>
            <div class="flex flex-col sm:flex-row gap-2">
              <button @click="advanceCalendar('week')" class="px-3 py-1 bg-steel-dark text-gold rounded text-sm hover:bg-steel-dark/70 w-full sm:w-auto">Avançar Semana</button>
              <button @click="advanceCalendar('month')" class="px-3 py-1 bg-steel-dark text-gold rounded text-sm hover:bg-steel-dark/70 w-full sm:w-auto">Avançar Mês</button>
            </div>
          </div>
        </div>
      </div>

      <div v-if="isRuleEnabled('enableDomainEconomy')" class="bg-dark-card border border-gold/20 p-6 rounded-xl md:col-span-2">
        <div class="flex flex-wrap items-center justify-between gap-2 mb-4 border-b border-steel-dark pb-2">
          <h2 class="text-xl font-bold text-gold">Ciclo Econômico Consolidado</h2>
          <button @click="refreshEconomy" class="text-sm px-3 py-1 bg-gold text-dark-bg font-bold rounded w-full sm:w-auto">Recalcular</button>
        </div>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
          <div class="bg-dark-bg border border-steel-dark/40 rounded p-3">
            <div class="text-xs text-steel">Receita Bruta</div>
            <div class="text-lg text-green-400 font-bold">{{ formatGp(economy.grossRevenue) }}</div>
          </div>
          <div class="bg-dark-bg border border-steel-dark/40 rounded p-3">
            <div class="text-xs text-steel">Despesas Totais</div>
            <div class="text-lg text-red-400 font-bold">{{ formatGp(economy.expensesTotal) }}</div>
          </div>
          <div class="bg-dark-bg border border-steel-dark/40 rounded p-3">
            <div class="text-xs text-steel">Estabilidade</div>
            <div class="text-lg text-gold font-bold">{{ economy.stability }}</div>
          </div>
          <div class="bg-dark-bg border border-steel-dark/40 rounded p-3">
            <div class="text-xs text-steel">Lealdade</div>
            <div class="text-lg text-gold font-bold">{{ economy.loyalty }}</div>
          </div>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label class="block text-xs text-steel mb-1">Evento Mensal</label>
            <input v-model="economy.monthlyEvent" class="w-full px-3 py-1.5 bg-dark-bg border border-steel-dark rounded text-gold" placeholder="Colheita ruim, feira sazonal, revolta..." />
          </div>
          <div>
            <label class="block text-xs text-steel mb-1">Saldo Consolidado</label>
            <div class="w-full px-3 py-1.5 bg-dark-bg border border-steel-dark rounded text-lg font-bold" :class="economy.consolidatedBalance >= 0 ? 'text-green-400' : 'text-red-400'">
              {{ formatGp(economy.consolidatedBalance) }}
            </div>
          </div>
          <div class="md:col-span-2">
            <label class="block text-xs text-steel mb-1">Notas Econômicas</label>
            <textarea v-model="economy.notes" rows="2" class="w-full px-3 py-1.5 bg-dark-bg border border-steel-dark rounded text-gold"></textarea>
          </div>
        </div>
        <div class="mt-3 flex justify-end">
          <button @click="saveEconomy" class="text-sm px-3 py-1 bg-gold text-dark-bg font-bold rounded w-full sm:w-auto">Salvar Economia</button>
        </div>
      </div>

      <div v-else class="bg-dark-card border border-gold/20 p-6 rounded-xl md:col-span-2">
        <h2 class="text-xl font-bold text-gold mb-2">Ciclo Econômico Consolidado</h2>
        <p class="text-sm text-steel">A regra opcional de economia de domínio está desligada para esta campanha.</p>
      </div>

      <!-- Membros Atuais -->
      <div class="bg-dark-card border border-gold/20 p-6 rounded-xl">
        <h2 class="text-xl font-bold text-gold mb-4 border-b border-steel-dark pb-2">Membros da Campanha</h2>
        <div v-if="loadingMembers" class="text-steel text-sm py-2">Carregando membros...</div>
        <div v-else-if="members.length === 0" class="text-steel text-sm py-2">Nenhum membro ativo.</div>
        <div v-else class="space-y-3">
          <div v-for="m in members" :key="m.id" class="flex items-center justify-between bg-dark-bg p-3 rounded border border-steel-dark/50">
            <span class="text-steel-light font-medium">{{ m.user.username }} <span v-if="m.userId === authStore.user?.id" class="text-[10px] text-gold ml-1">(Você)</span></span>
            <div class="flex gap-2">
              <button v-if="m.userId !== authStore.user?.id" @click="kickMember(m.userId)" class="px-3 py-1 bg-red-900/30 text-red-500 border border-red-800 rounded hover:bg-red-900/50 text-sm">
                Expulsar
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Convites Pendentes -->
      <div class="bg-dark-card border border-gold/20 p-6 rounded-xl">
        <h2 class="text-xl font-bold text-gold mb-4 border-b border-steel-dark pb-2">Convites Pendentes</h2>
        <div v-if="loadingInvites" class="text-steel text-sm py-2">Carregando convites...</div>
        <div v-else-if="invites.length === 0" class="text-steel text-sm py-2">Nenhum convite pendente.</div>
        <div v-else class="space-y-3">
          <div v-for="inv in invites" :key="inv.id" class="flex items-center justify-between bg-dark-bg p-3 rounded border border-steel-dark/50">
            <span class="text-steel-light font-medium">{{ inv.user.username }}</span>
            <div class="flex gap-2">
              <button @click="resolveInvite(inv.userId, 'ACCEPTED')" class="px-3 py-1 bg-green-900/30 text-green-400 border border-green-800 rounded hover:bg-green-900/50 text-sm">
                Aceitar
              </button>
              <button @click="resolveInvite(inv.userId, 'REJECTED')" class="px-3 py-1 bg-red-900/30 text-red-500 border border-red-800 rounded hover:bg-red-900/50 text-sm">
                Recusar
              </button>
            </div>
          </div>
        </div>
      </div>

      <div v-if="isRuleEnabled('enableActivityQueue')" class="bg-dark-card border border-gold/20 p-6 rounded-xl md:col-span-2">
        <div class="flex flex-wrap items-center justify-between gap-2 mb-4 border-b border-steel-dark pb-2">
          <h2 class="text-xl font-bold text-gold">Encargos e Fila de Atividades</h2>
          <button @click="addActivity" class="text-sm px-3 py-1 bg-gold text-dark-bg font-bold rounded w-full sm:w-auto">+ Atividade</button>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-5 gap-2 mb-3">
          <input v-model="newActivity.title" class="md:col-span-2 px-3 py-1.5 bg-dark-bg border border-steel-dark rounded text-gold" placeholder="Título" />
          <select v-model="newActivity.type" class="px-3 py-1.5 bg-dark-bg border border-steel-dark rounded text-gold">
            <option value="travel">Travel</option>
            <option value="downtime">Downtime</option>
            <option value="construction">Construction</option>
            <option value="research">Research</option>
            <option value="war">War</option>
          </select>
          <input v-model.number="newActivity.durationWeeks" type="number" min="1" class="px-3 py-1.5 bg-dark-bg border border-steel-dark rounded text-gold" placeholder="Semanas" />
          <input v-model.number="newActivity.costGp" type="number" min="0" class="px-3 py-1.5 bg-dark-bg border border-steel-dark rounded text-gold" placeholder="Custo GP" />
        </div>
        <textarea v-model="newActivity.details" rows="2" class="w-full px-3 py-1.5 bg-dark-bg border border-steel-dark rounded text-gold mb-3" placeholder="Detalhes e impacto esperado"></textarea>

        <div v-if="activities.length === 0" class="text-steel text-sm">Nenhuma atividade em fila.</div>
        <div v-else class="space-y-2">
          <div v-for="act in activities" :key="act.id" class="bg-dark-bg border border-steel-dark/40 rounded p-3 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
            <div>
              <div class="text-gold font-bold">{{ act.title }}</div>
              <div class="text-xs text-steel-light">{{ act.type }} | {{ act.status }} | {{ act.remainingWeeks }}/{{ act.durationWeeks }} semanas</div>
              <div class="text-xs text-steel">{{ act.details }}</div>
            </div>
            <div class="flex gap-2">
              <button @click="resolveActivity(act.id)" class="px-3 py-1 bg-steel-dark text-gold rounded text-sm hover:bg-steel-dark/70">Resolver Semana</button>
            </div>
          </div>
        </div>
      </div>

      <div v-else class="bg-dark-card border border-gold/20 p-6 rounded-xl md:col-span-2">
        <h2 class="text-xl font-bold text-gold mb-2">Encargos e Fila de Atividades</h2>
        <p class="text-sm text-steel">A fila semanal/mensal está desligada nas regras opcionais desta campanha.</p>
      </div>
    </div>

    <!-- Classes Customizadas -->
    <div class="bg-dark-card border border-gold/20 p-6 rounded-xl">
      <div class="flex items-center justify-between mb-4 border-b border-steel-dark pb-2">
        <h2 class="text-xl font-bold text-gold">Classes da Campanha</h2>
        <button @click="startBlankClass" class="text-sm px-3 py-1 bg-gold text-dark-bg font-bold rounded">
          + Nova Classe
        </button>
      </div>

      <p class="text-sm text-steel-light mb-3">As classes base estão sempre no catálogo. Crie uma classe própria ou copie uma base para personalizar sua progressão. Classes antigas desta campanha foram preservadas.</p>
      <div class="flex flex-wrap gap-3 mb-4">
        <label class="flex-1">Copiar do catálogo<select v-model="baseToCopy" class="w-full bg-dark-bg border border-steel-dark text-gold rounded p-2"><option value="">Selecione uma base</option><option v-for="c in catalogClasses" :key="c.id" :value="c.id">{{ c.name }}</option></select></label>
        <button :disabled="!baseToCopy" @click="copyBaseClass" class="text-gold disabled:opacity-40">Criar cópia editável</button>
      </div>
      <p v-if="classError" role="alert" class="text-red-400 mb-3">{{ classError }}</p>
      <!-- Add/Edit Class Form -->
      <ClassPointBuilder :campaign-id="campaignId" @created="loadClasses" />
      <div v-if="showAddClass" class="bg-dark-bg border border-gold/30 p-5 rounded-lg mb-6">
        <h3 class="text-lg text-gold mb-3">{{ editingClassId ? 'Editar Classe' : 'Criar Classe' }}</h3>
        <p class="text-sm text-steel-light mb-3">Defina as tabelas e descreva os requisitos e poderes. Este editor não calcula custos de construção ou equilíbrio de classes. Alterações na progressão são usadas quando a ficha é salva; PV e escolhas já feitas permanecem manuais.</p>
        <ol class="flex flex-wrap gap-4 mb-4"><li v-for="(label, i) in classSteps" :key="label" :aria-current="classStep === i ? 'step' : undefined" :class="classStep === i ? 'text-gold font-bold' : 'text-steel'">{{ i + 1 }}. {{ label }}</li></ol>
        <template v-if="classStep === 0">
        <div class="grid grid-cols-2 gap-4 mb-4">
          <div class="col-span-2 md:col-span-1">
            <label class="block text-xs text-steel mb-1">Nome da Classe</label>
            <input v-model="newClass.name" class="w-full px-3 py-1.5 bg-dark-card border border-steel-dark rounded text-gold" />
          </div>
          <div>
            <label class="block text-xs text-steel mb-1">Hit Die (ex: 1d8)</label>
            <input v-model="newClass.hitDie" class="w-full px-3 py-1.5 bg-dark-card border border-steel-dark rounded text-gold" />
          </div>
          <div class="flex items-center gap-2 md:col-span-2 text-sm text-steel mt-2">
             <input type="checkbox" v-model="newClass.conBonus" /> <label>Aplicar Bônus de Constituição no HP por Nível</label>
          </div>
        </div>

        <label class="block text-sm mb-3">Descrição e requisitos<textarea v-model="newClass.description" maxlength="4000" rows="2" class="w-full p-2 bg-dark-card border border-steel-dark rounded" /></label>
        <label class="block text-sm mb-3">Poderes e escolhas iniciais<textarea v-model="newClass.classFeatures" maxlength="20000" rows="3" class="w-full p-2 bg-dark-card border border-steel-dark rounded" /></label>
        <fieldset class="border border-steel-dark rounded p-3 mb-3">
          <legend>Requisitos de criação</legend>
          <label><input v-model="newClass.creationRules.spellcaster" type="checkbox" /> Classe conjuradora</label>
          <div class="grid grid-cols-2 md:grid-cols-3 gap-3 mt-3"><div v-for="key in classAttributeKeys" :key="key">
            <label><input v-model="newClass.creationRules.keyAttributes" :value="key" type="checkbox" /> {{ key.toUpperCase() }} é atributo-chave</label>
            <label class="block text-xs">Mínimo <input v-model.number="newClass.creationRules.minimumAttributes[key]" type="number" min="3" max="18" class="w-16 bg-dark-card border border-steel-dark rounded" /></label>
          </div></div>
          <p class="text-xs mt-2">Atributos-chave exigem ao menos 9. Estes requisitos serão verificados ao criar a ficha. A construção por pontos do Judges Journal ainda exige cálculo manual.</p>
        </fieldset>

        <p v-if="newClass.baseClassKey" class="text-sm text-steel-light">A cópia fornece as tabelas de progressão. Descreva acima os poderes que deseja manter ou modificar; eles não são herdados automaticamente pelo nome da base.</p>
        </template>
        <div v-if="classStep === 1" class="mb-4 overflow-x-auto">
          <div class="flex flex-wrap gap-4 mb-3 text-sm"><label><input type="checkbox" v-model="useThiefSkills" /> Tabela personalizada de habilidades de ladrão</label><label><input type="checkbox" v-model="useRebukingUndead" /> Tabela de afastar mortos-vivos</label></div>
          <label class="block text-sm text-gold mb-2 border-b border-steel-dark pb-1">Níveis e Títulos</label>
            <div v-for="(lvl, idx) in newClass.levels" :key="idx" class="flex flex-col gap-2 mb-4 p-3 bg-dark-bg/50 border border-steel-dark/30 rounded animate-fade-in">
              <div class="flex items-center gap-3">
                <div class="w-20 text-sm text-steel-light font-bold">Nível {{ lvl.level }}</div>
                <input v-model.number="lvl.xp" type="number" placeholder="XP" class="w-24 px-3 py-1 bg-dark-card border border-steel-dark rounded text-gold text-sm" />
                <input v-model="lvl.title" placeholder="Título" class="flex-1 px-3 py-1 bg-dark-card border border-steel-dark rounded text-gold text-sm" />
                <input v-model.number="lvl.attackThrow" type="number" placeholder="Atk" title="Attack Throw" class="w-16 px-2 py-1 bg-dark-card border border-steel-dark rounded text-gold text-sm" />
                <button v-if="idx === newClass.levels.length - 1 && idx > 0" @click="removeLevel(idx)" class="text-crimson-light hover:text-crimson p-1 px-2" title="Remover Nível">-</button>
                <div v-else class="w-7"></div>
              </div>
              <div class="flex items-center gap-2 pl-22">
                <div class="text-[10px] text-steel" title="Paralysis">Par</div>
                <input v-model.number="lvl.paralysis" type="number" class="w-12 px-1 py-0.5 bg-dark-card border border-steel-dark rounded text-gold text-xs text-center" />
                <div class="text-[10px] text-steel" title="Death">Mort</div>
                <input v-model.number="lvl.death" type="number" class="w-12 px-1 py-0.5 bg-dark-card border border-steel-dark rounded text-gold text-xs text-center" />
                <div class="text-[10px] text-steel" title="Blast">Expl</div>
                <input v-model.number="lvl.blast" type="number" class="w-12 px-1 py-0.5 bg-dark-card border border-steel-dark rounded text-gold text-xs text-center" />
                <div class="text-[10px] text-steel" title="Implements">Imp</div>
                <input v-model.number="lvl.implements" type="number" class="w-12 px-1 py-0.5 bg-dark-card border border-steel-dark rounded text-gold text-xs text-center" />
                <div class="text-[10px] text-steel" title="Spells">Mag</div>
                <input v-model.number="lvl.spells" type="number" class="w-12 px-1 py-0.5 bg-dark-card border border-steel-dark rounded text-gold text-xs text-center" />
              </div>
              <div v-if="useThiefSkills" class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2 pl-22">
                <div class="text-[10px] text-gold col-span-full">Habilidades personalizadas (valores da sua mesa)</div>
                <input v-model.number="lvl.thiefOpenLocks" type="number" min="0" max="100" class="px-1 py-0.5 bg-dark-card border border-steel-dark rounded text-gold text-xs text-center" placeholder="Open" title="Open Locks" />
                <input v-model.number="lvl.thiefFindTraps" type="number" min="0" max="100" class="px-1 py-0.5 bg-dark-card border border-steel-dark rounded text-gold text-xs text-center" placeholder="Trap" title="Find/Remove Traps" />
                <input v-model.number="lvl.thiefPickPockets" type="number" min="0" max="100" class="px-1 py-0.5 bg-dark-card border border-steel-dark rounded text-gold text-xs text-center" placeholder="Pick" title="Pick Pockets" />
                <input v-model.number="lvl.thiefMoveSilently" type="number" min="0" max="100" class="px-1 py-0.5 bg-dark-card border border-steel-dark rounded text-gold text-xs text-center" placeholder="Move" title="Move Silently" />
                <input v-model.number="lvl.thiefClimbWalls" type="number" min="0" max="100" class="px-1 py-0.5 bg-dark-card border border-steel-dark rounded text-gold text-xs text-center" placeholder="Climb" title="Climb Walls" />
                <input v-model.number="lvl.thiefHideInShadows" type="number" min="0" max="100" class="px-1 py-0.5 bg-dark-card border border-steel-dark rounded text-gold text-xs text-center" placeholder="Hide" title="Hide in Shadows" />
                <input v-model.number="lvl.thiefHearNoise" type="number" min="0" max="100" class="px-1 py-0.5 bg-dark-card border border-steel-dark rounded text-gold text-xs text-center" placeholder="Hear" title="Hear Noise" />
              </div>
              <div v-if="useRebukingUndead" class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2 pl-22">
                <div class="text-[10px] text-gold col-span-full">Rebuking Undead (valor/tipo)</div>
                <input v-model="lvl.rebukeSkeleton" type="text" class="px-1 py-0.5 bg-dark-card border border-steel-dark rounded text-gold text-xs text-center" placeholder="Skel" title="Skeleton" />
                <input v-model="lvl.rebukeZombie" type="text" class="px-1 py-0.5 bg-dark-card border border-steel-dark rounded text-gold text-xs text-center" placeholder="Zomb" title="Zombie" />
                <input v-model="lvl.rebukeGhoul" type="text" class="px-1 py-0.5 bg-dark-card border border-steel-dark rounded text-gold text-xs text-center" placeholder="Ghoul" title="Ghoul" />
                <input v-model="lvl.rebukeWight" type="text" class="px-1 py-0.5 bg-dark-card border border-steel-dark rounded text-gold text-xs text-center" placeholder="Wight" title="Wight" />
                <input v-model="lvl.rebukeWraith" type="text" class="px-1 py-0.5 bg-dark-card border border-steel-dark rounded text-gold text-xs text-center" placeholder="Wraith" title="Wraith" />
                <input v-model="lvl.rebukeMummy" type="text" class="px-1 py-0.5 bg-dark-card border border-steel-dark rounded text-gold text-xs text-center" placeholder="Mummy" title="Mummy" />
                <input v-model="lvl.rebukeSpectre" type="text" class="px-1 py-0.5 bg-dark-card border border-steel-dark rounded text-gold text-xs text-center" placeholder="Spectre" title="Spectre" />
                <input v-model="lvl.rebukeVampire" type="text" class="px-1 py-0.5 bg-dark-card border border-steel-dark rounded text-gold text-xs text-center" placeholder="Vamp" title="Vampire" />
              </div>
            </div>
            <button @click="addLevel" :disabled="newClass.levels.length >= 14" class="text-sm text-gold hover:text-gold-light mt-2 disabled:opacity-40">+ Adicionar Próximo Nível</button>        </div>

        <div v-if="classStep === 2" class="space-y-3">
          <h4 class="text-xl text-gold">{{ newClass.name }} · {{ newClass.hitDie }}</h4>
          <p class="whitespace-pre-wrap">{{ newClass.description }}</p><p class="whitespace-pre-wrap">{{ newClass.classFeatures }}</p>
          <p>{{ newClass.conBonus ? 'Aplica bônus de CON' : 'Sem bônus de CON' }} · {{ newClass.levels.length }} níveis</p>
          <div class="overflow-x-auto"><table class="w-full text-sm"><thead><tr><th>Nível</th><th>XP</th><th>Título</th><th>Ataque</th><th>Mort / Par / Expl / Imp / Mag</th></tr></thead><tbody><tr v-for="l in newClass.levels" :key="l.level" class="text-center border-t border-steel-dark"><td>{{ l.level }}</td><td>{{ l.xp }}</td><td>{{ l.title }}</td><td>{{ l.attackThrow }}</td><td>{{ l.death }} / {{ l.paralysis }} / {{ l.blast }} / {{ l.implements }} / {{ l.spells }}</td></tr></tbody></table></div>
          <p class="text-sm text-steel-light">Ao salvar, esta classe ficará disponível para os participantes da campanha.</p>
        </div>
        <div class="flex flex-wrap gap-3 justify-end mt-4">
          <button @click="cancelEditClass" class="px-4 py-1.5 text-steel hover:text-white">Cancelar</button>
          <button v-if="classStep > 0" @click="classStep--" :disabled="savingClass" class="text-gold">Voltar</button>
          <button v-if="classStep < 2" @click="nextClassStep" class="px-4 py-1.5 bg-gold text-dark-bg rounded">Continuar</button>
          <button v-else @click="saveClass" :disabled="savingClass" class="px-4 py-1.5 bg-gold-dark text-dark-bg font-bold rounded disabled:opacity-40">{{ savingClass ? 'Salvando...' : 'Salvar classe' }}</button>
        </div>
      </div>

      <!-- Class List -->
      <div v-if="loadingClasses" class="text-steel py-2">Carregando classes...</div>
      <div v-else-if="customClasses.length === 0" class="text-steel py-2">Nenhuma classe homebrew criada.</div>
      <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div v-for="c in customClasses" :key="c.id" class="border border-steel-dark/50 rounded-lg p-4 bg-dark-bg relative group flex justify-between items-start">
          <div>
            <h3 class="text-lg font-bold text-gold">{{ c.name }}</h3>
            <p class="text-xs text-steel mt-1">Hit Die: {{ c.hitDie }} ({{ c.conBonus ? '+ CON' : 'sem CON' }})</p>
          </div>
          <div class="flex gap-2">
            <button @click="editClass(c)" class="text-xs px-2 py-1 bg-steel-dark/50 rounded text-gold hover:text-white">Editar</button>
            <button @click="deleteClass(c.id)" class="text-xs px-2 py-1 text-crimson hover:text-red-400">Remover</button>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import api from '../services/api'
import { useAuthStore } from '../stores/auth'
import { notifyError, notifyInfo, notifySuccess } from '../utils/toast'
import { errorMessage, type CatalogClass } from '../utils/catalog'
import ClassPointBuilder from '../components/ClassPointBuilder.vue'

const route = useRoute()
const campaignId = route.params.id as string
const authStore = useAuthStore()

const invites = ref<any[]>([])
const loadingInvites = ref(true)

const members = ref<any[]>([])
const loadingMembers = ref(true)

const customClasses = ref<any[]>([])
const loadingClasses = ref(true)
const catalogClasses = ref<CatalogClass[]>([])
const baseToCopy = ref('')
const classError = ref('')
const savingClass = ref(false)
const classAttributeKeys = ['str', 'int', 'dex', 'wil', 'con', 'cha']
const defaultCreationRules = () => ({ spellcaster: false, keyAttributes: [] as string[], minimumAttributes: Object.fromEntries(classAttributeKeys.map(k => [k, 3])) })

const settings = ref({
  currentYear: 1,
  currentMonth: 1,
  currentWeek: 1,
  optionalRules: {} as Record<string, boolean>
})
const settingsStatus = ref('')

const optionalRuleOptions = [
  { key: 'enableDomainEconomy', label: 'Ciclo econômico de domínio/fortaleza' },
  { key: 'enableMercenaryMorale', label: 'Moral e lealdade de mercenários' },
  { key: 'enableMagicResearchValidation', label: 'Validação automática de pesquisa mágica' },
  { key: 'enableTreasureToXp', label: 'Conversão de tesouro em XP' },
  { key: 'enableMonthlyMaintenance', label: 'Custos mensais de manutenção' },
  { key: 'enableActivityQueue', label: 'Fila semanal/mensal de atividades' },
  { key: 'enableClassAutoProgression', label: 'Progressão automática por classe' },
  { key: 'enableAdvancedEncumbrance', label: 'Encumbrance avançada' },
]

const economy = ref({
  grossRevenue: 0,
  expensesTotal: 0,
  stability: 0,
  loyalty: 0,
  monthlyEvent: '',
  consolidatedBalance: 0,
  notes: ''
})

const activities = ref<any[]>([])
const newActivity = ref({
  title: '',
  type: 'downtime',
  details: '',
  durationWeeks: 1,
  costGp: 0
})

const showAddClass = ref(false)
const editingClassId = ref<string | null>(null)

interface LevelData {
  level: number;
  xp: number;
  title: string;
  attackThrow: number;
  paralysis: number;
  death: number;
  blast: number;
  implements: number;
  spells: number;
  thiefOpenLocks: number;
  thiefFindTraps: number;
  thiefPickPockets: number;
  thiefMoveSilently: number;
  thiefClimbWalls: number;
  thiefHideInShadows: number;
  thiefHearNoise: number;
  rebukeSkeleton: string;
  rebukeZombie: string;
  rebukeGhoul: string;
  rebukeWight: string;
  rebukeWraith: string;
  rebukeMummy: string;
  rebukeSpectre: string;
  rebukeVampire: string;
}

  const defaultClassState = () => ({
    name: '',
    description: '',
    classFeatures: '',
    baseClassKey: '',
    creationRules: defaultCreationRules(),
    hitDie: '1d8',
    conBonus: true,
    levels: [
      {
        level: 1,
        xp: 0,
        title: 'Men-at-arms',
        attackThrow: 10,
        paralysis: 13,
        death: 14,
        blast: 15,
        implements: 16,
        spells: 17,
        thiefOpenLocks: 10,
        thiefFindTraps: 10,
        thiefPickPockets: 15,
        thiefMoveSilently: 15,
        thiefClimbWalls: 80,
        thiefHideInShadows: 10,
        thiefHearNoise: 14,
        rebukeSkeleton: '-',
        rebukeZombie: '-',
        rebukeGhoul: '-',
        rebukeWight: '-',
        rebukeWraith: '-',
        rebukeMummy: '-',
        rebukeSpectre: '-',
        rebukeVampire: '-'
      },
      {
        level: 2,
        xp: 2000,
        title: 'Warrior',
        attackThrow: 9,
        paralysis: 12,
        death: 13,
        blast: 14,
        implements: 15,
        spells: 16,
        thiefOpenLocks: 12,
        thiefFindTraps: 12,
        thiefPickPockets: 18,
        thiefMoveSilently: 18,
        thiefClimbWalls: 82,
        thiefHideInShadows: 12,
        thiefHearNoise: 14,
        rebukeSkeleton: '-',
        rebukeZombie: '-',
        rebukeGhoul: '-',
        rebukeWight: '-',
        rebukeWraith: '-',
        rebukeMummy: '-',
        rebukeSpectre: '-',
        rebukeVampire: '-'
      }
    ] as LevelData[]
  })

  const newClass = ref(defaultClassState())

onMounted(() => {
  loadInvites()
  loadMembers()
  loadClasses()
  loadSettings()
  loadEconomy()
  loadActivities()
})

function formatGp(value: number) {
  const n = Number(value || 0)
  return `${n >= 0 ? '+' : ''}${n.toFixed(0)} GP`
}

function defaultOptionalRules() {
  return {
    enableDomainEconomy: true,
    enableMercenaryMorale: true,
    enableMagicResearchValidation: true,
    enableTreasureToXp: true,
    enableMonthlyMaintenance: true,
    enableActivityQueue: true,
    enableClassAutoProgression: true,
    enableAdvancedEncumbrance: true,
  } as Record<string, boolean>
}

function isRuleEnabled(key: string) {
  return settings.value.optionalRules[key] !== false
}

async function loadSettings() {
  try {
    const res = await api.get(`/api/campaigns/${campaignId}/settings`)
    settings.value = {
      currentYear: res.data.currentYear || 1,
      currentMonth: res.data.currentMonth || 1,
      currentWeek: res.data.currentWeek || 1,
      optionalRules: {
        ...defaultOptionalRules(),
        ...(res.data.optionalRules || {})
      }
    }
  } catch (e) {
    notifyError(errorMessage(e, 'Não foi possível carregar as configurações da campanha.'))
  }
}

async function saveSettings() {
  try {
    await api.put(`/api/campaigns/${campaignId}/settings`, settings.value)
    settingsStatus.value = 'Configuracoes salvas.'
    notifySuccess('Configuracoes atualizadas com sucesso.')
    setTimeout(() => {
      settingsStatus.value = ''
    }, 2000)
  } catch (e) {
    const message = errorMessage(e, 'Não foi possível salvar as configurações.')
    settingsStatus.value = message
    notifyError(message)
  }
}

async function onRuleToggle() {
  await saveSettings()
}

async function advanceCalendar(mode: 'week' | 'month') {
  try {
    const res = await api.post(`/api/campaigns/${campaignId}/calendar/advance`, { mode })
    settings.value.currentYear = res.data.currentYear
    settings.value.currentMonth = res.data.currentMonth
    settings.value.currentWeek = res.data.currentWeek
    await loadActivities()
    await loadEconomy()
    notifyInfo(`Calendario avancado (${mode === 'week' ? 'semana' : 'mes'}).`)
  } catch (e) {
    notifyError(errorMessage(e, 'Não foi possível avançar o calendário.'))
  }
}

async function loadEconomy() {
  try {
    const res = await api.get(`/api/campaigns/${campaignId}/economy`)
    economy.value = {
      grossRevenue: res.data.grossRevenue || 0,
      expensesTotal: res.data.expensesTotal || 0,
      stability: res.data.stability || 0,
      loyalty: res.data.loyalty || 0,
      monthlyEvent: res.data.monthlyEvent || '',
      consolidatedBalance: res.data.consolidatedBalance || 0,
      notes: res.data.notes || ''
    }
  } catch (e) {
    notifyError(errorMessage(e, 'Não foi possível carregar a economia da campanha.'))
  }
}

async function refreshEconomy() {
  await loadEconomy()
  notifyInfo('Economia recalculada.')
}

async function saveEconomy() {
  try {
    await api.put(`/api/campaigns/${campaignId}/economy`, economy.value)
    await loadEconomy()
    notifySuccess('Economia salva com sucesso.')
  } catch (e) {
    notifyError(errorMessage(e, 'Não foi possível salvar a economia.'))
  }
}

async function loadActivities() {
  try {
    const res = await api.get(`/api/campaigns/${campaignId}/activities`)
    activities.value = res.data
  } catch (e) {
    notifyError(errorMessage(e, 'Não foi possível carregar as atividades.'))
  }
}

async function addActivity() {
  if (!newActivity.value.title.trim()) {
    notifyError('Informe um titulo para a atividade.')
    return
  }
  try {
    await api.post(`/api/campaigns/${campaignId}/activities`, newActivity.value)
    newActivity.value = {
      title: '',
      type: 'downtime',
      details: '',
      durationWeeks: 1,
      costGp: 0
    }
    await loadActivities()
    notifySuccess('Atividade adicionada na fila.')
  } catch (e) {
    notifyError(errorMessage(e, 'Não foi possível adicionar a atividade.'))
  }
}

async function resolveActivity(activityId: string) {
  try {
    await api.post(`/api/campaigns/${campaignId}/activities/${activityId}/resolve`, {})
    await loadActivities()
    notifyInfo('Atividade avancada em 1 semana.')
  } catch (e) {
    notifyError(errorMessage(e, 'Não foi possível avançar a atividade.'))
  }
}

async function loadMembers() {
  loadingMembers.value = true
  try {
    const res = await api.get(`/api/campaigns/${campaignId}/members`)
    members.value = res.data
  } catch (e) {
    notifyError(errorMessage(e, 'Não foi possível carregar os membros.'))
  } finally {
    loadingMembers.value = false
  }
}

async function kickMember(userId: string) {
  if (!confirm('Tem certeza que deseja expulsar este jogador?')) return
  try {
    await api.delete(`/api/campaigns/${campaignId}/members/${userId}`)
    await loadMembers()
    notifySuccess('Membro removido da campanha.')
  } catch (e) {
    notifyError(errorMessage(e, 'Não foi possível remover o membro.'))
  }
}

async function loadInvites() {
  loadingInvites.value = true
  try {
    const res = await api.get(`/api/campaigns/${campaignId}/invites`)
    invites.value = res.data
  } catch (e) {
    notifyError(errorMessage(e, 'Não foi possível carregar os convites.'))
  } finally {
    loadingInvites.value = false
  }
}

async function resolveInvite(userId: string, status: 'ACCEPTED'|'REJECTED') {
  try {
    await api.put(`/api/campaigns/${campaignId}/invites/${userId}`, { status })
    await loadInvites()
    await loadMembers()
    notifySuccess(status === 'ACCEPTED' ? 'Convite aceito.' : 'Convite recusado.')
  } catch (e) {
    notifyError(errorMessage(e, 'Não foi possível processar o convite.'))
  }
}

async function loadClasses() {
  loadingClasses.value = true
  try {
    const res = await api.get(`/api/classes/${campaignId}`)
    customClasses.value = res.data
    catalogClasses.value = (await api.get('/api/classes/catalog')).data
    if (route.query.baseClass && !templateOpened) {
      templateOpened = true
      baseToCopy.value = String(route.query.baseClass)
      copyBaseClass()
    }
  } catch(e) {
    notifyError(errorMessage(e, 'Não foi possível carregar as classes da campanha.'))
  } finally {
    loadingClasses.value = false
  }
}

function addLevel() {
  const lastLevel = newClass.value.levels[newClass.value.levels.length - 1]
  newClass.value.levels.push({
    level: lastLevel ? lastLevel.level + 1 : 1,
    xp: lastLevel ? lastLevel.xp * 2 : 0,
      title: '',
      attackThrow: lastLevel ? lastLevel.attackThrow : 10,
      paralysis: lastLevel ? lastLevel.paralysis : 13,
      death: lastLevel ? lastLevel.death : 14,
      blast: lastLevel ? lastLevel.blast : 15,
      implements: lastLevel ? lastLevel.implements : 16,
      spells: lastLevel ? lastLevel.spells : 17,
      thiefOpenLocks: lastLevel ? lastLevel.thiefOpenLocks : 10,
      thiefFindTraps: lastLevel ? lastLevel.thiefFindTraps : 10,
      thiefPickPockets: lastLevel ? lastLevel.thiefPickPockets : 15,
      thiefMoveSilently: lastLevel ? lastLevel.thiefMoveSilently : 15,
      thiefClimbWalls: lastLevel ? lastLevel.thiefClimbWalls : 80,
      thiefHideInShadows: lastLevel ? lastLevel.thiefHideInShadows : 10,
      thiefHearNoise: lastLevel ? lastLevel.thiefHearNoise : 14,
      rebukeSkeleton: lastLevel ? lastLevel.rebukeSkeleton : '-',
      rebukeZombie: lastLevel ? lastLevel.rebukeZombie : '-',
      rebukeGhoul: lastLevel ? lastLevel.rebukeGhoul : '-',
      rebukeWight: lastLevel ? lastLevel.rebukeWight : '-',
      rebukeWraith: lastLevel ? lastLevel.rebukeWraith : '-',
      rebukeMummy: lastLevel ? lastLevel.rebukeMummy : '-',
      rebukeSpectre: lastLevel ? lastLevel.rebukeSpectre : '-',
      rebukeVampire: lastLevel ? lastLevel.rebukeVampire : '-'
    })
  }

  function removeLevel(idx: number) {
    newClass.value.levels.splice(idx, 1)
  }

  function editClass(c: any) {
    let parsedCreationRules: Record<string, any> = {}
    try {
      parsedCreationRules = typeof c.creationRules === 'string'
        ? JSON.parse(c.creationRules || '{}')
        : (c.creationRules || {})
    } catch (e) {
      notifyError('As regras salvas desta classe são inválidas. Os valores padrão foram carregados para correção.')
    }
    if (parsedCreationRules.build) {
      parsedCreationRules = {
        spellcaster: parsedCreationRules.spellcaster,
        keyAttributes: parsedCreationRules.keyAttributes,
        minimumAttributes: parsedCreationRules.minimumAttributes
      }
      c={...c,id:null,name:`${c.name} (cópia manual)`,creationRules:JSON.stringify(parsedCreationRules)}
    }
    classStep.value = 0
    classError.value = ''
    useThiefSkills.value = false
    useRebukingUndead.value = false
    editingClassId.value = c.id
    showAddClass.value = true

    let parsedLevels: LevelData[] = []
    try {
      const xpArray = JSON.parse(c.xpPerLevel || '[]')
      const titlesArray = JSON.parse(c.titles || '[]')
      const atkArray = JSON.parse(c.attackThrows || '[]')
      const svArray = JSON.parse(c.savingThrows || '[]')
      const thiefArray = JSON.parse(c.thiefSkills || '[]')
      const rebukeArray = JSON.parse(c.rebukingUndead || '[]')
      useThiefSkills.value = thiefArray.length > 0
      useRebukingUndead.value = rebukeArray.length > 0
      const maxLen = Math.max(xpArray.length, titlesArray.length, atkArray.length, svArray.length)

      for (let i = 0; i < maxLen; i++) {
        parsedLevels.push({
          level: i + 1,
          xp: xpArray[i] || 0,
          title: titlesArray[i] || '',
          attackThrow: atkArray[i] ?? 10,
          paralysis: svArray[i]?.paralysis ?? 13,
          death: svArray[i]?.death ?? 14,
          blast: svArray[i]?.blast ?? 15,
          implements: svArray[i]?.implements ?? 16,
          spells: svArray[i]?.spells ?? 17,
          thiefOpenLocks: Number(thiefArray[i]?.openLocks ?? 10),
          thiefFindTraps: Number(thiefArray[i]?.findRemoveTraps ?? 10),
          thiefPickPockets: Number(thiefArray[i]?.pickPockets ?? 15),
          thiefMoveSilently: Number(thiefArray[i]?.moveSilently ?? 15),
          thiefClimbWalls: Number(thiefArray[i]?.climbWalls ?? 80),
          thiefHideInShadows: Number(thiefArray[i]?.hideInShadows ?? 10),
          thiefHearNoise: Number(thiefArray[i]?.hearNoise ?? 14),
          rebukeSkeleton: String(rebukeArray[i]?.skeleton ?? '-'),
          rebukeZombie: String(rebukeArray[i]?.zombie ?? '-'),
          rebukeGhoul: String(rebukeArray[i]?.ghoul ?? '-'),
          rebukeWight: String(rebukeArray[i]?.wight ?? '-'),
          rebukeWraith: String(rebukeArray[i]?.wraith ?? '-'),
          rebukeMummy: String(rebukeArray[i]?.mummy ?? '-'),
          rebukeSpectre: String(rebukeArray[i]?.spectre ?? '-'),
          rebukeVampire: String(rebukeArray[i]?.vampire ?? '-')
        })
      }
    } catch(e) {
      const message = 'A progressão salva desta classe é inválida. Uma linha inicial foi carregada para correção.'
      classError.value = message
      notifyError(message)
    }

    if (parsedLevels.length === 0) {
      parsedLevels = [{ level: 1, xp: 0, title: '', attackThrow: 10, paralysis: 13, death: 14, blast: 15, implements: 16, spells: 17, thiefOpenLocks: 10, thiefFindTraps: 10, thiefPickPockets: 15, thiefMoveSilently: 15, thiefClimbWalls: 80, thiefHideInShadows: 10, thiefHearNoise: 14, rebukeSkeleton: '-', rebukeZombie: '-', rebukeGhoul: '-', rebukeWight: '-', rebukeWraith: '-', rebukeMummy: '-', rebukeSpectre: '-', rebukeVampire: '-' }]
    }

    newClass.value = {
      name: c.name,
      description: c.description || '',
      classFeatures: c.classFeatures || '',
      baseClassKey: c.baseClassKey || '',
      creationRules: {
        ...defaultCreationRules(),
        ...(c.creationRules ? parsedCreationRules : { spellcaster: c.spellcaster ?? false, keyAttributes: c.keyAttributes ?? [], minimumAttributes: c.minimumAttributes ?? {} })
      },
      hitDie: c.hitDie,
      conBonus: c.conBonus,
      levels: parsedLevels
    }
}

function cancelEditClass() {
  classStep.value = 0
  useThiefSkills.value = false
  useRebukingUndead.value = false
  classError.value = ''
  showAddClass.value = false
  editingClassId.value = null
  newClass.value = defaultClassState()
}

async function saveClass() {
  if (savingClass.value) return
  classError.value = ''
  savingClass.value = true
  const isEditing = Boolean(editingClassId.value)
  const xpArray = newClass.value.levels.map(l => l.xp)
  const titlesArray = newClass.value.levels.map(l => l.title)
    const attackThrows = newClass.value.levels.map(l => Number(l.attackThrow))
    const savingThrows = newClass.value.levels.map(l => ({
      level: l.level,
      paralysis: Number(l.paralysis),
      death: Number(l.death),
      blast: Number(l.blast),
      implements: Number(l.implements),
      spells: Number(l.spells)
    }))
    const thiefSkills = newClass.value.levels.map(l => ({
      level: l.level,
      openLocks: Number(l.thiefOpenLocks),
      findRemoveTraps: Number(l.thiefFindTraps),
      pickPockets: Number(l.thiefPickPockets),
      moveSilently: Number(l.thiefMoveSilently),
      climbWalls: Number(l.thiefClimbWalls),
      hideInShadows: Number(l.thiefHideInShadows),
      hearNoise: Number(l.thiefHearNoise)
    }))
    const rebukingUndead = newClass.value.levels.map(l => ({
      level: l.level,
      skeleton: String(l.rebukeSkeleton || '-'),
      zombie: String(l.rebukeZombie || '-'),
      ghoul: String(l.rebukeGhoul || '-'),
      wight: String(l.rebukeWight || '-'),
      wraith: String(l.rebukeWraith || '-'),
      mummy: String(l.rebukeMummy || '-'),
      spectre: String(l.rebukeSpectre || '-'),
      vampire: String(l.rebukeVampire || '-')
    }))

    try {
      if (editingClassId.value) {
        await api.put(`/api/classes/${campaignId}/${editingClassId.value}`, {
          name: newClass.value.name,
          description: newClass.value.description,
          classFeatures: newClass.value.classFeatures,
          baseClassKey: newClass.value.baseClassKey,
          creationRules: newClass.value.creationRules,
          hitDie: newClass.value.hitDie,
          conBonus: newClass.value.conBonus,
          xpPerLevel: xpArray,
          titles: titlesArray,
          attackThrows,
          savingThrows,
          thiefSkills: useThiefSkills.value ? thiefSkills : [],
          rebukingUndead: useRebukingUndead.value ? rebukingUndead : []
        })
      } else {
        await api.post(`/api/classes/${campaignId}`, {
          name: newClass.value.name,
          description: newClass.value.description,
          classFeatures: newClass.value.classFeatures,
          baseClassKey: newClass.value.baseClassKey,
          creationRules: newClass.value.creationRules,
          hitDie: newClass.value.hitDie,
          conBonus: newClass.value.conBonus,
          xpPerLevel: xpArray,
          titles: titlesArray,
          attackThrows,
          savingThrows,
          thiefSkills: useThiefSkills.value ? thiefSkills : [],
          rebukingUndead: useRebukingUndead.value ? rebukingUndead : []
        })
      }

    cancelEditClass()
    await loadClasses()
    notifySuccess(isEditing ? 'Classe atualizada.' : 'Classe criada.')
  } catch (e) {
    classError.value = errorMessage(e, 'Erro ao salvar classe.')
    notifyError(classError.value)
  } finally {
    savingClass.value = false
  }
}

async function deleteClass(classId: string) {
  if (!confirm('Tem certeza?')) return;
  try {
    await api.delete(`/api/classes/${campaignId}/${classId}`)
    await loadClasses()
    notifySuccess('Classe removida.')
  } catch(e) {
    classError.value = errorMessage(e, 'Falha ao remover classe.')
    notifyError(classError.value)
  }
}

function startBlankClass() {
  cancelEditClass()
  showAddClass.value = true
}

const classSteps = ['Identidade e poderes', 'Progressão', 'Revisão']
const classStep = ref(0), useThiefSkills = ref(false), useRebukingUndead = ref(false)
let templateOpened = false
function nextClassStep() {
  classError.value = ''
  if (classStep.value === 0 && (!newClass.value.name.trim() || !/^1d(4|6|8|10|12)$/.test(newClass.value.hitDie))) {
    classError.value = 'Preencha o nome e um dado de vida válido (1d4 a 1d12).'; return
  }
  if (classStep.value === 1 && (newClass.value.levels[0]?.xp !== 0 || newClass.value.levels.some((l, i, all) => !Number.isInteger(l.xp) || (i > 0 && l.xp <= all[i - 1]!.xp)))) {
    classError.value = 'O primeiro nível começa em 0 XP; os demais exigem valores crescentes.'; return
  }
  classStep.value++
}

function copyBaseClass() {
  const base = catalogClasses.value.find(c => c.id === baseToCopy.value)
  if (!base) return
  editClass(base)
  editingClassId.value = null
  newClass.value.name = `${base.name} — variante`
  newClass.value.baseClassKey = base.id
  classError.value = ''
}
</script>
