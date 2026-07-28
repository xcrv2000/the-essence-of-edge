(function () {
  const DEFAULT_MAX_LEVEL = 7;
  const COST_MULTIPLIER = 1.4;

  function buildLevels({ baseCost, resource, multiplier = COST_MULTIPLIER, maxLevel, effect }) {
    return Array.from({ length: maxLevel }, (_, index) => {
      const level = index + 1;
      return {
        level,
        cost: {
          [resource]: Math.floor(baseCost * Math.pow(multiplier, level - 1)),
        },
        effects: { ...effect },
      };
    });
  }

  function buildScaledSingleEffectLevels({
    baseCost,
    costResource,
    effectId,
    baseEffect,
    maxLevel,
    costMultiplier = 2,
    effectMultiplier = 3,
  }) {
    return Array.from({ length: maxLevel }, (_, index) => ({
      level: index + 1,
      cost: {
        [costResource]: Math.floor(baseCost * Math.pow(costMultiplier, index)),
      },
      effects: {
        [effectId]: Math.floor(baseEffect * Math.pow(effectMultiplier, index)),
      },
    }));
  }

  function buildMercuryFracturingLevels() {
    const effects = [
      { mercuryCost: 2, sulfurBonus: 1 },
      { mercuryCost: 4, sulfurBonus: 3 },
      { mercuryCost: 16, sulfurBonus: 9 },
      { mercuryCost: 32, sulfurBonus: 27 },
      { mercuryCost: 128, sulfurBonus: 81 },
      { mercuryCost: 256, sulfurBonus: 243 },
      { mercuryCost: 1024, sulfurBonus: 729 },
    ];

    return effects.map((effect, index) => ({
      level: index + 1,
      cost: {
        mercury: Math.floor(1000 * Math.pow(1.5, index)),
      },
      effects: {
        sulfurClickMercuryConversion: effect,
      },
    }));
  }

  function buildLargerAnvilLevels() {
    return [
      {
        level: 1,
        cost: {
          lead: 10,
          tin: 10,
        },
        effects: {
          forgingInputLimit: 100,
        },
      },
      {
        level: 2,
        cost: {
          lead: 100,
          tin: 100,
          copper: 100,
          iron: 100,
        },
        effects: {
          forgingInputLimit: 1000,
        },
      },
      {
        level: 3,
        cost: {
          lead: 1000,
          tin: 1000,
          copper: 1000,
          iron: 1000,
          silver: 1000,
          gold: 1000,
        },
        effects: {
          forgingInputLimit: 10000,
        },
      },
    ];
  }

  function buildLargerCrucibleLevels() {
    return [
      {
        level: 1,
        cost: {
          lead: 10,
          tin: 10,
        },
        effects: {
          smeltingInputLimit: 1000,
        },
      },
      {
        level: 2,
        cost: {
          copper: 100,
          iron: 100,
        },
        effects: {
          smeltingInputLimit: 5000,
        },
      },
      {
        level: 3,
        cost: {
          silver: 1000,
          gold: 1000,
        },
        effects: {
          smeltingInputLimit: 10000,
        },
      },
    ];
  }

  function buildEfficientPickaxeLevels() {
    const saltCosts = [1, 10, 100, 1000];
    return [
      {
        level: 1,
        cost: {
          lead: 10,
          salt: saltCosts[0],
        },
        effects: {
          sulfurMineCooldown: 0.5,
        },
      },
      {
        level: 2,
        cost: {
          tin: 10,
          salt: saltCosts[1],
        },
        effects: {
          sulfurMineCooldown: 0.3,
        },
      },
      {
        level: 3,
        cost: {
          copper: 10,
          salt: saltCosts[2],
        },
        effects: {
          sulfurMineCooldown: 0.2,
        },
      },
      {
        level: 4,
        cost: {
          iron: 10,
          salt: saltCosts[3],
        },
        effects: {
          sulfurMineCooldown: 0.1,
        },
      },
    ];
  }

  function buildEfficientSmeltingLevels() {
    return buildEfficientStationDurationLevels("smeltingDurationMultiplier");
  }

  function buildEfficientForgingLevels() {
    return buildEfficientStationDurationLevels("forgingDurationMultiplier");
  }

  function buildEfficientStationDurationLevels(effectId) {
    return [
      {
        level: 1,
        cost: {
          salt: 1,
        },
        effects: {
          [effectId]: 0.5,
        },
      },
      {
        level: 2,
        cost: {
          salt: 300,
        },
        effects: {
          [effectId]: 0.2,
        },
      },
      {
        level: 3,
        cost: {
          salt: 1000,
        },
        effects: {
          [effectId]: 0.1,
        },
      },
    ];
  }

  function buildAutomatedPickaxeLevels() {
    return [
      {
        level: 1,
        cost: {
          silver: 10,
          gold: 10,
        },
        effects: {
          sulfurPerSecond: 1,
        },
      },
      {
        level: 2,
        cost: {
          silver: 100,
          gold: 100,
        },
        effects: {
          sulfurPerSecond: 10,
        },
      },
      {
        level: 3,
        cost: {
          silver: 1000,
          gold: 1000,
        },
        effects: {
          sulfurPerSecond: 100,
        },
      },
    ];
  }

  window.GameResearch = {
    defaultMaxResearchLevel: DEFAULT_MAX_LEVEL,
    resourceLabels: {
      mercury: "汞",
      sulfur: "硫",
      salt: "盐",
      lead: "铅",
      tin: "锡",
      copper: "铜",
      iron: "铁",
      silver: "银",
      gold: "金",
    },
    featureLabels: {
      metallurgy: "冶金",
      battle: "战斗",
      inscription: "铭文",
    },
    startingResearch: [
      {
        id: "mercury-condenser",
        name: "汞冷凝器",
        description: "开局持有。每秒自动生成 1 汞。",
        unlockAt: "开局解锁",
        unlockRule: { type: "start" },
        source: "开局持有",
        maxLevel: 1,
        levels: [
          {
            level: 1,
            cost: {},
            effects: {
              mercuryPerSecond: 1,
            },
          },
        ],
      },
      {
        id: "sulfur-deposit",
        name: "硫矿床",
        description: "开局持有。每次按下增加 1 硫。",
        unlockAt: "开局解锁",
        unlockRule: { type: "start" },
        source: "开局持有",
        maxLevel: 1,
        levels: [
          {
            level: 1,
            cost: {},
            effects: {
              sulfurPerClick: 1,
            },
          },
        ],
      },
    ],
    upgradeResearch: [
      {
        id: "mercury-convergence",
        name: "汞汇聚",
        description: "让水银体更稳定地汇集汞滴。每级每秒额外获得 1 汞。",
        unlockAt: "开局解锁",
        unlockRule: { type: "start" },
        maxLevel: DEFAULT_MAX_LEVEL,
        levels: buildLevels({
          baseCost: 10,
          resource: "sulfur",
          maxLevel: DEFAULT_MAX_LEVEL,
          effect: {
            mercuryPerSecond: 1,
          },
        }),
      },
      {
        id: "sulfur-enrichment",
        name: "硫富集",
        description: "提高硫矿床的有效采收。每级每次点击额外获得 1 硫。",
        unlockAt: "开局解锁",
        unlockRule: { type: "start" },
        maxLevel: DEFAULT_MAX_LEVEL,
        levels: buildLevels({
          baseCost: 10,
          resource: "mercury",
          maxLevel: DEFAULT_MAX_LEVEL,
          effect: {
            sulfurPerClick: 1,
          },
        }),
      },
      {
        id: "mercury-condenser-upgrade-1",
        name: "汞冷凝器升级 I",
        description: "强化汞冷凝器。每级价格翻倍，单级汞收益变为上一级的 3 倍。",
        unlockAt: "汞汇聚达到 7 级",
        unlockRule: {
          type: "researchLevel",
          researchId: "mercury-convergence",
          level: 7,
        },
        maxLevel: 3,
        levels: buildScaledSingleEffectLevels({
          baseCost: 100,
          costResource: "mercury",
          effectId: "mercuryPerSecond",
          baseEffect: 10,
          maxLevel: 3,
        }),
      },
      {
        id: "sulfur-deposit-upgrade-1",
        name: "硫矿床升级 I",
        description: "强化硫矿床。每级价格翻倍，单级硫收益变为上一级的 3 倍。",
        unlockAt: "硫富集达到 7 级",
        unlockRule: {
          type: "researchLevel",
          researchId: "sulfur-enrichment",
          level: 7,
        },
        maxLevel: 3,
        levels: buildScaledSingleEffectLevels({
          baseCost: 100,
          costResource: "sulfur",
          effectId: "sulfurPerClick",
          baseEffect: 10,
          maxLevel: 3,
        }),
      },
      {
        id: "mercury-fracturing",
        name: "汞压裂",
        description: "点击硫矿床时，若汞足够，则消耗汞并额外获得硫；汞不足时只获得基础硫。",
        unlockAt: "历史最大汞超过 1000",
        unlockRule: {
          type: "resourceHistory",
          resources: {
            mercury: 1000,
          },
        },
        maxLevel: DEFAULT_MAX_LEVEL,
        levels: buildMercuryFracturingLevels(),
      },
      {
        id: "metallurgy",
        name: "冶金",
        description: "解锁冶金选项卡。",
        unlockAt: "历史最大汞和硫都超过 100",
        unlockRule: {
          type: "resourceHistory",
          resources: {
            mercury: 100,
            sulfur: 100,
          },
        },
        maxLevel: 1,
        levels: [
          {
            level: 1,
            cost: {
              mercury: 100,
              sulfur: 100,
            },
            effects: {
              unlockFeature: "metallurgy",
            },
          },
        ],
      },
      {
        id: "larger-crucible",
        name: "更大的坩埚",
        description: "扩大冶炼投料容量。初始最多投入总和为 100 的原料。",
        unlockAt: "冶炼解锁时",
        unlockRule: {
          type: "researchLevel",
          researchId: "metallurgy",
          level: 1,
        },
        maxLevel: 3,
        levels: buildLargerCrucibleLevels(),
      },
      {
        id: "efficient-smelting",
        name: "高效冶炼",
        description: "缩短冶炼等待时间。",
        unlockAt: "更大的坩埚达到 1 级",
        unlockRule: {
          type: "researchLevel",
          researchId: "larger-crucible",
          level: 1,
        },
        maxLevel: 3,
        levels: buildEfficientSmeltingLevels(),
      },
      {
        id: "battle",
        name: "战斗",
        description: "让锻成的刃进入战斗，击败敌人并获得盐。",
        unlockAt: "历史锻造刃总数大于 0",
        unlockRule: {
          type: "bladeHistory",
          count: 0,
        },
        maxLevel: 1,
        levels: [
          {
            level: 1,
            cost: {
              mercury: 1,
            },
            effects: {
              unlockFeature: "battle",
            },
          },
        ],
      },
      {
        id: "efficient-pickaxe",
        name: "高效矿镐",
        description: "缩短硫矿床的操作冷却。",
        unlockAt: "解锁冶金",
        unlockRule: {
          type: "researchLevel",
          researchId: "metallurgy",
          level: 1,
        },
        maxLevel: 4,
        levels: buildEfficientPickaxeLevels(),
      },
      {
        id: "automated-pickaxe",
        name: "自动化矿镐",
        description: "让硫矿床自动产出硫。",
        unlockAt: "高效矿镐达到 4 级",
        unlockRule: {
          type: "researchLevel",
          researchId: "efficient-pickaxe",
          level: 4,
        },
        maxLevel: 3,
        levels: buildAutomatedPickaxeLevels(),
      },
      {
        id: "larger-anvil",
        name: "更大的铁砧",
        description: "扩大锻造投料容量。初始最多投入总和为 10 的金属。",
        unlockAt: "锻造解锁时",
        unlockRule: {
          type: "researchLevel",
          researchId: "metallurgy",
          level: 1,
        },
        maxLevel: 3,
        levels: buildLargerAnvilLevels(),
      },
      {
        id: "efficient-forging",
        name: "高效锻造",
        description: "缩短锻造等待时间。",
        unlockAt: "更大的铁砧达到 1 级",
        unlockRule: {
          type: "researchLevel",
          researchId: "larger-anvil",
          level: 1,
        },
        maxLevel: 3,
        levels: buildEfficientForgingLevels(),
      },
      {
        id: "inscription",
        name: "铭文",
        description: "解锁冶金界面的铭文子页面。",
        unlockAt: "击败 CR5 敌人",
        unlockRule: {
          type: "battleKill",
          cr: 5,
          count: 1,
        },
        maxLevel: 1,
        levels: [
          {
            level: 1,
            cost: {
              salt: 10000,
              silver: 1000,
              gold: 100,
            },
            effects: {
              unlockFeature: "inscription",
            },
          },
        ],
      },
      {
        id: "looked-back-once",
        name: "只是回头看了一眼",
        description: "盐开始慢慢自己出现。",
        unlockAt: "点击铭文界面的【好耶！】且已经击杀过 CR5 怪物",
        unlockRule: {
          type: "inscriptionEpilogue",
          cr: 5,
          count: 1,
        },
        maxLevel: 1,
        levels: [
          {
            level: 1,
            cost: {
              salt: 1,
            },
            effects: {
              saltPerSecond: 1,
            },
          },
        ],
      },
      {
        id: "fire-pillar-falls",
        name: "火柱从天而降",
        description: "硫开始从更高的地方落下。",
        unlockAt: "点击铭文界面的【好耶！】且已经击杀过 CR5 怪物",
        unlockRule: {
          type: "inscriptionEpilogue",
          cr: 5,
          count: 1,
        },
        maxLevel: 1,
        levels: [
          {
            level: 1,
            cost: {
              sulfur: 1,
            },
            effects: {
              sulfurPerSecond: 10,
            },
          },
        ],
      },
      {
        id: "silver-tide-rises",
        name: "银潮从大地的缝隙中蔓出",
        description: "汞像潮水一样从缝隙里蔓延。",
        unlockAt: "点击铭文界面的【好耶！】且已经击杀过 CR5 怪物",
        unlockRule: {
          type: "inscriptionEpilogue",
          cr: 5,
          count: 1,
        },
        maxLevel: 1,
        levels: [
          {
            level: 1,
            cost: {
              sulfur: 1,
            },
            effects: {
              mercuryPerSecond: 100,
            },
          },
        ],
      },
    ],
  };
})();
