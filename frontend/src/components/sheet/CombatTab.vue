<template>
  <div class="space-y-4">
    <!-- ====== HEADER / BIO ====== -->
    <div class="bg-dark-card border border-gold/20 rounded-xl p-5 mb-4">
      <h2 class="text-xl font-bold text-gold mb-4 border-b border-gold/10 pb-2">CHARACTER SHEET</h2>
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
          <input v-model="character.characterName" @change="emit('save')" class="inp text-lg font-bold text-gold" />
        </div>
        <div>
          <label class="lbl">OF — Birthplace</label>
          <input v-model="character.birthplace" @change="emit('save')" class="inp" />
        </div>
        <div>
          <label class="lbl">Class</label>
          <select v-if="customClasses.length > 0" v-model="character.classKey" @change="emit('class-change')" class="inp">
            <option v-if="!character.classKey && character.className" value="">{{ character.className }} (cadastro anterior)</option>
            <option v-else value="" disabled>Selecione uma classe</option>
            <option v-for="c in customClasses" :key="c.id" :value="c.id">{{ c.name }} — {{ c.source === 'catalog' ? 'base' : 'campanha' }}</option>
          </select>
          <input v-else v-model="character.className" @change="emit('save')" class="inp" />
        </div>
        <div v-if="levelFeats?.availableSubclasses && levelFeats.availableSubclasses.length > 0">
          <label class="lbl" v-if="character.className.toLowerCase() === 'warlock'">Dark Path</label>
          <label class="lbl" v-else-if="character.className.toLowerCase() === 'witch'">Tradition</label>
          <label class="lbl" v-else>Subclass</label>
          <select v-model="character.subclass" @change="emit('save')" class="inp">
            <option value="">(Select)</option>
            <option v-for="sub in levelFeats.availableSubclasses" :key="sub" :value="sub">{{ sub }}</option>
          </select>
        </div>
        <div>
          <label class="lbl">AND — Title</label>
          <input v-model="character.title" @change="emit('save')" class="inp" />
        </div>
        <div>
          <label class="lbl">Alignment</label>
          <select v-model="character.alignment" @change="emit('save')" class="inp">
            <option value="">-</option>
            <option value="Lawful">Lawful</option>
            <option value="Neutral">Neutral</option>
            <option value="Chaotic">Chaotic</option>
          </select>
        </div>
        <div>
          <label class="lbl">Age</label>
          <input v-model.number="character.age" @change="emit('save')" type="number" class="inp" />
        </div>
        <div>
          <label class="lbl">Size</label>
          <select v-model="character.size" @change="emit('save')" class="inp">
            <option value="Small">Small</option>
            <option value="Medium">Medium</option>
            <option value="Large">Large</option>
          </select>
        </div>
        <div>
          <label class="lbl">Gender</label>
          <input v-model="character.gender" @change="emit('save')" class="inp" />
        </div>
        <div>
          <label class="lbl">Hit Die</label>
          <input v-model="character.hitDice" @change="emit('save')" class="inp" placeholder="1d8" />
        </div>
      </div>
    </div>

    <!-- ====== LEVEL / XP / HP ROW ====== -->
    <div class="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
      <div class="stat-box">
        <label class="lbl">Nível</label>
        <input v-model.number="character.level" @change="emit('level-change')" type="number" min="1" max="14" class="inp text-center text-2xl font-bold text-gold" />
      </div>
      <div class="stat-box">
        <label class="lbl">XP</label>
        <input v-model.number="character.xp" @change="emit('save')" type="number" class="inp text-center" />
      </div>
      <div class="stat-box">
        <label class="lbl">XP Próx. Nível</label>
        <div class="inp text-center bg-dark-bg/50 text-gold cursor-default">{{ (displayXpNext || 0).toLocaleString() }}</div>
      </div>
      <div class="stat-box">
        <label class="lbl">HP Máx</label>
        <input v-model.number="character.hpMax" @change="emit('save')" type="number" class="inp text-center text-xl font-bold text-green-400" />
      </div>
      <div class="stat-box">
        <label class="lbl">HP Atual</label>
        <input v-model.number="character.hpCurr" @change="emit('save')" type="number" class="inp text-center text-xl font-bold"
          :class="hpPercent > 50 ? 'text-green-400' : hpPercent > 25 ? 'text-yellow-400' : 'text-red-400'" />
      </div>
    </div>

    <!-- ====== ATTRIBUTES ====== -->
    <div class="bg-dark-card border border-gold/20 rounded-xl p-5 mb-4">
      <h2 class="text-xl font-bold text-gold mb-4 border-b border-gold/10 pb-2">Atributos</h2>
      <div class="grid grid-cols-3 md:grid-cols-6 gap-4">
        <div v-for="attr in ATTRS" :key="attr.key" class="text-center">
          <label class="text-xs font-bold uppercase tracking-wider" :class="attr.color">{{ attr.label }}</label>
          <input v-model.number="character[attr.key]" @change="emit('save')" type="number" min="3" max="18"
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
        <h3 class="text-lg font-bold text-gold mb-3">ARMOR CLASS</h3>
        <div class="grid grid-cols-2 gap-2 mb-4 border-b border-steel-dark pb-4">
          <div class="col-span-2">
            <label class="lbl">Armor Worn</label>
            <input v-model="character.armorName" @change="emit('save')" class="inp" placeholder="e.g. Chainmail" />
          </div>
          <div>
            <label class="lbl" title="Inclua aqui a armadura e outros bônus permanentes. DES e escudo são somados automaticamente.">Bônus da armadura/efeitos</label>
            <input v-model.number="character.armorAcBonus" @change="emit('save')" type="number" class="inp text-center" />
            <label class="lbl mt-2">Ajuste de CA (poderes, magia, mestre)</label>
            <input v-model.number="character.acAdjustment" @change="emit('save')" type="number" class="inp text-center" />
          </div>
          <div>
            <label class="lbl">Weight (Stone)</label>
            <input v-model.number="character.armorWeight" @change="emit('save')" type="number" step="0.1" class="inp text-center" />
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
        </div>
      </div>

      <div class="bg-dark-card border border-gold/20 rounded-xl p-5">
        <h3 class="text-lg font-bold text-gold mb-3">SAVING THROWS</h3>
        <div class="grid grid-cols-1 gap-2">
          <div v-for="save in SAVES" :key="save.key" class="flex items-center justify-between bg-dark-bg/35 border border-steel-dark/50 rounded-lg px-3 py-2 hover:bg-dark-bg/50 transition-colors">
            <label class="text-xs uppercase tracking-wider text-steel-light shrink-0 font-semibold">{{ save.label }}</label>
            <input v-model.number="character[save.key]" @change="emit('save')" type="number"
              class="w-16 py-1 px-2 text-center text-sm font-bold bg-dark-bg border border-steel-dark rounded-lg text-gold focus:outline-none focus:border-gold transition-all shrink-0" />
          </div>
        </div>
      </div>

      <div class="bg-dark-card border border-gold/20 rounded-xl p-5">
        <h3 class="text-lg font-bold text-gold mb-3">INITIATIVE & SURPRISE</h3>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="lbl">Initiative</label>
            <div class="inp text-center text-lg font-bold bg-dark-bg/50 text-gold cursor-default">{{ formatMod(computedInitiative) }}</div>
            <p class="text-xs text-steel-light">{{ effects.initiativeSources.map(e => `${e.source} ${formatMod(e.value)}`).join(' · ') }}</p>
            <p class="text-xs text-steel-light">Ao conjurar: {{ formatMod(effects.castingInitiative) }}. Some ajustes situacionais aplicáveis.</p>
            <p v-for="effect in effects.conditional" :key="effect" class="text-xs text-gold">{{ effect }}</p>
          </div>
          <div>
            <label class="lbl">Surprise (mod)</label>
            <input v-model.number="character.surprise" @change="emit('save')" type="number" class="inp text-center" />
          </div>
          <div>
            <label class="lbl">Surprise Others</label>
            <input v-model.number="character.surpriseOthers" @change="emit('save')" type="number" class="inp text-center" />
          </div>
          <div>
            <label class="lbl">Avoid Surprise</label>
            <input v-model.number="character.avoidSurprise" @change="emit('save')" type="number" class="inp text-center" />
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
            <input v-model.number="character.mortalWounds" @change="emit('save')" type="number" class="inp text-center" />
          </div>
          <div>
            <label class="lbl">Cleaves</label>
            <input v-model.number="character.cleaves" @change="emit('save')" type="number" class="inp text-center" />
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
        <p v-for="power in levelFeats.futurePowers" :key="power.name" class="text-sm mt-2">{{ power.name }}</p>
      </details>
      <template v-if="levelFeats?.powers?.length > 0">
        <div class="bg-dark-card border border-gold/20 rounded-xl p-5 col-span-1 lg:col-span-2">
          <h3 class="text-lg font-bold text-gold mb-4">Poderes da Classe</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div v-for="(pw, idx) in levelFeats.powers" :key="'pow-'+idx" class="bg-dark-bg/40 border border-steel-dark/30 rounded p-3 flex items-start gap-3">
              <HelpTooltip :label="pw.name">{{ pw.description }}</HelpTooltip>
              <div>
                <div class="font-bold text-gray-200">{{ pw.name }}</div>
                <div class="text-xs text-steel line-clamp-2 md:line-clamp-3">{{ pw.description }}</div>
              </div>
            </div>
          </div>
        </div>
      </template>

    </div>

    <!-- ====== WEAPONS ====== -->
    <div class="bg-dark-card border border-gold/20 rounded-xl p-5 mb-4">
      <div class="flex items-center justify-between mb-3">
        <h3 class="text-lg font-bold text-gold">WEAPONS</h3>
        <button @click="addWeapon" class="text-sm text-gold hover:text-gold-light transition-colors">+ Add</button>
      </div>
      <p class="mb-3 text-xs text-steel-light">O alvo é Base + CA − bônus. Escolha o estilo para usar FOR no corpo a corpo ou DES à distância, inclusive ao arremessar uma arma. “Outros” guarda bônus de arma, estilo e efeitos.</p>
      <div v-if="character.weapons?.length" class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="text-steel-light border-b border-steel-dark text-xs uppercase tracking-wider">
              <th class="text-left py-2.5 px-2">Weapon & Fighting Style</th>
              <th class="text-center py-2.5 px-1">Init</th>
              <th class="text-center py-2.5 px-1">Base</th>
              <th class="text-center py-2.5 px-1">Atributo</th>
              <th class="text-center py-2.5 px-1">Outros</th>
              <th class="text-center py-2.5 px-1">Dmg</th>
              <th class="text-center py-2.5 px-1">Range</th>
              <th class="text-center py-2.5 px-1">Enc</th>
              <th class="text-center py-2 px-1"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="w in character.weapons" :key="w.id" class="border-b border-steel-dark/30 align-top hover:bg-dark-bg/20 transition-colors">
              <td class="py-2 px-2">
                <input v-model="w.name" @blur="saveWeapon(w)" class="inp-table w-full" placeholder="Weapon" list="acks-weapon-compendium" />
                <button type="button" @click="applyCompendiumWeapon(w)" class="text-xs text-gold underline">Usar valores do catálogo</button>
                <select v-model="w.style" @change="saveWeapon(w)" class="inp-table w-full text-xs mt-0.5">
                  <option value="">Automático pelo alcance</option><option>Single Weapon</option><option>Dual Weapon</option><option>Two-Handed Weapon</option><option>Weapon and Shield</option><option>Missile Weapon</option>
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
              </td>
              <td class="py-2 px-1 text-center">
                <input v-model.number="w.attackBonus" @blur="saveWeapon(w)" type="number" class="w-14 px-2 py-1 bg-dark-bg border border-steel-dark rounded text-center font-bold text-gold focus:outline-none focus:border-gold" title="Outros bônus de ataque; não inclua FOR ou DES" />
              </td>
              <td class="py-2 px-1 text-center">
                <input v-model="w.damage" @input="w.automaticDamage = false" @blur="saveWeapon(w)" class="w-16 px-2 py-1 bg-dark-bg border border-steel-dark rounded text-dark-text text-center focus:outline-none focus:border-gold" />
                <p class="text-xs text-steel-light">{{ w.automaticDamage ? 'Base por estilo' : 'Manual' }} · classe {{ formatMod(effects.damageBonusFor(w.style === 'Missile Weapon')) }}</p>
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
                <button type="button" @click="removeWeapon(w.id)" class="text-crimson-light hover:text-crimson text-xs font-bold px-1.5 py-0.5 rounded border border-transparent hover:border-crimson/40">X</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-if="character.weapons?.length" class="mt-4 pt-4 border-t border-steel-dark space-y-4">
        <div v-for="w in character.weapons" :key="w.id">
          <h4 class="text-sm font-bold text-gold mb-2">{{ w.name || 'Arma sem nome' }} <span class="text-steel font-normal text-xs">— ATTACK THROW (to hit AC)</span></h4>
          <div class="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-11 gap-1.5">
            <div v-for="ac in 11" :key="ac - 1" class="bg-dark-bg/40 border border-steel-dark/60 rounded px-2 py-1.5 flex items-center justify-between">
              <span class="text-[11px] text-steel-light font-semibold">AC {{ ac - 1 }}</span>
              <div class="min-w-8 text-center text-sm font-bold text-gold">
                {{ attackThrowForWeaponAC(w, ac - 1) }}
              </div>
            </div>
          </div>
        </div>
      </div>
      <p v-else class="text-steel text-sm pt-2">No weapons added</p>
      <datalist id="acks-weapon-compendium">
        <option v-for="entry in compendiumWeapons" :key="entry.id" :value="entry.name" :label="entry.name" />
      </datalist>
    </div>

    <!-- ====== PROFICIENCIES ====== -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
      <div v-for="cat in PROF_CATS" :key="cat.key" class="bg-dark-card border border-gold/20 rounded-xl p-5">
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-lg font-bold text-gold">{{ cat.icon }} {{ cat.label }}</h3>
          <button @click="addProficiency(cat.key)" class="text-sm text-gold hover:text-gold-light transition-colors">+</button>
        </div>
        <div v-for="p in getProfsByCategory(cat.key)" :key="p.id" class="flex items-center gap-2 mb-2 bg-dark-bg/35 border border-steel-dark/50 rounded-lg px-2.5 py-2 hover:bg-dark-bg/50 transition-colors">
          <input v-model="p.name" @change="saveProficiency(p)" class="flex-1 min-w-0 px-2 py-1 bg-dark-bg border border-steel-dark rounded text-dark-text text-sm focus:outline-none focus:border-gold" placeholder="Proficiency" />
          <label class="text-[10px] uppercase tracking-wider text-steel w-10 text-right font-semibold shrink-0">Throw</label>
          <input v-model.number="p.throwTarget" @change="saveProficiency(p)" type="number" class="w-14 shrink-0 px-2 py-1 bg-dark-bg border border-steel-dark rounded text-gold text-center text-sm font-bold focus:outline-none focus:border-gold" />
          <button type="button" @click="removeProficiency(p.id)" class="text-crimson-light hover:text-crimson text-xs font-bold px-1.5 py-0.5 rounded border border-transparent hover:border-crimson/40 shrink-0">X</button>
        </div>
      </div>
    </div>

    <!-- ====== CLASS FEATURES & LANGUAGES ====== -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
      <div class="bg-dark-card border border-gold/20 rounded-xl p-5">
        <h3 class="text-lg font-bold text-gold mb-3">CLASS FEATURES</h3>
        <details v-if="selectedCustomClass?.classFeatures" class="mb-3 text-sm"><summary class="text-gold cursor-pointer">Poderes cadastrados na classe</summary><p class="whitespace-pre-wrap mt-2">{{ selectedCustomClass.classFeatures }}</p></details>
        <textarea v-model="character.classFeatures" @change="emit('save')" rows="5"
          class="w-full inp resize-y" placeholder="Class abilities and features..."></textarea>
      </div>
      <div class="bg-dark-card border border-gold/20 rounded-xl p-5">
        <h3 class="text-lg font-bold text-gold mb-3">LANGUAGES KNOWN</h3>
        <textarea v-model="character.languagesKnown" @change="emit('save')" rows="5"
          class="w-full inp resize-y" placeholder="Languages..."></textarea>
      </div>
      <div class="bg-dark-card border border-gold/20 rounded-xl p-5 md:col-span-2">
        <h3 class="text-lg font-bold text-gold mb-3">Notas</h3>
        <textarea v-model="character.notes" @change="emit('save')" rows="6"
          class="w-full inp resize-y" placeholder="Anotações do personagem..."></textarea>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'CombatTab' })

import api from '../../services/api'
import HelpTooltip from '../HelpTooltip.vue'
import { classEffects } from '../../utils/classEffects'
import { getModifier, formatMod, calculateAttackThrow, getWeaponAbilityModifier } from '../../utils/mechanics'
import { notifyError } from '../../utils/toast'
import { errorMessage } from '../../utils/catalog'
import { computed, onMounted, ref } from 'vue'
import { getClassFeats } from '../../utils/classFeats'
const props = defineProps<{
  character: any,
  campaigns: any[],
  customClasses: any[],
  currentCampaignMembers: any[],
  authStore: any,
  encumbranceResult: any,
  computedAC: any,
  computedInitiative: number,
  computedHealingRate: string,
  hpPercent: number,
  displayXpNext: number
}>()

const emit = defineEmits(['save', 'campaign-change', 'owner-change', 'class-change', 'level-change'])
const compendiumWeapons = ref<any[]>([])

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
  { key: 'saveDeath', label: 'Death' },
  { key: 'saveImplements', label: 'Implements' },
  { key: 'saveParalysis', label: 'Paralysis' },
  { key: 'saveBlast', label: 'Blast' },
  { key: 'saveSpells', label: 'Spells' },
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
  { key: 'adventuring', label: 'Adventuring Proficiencies', icon: '' },
  { key: 'class', label: 'Class Proficiencies', icon: '' },
  { key: 'general', label: 'General Proficiencies', icon: '' },
]





function getMoveValue(key: string) {
  return props.encumbranceResult?.[key as keyof typeof props.encumbranceResult] ?? ''
}

function getProfsByCategory(cat: string) {
  return props.character?.proficiencies?.filter((p: any) => p.category === cat) || []
}
const effects = computed(() => classEffects(props.character, selectedCustomClass.value?.ruleProfile))

function attackThrowForWeaponAC(w: any, ac: number): string {
  if (!w || w.attackThrow == null) return '—'
  const ability = getWeaponAbilityModifier(w, getModifier(props.character.str), getModifier(props.character.dex))
  const needed = calculateAttackThrow(Number(w.attackThrow), ac, Number(w.attackBonus ?? 0) + ability)
  return String(needed)
}

function weaponAbilityLabel(w: any) {
  return getWeaponAbilityModifier(w, 0, 1) === 1 ? `DEX ${formatMod(getModifier(props.character.dex))}` : `STR ${formatMod(getModifier(props.character.str))}`
}

async function saveProficiency(p: any) {
  try {
    const result = await api.put(`/api/characters/${props.character.id}/proficiencies/${p.id}`, {
      name: p.name, category: p.category, throwTarget: p.throwTarget,
    })
    Object.assign(p, result.data.proficiency)
  } catch (e) { notifyError(errorMessage(e, 'Não foi possível salvar a proficiência. Tente novamente.')) }
}



const selectedCustomClass = computed(() => {
  if (props.character?.classKey) return props.customClasses.find((c: any) => c.id === props.character.classKey) || null
  const className = String(props.character?.className || '').trim()
  if (!className) return null
  const normalized = className.toLowerCase()
  return props.customClasses.find((c: any) => String(c?.name || '').trim().toLowerCase() === normalized) || null
})



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
  const baseFeats = getClassFeats(className, level, props.character.subclass)
  const customClass = selectedCustomClass.value

  if (customClass) {
    let thiefSkillsData = customClass.thiefSkills
    if (typeof thiefSkillsData === 'string') {
      try { thiefSkillsData = JSON.parse(thiefSkillsData) } catch(e) {}
    }
    if (Array.isArray(thiefSkillsData) && thiefSkillsData.length > 0) {
      const row = pickLevelData(thiefSkillsData, level - 1)
      if (row && !Array.isArray(row) && typeof row === 'object') {
        const fields: Record<string, string> = { openLocks: 'Open Locks', findRemoveTraps: 'Find/Remove Traps', pickPockets: 'Pick Pockets', moveSilently: 'Move Silently', climbWalls: 'Climb Walls', hideInShadows: 'Hide in Shadows', hearNoise: 'Hear Noise' }
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
        const fields: Record<string, string> = { skeleton: 'Skeleton', zombie: 'Zombie', ghoul: 'Ghoul', wight: 'Wight', wraith: 'Wraith', mummy: 'Mummy', spectre: 'Spectre', vampire: 'Vampire' }
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
  try {
    const res = await api.post(`/api/characters/${props.character.id}/weapons`, { name: 'Nova Arma' })
    props.character.weapons.push(res.data.weapon)
  } catch (e) { notifyError(errorMessage(e, 'Não foi possível adicionar a arma.')) }
}

async function removeWeapon(id: string) {
  try {
    await api.delete(`/api/characters/${props.character.id}/weapons/${id}`)
    props.character.weapons = props.character.weapons.filter((w: any) => w.id !== id)
  } catch (e) { notifyError(errorMessage(e, 'Não foi possível remover a arma.')) }
}

async function saveWeapon(w: any) {
  try {
    const result = await api.put(`/api/characters/${props.character.id}/weapons/${w.id}`, {
      name: w.name, style: w.style, initBonus: w.initBonus, attackThrow: w.attackThrow,
      attackBonus: w.attackBonus ?? 0,
      damage: w.damage,
      catalogId: w.catalogId || '', automaticDamage: w.automaticDamage || false,
      rangeShort: w.rangeShort ?? 0,
      rangeMed: w.rangeMed ?? 0,
      rangeLong: w.rangeLong ?? 0,
      encumbrance: w.encumbrance ?? 0
    })
    Object.assign(w, result.data.weapon)
  } catch (e) { notifyError(errorMessage(e, 'Não foi possível salvar a arma. Tente novamente.')) }
}

// Proficiencies
async function addProficiency(category: string) {
  try {
    const res = await api.post(`/api/characters/${props.character.id}/proficiencies`, { name: '', category })
    props.character.proficiencies.push(res.data.proficiency)
  } catch (e) { notifyError(errorMessage(e, 'Não foi possível adicionar a proficiência.')) }
}

async function removeProficiency(id: string) {
  try {
    await api.delete(`/api/characters/${props.character.id}/proficiencies/${id}`)
    props.character.proficiencies = props.character.proficiencies.filter((p: any) => p.id !== id)
  } catch (e) { notifyError(errorMessage(e, 'Não foi possível remover a proficiência.')) }
}

  // Scars / Mortal Wounds
  async function addScar() {
    try {
      const res = await api.post(`/api/characters/${props.character.id}/scars`, {})
      if (!props.character.scars) props.character.scars = []
      props.character.scars.push(res.data.scar)
    } catch (e) { notifyError(errorMessage(e, 'Não foi possível adicionar a cicatriz.')) }
  }

  async function saveScar(s: any) {
    try {
      await api.put(`/api/characters/${props.character.id}/scars/${s.id}`, s)
    } catch (e) { notifyError(errorMessage(e, 'Não foi possível salvar a cicatriz. Tente novamente.')) }
  }

  async function removeScar(id: string) {
    try {
      await api.delete(`/api/characters/${props.character.id}/scars/${id}`)
      props.character.scars = props.character.scars.filter((s: any) => s.id !== id)
    } catch (e) { notifyError(errorMessage(e, 'Não foi possível remover a cicatriz.')) }
  }
</script>


