(function (global) {
  const statIds = global.ForgingFormula?.statIds || [
    "sharpness",
    "toughness",
    "durability",
    "hardness",
    "stability",
    "conductivity",
  ];
  const statLabels = global.ForgingFormula?.statLabels || {
    sharpness: "锋利",
    toughness: "韧性",
    durability: "耐久",
    hardness: "硬度",
    stability: "稳定",
    conductivity: "导能",
  };
  const pauseStatIds = statIds.filter((stat) => stat !== "conductivity");
  const monitoredConductivityStatIds = pauseStatIds;
  const enemyStatIds = ["cr", "hp", "hardness", "fracture", "wear", "rust"];
  const enemyStatLabels = {
    cr: "CR",
    hp: "生命",
    hardness: "坚硬",
    fracture: "崩裂",
    wear: "磨损",
    rust: "锈蚀",
  };
  const defaultEnemy = {
    cr: 2,
    hp: 1000,
    hardness: 0,
    fracture: 0,
    wear: 0,
    rust: 0,
  };
  const defaultParams = {
    dullingK: 0.8,
    dullingS: 10,
    honingK: 0.5,
    honingS: 25,
    conductivityK: 1,
    rustK: 0.5,
    attackIntervalSeconds: 1,
    fullSharpnessHoneDelaySeconds: 1,
    saltReward: 1,
  };
  const defaultMaintenancePolicy = {
    enabled: true,
    sharpenAtOrBelow: 1,
    sharpenToAtLeast: 5,
    minDurability: 1,
    allowFullSharpnessHone: false,
    maxHonesPerBattle: 100,
  };
  const enemyAttributeIds = ["hardness", "fracture", "wear", "rust"];
  const ENEMY_BASE_ATTRIBUTE_SHARE = 0.05;
  const enemyNamePools = {
    hardness: splitWordPool(`
岩石
石墙
石柱
矿石
水晶
砖墙
瓷砖
玻璃
混凝土
骨头
头骨
兽角
龙骨
龟壳
铁皮
钢板
钢筋
锁链
齿轮
装甲板
铁傀儡
机械义体
机器人
炮塔
战车
冰墙
坚冰
冰川
符文锁
符文门
魔晶
封印碑
`),
    fracture: splitWordPool(`
树干
树根
原木
木梁
木门
木箱
巨兽甲壳
野兽
猛兽
食人魔
血肉怪
巨型肉块
兽夹
巨石
路障
城门
吊桥
机械犬
机甲兵
战争机器
船体
防爆门
要塞核心
巨型锁链
`),
    wear: splitWordPool(`
草
杂草
藤蔓
荆棘
灌木
芦苇
麦秆
稻秆
纸张
纸箱
硬纸板
书本
布匹
帆布
皮革
绳索
蛛网
泥土
沙土
砾石
冻土
蔬菜
水果
面包
冻肉
鱼肉
肉排
长发
胡须
体毛
毛球
渔网
水草
碎木
废铁堆
`),
    rust: splitWordPool(`
苹果
柑橘
番茄
菠萝
腌菜
咸肉
鲜鱼
湿皮革
湿绳索
血肉怪
活体肿瘤
僵尸
腐尸
酸液囊
毒液腺
腐蚀虫
酸血兽
盐晶怪
胆汁囊
脓肿
寄生体
腐肉块
炼金废料
树脂瘤
树液藤
胶质怪
油脂块
蜡像
沥青块
黏液兽
菌丝团
高速转子
旋转轴
飞轮
涡轮芯
热钢坯
高速齿轮
制动盘
机械主轴
火热装甲
过载核心
符文锁链
诅咒绷带
魔导转子
腐化骨甲
魔力导管
`),
  };
  const defaultEnemyGenerationConfig = {
    cr: 2,
    hpK: 1.2,
    hpS: 60,
    hpMultiplierMin: 0.8,
    hpMultiplierMax: 1.5,
    pointK: 1.4,
    pointS: 25,
    focusShareMin: 0.25,
    focusShareMax: 0.65,
  };

  function splitWordPool(text) {
    return text
      .split(/[\s、，,]+/)
      .map((word) => word.trim())
      .filter(Boolean);
  }

  function createStatRecord(defaultValue = 0) {
    return Object.fromEntries(statIds.map((stat) => [stat, defaultValue]));
  }

  function normalizeInteger(value, fallback = 0) {
    const number = Number(value);
    return Number.isFinite(number) ? Math.floor(number) : fallback;
  }

  function normalizeNonNegativeInteger(value, fallback = 0) {
    return Math.max(0, normalizeInteger(value, fallback));
  }

  function normalizePositiveNumber(value, fallback = 1) {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? number : fallback;
  }

  function normalizeProbabilityMultiplier(value, fallback = 1) {
    const number = Number(value);
    return Number.isFinite(number) && number >= 0 ? number : fallback;
  }

  function formatFormulaNumber(value, digits = 4) {
    const number = Number(value);
    if (!Number.isFinite(number)) {
      return "0";
    }
    return Number.isInteger(number) ? String(number) : String(Number(number.toFixed(digits)));
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function createId(prefix) {
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function normalizeStats(source, fallback = createStatRecord()) {
    const safeSource = source && typeof source === "object" ? source : {};
    return Object.fromEntries(
      statIds.map((stat) => [stat, normalizeNonNegativeInteger(safeSource[stat], fallback[stat] || 0)]),
    );
  }

  function normalizeBlade(source) {
    const safeSource = source && typeof source === "object" ? source : {};
    const stats = normalizeStats(safeSource.stats);
    const maxStats = normalizeStats(safeSource.maxStats, stats);
    return {
      id: typeof safeSource.id === "string" ? safeSource.id : createId("battle-blade"),
      name: typeof safeSource.name === "string" && safeSource.name.trim() ? safeSource.name.trim() : "未命名刃",
      stats,
      maxStats,
      inputs: safeSource.inputs && typeof safeSource.inputs === "object" ? { ...safeSource.inputs } : null,
      createdAt: typeof safeSource.createdAt === "string" ? safeSource.createdAt : new Date().toISOString(),
      uses: normalizeNonNegativeInteger(safeSource.uses, 0),
      kills: normalizeNonNegativeInteger(safeSource.kills, 0),
    };
  }

  function normalizeEnemy(source, fallback = defaultEnemy) {
    const safeSource = source && typeof source === "object" ? source : {};
    const fallbackName = typeof fallback.name === "string" && fallback.name.trim() ? fallback.name.trim() : "敌人";
    return {
      name: typeof safeSource.name === "string" && safeSource.name.trim() ? safeSource.name.trim() : fallbackName,
      cr: normalizeNonNegativeInteger(safeSource.cr, fallback.cr),
      hp: normalizeInteger(safeSource.hp, fallback.hp),
      hardness: normalizeInteger(safeSource.hardness, fallback.hardness),
      fracture: normalizeInteger(safeSource.fracture, fallback.fracture),
      wear: normalizeInteger(safeSource.wear, fallback.wear),
      rust: normalizeInteger(safeSource.rust, fallback.rust),
    };
  }

  function normalizeParams(source) {
    const safeSource = source && typeof source === "object" ? source : {};
    return {
      dullingK: normalizeProbabilityMultiplier(safeSource.dullingK, defaultParams.dullingK),
      dullingS: normalizeProbabilityMultiplier(safeSource.dullingS, defaultParams.dullingS),
      honingK: normalizeProbabilityMultiplier(safeSource.honingK, defaultParams.honingK),
      honingS: normalizeProbabilityMultiplier(safeSource.honingS, defaultParams.honingS),
      conductivityK: normalizeProbabilityMultiplier(safeSource.conductivityK, defaultParams.conductivityK),
      rustK: normalizeProbabilityMultiplier(safeSource.rustK, defaultParams.rustK),
      attackIntervalSeconds: normalizePositiveNumber(
        safeSource.attackIntervalSeconds,
        defaultParams.attackIntervalSeconds,
      ),
      fullSharpnessHoneDelaySeconds: normalizePositiveNumber(
        safeSource.fullSharpnessHoneDelaySeconds,
        defaultParams.fullSharpnessHoneDelaySeconds,
      ),
      saltReward: normalizeNonNegativeInteger(safeSource.saltReward, defaultParams.saltReward),
    };
  }

  function normalizeMaintenancePolicy(source) {
    const safeSource = source && typeof source === "object" ? source : {};
    return {
      enabled: Boolean(safeSource.enabled),
      sharpenAtOrBelow: normalizeNonNegativeInteger(
        safeSource.sharpenAtOrBelow,
        defaultMaintenancePolicy.sharpenAtOrBelow,
      ),
      sharpenToAtLeast: normalizeNonNegativeInteger(
        safeSource.sharpenToAtLeast,
        defaultMaintenancePolicy.sharpenToAtLeast,
      ),
      minDurability: normalizeNonNegativeInteger(safeSource.minDurability, defaultMaintenancePolicy.minDurability),
      allowFullSharpnessHone: Boolean(safeSource.allowFullSharpnessHone),
      maxHonesPerBattle: normalizeNonNegativeInteger(
        safeSource.maxHonesPerBattle,
        defaultMaintenancePolicy.maxHonesPerBattle,
      ),
    };
  }

  function normalizeEnemyGenerationConfig(source) {
    const safeSource = source && typeof source === "object" ? source : {};
    const hpMin = normalizePositiveNumber(safeSource.hpMultiplierMin, defaultEnemyGenerationConfig.hpMultiplierMin);
    const hpMax = normalizePositiveNumber(safeSource.hpMultiplierMax, defaultEnemyGenerationConfig.hpMultiplierMax);
    const hpK = normalizePositiveNumber(safeSource.hpK, defaultEnemyGenerationConfig.hpK);
    const hpS = normalizePositiveNumber(safeSource.hpS, defaultEnemyGenerationConfig.hpS);
    const pointK = normalizePositiveNumber(safeSource.pointK, defaultEnemyGenerationConfig.pointK);
    const pointS = normalizePositiveNumber(safeSource.pointS, defaultEnemyGenerationConfig.pointS);
    const rawFocusMin = Number(safeSource.focusShareMin);
    const rawFocusMax = Number(safeSource.focusShareMax);
    const focusMin = clamp(
      Number.isFinite(rawFocusMin) ? rawFocusMin : defaultEnemyGenerationConfig.focusShareMin,
      0,
      1,
    );
    const focusMax = clamp(
      Number.isFinite(rawFocusMax) ? rawFocusMax : defaultEnemyGenerationConfig.focusShareMax,
      0,
      1,
    );
    return {
      cr: normalizeNonNegativeInteger(safeSource.cr, defaultEnemyGenerationConfig.cr),
      hpK,
      hpS,
      hpMultiplierMin: Math.min(hpMin, hpMax),
      hpMultiplierMax: Math.max(hpMin, hpMax),
      pointK,
      pointS,
      focusShareMin: Math.min(focusMin, focusMax),
      focusShareMax: Math.max(focusMin, focusMax),
      previousEnemyName:
        typeof safeSource.previousEnemyName === "string" && safeSource.previousEnemyName.trim()
          ? safeSource.previousEnemyName.trim()
          : "",
    };
  }

  function reciprocalProbability(divisor, multiplier = 1) {
    const safeMultiplier = normalizeProbabilityMultiplier(multiplier, 1);
    const safeDivisor = Number(divisor);
    if (!Number.isFinite(safeDivisor) || safeDivisor <= 0) {
      return safeMultiplier > 0 ? 1 : 0;
    }
    return clamp((1 / safeDivisor) * safeMultiplier, 0, 1);
  }

  function reciprocalPowerProbability(divisor, exponent = 1) {
    const safeExponent = normalizeProbabilityMultiplier(exponent, 1);
    const safeDivisor = Number(divisor);
    if (!Number.isFinite(safeDivisor) || safeDivisor <= 0) {
      return 1;
    }
    return clamp((1 / safeDivisor) ** safeExponent, 0, 1);
  }

  function rollChance(probability, rng = Math.random) {
    const safeProbability = clamp(Number(probability) || 0, 0, 1);
    return {
      probability: safeProbability,
      roll: rng(),
      triggered: false,
    };
  }

  function completeRoll(probability, rng = Math.random) {
    const roll = rollChance(probability, rng);
    roll.triggered = roll.roll < roll.probability;
    return roll;
  }

  function rollExpectedAmount(expectedAmount, rng = Math.random) {
    const safeAmount = Math.max(0, Number(expectedAmount) || 0);
    const guaranteedAmount = Math.floor(safeAmount);
    const fractionalProbability = safeAmount - guaranteedAmount;
    const fractionalRoll = fractionalProbability > 0 ? completeRoll(fractionalProbability, rng) : null;
    return {
      expectedAmount: safeAmount,
      guaranteedAmount,
      fractionalProbability,
      fractionalRoll,
      amount: guaranteedAmount + (fractionalRoll?.triggered ? 1 : 0),
    };
  }

  function randomRange(min, max, rng = Math.random) {
    return min + (max - min) * rng();
  }

  function chooseRandomItem(items, rng = Math.random) {
    if (!Array.isArray(items) || items.length === 0) {
      return null;
    }
    return items[Math.min(items.length - 1, Math.floor(rng() * items.length))];
  }

  function generateEnemyName(focusAttribute, previousEnemyName = "", rng = Math.random) {
    const pool = enemyNamePools[focusAttribute] || [];
    const previousName = typeof previousEnemyName === "string" ? previousEnemyName.trim() : "";
    const candidates = previousName ? pool.filter((name) => name !== previousName) : pool;
    return chooseRandomItem(candidates.length > 0 ? candidates : pool, rng) || "敌人";
  }

  function allocatePointsByWeight(totalPoints, keys, rng = Math.random, cap = Infinity) {
    const allocations = Object.fromEntries(keys.map((key) => [key, 0]));
    let remainingPoints = Math.max(0, Math.floor(totalPoints));
    let openKeys = [...keys];

    while (remainingPoints > 0 && openKeys.length > 0) {
      const weights = openKeys.map(() => rng());
      const weightSum = weights.reduce((sum, value) => sum + value, 0) || openKeys.length;
      const rawAllocations = openKeys.map((key, index) => {
        const raw = remainingPoints * (weightSum > 0 ? weights[index] / weightSum : 1 / openKeys.length);
        return {
          key,
          raw,
          points: Math.floor(raw),
          remainder: raw - Math.floor(raw),
        };
      });
      let assigned = rawAllocations.reduce((sum, item) => sum + item.points, 0);
      [...rawAllocations]
        .sort((a, b) => b.remainder - a.remainder)
        .slice(0, remainingPoints - assigned)
        .forEach((item) => {
          item.points += 1;
          assigned += 1;
        });

      let overflow = 0;
      rawAllocations.forEach((item) => {
        const room = Math.max(0, cap - allocations[item.key]);
        const accepted = Math.min(item.points, room);
        allocations[item.key] += accepted;
        overflow += item.points - accepted;
      });
      remainingPoints = overflow;
      const nextOpenKeys = openKeys.filter((key) => allocations[key] < cap);
      if (nextOpenKeys.length === openKeys.length && overflow === assigned) {
        break;
      }
      openKeys = nextOpenKeys;
    }

    return allocations;
  }

  function allocateSharesByWeight(totalShare, keys, rng = Math.random, cap = Infinity, initialShares = {}) {
    const allocations = Object.fromEntries(keys.map((key) => [key, 0]));
    let remainingShare = Math.max(0, Number(totalShare) || 0);
    let openKeys = keys.filter((key) => Math.max(0, Number(initialShares[key]) || 0) < cap);
    let guard = 0;

    while (remainingShare > 1e-9 && openKeys.length > 0 && guard < 32) {
      guard += 1;
      const weights = openKeys.map(() => rng());
      const weightSum = weights.reduce((sum, value) => sum + value, 0) || openKeys.length;
      let acceptedTotal = 0;

      openKeys.forEach((key, index) => {
        const rawShare = remainingShare * (weightSum > 0 ? weights[index] / weightSum : 1 / openKeys.length);
        const room = Math.max(0, cap - (Math.max(0, Number(initialShares[key]) || 0) + allocations[key]));
        const acceptedShare = Math.min(rawShare, room);
        allocations[key] += acceptedShare;
        acceptedTotal += acceptedShare;
      });

      if (acceptedTotal <= 1e-9) {
        break;
      }

      remainingShare = Math.max(0, remainingShare - acceptedTotal);
      openKeys = openKeys.filter(
        (key) => Math.max(0, Number(initialShares[key]) || 0) + allocations[key] < cap - 1e-9,
      );
    }

    return allocations;
  }

  function createEnemyAttributeShares(focusAttribute, focusShare, rng = Math.random) {
    const baseShareTotal = ENEMY_BASE_ATTRIBUTE_SHARE * enemyAttributeIds.length;
    const focusBonusShare = clamp(Math.max(0, Number(focusShare) || 0), 0, Math.max(0, 1 - baseShareTotal));
    const shares = Object.fromEntries(enemyAttributeIds.map((attribute) => [attribute, ENEMY_BASE_ATTRIBUTE_SHARE]));
    shares[focusAttribute] += focusBonusShare;

    const remainingAttributes = enemyAttributeIds.filter((attribute) => attribute !== focusAttribute);
    const remainingShare = Math.max(0, 1 - baseShareTotal - focusBonusShare);
    const cappedRemainingCapacity = remainingAttributes.reduce(
      (total, attribute) => total + Math.max(0, shares[focusAttribute] - shares[attribute]),
      0,
    );
    const randomShareCap = cappedRemainingCapacity >= remainingShare - 1e-9 ? shares[focusAttribute] : Infinity;
    const randomShares = allocateSharesByWeight(remainingShare, remainingAttributes, rng, randomShareCap, shares);
    remainingAttributes.forEach((attribute) => {
      shares[attribute] += randomShares[attribute] || 0;
    });

    const shareTotal = enemyAttributeIds.reduce((total, attribute) => total + shares[attribute], 0);
    if (Math.abs(1 - shareTotal) > 1e-9) {
      shares[focusAttribute] = Math.max(0, shares[focusAttribute] + (1 - shareTotal));
    }

    return shares;
  }

  function allocatePointsByShare(totalPoints, shares) {
    const safeTotalPoints = Math.max(0, Math.floor(totalPoints));
    const rawAllocations = enemyAttributeIds.map((attribute) => {
      const raw = safeTotalPoints * Math.max(0, Number(shares[attribute]) || 0);
      return {
        attribute,
        raw,
        points: Math.floor(raw),
        remainder: raw - Math.floor(raw),
      };
    });
    let assigned = rawAllocations.reduce((sum, item) => sum + item.points, 0);
    const remainingPoints = safeTotalPoints - assigned;

    if (remainingPoints > 0) {
      [...rawAllocations]
        .sort((a, b) => b.remainder - a.remainder)
        .slice(0, remainingPoints)
        .forEach((item) => {
          item.points += 1;
          assigned += 1;
        });
    } else if (remainingPoints < 0) {
      [...rawAllocations]
        .filter((item) => item.points > 0)
        .sort((a, b) => a.remainder - b.remainder)
        .slice(0, Math.abs(remainingPoints))
        .forEach((item) => {
          item.points -= 1;
          assigned -= 1;
        });
    }

    return Object.fromEntries(rawAllocations.map((item) => [item.attribute, item.points]));
  }

  function generateEnemy(config = defaultEnemyGenerationConfig, rng = Math.random) {
    const activeConfig = normalizeEnemyGenerationConfig(config);
    const cr = activeConfig.cr;
    const hpMultiplier = randomRange(activeConfig.hpMultiplierMin, activeConfig.hpMultiplierMax, rng);
    const hpBase = cr ** activeConfig.hpK * activeConfig.hpS;
    const hp = Math.max(1, Math.round(hpBase * hpMultiplier));
    const totalPoints = Math.max(0, Math.round(cr ** activeConfig.pointK * activeConfig.pointS));
    const maxFocusShare = Math.max(0, 1 - ENEMY_BASE_ATTRIBUTE_SHARE * enemyAttributeIds.length);
    const focusShare = clamp(randomRange(activeConfig.focusShareMin, activeConfig.focusShareMax, rng), 0, maxFocusShare);
    const focusAttribute = enemyAttributeIds[Math.min(enemyAttributeIds.length - 1, Math.floor(rng() * enemyAttributeIds.length))];
    const attributeShares = createEnemyAttributeShares(focusAttribute, focusShare, rng);
    const attributePoints = allocatePointsByShare(totalPoints, attributeShares);
    const enemy = {
      cr,
      hp,
      hardness: attributePoints.hardness,
      fracture: attributePoints.fracture,
      wear: attributePoints.wear,
      rust: attributePoints.rust,
    };
    const focusPoints = enemy[focusAttribute];
    const name = generateEnemyName(focusAttribute, activeConfig.previousEnemyName, rng);
    enemy.name = name;
    enemy.generation = {
      cr,
      hpBase,
      hpK: activeConfig.hpK,
      hpS: activeConfig.hpS,
      hpMultiplier,
      totalPoints,
      pointK: activeConfig.pointK,
      pointS: activeConfig.pointS,
      baseSharePerAttribute: ENEMY_BASE_ATTRIBUTE_SHARE,
      focusShare,
      focusFinalShare: attributeShares[focusAttribute],
      remainingShare: Math.max(0, 1 - ENEMY_BASE_ATTRIBUTE_SHARE * enemyAttributeIds.length - focusShare),
      attributeShares,
      focusAttribute,
      focusPoints,
      name,
    };
    return enemy;
  }

  function getEnemySaltReward(enemy) {
    const normalizedEnemy = normalizeEnemy(enemy);
    return Math.max(0, Math.round(7 ** normalizedEnemy.cr * 0.5));
  }

  function applyDelta(stats, stat, amount) {
    const before = normalizeNonNegativeInteger(stats[stat], 0);
    const after = Math.max(0, before + amount);
    stats[stat] = after;
    return before - after;
  }

  function createDeltaRecord() {
    return Object.fromEntries(statIds.map((stat) => [stat, 0]));
  }

  function getPauseReasons(blade) {
    const normalized = normalizeBlade(blade);
    return pauseStatIds
      .filter((stat) => normalizeNonNegativeInteger(normalized.stats[stat], 0) <= 0)
      .map((stat) => ({
        stat,
        label: statLabels[stat] || stat,
        message: `${statLabels[stat] || stat}已归零`,
      }));
  }

  function getPauseReason(blade) {
    const reasons = getPauseReasons(blade);
    return reasons.length > 0 ? reasons[0] : null;
  }

  function getSharpnessHardnessPauseReason(snapshot) {
    const sharpness = normalizeNonNegativeInteger(snapshot?.stats?.sharpness, 0);
    const hardness = normalizeInteger(snapshot?.enemy?.hardness, 0);
    if (sharpness >= hardness) {
      return null;
    }
    return {
      type: "sharpnessBelowHardness",
      stat: "sharpness",
      label: "锋利不足",
      message: `攻击开始时锋利 ${sharpness} 低于敌人坚硬 ${hardness}，本次攻击后自动暂停`,
      snapshot: {
        sharpness,
        hardness,
      },
    };
  }

  function canBattle(blade) {
    return getPauseReasons(blade).length === 0;
  }

  function resolveAttack(blade, enemy, params = defaultParams, rng = Math.random) {
    const normalizedBlade = normalizeBlade(blade);
    const normalizedEnemy = normalizeEnemy(enemy);
    const activeParams = normalizeParams(params);
    const snapshot = {
      stats: { ...normalizedBlade.stats },
      maxStats: { ...normalizedBlade.maxStats },
      enemy: { ...normalizedEnemy },
    };
    const nextBlade = normalizeBlade(normalizedBlade);
    const nextEnemy = { ...normalizedEnemy };
    const deltas = createDeltaRecord();
    const events = [];
    const rolls = {};

    const damage = Math.max(0, snapshot.stats.sharpness - snapshot.enemy.hardness);
    nextEnemy.hp -= damage;
    events.push({
      type: "damage",
      label: "造成伤害",
      amount: damage,
      formula: "max(0, 当前锋利 - 敌人坚硬)",
    });

    const wearDurabilityLoss = Math.max(0, snapshot.enemy.wear - snapshot.stats.hardness);
    if (wearDurabilityLoss > 0) {
      deltas.durability -= wearDurabilityLoss;
      events.push({
        type: "wear",
        label: "磨损损耐久",
        amount: wearDurabilityLoss,
        formula: "max(0, 敌人磨损 - 当前硬度)",
      });
    }

    if (snapshot.stats.stability <= snapshot.enemy.rust) {
      rolls.rust = {
        probability: 1,
        roll: 0,
        triggered: true,
        certain: true,
      };
    } else {
      rolls.rust = completeRoll(
        reciprocalPowerProbability(snapshot.stats.stability - snapshot.enemy.rust, activeParams.rustK),
        rng,
      );
    }
    if (rolls.rust.triggered) {
      const rustTargets = ["toughness", "hardness", "stability"];
      const rustGap = Math.max(0, snapshot.enemy.rust - snapshot.stats.stability);
      const extraRustLossCount = snapshot.stats.stability < snapshot.enemy.rust
        ? Math.max(0, Math.floor(Math.log(Math.max(1, rustGap))))
        : 0;
      const rustLossCount = 1 + extraRustLossCount;
      const rustTargetCounts = Object.fromEntries(rustTargets.map((target) => [target, 0]));
      const rustTargetDetails = [];

      for (let index = 0; index < rustLossCount; index += 1) {
        const rustTarget = rustTargets[Math.min(rustTargets.length - 1, Math.floor(rng() * rustTargets.length))];
        rustTargetCounts[rustTarget] += 1;
        rustTargetDetails.push({
          stat: rustTarget,
          label: statLabels[rustTarget],
        });
        deltas[rustTarget] -= 1;
      }
      rolls.rust.attemptedTarget = rustTargetDetails[0]?.stat || null;
      rolls.rust.attemptedTargetLabel = rustTargetDetails[0]?.label || "";
      rolls.rust.attemptedTargets = rustTargetDetails;
      rolls.rust.attemptedTargetCounts = rustTargetCounts;
      rolls.rust.rustGap = rustGap;
      rolls.rust.extraLossCount = extraRustLossCount;
      rolls.rust.attemptedLossCount = rustLossCount;
      rolls.rust.target = rustTargetDetails[0]?.stat || null;
      rolls.rust.targetLabel = rustTargetDetails[0]?.label || "";
      rolls.rust.targets = rustTargetDetails;
      rolls.rust.targetCounts = rustTargetCounts;
      rolls.rust.lossCount = rustLossCount;
      events.push({
        type: "rust",
        label: "锈蚀损随机抗性",
        amount: rustLossCount,
        formula:
          snapshot.stats.stability < snapshot.enemy.rust
            ? "当前稳定 < 敌人锈蚀：基础 1 次 + floor(ln(锈蚀 - 稳定)) 次随机韧性、硬度或稳定 -1"
            : snapshot.stats.stability === snapshot.enemy.rust
              ? "当前稳定 = 敌人锈蚀，必定触发 1 次"
              : "(1 / (当前稳定 - 敌人锈蚀)) ^ k_锈蚀；触发后随机韧性、硬度或稳定 -1",
      });
    }

    const effectiveDullingToughness = Math.max(0, snapshot.stats.toughness - snapshot.enemy.fracture);
    const dullingQuality = reciprocalPowerProbability(effectiveDullingToughness, activeParams.dullingK);
    const expectedSharpnessLoss = dullingQuality * activeParams.dullingS;
    const dullingLossRoll = rollExpectedAmount(expectedSharpnessLoss, rng);
    if (dullingLossRoll.amount > 0) {
      deltas.sharpness -= dullingLossRoll.amount;
    }
    rolls.dulling = {
      probability: dullingQuality,
      triggered: dullingLossRoll.amount > 0,
      expectedLoss: expectedSharpnessLoss,
      guaranteedLoss: dullingLossRoll.guaranteedAmount,
      fractionalProbability: dullingLossRoll.fractionalProbability,
      fractionalRoll: dullingLossRoll.fractionalRoll,
      rolledLoss: dullingLossRoll.amount,
      loss: dullingLossRoll.amount,
      s: activeParams.dullingS,
      effectiveToughness: effectiveDullingToughness,
      fracture: snapshot.enemy.fracture,
    };

    statIds.forEach((stat) => {
      if (deltas[stat] !== 0) {
        const loss = applyDelta(nextBlade.stats, stat, deltas[stat]);
        deltas[stat] = -loss;
      }
    });
    if (rolls.rust?.triggered) {
      const rustTargets = ["toughness", "hardness", "stability"];
      const actualTargetCounts = Object.fromEntries(
        rustTargets.map((target) => [target, Math.max(0, -deltas[target])]),
      );
      const remainingTargetCounts = { ...actualTargetCounts };
      const actualTargetDetails = (rolls.rust.attemptedTargets || []).filter(({ stat }) => {
        if (remainingTargetCounts[stat] > 0) {
          remainingTargetCounts[stat] -= 1;
          return true;
        }
        return false;
      });
      const actualLossCount = actualTargetDetails.length;
      rolls.rust.target = actualTargetDetails[0]?.stat || null;
      rolls.rust.targetLabel = actualTargetDetails[0]?.label || "";
      rolls.rust.targets = actualTargetDetails;
      rolls.rust.targetCounts = actualTargetCounts;
      rolls.rust.actualTargets = actualTargetDetails;
      rolls.rust.actualTargetCounts = actualTargetCounts;
      rolls.rust.actualLossCount = actualLossCount;
      rolls.rust.lossCount = actualLossCount;
      const rustEvent = events.find((event) => event.type === "rust");
      if (rustEvent) {
        rustEvent.amount = actualLossCount;
      }
    }
    if (rolls.dulling) {
      rolls.dulling.loss = Math.max(0, -deltas.sharpness);
      rolls.dulling.triggered = rolls.dulling.loss > 0;
      if (rolls.dulling.loss > 0) {
        events.push({
          type: "dulling",
          label: "钝化损锋利",
          amount: rolls.dulling.loss,
          formula: "clamp((1 / max(0, 当前韧性 - 敌人崩裂)) ^ k_钝化, 0, 1) * s_钝化",
        });
      }
    }

    const hasMonitoredLoss = monitoredConductivityStatIds.some(
      (stat) => normalizeNonNegativeInteger(nextBlade.stats[stat], 0) < normalizeNonNegativeInteger(snapshot.stats[stat], 0),
    );
    if (hasMonitoredLoss) {
      rolls.conductivity = completeRoll(
        reciprocalPowerProbability(snapshot.stats.stability, activeParams.conductivityK),
        rng,
      );
      if (rolls.conductivity.triggered) {
        const loss = applyDelta(nextBlade.stats, "conductivity", -1);
        deltas.conductivity = -loss;
        events.push({
          type: "conductivity",
          label: "导能损耗",
          amount: loss,
          formula: "(1 / 当前稳定) ^ k_导能",
        });
      }
    } else {
      rolls.conductivity = null;
    }

    const victory = nextEnemy.hp <= 0;
    const pauseReasons = getPauseReasons(nextBlade);
    const sharpnessHardnessPauseReason = getSharpnessHardnessPauseReason(snapshot);
    if (sharpnessHardnessPauseReason) {
      pauseReasons.push(sharpnessHardnessPauseReason);
    }

    return {
      type: "attack",
      snapshot,
      blade: nextBlade,
      enemy: nextEnemy,
      damage,
      deltas,
      events,
      rolls,
      victory,
      pauseReasons,
      shouldPause: victory || pauseReasons.length > 0,
      saltReward: victory ? getEnemySaltReward(snapshot.enemy) : 0,
    };
  }

  function resolveHone(blade, params = defaultParams, rng = Math.random) {
    const normalizedBlade = normalizeBlade(blade);
    const activeParams = normalizeParams(params);
    const snapshot = {
      stats: { ...normalizedBlade.stats },
      maxStats: { ...normalizedBlade.maxStats },
    };
    const nextBlade = normalizeBlade(normalizedBlade);
    const deltas = createDeltaRecord();
    const events = [];
    const rolls = {};
    const currentSharpness = normalizeNonNegativeInteger(snapshot.stats.sharpness, 0);
    const maxSharpness = normalizeNonNegativeInteger(snapshot.maxStats.sharpness, 0);
    const isFullSharpness = currentSharpness >= maxSharpness;

    if (snapshot.stats.durability <= 0) {
      return {
        type: "hone",
        blocked: true,
        reason: "耐久不足，无法磨刃。",
        snapshot,
        blade: nextBlade,
        deltas,
        events,
        rolls,
        requiresDelay: false,
        pauseReasons: getPauseReasons(nextBlade),
      };
    }

    const durabilityLoss = applyDelta(nextBlade.stats, "durability", -1);
    deltas.durability = -durabilityLoss;
    events.push({
      type: "hone-durability",
      label: "磨刃消耗耐久",
      amount: durabilityLoss,
      formula: "每次磨刃消耗 1 耐久",
    });

    if (!isFullSharpness) {
      const honingQuality = reciprocalPowerProbability(snapshot.stats.hardness, activeParams.honingK);
      const expectedSharpnessGain = honingQuality * activeParams.honingS;
      const gainRoll = rollExpectedAmount(expectedSharpnessGain, rng);
      const restorableSharpness = Math.max(0, maxSharpness - currentSharpness);
      const sharpnessGain = Math.min(restorableSharpness, gainRoll.amount);
      nextBlade.stats.sharpness = currentSharpness + sharpnessGain;
      deltas.sharpness += sharpnessGain;
      rolls.honing = {
        probability: honingQuality,
        triggered: sharpnessGain > 0,
        expectedGain: expectedSharpnessGain,
        guaranteedGain: gainRoll.guaranteedAmount,
        fractionalProbability: gainRoll.fractionalProbability,
        fractionalRoll: gainRoll.fractionalRoll,
        rolledGain: gainRoll.amount,
        gain: sharpnessGain,
        s: activeParams.honingS,
      };
      events.push({
        type: sharpnessGain > 0 ? "honing" : "honing-no-gain",
        label: sharpnessGain > 0 ? "磨刃恢复锋利" : "磨刃无锋利收益",
        amount: sharpnessGain,
        formula: "clamp((1 / 当前硬度) ^ k_磨刃, 0, 1) * s_磨刃",
      });
    } else {
      rolls.honing = null;
      events.push({
        type: "full-hone",
        label: "满锋磨刃",
        amount: 0,
        formula: "当前锋利已达到出厂锋利，只消耗耐久",
      });
    }

    if (durabilityLoss > 0) {
      rolls.conductivity = completeRoll(
        reciprocalPowerProbability(snapshot.stats.stability, activeParams.conductivityK),
        rng,
      );
      if (rolls.conductivity.triggered) {
        const loss = applyDelta(nextBlade.stats, "conductivity", -1);
        deltas.conductivity = -loss;
        events.push({
          type: "conductivity",
          label: "导能损耗",
          amount: loss,
          formula: "(1 / 当前稳定) ^ k_导能",
        });
      }
    }

    return {
      type: "hone",
      blocked: false,
      snapshot,
      blade: nextBlade,
      deltas,
      events,
      rolls,
      requiresDelay: isFullSharpness,
      delaySeconds: isFullSharpness ? activeParams.fullSharpnessHoneDelaySeconds : 0,
      pauseReasons: getPauseReasons(nextBlade),
    };
  }

  function shouldMaintenanceRun(blade, policy) {
    const activePolicy = normalizeMaintenancePolicy(policy);
    const normalizedBlade = normalizeBlade(blade);
    if (!activePolicy.enabled) {
      return false;
    }
    if (normalizedBlade.stats.durability <= activePolicy.minDurability) {
      return false;
    }
    if (normalizedBlade.stats.sharpness <= activePolicy.sharpenAtOrBelow) {
      return true;
    }
    if (activePolicy.allowFullSharpnessHone && normalizedBlade.stats.sharpness >= normalizedBlade.maxStats.sharpness) {
      return true;
    }
    return false;
  }

  function runMaintenance(blade, params, policy, rng = Math.random) {
    const activePolicy = normalizeMaintenancePolicy(policy);
    let nextBlade = normalizeBlade(blade);
    const results = [];
    let honeCount = 0;

    while (
      activePolicy.enabled &&
      honeCount < activePolicy.maxHonesPerBattle &&
      nextBlade.stats.durability > activePolicy.minDurability &&
      (nextBlade.stats.sharpness < activePolicy.sharpenToAtLeast ||
        (activePolicy.allowFullSharpnessHone && nextBlade.stats.sharpness >= nextBlade.maxStats.sharpness))
    ) {
      const result = resolveHone(nextBlade, params, rng);
      if (result.blocked) {
        break;
      }
      results.push(result);
      honeCount += 1;
      nextBlade = result.blade;
      if (nextBlade.stats.sharpness >= activePolicy.sharpenToAtLeast && !activePolicy.allowFullSharpnessHone) {
        break;
      }
      if (result.pauseReasons.some((reason) => reason.stat === "durability")) {
        break;
      }
    }

    return {
      blade: nextBlade,
      results,
      honeCount,
    };
  }

  function simulateLifetime(options = {}) {
    const params = normalizeParams(options.params);
    const baseEnemy = normalizeEnemy(options.enemy);
    const enemyMode = options.enemyMode || "fixed";
    const enemyIncrement = normalizeEnemy(options.enemyIncrement || {}, {
      cr: 0,
      hp: 0,
      hardness: 0,
      fracture: 0,
      wear: 0,
      rust: 0,
    });
    const enemySequence = Array.isArray(options.enemySequence) ? options.enemySequence.map(normalizeEnemy) : [];
    const maintenancePolicy = normalizeMaintenancePolicy(options.maintenancePolicy);
    const rng = typeof options.rng === "function" ? options.rng : Math.random;
    const maxBattles = normalizeNonNegativeInteger(options.maxBattles, 1000) || 1000;
    const maxTurnsPerBattle = normalizeNonNegativeInteger(options.maxTurnsPerBattle, 10000) || 10000;
    let blade = normalizeBlade(options.blade);
    let kills = 0;
    let attacks = 0;
    let hones = 0;
    let salt = 0;
    let stopReason = null;
    const finalPauseReasons = [];

    for (let battleIndex = 0; battleIndex < maxBattles; battleIndex += 1) {
      const battlePause = getPauseReasons(blade);
      if (battlePause.length > 0) {
        stopReason = battlePause[0].message;
        finalPauseReasons.push(...battlePause);
        break;
      }

      let enemy = getEnemyForBattle({
        battleIndex,
        enemyMode,
        baseEnemy,
        enemyIncrement,
        enemySequence,
      });
      let turn = 0;

      while (turn < maxTurnsPerBattle) {
        if (shouldMaintenanceRun(blade, maintenancePolicy)) {
          const maintenance = runMaintenance(blade, params, maintenancePolicy, rng);
          blade = maintenance.blade;
          hones += maintenance.honeCount;
          const pauseAfterMaintenance = getPauseReasons(blade);
          if (pauseAfterMaintenance.length > 0) {
            stopReason = pauseAfterMaintenance[0].message;
            finalPauseReasons.push(...pauseAfterMaintenance);
            break;
          }
        }

        const result = resolveAttack(blade, enemy, params, rng);
        attacks += 1;
        turn += 1;
        blade = result.blade;
        enemy = result.enemy;

        if (result.victory) {
          kills += 1;
          salt += result.saltReward;
          break;
        }

        if (result.pauseReasons.length > 0) {
          stopReason = result.pauseReasons[0].message;
          finalPauseReasons.push(...result.pauseReasons);
          break;
        }
      }

      if (stopReason) {
        break;
      }
      if (turn >= maxTurnsPerBattle) {
        stopReason = "超过单场最大攻击次数";
        break;
      }
    }

    return {
      blade,
      kills,
      attacks,
      hones,
      salt,
      seconds: attacks * params.attackIntervalSeconds,
      stopReason: stopReason || "达到模拟上限",
      pauseReasons: finalPauseReasons,
    };
  }

  function getEnemyForBattle({ battleIndex, enemyMode, baseEnemy, enemyIncrement, enemySequence }) {
    if (enemyMode === "sequence" && enemySequence.length > 0) {
      return normalizeEnemy(enemySequence[battleIndex % enemySequence.length]);
    }
    if (enemyMode === "incremental") {
        return normalizeEnemy({
          name: baseEnemy.name,
          cr: baseEnemy.cr + enemyIncrement.cr * battleIndex,
          hp: baseEnemy.hp + enemyIncrement.hp * battleIndex,
          hardness: baseEnemy.hardness + enemyIncrement.hardness * battleIndex,
        fracture: baseEnemy.fracture + enemyIncrement.fracture * battleIndex,
        wear: baseEnemy.wear + enemyIncrement.wear * battleIndex,
        rust: baseEnemy.rust + enemyIncrement.rust * battleIndex,
      });
    }
    return normalizeEnemy(baseEnemy);
  }

  function summarizeLifetimeRuns(runs) {
    const safeRuns = Array.isArray(runs) ? runs.filter(Boolean) : [];
    if (safeRuns.length === 0) {
      return null;
    }
    const totals = safeRuns.reduce(
      (sum, run) => {
        sum.kills += run.kills;
        sum.attacks += run.attacks;
        sum.hones += run.hones;
        sum.salt += run.salt;
        sum.seconds += run.seconds;
        sum.remainingStats = statIds.reduce((stats, stat) => {
          stats[stat] = (stats[stat] || 0) + run.blade.stats[stat];
          return stats;
        }, sum.remainingStats);
        sum.stopReasons[run.stopReason] = (sum.stopReasons[run.stopReason] || 0) + 1;
        return sum;
      },
      {
        kills: 0,
        attacks: 0,
        hones: 0,
        salt: 0,
        seconds: 0,
        remainingStats: createStatRecord(),
        stopReasons: {},
      },
    );
    const count = safeRuns.length;
    const mostCommonStopReason = Object.entries(totals.stopReasons).sort((a, b) => b[1] - a[1])[0]?.[0] || "无";

    return {
      count,
      averageKills: totals.kills / count,
      averageAttacks: totals.attacks / count,
      averageHones: totals.hones / count,
      averageSalt: totals.salt / count,
      averageSeconds: totals.seconds / count,
      averageRemainingStats: Object.fromEntries(statIds.map((stat) => [stat, totals.remainingStats[stat] / count])),
      stopReasons: totals.stopReasons,
      mostCommonStopReason,
    };
  }

  function getRuleSections(params = defaultParams) {
    const activeParams = normalizeParams(params);
    return [
      {
        title: "攻击",
        lines: [
          "每次攻击开始时先记录刃与敌人的属性快照，本次所有公式都使用该快照，最后统一应用损耗。",
          "伤害 = max(0, 当前锋利 - 敌人坚硬)。",
          "敌人 HP <= 0 时胜利，获得 7^CR * 0.5 的盐并刷新下一只敌人，自动战斗保持暂停。",
        ],
      },
      {
        title: "敌人生成",
        lines: [
          `HP基准 = CR^HP_k * HP_s，当前默认基线为 CR^${defaultEnemyGenerationConfig.hpK} * ${defaultEnemyGenerationConfig.hpS}；最终 HP = round(HP基准 * HP倍率)，默认 HP倍率在 ${formatFormulaNumber(defaultEnemyGenerationConfig.hpMultiplierMin * 100)}% 到 ${formatFormulaNumber(defaultEnemyGenerationConfig.hpMultiplierMax * 100)}% 之间随机。`,
          `属性点 = round(CR^购点_k * 购点_s)，当前默认为 CR^${defaultEnemyGenerationConfig.pointK} * ${defaultEnemyGenerationConfig.pointS}，分配给坚硬、崩裂、磨损、锈蚀。`,
          `先给每个敌人属性分配 ${formatFormulaNumber(ENEMY_BASE_ATTRIBUTE_SHARE * 100)}% 的基础占比；再随机选出一个优势属性，额外分配 ${formatFormulaNumber(defaultEnemyGenerationConfig.focusShareMin * 100)}% 到 ${formatFormulaNumber(defaultEnemyGenerationConfig.focusShareMax * 100)}% 的占比；剩余占比随机分配给其它属性，最后换算成整数属性点。`,
        ],
      },
      {
        title: "损耗",
        lines: [
          "崩裂不再直接损耗锋利；它会降低钝化公式中的有效韧性。",
          "磨损损耐久 = max(0, 敌人磨损 - 当前硬度)。",
          `有效韧性 = max(0, 当前韧性 - 敌人崩裂)，钝化质量 = clamp((1 / 有效韧性) ^ ${activeParams.dullingK}, 0, 1)。有效韧性为 0 时按 1 结算。`,
          `钝化锋利损耗期望 = 钝化质量 * ${activeParams.dullingS}。整数部分必失，小数部分按概率额外 -1。`,
          `锈蚀：若当前稳定 <= 敌人锈蚀则必定触发；否则概率 = clamp((1 / (当前稳定 - 敌人锈蚀)) ^ ${activeParams.rustK}, 0, 1)。触发时随机选择韧性、硬度或稳定 -1；若当前稳定 < 敌人锈蚀，则额外触发 floor(ln(敌人锈蚀 - 当前稳定)) 次随机属性减少。`,
          `导能损耗：每次锋利、韧性、耐久、硬度或稳定下降后只判定一次，概率 = clamp((1 / 当前稳定) ^ ${activeParams.conductivityK}, 0, 1)，导能最低为 0。`,
        ],
      },
      {
        title: "磨刃",
        lines: [
          "磨刃只能在自动战斗暂停时进行，每次消耗 1 耐久。",
          `当当前锋利 < 出厂锋利，恢复期望 = clamp((1 / 当前硬度) ^ ${activeParams.honingK}, 0, 1) * ${activeParams.honingS}。整数部分必得，小数部分按概率额外 +1，最高不超过出厂锋利。`,
          `当当前锋利已满，仍可磨刃，但需要 ${activeParams.fullSharpnessHoneDelaySeconds} 秒后结算，只消耗耐久。`,
        ],
      },
      {
        title: "暂停",
        lines: [
          "锋利、韧性、耐久、硬度、稳定任一当前值 <= 0 时自动暂停。",
          "若攻击快照的当前锋利 < 敌人坚硬，本次攻击照常结算，结算后自动暂停。",
          "导能 <= 0 不会暂停普通战斗；导能最低值为 0。",
        ],
      },
    ];
  }

  function getKParameterSections(params = defaultParams) {
    const activeParams = normalizeParams(params);
    return [
      {
        id: "dullingK",
        label: "钝化 k",
        value: activeParams.dullingK,
        meaning: "有效韧性倒数质量的指数；敌人崩裂会先降低有效韧性。",
        formula: "钝化质量 = clamp((1 / max(0, 当前韧性 - 敌人崩裂)) ^ k_钝化, 0, 1)",
      },
      {
        id: "dullingS",
        label: "钝化 s",
        value: activeParams.dullingS,
        meaning: "一次完全钝化可能损失的锋利量；和钝化质量相乘后得到损耗期望。",
        formula: "损耗期望 = 钝化质量 * s；整数部分必失，小数部分按概率额外 -1",
      },
      {
        id: "honingK",
        label: "磨刃 k",
        value: activeParams.honingK,
        meaning: "硬度倒数质量的指数；当前锋利未满时先算出本次磨刃质量。",
        formula: "磨刃质量 = clamp((1 / 当前硬度) ^ k_磨刃, 0, 1)",
      },
      {
        id: "honingS",
        label: "磨刃 s",
        value: activeParams.honingS,
        meaning: "一次完美磨刃可能恢复的锋利量；和磨刃质量相乘后得到恢复期望。",
        formula: "恢复期望 = 磨刃质量 * s；整数部分必得，小数部分按概率额外 +1",
      },
      {
        id: "conductivityK",
        label: "导能 k",
        value: activeParams.conductivityK,
        meaning: "稳定倒数概率的指数；任一受监控属性下降后判定导能是否 -1。",
        formula: "clamp((1 / 当前稳定) ^ k_导能, 0, 1)",
      },
      {
        id: "rustK",
        label: "锈蚀 k",
        value: activeParams.rustK,
        meaning: "稳定高于敌人锈蚀时的锈蚀概率指数；触发后随机削减韧性、硬度或稳定，稳定低于锈蚀时按差距追加损耗次数。",
        formula: "当前稳定 <= 敌人锈蚀：必定触发；稳定 < 锈蚀时额外 floor(ln(锈蚀 - 稳定)) 次；否则 clamp((1 / (当前稳定 - 敌人锈蚀)) ^ k_锈蚀, 0, 1)",
      },
    ];
  }

  function getFormulaPreview(blade, enemy, params = defaultParams) {
    const normalizedBlade = normalizeBlade(blade);
    const normalizedEnemy = normalizeEnemy(enemy);
    const activeParams = normalizeParams(params);
    const stats = normalizedBlade.stats;
    const damage = Math.max(0, stats.sharpness - normalizedEnemy.hardness);
    const sharpnessHardnessPause = stats.sharpness < normalizedEnemy.hardness;
    const wearDurabilityLoss = Math.max(0, normalizedEnemy.wear - stats.hardness);
    const effectiveDullingToughness = Math.max(0, stats.toughness - normalizedEnemy.fracture);
    const dullingQuality = reciprocalPowerProbability(effectiveDullingToughness, activeParams.dullingK);
    const dullingExpectedLoss = dullingQuality * activeParams.dullingS;
    const honingQuality = reciprocalPowerProbability(stats.hardness, activeParams.honingK);
    const honingExpectedGain = honingQuality * activeParams.honingS;
    const conductivityProbability = reciprocalPowerProbability(stats.stability, activeParams.conductivityK);
    const rustCertain = stats.stability <= normalizedEnemy.rust;
    const rustDenominator = stats.stability - normalizedEnemy.rust;
    const rustProbability = rustCertain ? 1 : reciprocalPowerProbability(rustDenominator, activeParams.rustK);
    const rustExtraLossCount = stats.stability < normalizedEnemy.rust
      ? Math.max(0, Math.floor(Math.log(Math.max(1, normalizedEnemy.rust - stats.stability))))
      : 0;

    return [
      {
        id: "damage",
        label: "本次攻击伤害",
        formula: "max(0, 当前锋利 - 敌人坚硬)",
        substitution: `max(0, ${stats.sharpness} - ${normalizedEnemy.hardness})`,
        result: damage,
      },
      {
        id: "enemyHpAfterAttack",
        label: "攻击后敌人 HP",
        formula: "当前敌人 HP - 本次攻击伤害",
        substitution: `${normalizedEnemy.hp} - ${damage}`,
        result: normalizedEnemy.hp - damage,
      },
      {
        id: "sharpnessHardnessPause",
        label: "锋利不足暂停",
        formula: "当前锋利 < 敌人坚硬",
        substitution: `${stats.sharpness} < ${normalizedEnemy.hardness}`,
        result: sharpnessHardnessPause,
        resultType: "boolean",
        note: "触发时本次攻击照常结算，结算后自动暂停。",
      },
      {
        id: "fracture",
        label: "崩裂后有效韧性",
        formula: "max(0, 当前韧性 - 敌人崩裂)",
        substitution: `max(0, ${stats.toughness} - ${normalizedEnemy.fracture})`,
        result: effectiveDullingToughness,
      },
      {
        id: "wear",
        label: "磨损损耐久",
        formula: "max(0, 敌人磨损 - 当前硬度)",
        substitution: `max(0, ${normalizedEnemy.wear} - ${stats.hardness})`,
        result: wearDurabilityLoss,
      },
      {
        id: "dullingQuality",
        label: "钝化质量",
        formula: "clamp((1 / max(0, 当前韧性 - 敌人崩裂)) ^ k_钝化, 0, 1)",
        substitution: `clamp((1 / max(0, ${stats.toughness} - ${normalizedEnemy.fracture})) ^ ${activeParams.dullingK}, 0, 1)`,
        result: dullingQuality,
        resultType: "probability",
      },
      {
        id: "dullingLoss",
        label: "钝化损锋利期望",
        formula: "钝化质量 * s_钝化",
        substitution: `${formatFormulaNumber(dullingQuality)} * ${formatFormulaNumber(activeParams.dullingS)}`,
        result: dullingExpectedLoss,
        note: "整数部分必失，小数部分按概率额外 -1；最终不低于 0。",
      },
      {
        id: "honingQuality",
        label: "磨刃质量",
        formula: "clamp((1 / 当前硬度) ^ k_磨刃, 0, 1)",
        substitution: `clamp((1 / ${stats.hardness}) ^ ${activeParams.honingK}, 0, 1)`,
        result: honingQuality,
        resultType: "probability",
        note: "仅当前锋利低于出厂锋利时使用。",
      },
      {
        id: "honingGain",
        label: "磨刃恢复期望",
        formula: "磨刃质量 * s_磨刃",
        substitution: `${formatFormulaNumber(honingQuality)} * ${formatFormulaNumber(activeParams.honingS)}`,
        result: honingExpectedGain,
        note: "整数部分必得，小数部分按概率额外 +1；最终不超过出厂锋利。",
      },
      {
        id: "rust",
        label: "锈蚀触发概率",
        formula: rustCertain
          ? "当前稳定 <= 敌人锈蚀，必定触发"
          : "clamp((1 / (当前稳定 - 敌人锈蚀)) ^ k_锈蚀, 0, 1)",
        substitution: rustCertain
          ? `${stats.stability} <= ${normalizedEnemy.rust}`
          : `clamp((1 / (${stats.stability} - ${normalizedEnemy.rust})) ^ ${activeParams.rustK}, 0, 1)`,
        result: rustProbability,
        resultType: "probability",
        note: `触发后随机选择韧性、硬度或稳定 -1；当前额外随机损耗次数为 ${formatFormulaNumber(rustExtraLossCount)}。`,
      },
      {
        id: "rustExtraLossCount",
        label: "低稳定锈蚀额外次数",
        formula: "当前稳定 < 敌人锈蚀 ? floor(ln(敌人锈蚀 - 当前稳定)) : 0",
        substitution:
          stats.stability < normalizedEnemy.rust
            ? `floor(ln(${normalizedEnemy.rust} - ${stats.stability}))`
            : `${stats.stability} >= ${normalizedEnemy.rust}`,
        result: rustExtraLossCount,
        note: "额外次数会在基础锈蚀触发之外，继续随机选择韧性、硬度或稳定 -1。",
      },
      {
        id: "conductivity",
        label: "导能损耗概率",
        formula: "clamp((1 / 当前稳定) ^ k_导能, 0, 1)",
        substitution: `clamp((1 / ${stats.stability}) ^ ${activeParams.conductivityK}, 0, 1)`,
        result: conductivityProbability,
        resultType: "probability",
        note: "每次锋利、韧性、耐久、硬度或稳定下降后只判定一次。",
      },
    ];
  }

  const api = {
    statIds,
    statLabels,
    pauseStatIds,
    enemyStatIds,
    enemyStatLabels,
    enemyNamePools,
    defaultEnemy,
    defaultParams,
    defaultMaintenancePolicy,
    defaultEnemyGenerationConfig,
    createStatRecord,
    normalizeStats,
    normalizeBlade,
    normalizeEnemy,
    normalizeParams,
    normalizeMaintenancePolicy,
    normalizeEnemyGenerationConfig,
    reciprocalProbability,
    reciprocalPowerProbability,
    generateEnemyName,
    generateEnemy,
    getEnemySaltReward,
    resolveAttack,
    resolveHone,
    canBattle,
    getPauseReasons,
    getPauseReason,
    shouldMaintenanceRun,
    runMaintenance,
    simulateLifetime,
    summarizeLifetimeRuns,
    getEnemyForBattle,
    getRuleSections,
    getKParameterSections,
    getFormulaPreview,
  };

  global.BattleFormula = api;
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
