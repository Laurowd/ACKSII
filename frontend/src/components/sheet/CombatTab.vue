<template>
  <div class="space-y-4">
    <!-- ====== HEADER / BIO ====== -->
    <div class="bg-dark-card border border-gold/20 rounded-xl p-5 mb-4">
      <h2 class="text-xl font-bold text-gold mb-4 border-b border-gold/10 pb-2">Identidade do personagem</h2>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div class="col-span-2">
          <label class="lbl">Campanha Atual</label>
          <select v-model="character.campaignId" @change="emit('campaign-change')" class="inp">
            <option :value="null">Sem Campanha</option>
            <option v-for="c in campaigns" :key="c.id" :value="c.id">{{ c.name }}</option>
          </select>
        </div>
        <div v-if="authStore.isMaster && character.campaignId" class="col-span-2">
          <label class="lbl">Jogador (Dono da Ficha)</label>
          <select v-model="character.userId" @change="emit('owner-change')" class="inp">
            <option v-for="m in currentCampaignMembers" :key="m.userId" :value="m.userId">
              {{ m.user.username }}
            </option>
          </select>
        </div>
        <div class="col-span-2 md:col-span-4 lg:col-span-2">
          <label class="lbl">Character Name</label>
          <input v-model="character.characterName" @input="emit('save')" @change="emit('save')" class="inp text-lg font-bold text-gold" />
        </div>
        <div>
          <label class="lbl">Local de origem</label>
          <input v-model="character.birthplace" @input="emit('save')" @change="emit('save')" class="inp" />
        </div>
        <div>
          <label for="sheet-class" class="lbl">Classe</label>
          <select v-if="customClasses.length > 0" id="sheet-class" :value="selectedCustomClass?.id || character.classKey" @change="requestClassChange" :disabled="!canManage" class="inp">
            <option v-if="!character.classKey && character.className" value="">{{ character.className }} (cadastro anterior)</option>
            <option v-else value="" disabled>Selecione uma classe</option>
            <option v-for="c in customClasses" :key="c.id" :value="c.id">{{ c.name }} — {{ c.source === 'catalog' ? 'base' : 'campanha' }}</option>
          </select>
          <output v-else id="sheet-class" class="inp block">{{ character.className }}</output>
          <button v-if="canManage" type="button" @click="emit('class-change', character.classKey)" class="text-xs text-gold underline mt-1">Revisar classe e concessões</button>
        </div>
        <div v-if="levelFeats?.availableSubclasses && levelFeats.availableSubclasses.length > 0">
          <template v-if="usesStructuredTradition">
            <label for="sheet-class-tradition" class="lbl">{{ character.className === 'Warlock' ? 'Dark Path do Warlock' : 'Tradição da Witch' }}</label>
            <output id="sheet-class-tradition" class="inp block">{{ selectionsFor(character,selectedCustomClass?.rules).tradition || selectionsFor(character,selectedCustomClass?.rules)['dark-path'] || 'Escolha pendente' }}</output>
            <p class="text-xs text-steel-light mt-1">Confira a tradição em Evolução &amp; Regras → Escolhas próprias da classe.</p>
          </template>
          <template v-else>
          <label class="lbl" v-if="character.className.toLowerCase() === 'warlock'">Dark Path</label>
          <label class="lbl" v-else-if="character.className.toLowerCase() === 'witch'">Tradition</label>
          <label class="lbl" v-else>Subclass</label>
          <select v-model="character.subclass" @input="emit('save')" @change="emit('save')" class="inp">
            <option value="">(Select)</option>
            <option v-for="sub in levelFeats.availableSubclasses" :key="sub" :value="sub">{{ sub }}</option>
          </select>
          </template>
        </div>
        <div>
          <label class="lbl">Título</label>
          <input v-model="character.title" @input="emit('save')" @change="emit('save')" class="inp" />
        </div>
        <div>
          <label class="lbl">Alinhamento</label>
          <select v-model="character.alignment" @input="emit('save')" @change="emit('save')" class="inp">
            <option value="">-</option>
            <option value="Lawful">Ordeiro</option>
            <option value="Neutral">Neutro</option>
            <option value="Chaotic">Caótico</option>
          </select>
        </div>
        <div>
          <label class="lbl">Idade</label>
          <input v-model.number="character.age" @input="emit('save')" @change="emit('save')" type="number" class="inp" />
        </div>
        <div>
          <label class="lbl">Tamanho</label>
          <select v-model="character.size" @input="emit('save')" @change="emit('save')" class="inp">
            <option value="Small">Pequeno</option>
            <option value="Medium">Médio</option>
            <option value="Large">Grande</option>
          </select>
        </div>
        <div>
          <label class="lbl">Gênero</label>
          <input v-model="character.gender" @input="emit('save')" @change="emit('save')" class="inp" />
        </div>
        <div>
          <label class="lbl">Dados de vida</label>
          <input v-model="character.hitDice" @input="emit('save')" @change="emit('save')" class="inp" placeholder="1d8" />
        </div>
      </div>
    </div>

    <!-- ====== LEVEL / XP / HP ROW ====== -->
    <div class="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
      <div class="stat-box">
        <label class="lbl">Nível</label>
        <input :value="character.level" readonly aria-label="Nível atual" type="number" class="inp text-center text-2xl font-bold text-gold" />
        <p class="text-[10px] text-steel-light mt-1">Avance em Evolução &amp; Regras.</p>
      </div>
      <div class="stat-box">
        <label class="lbl">XP</label>
        <input :value="character.xp" readonly type="number" aria-label="XP acumulado" class="inp text-center" />
        <p class="text-[10px] text-steel-light mt-1">O mestre registra o XP da sessão.</p>
      </div>
      <div class="stat-box">
        <label class="lbl">XP Próx. Nível</label>
        <div class="inp text-center bg-dark-bg/50 text-gold cursor-default">{{ (displayXpNext || 0).toLocaleString() }}</div>
      </div>
      <div class="stat-box">
        <label class="lbl">HP Máx</label>
        <input v-model.number="character.hpMax" @input="emit('save')" @change="emit('save')" type="number" class="inp text-center text-xl font-bold text-green-400" />
      </div>
      <div class="stat-box">
        <label class="lbl">HP Atual</label>
        <input v-model.number="character.hpCurr" @input="emit('save')" @change="emit('save')" type="number" class="inp text-center text-xl font-bold"
          :class="hpPercent > 50 ? 'text-green-400' : hpPercent > 25 ? 'text-yellow-400' : 'text-red-400'" />
      </div>
    </div>

    <!-- ====== ATTRIBUTES ====== -->
    <div class="bg-dark-card border border-gold/20 rounded-xl p-5 mb-4">
      <h2 class="text-xl font-bold text-gold mb-4 border-b border-gold/10 pb-2">Atributos</h2>
      <div class="grid grid-cols-3 md:grid-cols-6 gap-4">
        <div v-for="attr in ATTRS" :key="attr.key" class="text-center">
          <label class="text-xs font-bold uppercase tracking-wider" :class="attr.color">{{ attr.label }}</label>
          <input v-model.number="character[attr.key]" @input="emit('save')" @change="emit('save')" :aria-label="attr.label" type="number" min="3" max="18"
            class="inp text-center text-2xl font-bold mt-1" />
          <div class="mt-1 text-sm font-bold px-2 py-0.5 rounded"
            :class="getModifier(character[attr.key]) >= 0 ? 'text-green-400 bg-green-400/10' : 'text-red-400 bg-red-400/10'">
            {{ formatMod(getModifier(character[attr.key])) }}
          </div>
          <div class="text-[10px] text-steel mt-0.5">{{ attr.affects }}</div>
        </div>
      </div>
    </div>

    <!-- ====== FERIMENTOS E CICATRIZES ====== -->
    <div v-if="character.hpCurr === 0 || character.scars?.length" class="bg-red-950/20 border border-red-500/30 rounded-xl p-5 mb-4 animate-glow">
      <div class="flex items-center justify-between mb-3 border-b border-red-500/20 pb-2">
        <h3 class="text-lg font-bold text-red-500">TAMPERING WITH MORTALITY (SCARS)</h3>
        <button @click="addScar" class="text-xs bg-red-900/50 text-red-200 px-3 py-1 rounded hover:bg-red-800 transition-all">+ Novo Ferimento</button>
      </div>
      <p class="text-xs text-red-300/70 mb-3">Quando cair a 0 HP e sobreviver na tabela de Mortal Wounds.</p>
      
      <div class="grid grid-cols-1 gap-2">
        <div v-for="scar in character.scars" :key="scar.id" class="flex flex-col sm:flex-row items-start sm:items-center gap-2 mb-2 bg-dark-bg/50 p-2 rounded">
          <input v-model="scar.description" @change="saveScar(scar)" class="inp-table flex-1 w-full text-red-200 placeholder-red-400/50 border-red-500/30" placeholder="Descrição da fratura/cicatriz..." />
          <div class="flex items-center gap-2 w-full sm:w-auto mt-2 sm:mt-0">
            <input v-model.number="scar.daysToRest" @change="saveScar(scar)" type="number" class="inp-table w-16 text-center border-red-500/30 text-xs" placeholder="Dias" title="Dias de Repouso" />
            <span class="text-[10px] text-red-400">Dias</span>
            <input v-model="scar.debuff" @change="saveScar(scar)" class="inp-table w-24 border-red-500/30 text-xs" placeholder="Debuffs..." />
            <button @click="removeScar(scar.id)" type="button" class="text-red-500 hover:text-red-400 text-xs font-bold px-2">X</button>
          </div>
        </div>
      </div>
    </div>

    <!-- ====== COMBAT ROW ====== -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
      <div class="bg-dark-card border border-gold/20 rounded-xl p-5">
        <h3 class="text-lg font-bold text-gold mb-3">Classe de armadura</h3>
        <div class="grid grid-cols-2 gap-2 mb-4 border-b border-steel-dark pb-4">
          <div class="col-span-2">
            <label class="lbl">Armadura equipada</label>
            <input v-model="character.armorName" @input="emit('save')" @change="emit('save')" class="inp" placeholder="e.g. Chainmail" />
          </div>
          <div>
            <label class="lbl" title="Inclua aqui a armadura e outros bônus permanentes. DES e escudo são somados automaticamente.">Bônus da armadura/efeitos</label>
            <input v-model.number="character.armorAcBonus" @input="emit('save')" @change="emit('save')" type="number" class="inp text-center" />
            <label class="lbl mt-2">Ajuste de CA (poderes, magia, mestre)</label>
            <input v-model.number="character.acAdjustment" @input="emit('save')" @change="emit('save')" type="number" class="inp text-center" />
          </div>
          <div>
            <label class="lbl">Peso (stone)</label>
            <input v-model.number="character.armorWeight" @input="emit('save')" @change="emit('save')" type="number" step="0.1" class="inp text-center" />
          </div>
        </div>
        <div class="grid grid-cols-1 gap-2 mb-2">
          <div class="text-center flex items-center justify-between">
            <label class="lbl mb-0">Sem armadura (DES)</label>
            <div class="w-16 py-1 bg-dark-bg/50 border border-steel-dark rounded-lg text-gold text-center text-sm font-bold cursor-default">{{ computedAC.noArmor }}</div>
          </div>
          <div class="text-center flex items-center justify-between">
            <label class="lbl mb-0">Equipada sem escudo</label>
            <div class="w-16 py-1 bg-dark-bg/50 border border-steel-dark rounded-lg text-gold text-center text-sm font-bold cursor-default">{{ computedAC.noShield }}</div>
          </div>
          <div class="text-center flex items-center justify-between">
            <label class="lbl mb-0 w-32 text-left">Equipada com escudo</label>
            <div class="w-16 py-1 bg-dark-bg/50 border border-steel-dark rounded-lg text-gold text-center text-sm font-bold cursor-default">{{ computedAC.withShield }}</div>
          </div>
          <p v-if="!combatMetrics.shieldAllowed" class="text-xs text-steel-light">Sem benefício de escudo: a classe não possui o estilo Weapon and Shield.</p>
        </div>
      </div>

      <div class="bg-dark-card border border-gold/20 rounded-xl p-5">
        <h3 class="text-lg font-bold text-gold mb-3">Salvamentos</h3>
        <div class="grid grid-cols-1 gap-2">
          <div v-for="save in SAVES" :key="save.key" class="flex items-center justify-between bg-dark-bg/35 border border-steel-dark/50 rounded-lg px-3 py-2 hover:bg-dark-bg/50 transition-colors">
            <label class="text-xs uppercase tracking-wider text-steel-light shrink-0 font-semibold">{{ save.label }}</label>
            <input v-model.number="character[save.key]" @input="emit('save')" @change="emit('save')" :aria-label="`Salvamento: ${save.label}`" type="number"
              class="w-16 py-1 px-2 text-center text-sm font-bold bg-dark-bg border border-steel-dark rounded-lg text-gold focus:outline-none focus:border-gold transition-all shrink-0" />
          </div>
        </div>
      </div>

      <div class="bg-dark-card border border-gold/20 rounded-xl p-5">
        <h3 class="text-lg font-bold text-gold mb-3">Iniciativa e surpresa</h3>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="lbl">Iniciativa</label>
            <div class="inp text-center text-lg font-bold bg-dark-bg/50 text-gold cursor-default">{{ formatMod(computedInitiative) }}</div>
            <p class="text-xs text-steel-light">{{ combatMetrics.initiativeSources.map(e => `${e.source} ${formatMod(e.value)}`).join(' · ') }}</p>
            <p class="text-xs text-steel-light">Ao conjurar: {{ formatMod(combatMetrics.castingInitiative) }}. Some ajustes situacionais aplicáveis.</p>
            <p v-for="effect in effects.conditional" :key="effect" class="text-xs text-gold">{{ effect }}</p>
          </div>
          <div>
            <label class="lbl">Surpresa (ajuste)</label>
            <input v-model.number="character.surprise" @input="emit('save')" @change="emit('save')" type="number" class="inp text-center" />
          </div>
          <div>
            <label class="lbl">Surpreender outros</label>
            <input v-model.number="character.surpriseOthers" @input="emit('save')" @change="emit('save')" type="number" class="inp text-center" />
          </div>
          <div>
            <label class="lbl">Evitar surpresa</label>
            <input v-model.number="character.avoidSurprise" @input="emit('save')" @change="emit('save')" type="number" class="inp text-center" />
            <p class="text-xs text-steel-light">Bônus de classe/proficiências: {{ formatMod(effects.avoidSurprise) }}. Campo acima: total manual.</p>
          </div>
          <div>
            <div class="mb-1 flex items-center justify-center gap-1"><span class="lbl">Cura natural</span>
            <HelpTooltip label="Cura natural">
              Após um dia completo de repouso, recupere 1d3 PV. Ajustes de classe, magia ou tratamento são aplicados separadamente.
            </HelpTooltip>
            </div>
            <div class="inp text-center bg-dark-bg/50 text-green-400 cursor-default">{{ computedHealingRate }} PV/dia</div>
          </div>
          <div>
            <label class="lbl">Mortal Wounds</label>
            <input v-model.number="character.mortalWounds" @input="emit('save')" @change="emit('save')" type="number" class="inp text-center" />
          </div>
          <div>
            <label class="lbl">Cleaves</label>
            <input v-model.number="character.cleaves" @input="emit('save')" @change="emit('save')" type="number" class="inp text-center" />
            <button type="button" class="text-xs text-gold underline" @click="character.cleaves = effects.cleaves; emit('save')">Usar limite {{ effects.cleaves }}</button>
          </div>
        </div>
      </div>
    </div>

    <!-- ====== MOVEMENT ====== -->
    <div class="bg-dark-card border border-gold/20 rounded-xl p-5 mb-4 relative">
      <h3 class="text-lg font-bold text-gold mb-3 flex flex-wrap items-center gap-2">
        MOVEMENT
        <span class="text-sm font-normal text-steel-light ml-2">
          (Carga: {{ encumbranceResult.totalStone.toFixed(1) }}/{{ encumbranceResult.maxCapacity }} stone — {{ encumbranceResult.category }})
        </span>
        <HelpTooltip label="Movement">
          Encumbrance determina as velocidades básicas do personagem:<br/><br/>
          <strong class="text-green-400">Leve:</strong> até 5 Stone (120' / 40')<br/>
          <strong class="text-yellow-400">Médio:</strong> até 7 Stone (90' / 30')<br/>
          <strong class="text-red-400">Pesado:</strong> acima de 7 Stone (60' / 20')
          <br/><strong class="text-red-400">Capacidade máxima:</strong> 20 + modificador de FOR. Acima dela o personagem não pode se mover carregando toda a carga.
        </HelpTooltip>
      </h3>
      <p v-if="encumbranceResult.overCapacity" class="mb-3 rounded-lg border border-red-500/50 bg-red-950/30 px-3 py-2 text-sm font-semibold text-red-300">
        Capacidade excedida em {{ encumbranceResult.capacityExceededBy.toFixed(1) }} stone. Descarregue ou transfira itens para voltar a se mover.
      </p>
      <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
        <div v-for="mv in MOVES" :key="mv.key" class="text-center">
          <label class="lbl">{{ mv.label }}</label>
          <div class="inp text-center font-bold bg-dark-bg/50 cursor-default"
            :class="encumbranceResult.category === 'Leve' ? 'text-green-400' : encumbranceResult.category === 'Médio' ? 'text-yellow-400' : 'text-red-400'">
            {{ getMoveValue(mv.resultKey) }}
          </div>
          <div class="text-[10px] text-steel">{{ mv.unit }}</div>
        </div>
      </div>
      <p class="text-xs text-steel-light mt-3">As velocidades máximas de Climb e Stealth exigem, respectivamente, penalidades de −10 e −5 no teste. Use as velocidades reduzidas quando não quiser essas penalidades.</p>
    </div>

    <div v-if="levelFeats?.levelStats?.length > 0 || levelFeats?.tables?.length > 0 || levelFeats?.powers?.length > 0" class="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
      <!-- eslint-disable vue/no-v-for-template-key -->
      <template v-for="(block, idx) in levelFeats.levelStats" :key="'tsblock-'+idx">
        <div v-if="block.stats.length > 0" class="bg-dark-card border border-gold/20 rounded-xl p-5">
          <h3 class="text-lg font-bold text-gold mb-3">{{ block.sectionTitle }}</h3>
          <div class="grid grid-cols-2 gap-2 text-sm">
            <div v-for="skill in block.stats" :key="skill.label" class="bg-dark-bg/35 border border-steel-dark/50 rounded px-3 py-2 flex items-center justify-between">
              <span class="text-steel-light">{{ skill.label }}</span>
              <span class="text-gold font-bold">{{ skill.value }}</span>
            </div>
          </div>
        </div>
      </template>

      <template v-for="(table, idx) in levelFeats.tables" :key="'rutable-'+idx">
        <div class="bg-dark-card border border-gold/20 rounded-xl p-5 col-span-1 lg:col-span-2">
          <h3 class="text-lg font-bold text-gold mb-3">{{ table.title }}</h3>
          <p v-if="table.description" class="text-sm text-steel-light mb-4">{{ table.description }}</p>
          <div class="overflow-x-auto">
            <table class="w-full text-sm text-left">
              <thead>
                <tr class="text-steel-light border-b border-steel-dark uppercase tracking-wider text-xs">
                  <th v-for="col in table.columns" :key="col" class="py-2 px-2">{{ col }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(row, rIdx) in table.rows" :key="rIdx" class="border-b border-steel-dark/30 hover:bg-dark-bg/20 transition-colors">
                  <td v-for="(cell, cIdx) in row" :key="cIdx" class="py-2 px-2">{{ cell }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </template>

      <!-- Classic Powers list -->
      <details v-if="levelFeats.futurePowers?.length" class="p-4 border border-steel-dark rounded">
        <summary class="text-gold cursor-pointer">Poderes de níveis futuros</summary>
        <div v-for="(power,i) in levelFeats.futurePowers" :key="i" class="text-sm mt-2 flex items-center gap-2"><HelpTooltip :label="power.name">{{ power.description }}</HelpTooltip><span>{{ power.name }}<span v-if="power.minimumLevel" class="text-steel-light"> · nível {{ power.minimumLevel }}</span></span></div>
      </details>
      <template v-if="levelFeats?.powers?.length > 0">
        <div class="bg-dark-card border border-gold/20 rounded-xl p-5 col-span-1 lg:col-span-2">
          <h3 class="text-lg font-bold text-gold mb-4">Poderes da Classe</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div v-for="(pw, idx) in levelFeats.powers" :key="'pow-'+idx" class="bg-dark-bg/40 border border-steel-dark/30 rounded p-3 flex items-center gap-3">
              <HelpTooltip :label="pw.name">{{ pw.description }}</HelpTooltip>
              <div class="min-w-0 font-bold text-dark-text break-words">{{ pw.name }}</div>
            </div>
          </div>
        </div>
      </template>

    </div>

    <!-- ====== WEAPONS ====== -->
    <div class="bg-dark-card border border-gold/20 rounded-xl p-5 mb-4">
      <div class="flex items-center justify-between mb-3">
        <h3 class="text-lg font-bold text-gold">Armas</h3>
        <button type="button" @click="addWeapon" class="text-sm text-gold hover:text-gold-light transition-colors">+ Adicionar arma</button>
      </div>
      <p class="mb-3 text-xs text-steel-light">O alvo é Base + CA − bônus. Escolha o estilo para usar FOR no corpo a corpo ou DES à distância, inclusive ao arremessar uma arma. “Outros” guarda bônus de arma, estilo e efeitos.</p>
      <div v-if="character.weapons?.length" class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="text-steel-light border-b border-steel-dark text-xs uppercase tracking-wider">
              <th class="text-left py-2.5 px-2">Arma e estilo de combate</th>
              <th class="text-center py-2.5 px-1">Init</th>
              <th class="text-center py-2.5 px-1">Base</th>
              <th class="text-center py-2.5 px-1">Atributo</th>
              <th class="text-center py-2.5 px-1">Outros</th>
              <th class="text-center py-2.5 px-1">Dano</th>
              <th class="text-center py-2.5 px-1">Alcance</th>
              <th class="text-center py-2.5 px-1">Carga</th>
              <th class="text-center py-2 px-1"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="w in character.weapons" :key="w.id" class="border-b border-steel-dark/30 align-top hover:bg-dark-bg/20 transition-colors">
              <td class="py-2 px-2">
                <input v-model="w.name" @blur="saveWeapon(w)" :aria-label="`Nome da arma ${w.name || 'nova'}`" class="inp-table w-full" placeholder="Arma" list="acks-weapon-compendium" />
                <button type="button" @click="applyCompendiumWeapon(w)" class="text-xs text-gold underline">Usar valores do catálogo</button>
                <select v-model="w.style" @change="saveWeapon(w)" :aria-label="`Estilo de ${w.name || 'arma'}`" class="inp-table w-full text-xs mt-0.5">
                  <option value="">Automático pelo alcance</option><option value="Single Weapon">Arma única</option><option value="Dual Weapon">Duas armas</option><option value="Two-Handed Weapon">Arma de duas mãos</option><option value="Weapon and Shield">Arma e escudo</option><option value="Missile Weapon">Arma de projéteis</option>
                  <option v-if="w.style && !['Single Weapon','Dual Weapon','Two-Handed Weapon','Weapon and Shield','Missile Weapon'].includes(w.style)" :value="w.style">{{ w.style }}</option>
                </select>
              </td>
              <td class="py-2 px-1 text-center">
                <input v-model.number="w.initBonus" @blur="saveWeapon(w)" type="number" class="w-14 px-2 py-1 bg-dark-bg border border-steel-dark rounded text-dark-text text-center focus:outline-none focus:border-gold" />
              </td>
              <td class="py-2 px-1 text-center">
                <input v-model.number="w.attackThrow" @blur="saveWeapon(w)" type="number" class="w-14 px-2 py-1 bg-dark-bg border border-steel-dark rounded text-center font-bold text-gold focus:outline-none focus:border-gold" />
              </td>
              <td class="py-2 px-1 text-center text-xs font-semibold text-steel-light whitespace-nowrap">
                {{ weaponAbilityLabel(w) }}
                <select v-if="effects.finesseFor(w)" v-model="w.attackAbility" @change="saveWeapon(w)" :aria-label="`Atributo de ataque de ${w.name}`" class="inp mt-1 text-xs"><option value="auto">Melhor atributo</option><option value="str">STR</option><option value="dex">DEX · Weapon Finesse</option></select>
              </td>
              <td class="py-2 px-1 text-center">
                <input v-model.number="w.attackBonus" @blur="saveWeapon(w)" type="number" class="w-14 px-2 py-1 bg-dark-bg border border-steel-dark rounded text-center font-bold text-gold focus:outline-none focus:border-gold" title="Outros bônus de ataque; não inclua FOR ou DES" />
              </td>
              <td class="py-2 px-1 text-center">
                <input v-model="w.damage" @input="w.automaticDamage = false" @blur="saveWeapon(w)" class="w-16 px-2 py-1 bg-dark-bg border border-steel-dark rounded text-dark-text text-center focus:outline-none focus:border-gold" />
                <p class="text-xs text-steel-light">{{ w.automaticDamage ? 'Base por estilo' : 'Manual' }} · classe {{ formatMod(effects.weaponDamageBonusFor(w)) }}</p>
              </td>
              <td class="py-2 px-1">
                <div class="flex gap-1.5 justify-center">
                  <div class="flex flex-col items-center gap-0.5">
                    <span class="text-[10px] text-steel">S</span>
                    <input v-model.number="w.rangeShort" @blur="saveWeapon(w)" type="number" class="w-11 px-1.5 py-1 bg-dark-bg border border-steel-dark rounded text-dark-text text-center focus:outline-none focus:border-gold" title="Short" />
                  </div>
                  <div class="flex flex-col items-center gap-0.5">
                    <span class="text-[10px] text-steel">M</span>
                    <input v-model.number="w.rangeMed" @blur="saveWeapon(w)" type="number" class="w-11 px-1.5 py-1 bg-dark-bg border border-steel-dark rounded text-dark-text text-center focus:outline-none focus:border-gold" title="Medium" />
                  </div>
                  <div class="flex flex-col items-center gap-0.5">
                    <span class="text-[10px] text-steel">L</span>
                    <input v-model.number="w.rangeLong" @blur="saveWeapon(w)" type="number" class="w-11 px-1.5 py-1 bg-dark-bg border border-steel-dark rounded text-dark-text text-center focus:outline-none focus:border-gold" title="Long" />
                  </div>
                </div>
              </td>
              <td class="py-2 px-1 text-center">
                <input v-model.number="w.encumbrance" @blur="saveWeapon(w)" type="number" step="any" class="w-14 px-2 py-1 bg-dark-bg border border-steel-dark rounded text-dark-text text-center focus:outline-none focus:border-gold" />
              </td>
              <td class="py-2 px-1 text-center">
                <button type="button" @click="removeWeapon(w.id)" :aria-label="`Remover arma ${w.name || 'sem nome'}`" class="text-crimson-light hover:text-crimson text-xs font-bold px-1.5 py-0.5 rounded border border-transparent hover:border-crimson/40">X</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-if="character.weapons?.length" class="mt-4 pt-4 border-t border-steel-dark space-y-4">
        <div v-for="w in character.weapons" :key="w.id">
          <h4 class="text-sm font-bold text-gold mb-2">{{ w.name || 'Arma sem nome' }} <span class="text-steel font-normal text-xs">· ataque necessário para acertar a CA</span></h4>
          <div class="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-11 gap-1.5">
            <div v-for="ac in 11" :key="ac - 1" class="bg-dark-bg/40 border border-steel-dark/60 rounded px-2 py-1.5 flex items-center justify-between">
              <span class="text-[11px] text-steel-light font-semibold">CA {{ ac - 1 }}</span>
              <div class="min-w-8 text-center text-sm font-bold text-gold">
                {{ attackThrowForWeaponAC(w, ac - 1) }}
              </div>
            </div>
          </div>
        </div>
      </div>
      <p v-else class="text-steel text-sm pt-2">Nenhuma arma registrada. Adicione uma arma ou compre na loja do inventário.</p>
      <datalist id="acks-weapon-compendium">
        <option v-for="entry in compendiumWeapons" :key="entry.id" :value="entry.name" :label="entry.name" />
      </datalist>
    </div>

    <!-- ====== PROFICIENCIES ====== -->
    <div class="rounded-xl border border-steel-dark p-4 text-sm text-steel-light space-y-2">
      <p>Inclua escolhas de proficiência pelo assistente, que confere a lista da classe e os limites. O alvo do teste pode ser ajustado abaixo conforme a situação em jogo.</p>
      <button type="button" @click="emit('open-rules')" class="text-gold underline">Escolher proficiências com validação</button>
      <p v-if="canManage" class="text-xs">Os nomes e botões de inclusão abaixo são ajustes manuais do mestre para exceções da campanha.</p>
    </div>
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
      <div v-for="cat in PROF_CATS.filter(cat => cat.key !== 'natural' || getProfsByCategory('natural').length)" :key="cat.key" class="bg-dark-card border border-gold/20 rounded-xl p-5" :class="cat.key === 'natural' ? 'lg:col-span-3' : ''">
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-lg font-bold text-gold">{{ cat.icon }} {{ cat.label }}</h3>
          <button v-if="canManage" type="button" @click="addProficiency(cat.key)" :aria-label="`Adicionar proficiência: ${cat.label}`" class="text-sm text-gold hover:text-gold-light transition-colors">+</button>
        </div>
        <p v-if="cat.key === 'natural'" class="text-sm text-steel-light mb-3">{{ naturalOriginLabel }} · concedidas pela classe, sem gastar escolhas.</p>
        <div v-for="p in getProfsByCategory(cat.key)" :key="p.id" class="mb-2">
        <div class="flex items-center gap-2 bg-dark-bg/35 border border-steel-dark/50 rounded-lg px-2.5 py-2 hover:bg-dark-bg/50 transition-colors">
          <SearchableChoice v-if="canManage" v-model="p.name" @change="saveProficiency(p)" :options="manualProficiencyOptions(cat.key)" :label="`Nome da proficiência ${p.name || 'nova'}`" class="flex-1" placeholder="Proficiência" />
          <input v-else :value="p.name" readonly :aria-label="`Nome da proficiência ${p.name || 'nova'}`" class="flex-1 min-w-0 px-2 py-1 bg-dark-bg border border-steel-dark rounded text-dark-text text-sm" placeholder="Proficiência" />
          <template v-if="cat.key !== 'natural' || p.name.trim().toLowerCase() === 'climbing' || p.name.startsWith('Craft (')">
            <label :for="`proficiency-target-${p.id}`" class="text-[10px] uppercase tracking-wider text-steel w-10 text-right font-semibold shrink-0">Alvo</label>
            <input :id="`proficiency-target-${p.id}`" v-model.number="p.throwTarget" @change="saveProficiency(p)" :aria-label="`Alvo da proficiência ${p.name || 'nova'}`" type="number" class="w-14 shrink-0 px-2 py-1 bg-dark-bg border border-steel-dark rounded text-gold text-center text-sm font-bold focus:outline-none focus:border-gold" />
          </template>
          <button v-if="canManage || !['adventuring','natural'].includes(cat.key)" type="button" @click="removeProficiency(p.id)" :aria-label="`Remover proficiência ${p.name || 'sem nome'}`" class="text-crimson-light hover:text-crimson text-xs font-bold px-1.5 py-0.5 rounded border border-transparent hover:border-crimson/40 shrink-0">X</button>
        </div>
        <p v-if="powerTargetFor(p) !== undefined && powerTargetFor(p) !== p.throwTarget" class="text-xs text-gold mt-1">Referência com as graduações gratuitas da classe: {{ powerTargetFor(p) }}+. Confira com o mestre antes de alterar o alvo; ajustes manuais são preservados.</p>
        <p v-if="cat.key === 'natural' && naturalGrantFor(p)" class="text-xs text-steel-light mt-1">{{ naturalGrantFor(p)?.source }}<span v-if="(naturalGrantFor(p)?.ranks || 0) > 1"> · {{ naturalGrantFor(p)?.ranks }} graduações</span><span v-if="naturalGrantFor(p)?.conditional" :class="activeTotem(character) ? 'text-green-400' : 'text-gold'"> · benefício {{ activeTotem(character) ? 'ativo' : 'inativo' }}</span></p>
        </div>
      </div>
    </div>

    <!-- ====== CLASS FEATURES & LANGUAGES ====== -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
      <div class="bg-dark-card border border-gold/20 rounded-xl p-5">
        <h3 class="text-lg font-bold text-gold mb-3">Características de classe</h3>
        <details v-if="selectedCustomClass?.classFeatures" class="mb-3 text-sm"><summary class="text-gold cursor-pointer">Poderes cadastrados na classe</summary><p class="whitespace-pre-wrap mt-2">{{ selectedCustomClass.classFeatures }}</p></details>
        <textarea v-model="character.classFeatures" @input="emit('save')" @change="emit('save')" rows="5"
          class="w-full inp resize-y" placeholder="Class abilities and features..."></textarea>
      </div>
      <div class="bg-dark-card border border-gold/20 rounded-xl p-5">
        <h3 class="text-lg font-bold text-gold mb-3">Idiomas conhecidos</h3>
        <textarea v-model="character.languagesKnown" @input="emit('save')" @change="emit('save')" rows="5"
          class="w-full inp resize-y" placeholder="Languages..."></textarea>
      </div>
      <div class="bg-dark-card border border-gold/20 rounded-xl p-5 md:col-span-2">
        <h3 class="text-lg font-bold text-gold mb-3">Notas</h3>
        <textarea v-model="character.notes" @input="emit('save')" @change="emit('save')" rows="6"
          class="w-full inp resize-y" placeholder="Anotações do personagem..."></textarea>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'CombatTab' })

import api from '../../services/api'
import { useCharacterRelations } from '../../composables/characterRelations'
import HelpTooltip from '../HelpTooltip.vue'
import SearchableChoice from '../SearchableChoice.vue'
import { getResource } from '../../services/resources'
import { creationSettings } from '../../utils/creation'
import { classEffects } from '../../utils/classEffects'
import { calculateCharacterMetrics } from '../../utils/characterMetrics'
import { classGrants, activeTotem, selectionsFor } from '../../../../backend/src/lib/classAbilities'
import { proficiencyPowerTarget } from '../../../../backend/src/lib/levelReconciliation'
import { getModifier, formatMod, calculateAttackThrow, getWeaponAbilityModifier } from '../../utils/mechanics'
import { notifyError } from '../../utils/toast'
import { errorMessage, selectedClass, proficiencyOptions } from '../../utils/catalog'
import { computed, onMounted, ref } from 'vue'
import { classDefinitionFeats } from '../../utils/classDefinitionFeats'
const props = defineProps<{
  character: any,
  campaigns: any[],
  customClasses: any[],
  currentCampaignMembers: any[],
  authStore: any,
  canManage?: boolean,
  encumbranceResult: any,
  computedAC: any,
  computedInitiative: number,
  computedHealingRate: string,
  hpPercent: number,
  displayXpNext: number
}>()

const emit = defineEmits(['save', 'campaign-change', 'owner-change', 'class-change', 'open-rules'])
const relations = useCharacterRelations(() => props.character)
function requestClassChange(event:Event) {const select=event.target as HTMLSelectElement,key=select.value;select.value=selectedCustomClass.value?.id || props.character.classKey || '';emit('class-change',key)}
const compendiumWeapons = ref<any[]>([])
const proficiencyMetadata = ref<any>({})
function manualProficiencyOptions(category: string) {
  const rules = creationSettings(selectedClass(props.customClasses, props.character)).rules
  return proficiencyOptions(category === 'class' ? rules?.proficiencies || [] : category === 'general' ? proficiencyMetadata.value.generalProficiencies || [] : category === 'natural' ? (rules?.proficiencyOrigins || []).flatMap((origin: any) => origin.proficiencies) : ['Adventuring', ...getProfsByCategory('adventuring').map((p: any) => p.name).filter(Boolean)])
}
const naturalOriginLabel = computed(() => {
  let origin = ''; try { origin = JSON.parse(props.character.rulesState || '{}').proficiencyOrigin || '' } catch { /* Legacy manual grants have no recorded origin. */ }
  const origins = creationSettings(selectedClass(props.customClasses, props.character)).rules?.proficiencyOrigins || []
  return origins.find((entry: any) => entry.key === origin)?.label || props.character.className || 'Concessões do mestre'
})
function naturalGrantFor(proficiency:any) { return classGrants(creationSettings(selectedClass(props.customClasses, props.character)).rules || {}, props.character).find(grant => grant.name.toLowerCase() === proficiency.name.trim().toLowerCase()) }
function powerTargetFor(proficiency:any) { return proficiencyPowerTarget(props.character,creationSettings(selectedClass(props.customClasses,props.character)).rules || {},proficiency) }
onMounted(async () => { try { proficiencyMetadata.value = (await getResource('/api/game-rules/metadata')).data } catch { /* Manual names remain available if the reference catalog fails. */ } })

// Constants and local logic
const ATTRS = [
  { key: 'str', label: 'STR', color: 'text-red-400', affects: 'Melee, Dano' },
  { key: 'int', label: 'INT', color: 'text-blue-400', affects: 'Idiomas' },
  { key: 'dex', label: 'DEX', color: 'text-green-400', affects: 'AC, Ranged' },
  { key: 'wil', label: 'WIL', color: 'text-purple-400', affects: 'Saves' },
  { key: 'con', label: 'CON', color: 'text-orange-400', affects: 'HP, Cura' },
  { key: 'cha', label: 'CHA', color: 'text-pink-400', affects: 'Reação' },
]

const SAVES = [
  { key: 'saveDeath', label: 'Morte' },
  { key: 'saveImplements', label: 'Implementos' },
  { key: 'saveParalysis', label: 'Paralisia' },
  { key: 'saveBlast', label: 'Explosão' },
  { key: 'saveSpells', label: 'Magias' },
]

const MOVES = [
  { key: 'moveExploration', label: 'Exploration', resultKey: 'moveExploration', unit: 'ft/turn' },
  { key: 'moveCombat', label: 'Combat', resultKey: 'moveCombat', unit: 'ft/round' },
  { key: 'moveCharge', label: 'Charge/Run', resultKey: 'moveCharge', unit: 'ft/round' },
  { key: 'moveExpedition', label: 'Expedition', resultKey: 'moveExpedition', unit: 'miles/day' },
  { key: 'moveStealth', label: 'Stealth', resultKey: 'moveStealth', unit: 'ft/round' },
  { key: 'moveClimb', label: 'Climb', resultKey: 'moveClimb', unit: 'ft/round' },
]

const PROF_CATS = [
  { key: 'adventuring', label: 'Proficiências de aventura', icon: '' },
  { key: 'class', label: 'Proficiências de classe', icon: '' },
  { key: 'general', label: 'Proficiências gerais', icon: '' },
  { key: 'natural', label: 'Proficiências naturais', icon: '' },
]





function getMoveValue(key: string) {
  return props.encumbranceResult?.[key as keyof typeof props.encumbranceResult] ?? ''
}

function getProfsByCategory(cat: string) {
  return props.character?.proficiencies?.filter((p: any) => p.category === cat) || []
}
const effects = computed(() => classEffects(props.character, selectedCustomClass.value?.ruleProfile))
const combatMetrics = computed(() => calculateCharacterMetrics(props.character, selectedCustomClass.value || undefined))

function attackThrowForWeaponAC(w: any, ac: number): string {
  if (!w || w.attackThrow == null) return '—'
  const ability = getWeaponAbilityModifier(w, getModifier(props.character.str), getModifier(props.character.dex),effects.value.finesseFor(w))
  const needed = calculateAttackThrow(Number(w.attackThrow), ac, Number(w.attackBonus ?? 0) + ability)
  return String(needed)
}

function weaponAbilityLabel(w: any) {
  return effects.value.attackAttributeFor(w) === 'dex' ? `DEX ${formatMod(getModifier(props.character.dex))}` : `STR ${formatMod(getModifier(props.character.str))}`
}

async function saveProficiency(p: any) {
  await relations.update('proficiencies', p, { name: p.name, category: p.category, throwTarget: p.throwTarget }, 'proficiency')
}



const selectedCustomClass = computed(() => selectedClass(props.customClasses, props.character) || null)
const usesStructuredTradition = computed(() => selectedCustomClass.value?.rules?.classChoices?.some((choice:any) => ['tradition','dark-path'].includes(choice.id)))



function pickLevelData(list: any[], index: number) {
  if (!Array.isArray(list) || list.length === 0) return null
  if (list[index]) return list[index]
  // If the character level is above the table length, use the last available row.
  return list[list.length - 1] || null
}

const levelFeats = computed(() => {
  if (!props.character) return { levelStats: [], tables: [], powers: [], futurePowers: [] }

  const className = props.character.className || ''
  const level = props.character.level || 1
  const customClass = selectedCustomClass.value
  const baseFeats = classDefinitionFeats(customClass || undefined,className,level,props.character.subclass,props.customClasses,props.character)

  if (customClass) {
    let thiefSkillsData = customClass.thiefSkills
    if (typeof thiefSkillsData === 'string') {
      try { thiefSkillsData = JSON.parse(thiefSkillsData) } catch(e) {}
    }
    if (Array.isArray(thiefSkillsData) && thiefSkillsData.length > 0) {
      const row = pickLevelData(thiefSkillsData, level - 1)
      if (row && !Array.isArray(row) && typeof row === 'object') {
        const fields: Record<string, string> = { openLocks: 'Open Locks', findRemoveTraps: 'Find/Remove Traps', pickPockets: 'Pick Pockets', moveSilently: 'Move Silently', climbWalls: 'Climb Walls', hideInShadows: 'Hide in Shadows', hearNoise: 'Hear Noise', ...Object.fromEntries(['Climbing','Hiding','Listening','Lockpicking','Pickpocketing','Searching','Sneaking','Trapbreaking'].map(name=>[name,name])) }
        baseFeats.levelStats = baseFeats.levelStats.filter(s => s.sectionTitle !== 'Thief Skills')
        baseFeats.levelStats.push({ sectionTitle: 'Habilidades personalizadas', stats: Object.entries(fields).filter(([key]) => row[key] !== undefined).map(([key, label]) => ({ label, value: String(row[key]) })) })
      }
      if (row && Array.isArray(row) && row.length >= 8) {
        let tsBlock = baseFeats.levelStats.find(s => s.sectionTitle === 'Thief Skills')
        if (!tsBlock) {
          tsBlock = { sectionTitle: 'Thief Skills', stats: [] }
          baseFeats.levelStats.push(tsBlock)
        }
        tsBlock.stats = [
          { label: 'Climbing', value: String(row[0]) },
          { label: 'Hiding', value: String(row[1]) },
          { label: 'Listening', value: String(row[2]) },
          { label: 'Lockpicking', value: String(row[3]) },
          { label: 'Pickpocketing', value: String(row[4]) },
          { label: 'Searching', value: String(row[5]) },
          { label: 'Sneaking', value: String(row[6]) },
          { label: 'Trapbreaking', value: String(row[7]) }
        ]
      }
    }

    let rebukingUndeadData = customClass.rebukingUndead
    if (typeof rebukingUndeadData === 'string') {
      try { rebukingUndeadData = JSON.parse(rebukingUndeadData) } catch(e) {}
    }
    if (Array.isArray(rebukingUndeadData) && rebukingUndeadData.length > 0) {
      const row = pickLevelData(rebukingUndeadData, level - 1)
      if (row && !Array.isArray(row) && typeof row === 'object') {
        const fields: Record<string, string> = { skeleton: 'Skeleton', zombie: 'Zombie', ghoul: 'Ghoul', wight: 'Wight', wraith: 'Wraith', mummy: 'Mummy', spectre: 'Spectre', vampire: 'Vampire', incarnation:'Incarnation' }
        baseFeats.levelStats = baseFeats.levelStats.filter(s => s.sectionTitle !== 'Rebuking Undead')
        baseFeats.levelStats.push({ sectionTitle: 'Rebuking Undead', stats: Object.entries(fields).filter(([key]) => row[key] !== undefined).map(([key, label]) => ({ label, value: String(row[key]) })) })
      }
      if (row && Array.isArray(row) && row.length >= 9) {
        let ruBlock = baseFeats.levelStats.find(s => s.sectionTitle === 'Rebuking Undead')
        if (!ruBlock) {
          ruBlock = { sectionTitle: 'Rebuking Undead', stats: [] }
          baseFeats.levelStats.push(ruBlock)
        }
        ruBlock.stats = [
          { label: 'Skeleton', value: String(row[0]) },
          { label: 'Zombie', value: String(row[1]) },
          { label: 'Ghoul', value: String(row[2]) },
          { label: 'Wight', value: String(row[3]) },
          { label: 'Wraith', value: String(row[4]) },
          { label: 'Mummy', value: String(row[5]) },
          { label: 'Specter', value: String(row[6]) },
          { label: 'Vampire', value: String(row[7]) },
          { label: 'Incarnation*', value: String(row[8]) }
        ]
      }
    }
  }

  return baseFeats
})

onMounted(() => {
  loadWeaponCompendium()
})

async function loadWeaponCompendium() {
  try {
    const res = await api.get('/api/compendium/search', {
      params: { type: 'weapon', limit: 500 }
    })
    compendiumWeapons.value = res.data.entries || []
  } catch (e) {
    notifyError(errorMessage(e, 'Não foi possível carregar o catálogo de armas. Reabra a aba para tentar novamente.'))
  }
}

function applyCompendiumWeapon(weapon: any) {
  const found = compendiumWeapons.value.find((entry) => entry.name.toLowerCase() === String(weapon.name || '').toLowerCase())
  if (found) {
    weapon.catalogId = found.id
    weapon.automaticDamage = true
    weapon.damage = weapon.style === 'Two-Handed Weapon' && found.damageTwoHanded ? found.damageTwoHanded : found.damage
    weapon.rangeShort = Number(found.rangeShort || 0)
    weapon.rangeMed = Number(found.rangeMed || 0)
    weapon.rangeLong = Number(found.rangeLong || 0)
    weapon.encumbrance = Number(found.encumbrance || 0)
  } else {
    notifyError('Digite o nome de uma arma e escolha uma opção do catálogo.'); return
  }
  saveWeapon(weapon)
}

// Weapons
async function addWeapon() {
  await relations.add('weapons', 'weapons', 'weapon', { name: 'Nova arma' })
}

async function removeWeapon(id: string) {
  await relations.remove('weapons', 'weapons', id)
}

async function saveWeapon(w: any) {
  await relations.update('weapons', w, {
    name: w.name, style: w.style, initBonus: w.initBonus, attackThrow: w.attackThrow,
    attackBonus: w.attackBonus ?? 0, attackAbility:w.attackAbility || 'auto', damage: w.damage,
    catalogId: w.catalogId || '', automaticDamage: w.automaticDamage || false,
    rangeShort: w.rangeShort ?? 0, rangeMed: w.rangeMed ?? 0,
    rangeLong: w.rangeLong ?? 0, encumbrance: w.encumbrance ?? 0,
  }, 'weapon')
}

// Proficiencies
async function addProficiency(category: string) {
  await relations.add('proficiencies', 'proficiencies', 'proficiency', { name: '', category }, category)
}

async function removeProficiency(id: string) {
  await relations.remove('proficiencies', 'proficiencies', id)
}

  // Scars / Mortal Wounds
async function addScar() {
  await relations.add('scars', 'scars', 'scar')
}

async function saveScar(s: any) {
  await relations.update('scars', s, { description: s.description, daysToRest: s.daysToRest, debuff: s.debuff }, 'scar')
}

async function removeScar(id: string) {
  await relations.remove('scars', 'scars', id)
}
</script>


