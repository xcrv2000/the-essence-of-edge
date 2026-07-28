const STORAGE_KEY = "blade-essence-save-v4";
const GAME_VERSION = "1.0";
const SAVE_VERSION = 14;
const HOME_LOG_LIMIT = 100;
const SMELTING_LOG_LIMIT = 100;
const SMELTING_FAVORITE_LIMIT = 20;
const BATTLE_LOG_LIMIT = 60;
const BLADE_INVENTORY_LIMIT = 20;
const MAX_BATTLE_CR = 8;
const BATTLE_FLEE_COOLDOWN_SECONDS = 300;
const MAX_INGREDIENT_STEP = 1000000;
const BASE_SMELTING_INPUT_LIMIT = 100;
const BASE_FORGING_INPUT_LIMIT = 10;
const SMELTING_OPERATION_DURATION_FACTOR = 35;
const FORGING_OPERATION_DURATION_FACTOR = 35;
const OPERATION_DURATION_DIVISOR = 14;
const DEFAULT_SULFUR_MINE_COOLDOWN_SECONDS = 1;
const BLADE_NAME_ROLL_ATTEMPTS = 24;
const BLADE_NAME_VARIANTS = ["新月", "残星", "寒光", "鸣砂", "灰烬", "晨霜", "玄纹", "幽辉", "回火", "白隙"];
const BATTLE_ATTRIBUTE_NOTES = [
  ["【锋利】", "决定【普通攻击】的伤害，会在战斗中逐渐变钝；【磨刃】可以恢复【锋利】。"],
  ["【韧性】", "帮助刃维持【锋利】，也抵抗敌人的【崩裂】压力；耗尽时战斗会暂停。"],
  ["【耐久】", "是刃的承载能力。【磨刃】会消耗【耐久】，敌人的【磨损】也会伤到【耐久】。"],
  ["【硬度】", "代表耐磨和难以打磨的程度。它抵抗【磨损】，也影响【磨刃】带来的恢复量。"],
  ["【稳定】", "代表环境抗性。它抵抗【锈蚀】，并影响其它损耗是否连带降低【导能】。"],
  ["【导能】", "支撑【铭文】。【导能】可以降到 0，但不会单独阻止【普通攻击】。"],
  ["【坚硬】", "敌人的防护强度，会削弱刃的【普通攻击】伤害。"],
  ["【崩裂】", "敌人让刃开裂、卷刃的压力，会推动【锋利】更快下降。"],
  ["【磨损】", "敌人对刃身的磨耗压力，会压低刃的【耐久】。"],
  ["【锈蚀】", "敌人的腐蚀和污染压力，会随机侵蚀刃的【韧性】、【硬度】或【稳定】；稳定低于锈蚀时会按差距追加多次侵蚀。"],
];
const INSCRIPTION_EPILOGUE_TEXT = [
  "你已经来到了本版本的终点。如果你发现打CR6或更高的怪物很困难，这是正常的。",
  "你可以继续探索冶炼与锻造的规律，也可以随便挂着等版本更新。",
  "感谢游玩，以及敬请期待！（如果有人期待的话）",
];
const ACTION_COOLDOWN_IDS = ["sulfurMine", "smelting", "forging", "battleFlee"];
const PROCESS_ACTION_LABELS = {
  smelting: "冶炼",
  forging: "锻造",
};

const gameResearch = window.GameResearch;
const forgingFormula = window.ForgingFormula;
const bladeNaming = window.BladeNaming;
const battleFormula = window.BattleFormula;

if (!gameResearch) {
  throw new Error("Missing research.js");
}
if (!forgingFormula) {
  throw new Error("Missing forgingFormula.js");
}
if (!bladeNaming) {
  throw new Error("Missing bladeNaming.js");
}
if (!battleFormula) {
  throw new Error("Missing battleFormula.js");
}

const startingResearch = gameResearch.startingResearch;
const upgradeResearch = gameResearch.upgradeResearch;
const resourceLabels = gameResearch.resourceLabels;
const featureLabels = gameResearch.featureLabels || {};
const allResearch = [...startingResearch, ...upgradeResearch];
const resourceIds = Object.keys(resourceLabels);
const metalResourceIds = forgingFormula.metalIds;
const bladeStatIds = forgingFormula.statIds;
const bladeStatLabels = forgingFormula.statLabels;
const metalTierRank = Object.fromEntries(metalResourceIds.map((resource, index) => [resource, index]));
const metallurgyResourceIds = {
  smelting: ["mercury", "sulfur"],
  forging: metalResourceIds,
  inscription: [],
};
const smeltingRatioBands = [
  { resource: "lead", lower: [3, 2], upper: [5, 3], advice: "好像可以多放一些？" },
  { resource: "tin", lower: [8, 5], upper: [13, 8], advice: "好像可以再多放一些？" },
  { resource: "copper", lower: [21, 13], upper: [34, 21], advice: "好像可以稍微再多放一些？" },
  { resource: "iron", lower: [55, 34], upper: [89, 55], advice: "好像可以再多放一点？" },
  { resource: "silver", lower: [377, 233], upper: [233, 144], advice: "好像可以再多放一点点？" },
];
const BLADE_NAME_RATIO_THRESHOLD = 0.35;
const BLADE_NAME_TOP_STAT_RATIO = 0.9;
const bladeNamePools = {
  sharpness: splitWordPool(`
匕首、长剑、弯刀、武士刀、砍刀、战镰、长矛
飞刀、手里剑、轮刃、箭头
镰刀、柴刀、园艺剪、篱剪
手锯、木工凿、木工刨、木旋刀
美工刀、玻璃刀、瓷砖刀、刮漆刀
车刀、铣刀、钻头、铰刀、铁皮剪
裁缝剪、裁布刀、滚轮刀、拆线刀、皮革刀
半月刀、裁纸刀、闸刀、拆信刀
菜刀、主厨刀、砍骨刀、面包刀、水果刀
厨剪、披萨刀
猎刀、剥皮刀、屠刀、鱼刀
手术刀、手术剪、柳叶刀、骨锯、活检刀
切片刀、截肢刀
剃须刀、直剃刀、理发剪、鼻毛剪、修眉刀
水手刀、求生刀、割绳刀、急救剪
雕刻刀、版画刀、模型刀、刻纸刀、剪纸剪
制鞋刀、包装刀、工业刀、冰刀
`),
  toughness: splitWordPool(`
长剑、弯刀、武士刀、砍刀、战镰
长矛、戟、斧枪
飞刀、手里剑、标枪、投矛、鲸叉
大镰、柴刀、园艺剪、篱剪
链锯、带锯、曲线锯
钢筋剪、螺栓剪
拉刀、铁皮剪
裁缝剪、裁布刀、皮革刀、半月刀
厨剪
猎刀、鱼叉、鱼钩、羊毛剪
手术剪、截肢刀
直剃刀、打薄剪、鼻毛剪、指甲剪
水手刀、求生刀、多用刀、冰斧、急救剪
消防斧、剪纸剪、制鞋刀
刀辊
冰刀、冰艇刃、滑雪板、冲浪鳍
桨叶、滑翔翼、涡轮叶
`),
  durability: splitWordPool(`
长剑、武士刀、砍刀、战斧
长矛、戟、斧枪、飞斧、鲸叉
镰刀、大镰、柴刀、锄头、铁锹、犁铧
割草机、旋耕刀
手锯、链锯、圆锯、带锯
木工凿、木工刨、锛、木斧
瓦刀、冷凿、管切器、钢筋剪、螺栓剪
地板铲
车刀、铣刀、钻头、铰刀、镗刀、拉刀
丝锥、板牙、砂轮
闸刀、砍骨刀、绞肉机
猎刀、屠刀、肉锯、鱼叉、兽夹、蹄刀
骨锯、骨凿、环钻
指甲剪
水手刀、求生刀、多用刀、工兵铲
冰斧、冰镐、雪锯、消防斧
珠宝锯、金工锯
分切刀、剪板机、冲裁模、刀辊
切胶机、工业刀
冰刀、雪橇刃、滑雪板、船舵、桨叶
冰艇刃、螺旋桨、涡轮叶
`),
  hardness: splitWordPool(`
匕首、武士刀、战斧、飞斧
手里剑、轮刃、箭头、弩箭、标枪、鲸叉
犁铧、旋耕刀
手锯、链锯、圆锯
木工凿、锛
瓦刀、玻璃刀、瓷砖刀、冷凿
管切器、钢筋剪、螺栓剪、地板铲
车刀、铣刀、钻头、铰刀、镗刀、拉刀
丝锥、板牙、砂轮
冲子、闸刀
砍骨刀、刨丝器、开罐器
肉锯、鱼叉、兽夹、蹄刀
骨锯、骨凿、环钻、刮匙
指甲剪、死皮刀、刮脚刀
工兵铲、冰斧、冰镐、消防斧
篆刻刀、修坯刀、珠宝锯、金工锯
粉碎机、削片机、剪板机、冲裁模
刀辊、工业刀
冰刀、雪橇刃、冰艇刃、涡轮叶
`),
  stability: splitWordPool(`
长剑、砍刀、战斧、长矛、戟、斧枪、飞斧、鲸叉
大镰、柴刀
锄头、铁锹、犁铧、割草机、旋耕刀
链锯、圆锯、木工凿、木工刨、锛、木斧
瓦刀、管切器、螺栓剪、地板铲
车刀、铣刀、镗刀、拉刀、砂轮
闸刀
砍骨刀、绞肉机
屠刀、肉锯、兽夹
骨锯、骨凿、环钻、截肢刀
求生刀、多用刀、工兵铲
冰斧、冰镐、消防斧
金工锯
碎纸机、粉碎机、削片机、剪板机
冲裁模、刀辊、工业刀
雪橇刃、滑雪板、船舵、冰艇刃、涡轮叶
`),
  conductivity: splitWordPool(`
长剑、武士刀、长矛、戟、斧枪
手里剑、轮刃、飞镖、箭头、弩箭
标枪、投矛、鲸叉
割草机、旋耕刀
链锯、圆锯、带锯、曲线锯、木旋刀
玻璃刀、管切器
车刀、铣刀、钻头、铰刀、镗刀
丝锥、板牙、砂轮
滚轮刀、冲子、闸刀
披萨刀、刨丝器、开罐器、绞肉机
鱼钩
骨锯、环钻
电推子、多用刀
珠宝锯、金工锯
碎纸机、粉碎机、削片机
分切刀、包装刀、剪板机、冲裁模
刀辊、切胶机、工业刀
冰刀、雪橇刃、滑雪板、冲浪鳍
螺旋桨、船舵、桨叶、冰艇刃
滑翔翼、涡轮叶
`),
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

const elements = {
  screenTitle: $("#screen-title"),
  titleMercury: $("#title-mercury"),
  titleSulfur: $("#title-sulfur"),
  titleSalt: $("#title-salt"),
  homeMercury: $("#home-mercury"),
  homeSulfur: $("#home-sulfur"),
  homeSalt: $("#home-salt"),
  mercuryRate: $("#mercury-rate"),
  sulfurRate: $("#sulfur-rate"),
  saltRate: $("#salt-rate"),
  sulfurButton: $("#sulfur-button"),
  sulfurGain: $("#sulfur-gain"),
  homeLog: $("#home-log"),
  homeMetalResources: $("#home-metal-resources"),
  ownedResearchList: $("#owned-research-list"),
  availableResearchList: $("#available-research-list"),
  lockedResearchList: $("#locked-research-list"),
  smeltingResourceList: $("#smelting-resource-list"),
  forgingResourceList: $("#forging-resource-list"),
  smeltingSelectedResource: $("#smelting-selected-resource"),
  forgingSelectedResource: $("#forging-selected-resource"),
  smeltingCurrentInputs: $("#smelting-current-inputs"),
  forgingCurrentInputs: $("#forging-current-inputs"),
  metallurgyLayout: $(".metallurgy-layout"),
  smeltingProduct: $("#smelting-product"),
  smeltingProductNote: $("#smelting-product-note"),
  forgingProduct: $("#forging-product"),
  forgingProductNote: $("#forging-product-note"),
  smeltButton: $("#smelt-button"),
  forgeButton: $("#forge-button"),
  smeltingDrawer: $("#smelting-drawer"),
  forgingDrawer: $("#forging-drawer"),
  smeltingDrawerToggle: $("#smelting-drawer-toggle"),
  forgingDrawerToggle: $("#forging-drawer-toggle"),
  smeltingLogTitle: $("#smelting-log-title"),
  smeltingLogModeToggle: $("#smelting-log-mode-toggle"),
  smeltingLogList: $("#smelting-log-list"),
  bladeInventoryGrid: $("#blade-inventory-grid"),
  bladeDetail: $("#blade-detail"),
  bladeBatchDeleteToggle: $("#blade-batch-delete-toggle"),
  bladeBatchDeleteButton: $("#blade-batch-delete-button"),
  bladeFavoriteButton: $("#blade-favorite-button"),
  bladeReproduceButton: $("#blade-reproduce-button"),
  bladeDeleteButton: $("#blade-delete-button"),
  metallurgyMetalResources: $("#metallurgy-metal-resources"),
  metallurgySubtabs: $$("[data-metallurgy-tab]"),
  metallurgyPanels: $$("[data-metallurgy-panel]"),
  inscriptionPanel: $("[data-metallurgy-panel=\"inscription\"]"),
  settingsSubtabs: $$("[data-settings-tab]"),
  settingsPanels: $$("[data-settings-panel]"),
  statsList: $("#stats-list"),
  battleState: $("#battle-state"),
  battleLayout: $(".battle-layout"),
  battleEnemyCard: $("#battle-enemy-card"),
  battleLogSummary: $("#battle-log-summary"),
  battleLogList: $("#battle-log-list"),
  battleSelectedBlade: $("#battle-selected-blade"),
  battleFleeButton: $("#battle-flee-button"),
  battleCrSelect: $("#battle-cr-select"),
  battleAutoToggle: $("#battle-auto-toggle"),
  battleAttackButton: $("#battle-attack-button"),
  battleHoneButton: $("#battle-hone-button"),
  battleInscriptionButton: $("#battle-inscription-button"),
	  battleDrawer: $("#battle-drawer"),
	  battleDrawerToggle: $("#battle-drawer-toggle"),
	  battleInventorySummary: $("#battle-inventory-summary"),
	  battleBladeBatchDeleteToggle: $("#battle-blade-batch-delete-toggle"),
	  battleBladeBatchDeleteButton: $("#battle-blade-batch-delete-button"),
	  battleBladeFavoriteButton: $("#battle-blade-favorite-button"),
	  battleBladeDeleteButton: $("#battle-blade-delete-button"),
	  battleBladeList: $("#battle-blade-list"),
  autosaveToggle: $("#autosave-toggle"),
  autosaveState: $("#autosave-state"),
  compactToggle: $("#compact-toggle"),
  compactState: $("#compact-state"),
  saveCode: $("#save-code"),
  saveButton: $("#save-button"),
  exportButton: $("#export-button"),
  importButton: $("#import-button"),
  resetButton: $("#reset-button"),
  settingsMessage: $("#settings-message"),
  versionLabel: $("#version-label"),
  milestoneList: $("#milestone-list"),
};

const screenTitles = {
  home: "主页",
  research: "研究",
  metallurgy: "冶金",
  battle: "战斗",
  settings: "系统",
};

const screenFeatureRequirements = {
  metallurgy: "metallurgy",
  battle: "battle",
};
const featureIds = Array.from(
  new Set([...Object.keys(featureLabels), ...Object.values(screenFeatureRequirements)]),
);
const metallurgyStationFeatureRequirements = {
  inscription: "inscription",
};

let activeScreen = "home";
let state = loadState();
let lastTickAt = Date.now();
let lastAutoSaveAt = 0;
let lastPassiveRenderAt = 0;
let lastPassiveAutosaveCheckAt = 0;
let cooldownWasActive = false;
let lastAdvanceCompletedOperations = 0;
const collapsedResearchSections = {
  available: false,
  owned: false,
  locked: false,
};
const metallurgyUi = {
  activeStation: "smelting",
  selectedResources: {
    smelting: null,
    forging: null,
  },
  drawers: {
    smelting: false,
    forging: false,
  },
  ingredientSteps: {
    smelting: 1,
    forging: 1,
  },
  smeltingLogMode: "all",
  selectedBladeId: null,
  bladeMetaScrollTop: 0,
  batchDeleteMode: false,
  batchDeleteBladeIds: new Set(),
  pendingBladeDetails: null,
};
const settingsUi = {
  activeTab: "settings",
};
const battleUi = {
  drawerOpen: false,
  bladeInfoOpen: false,
  bladeInfoScrollTop: 0,
};
const milestoneDefinitions = [
  {
    id: "first-mercury",
    title: "获得第一个汞",
    isComplete: () => getHighestResourceAmount("mercury") >= 1,
  },
  {
    id: "first-sulfur",
    title: "获得第一个硫",
    isComplete: () => getHighestResourceAmount("sulfur") >= 1,
  },
  {
    id: "first-upgrade-research",
    title: "完成第一次研究",
    isComplete: () => getUpgradeResearchLevelTotal() > 0,
  },
  {
    id: "unlock-metallurgy",
    title: "解锁冶金",
    isComplete: () => hasResearch("metallurgy") || Boolean(state.unlockedFeatures.metallurgy),
  },
  {
    id: "first-smelting",
    title: "完成第一次冶炼",
    isComplete: () => hasCompletedSmelting(),
  },
  {
    id: "first-metal",
    title: "获得第一份金属",
    isComplete: () => hasAnyMetalResource(),
  },
  {
    id: "first-forging",
    title: "完成第一次锻造",
    isComplete: () => Math.floor(Number(state.meta?.forgedBladeTotal) || 0) > 0,
  },
  {
    id: "unlock-battle",
    title: "解锁战斗",
    isComplete: () => hasResearch("battle") || Boolean(state.unlockedFeatures.battle),
  },
  {
    id: "first-kill",
    title: "击败第一个敌人",
    isComplete: () => getBattleKillTotal() > 0,
  },
  {
    id: "first-salt",
    title: "获得第一个盐",
    isComplete: () => getHighestResourceAmount("salt") >= 1 || Math.floor(Number(state.battle?.saltEarned) || 0) > 0,
  },
  {
    id: "defeat-cr5",
    title: "击败 CR5 怪物",
    isComplete: () => getBattleKillsForCr(5) > 0,
  },
  {
    id: "unlock-inscription-page",
    title: "解锁铭文页",
    badge: "版本1.0终点",
    isComplete: () => Boolean(state.unlockedFeatures.inscription),
  },
];
let battleAutoTimer = null;
let battleHoneTimer = null;
let smeltingLogRenderSignature = "";

function createResourceRecord(defaultValue = 0) {
  return Object.fromEntries(resourceIds.map((resource) => [resource, defaultValue]));
}

function createDefaultCooldowns(defaultValue = 0) {
  return Object.fromEntries(ACTION_COOLDOWN_IDS.map((actionId) => [actionId, defaultValue]));
}

function createDefaultPendingOperations(defaultValue = null) {
  return Object.fromEntries(ACTION_COOLDOWN_IDS.map((actionId) => [actionId, defaultValue]));
}

function createDefaultState() {
  return {
    resources: createResourceRecord(),
    highestResources: createResourceRecord(),
    researchLevels: createDefaultResearchLevels(),
    activeResearchLevels: createDefaultActiveResearchLevels(),
    unlockedResearch: createDefaultUnlockedResearch(),
    unlockedFeatures: createDefaultUnlockedFeatures(),
    settings: {
      autoSave: true,
      compactNumbers: true,
    },
    metallurgy: createDefaultMetallurgyState(),
    meta: createDefaultMetaState(),
    battle: createDefaultBattleState(),
    cooldowns: createDefaultCooldowns(),
    pendingOperations: createDefaultPendingOperations(),
    homeLog: ["汞冷凝器开始滴落汞。", "硫矿床可开采。"],
    lastSavedAt: null,
  };
}

function createDefaultMetallurgyState() {
  return {
    smeltingInputs: createResourceRecord(),
    forgingInputs: createResourceRecord(),
    smeltingLog: [],
    smeltingFavorites: [],
    bladeInventory: [],
    garbageCount: 0,
    lastSmeltingProduct: null,
    lastForgingProduct: null,
  };
}

function createDefaultMetaState() {
  return {
    forgedBladeTotal: 0,
    inscriptionEpilogueAccepted: false,
  };
}

function createDefaultBattleKillsByCr(defaultValue = 0) {
  return Object.fromEntries(
    Array.from({ length: MAX_BATTLE_CR }, (_, index) => [String(index + 1), defaultValue]),
  );
}

function createDefaultBattleState() {
  return {
    selectedBladeId: null,
    selectedCr: 1,
    maxUnlockedCr: 1,
    killsByCr: createDefaultBattleKillsByCr(),
    currentEnemy: null,
    log: [],
    saltEarned: 0,
    attacks: 0,
    hones: 0,
    lastImportantPauseReason: null,
  };
}

function createDefaultResearchLevels() {
  const levels = {};

  startingResearch.forEach((research) => {
    levels[research.id] = 1;
  });
  upgradeResearch.forEach((research) => {
    levels[research.id] = 0;
  });

  return levels;
}

function createDefaultActiveResearchLevels() {
  return createDefaultResearchLevels();
}

function createDefaultUnlockedResearch() {
  const unlockedResearch = {};

  allResearch.forEach((research) => {
    unlockedResearch[research.id] = research.unlockRule?.type === "start";
  });

  return unlockedResearch;
}

function createDefaultUnlockedFeatures(defaultValue = false) {
  return Object.fromEntries(featureIds.map((featureId) => [featureId, defaultValue]));
}

function loadState() {
  try {
    const rawSave = localStorage.getItem(STORAGE_KEY);
    if (!rawSave) {
      return createDefaultState();
    }
    const parsed = JSON.parse(rawSave);
    return normalizeState(parsed.state || parsed);
  } catch {
    return createDefaultState();
  }
}

function normalizeState(source) {
  const fallback = createDefaultState();
  const safeSource = source && typeof source === "object" ? source : {};
  const safeResources =
    safeSource.resources && typeof safeSource.resources === "object" ? safeSource.resources : {};
  const resources = createResourceRecord();
  resourceIds.forEach((resource) => {
    resources[resource] = finiteNumber(safeResources[resource], fallback.resources[resource]);
  });
  const safeHighestResources =
    safeSource.highestResources && typeof safeSource.highestResources === "object"
      ? safeSource.highestResources
      : {};
  const safeFeatures =
    safeSource.unlockedFeatures && typeof safeSource.unlockedFeatures === "object"
      ? safeSource.unlockedFeatures
      : {};
  const safeSettings =
    safeSource.settings && typeof safeSource.settings === "object" ? safeSource.settings : {};
  const researchLevels = normalizeResearchLevels(safeSource);

  const normalized = {
    resources,
    highestResources: createResourceRecord(),
    researchLevels,
    activeResearchLevels: normalizeActiveResearchLevels(safeSource, researchLevels),
    unlockedResearch: normalizeUnlockedResearch(safeSource),
    unlockedFeatures: normalizeUnlockedFeatures(safeFeatures, fallback.unlockedFeatures),
    settings: {
      autoSave:
        typeof safeSettings.autoSave === "boolean"
          ? safeSettings.autoSave
          : fallback.settings.autoSave,
      compactNumbers:
        typeof safeSettings.compactNumbers === "boolean"
          ? safeSettings.compactNumbers
          : fallback.settings.compactNumbers,
    },
    metallurgy: normalizeMetallurgyState(safeSource.metallurgy, fallback.metallurgy),
    meta: normalizeMetaState(safeSource.meta, fallback.meta),
    battle: normalizeBattleState(safeSource.battle, fallback.battle),
    cooldowns: normalizeCooldowns(safeSource.cooldowns, fallback.cooldowns),
    pendingOperations: normalizePendingOperations(safeSource.pendingOperations, fallback.pendingOperations),
    homeLog: normalizeLog(safeSource.homeLog, fallback.homeLog),
    lastSavedAt:
      typeof safeSource.lastSavedAt === "string" ? safeSource.lastSavedAt : fallback.lastSavedAt,
  };

  ACTION_COOLDOWN_IDS.forEach((actionId) => {
    const pendingOperation = normalized.pendingOperations[actionId];
    if (pendingOperation) {
      normalized.cooldowns[actionId] = Math.max(normalized.cooldowns[actionId], pendingOperation.readyAt);
    }
  });

  resourceIds.forEach((resource) => {
    normalized.highestResources[resource] = Math.max(
      resources[resource],
      finiteNumber(safeHighestResources[resource], fallback.highestResources[resource]),
    );
  });
  normalized.meta.forgedBladeTotal = Math.max(
    normalized.meta.forgedBladeTotal,
    normalized.metallurgy.bladeInventory.length,
  );
  normalizeBattleSelectionAgainstInventory(normalized);

  refreshProgressState(normalized);
  return normalized;
}

function normalizeCooldowns(source, fallback = createDefaultCooldowns()) {
  const safeSource = source && typeof source === "object" ? source : {};
  const cooldowns = createDefaultCooldowns();

  ACTION_COOLDOWN_IDS.forEach((actionId) => {
    cooldowns[actionId] = Math.max(0, Math.floor(finiteNumber(safeSource[actionId], fallback[actionId] || 0)));
  });

  return cooldowns;
}

function normalizePendingOperations(source, fallback = createDefaultPendingOperations()) {
  const safeSource = source && typeof source === "object" ? source : {};
  const pendingOperations = createDefaultPendingOperations();

  ACTION_COOLDOWN_IDS.forEach((actionId) => {
    pendingOperations[actionId] = normalizePendingOperation(safeSource[actionId] || fallback[actionId], actionId);
  });

  return pendingOperations;
}

function normalizePendingOperation(source, actionId) {
  if (!source || typeof source !== "object") {
    return null;
  }
  if (actionId === "battleFlee") {
    return null;
  }

  const readyAt = Math.max(0, Math.floor(finiteNumber(source.readyAt, 0)));
  if (readyAt <= 0) {
    return null;
  }

  const startedAt = Math.max(0, Math.floor(finiteNumber(source.startedAt, Date.now())));
  if (actionId === "sulfurMine") {
    const totalSulfur = Math.floor(finiteNumber(source.totalSulfur, 0));
    const baseSulfur = Math.floor(finiteNumber(source.baseSulfur, totalSulfur));
    const mercuryCost = Math.floor(finiteNumber(source.mercuryCost, 0));
    const bonusSulfur = Math.floor(finiteNumber(source.bonusSulfur, 0));

    return {
      actionId,
      startedAt,
      readyAt,
      baseSulfur,
      totalSulfur,
      mercuryCost,
      bonusSulfur,
      converted: Boolean(source.converted),
      hadConversion: Boolean(source.hadConversion),
    };
  }

  const product = normalizeProduct(source.product);
  if (!product) {
    return null;
  }

  return {
    actionId,
    station: actionId,
    startedAt,
    readyAt,
    inputs: normalizeResourceAmounts(source.inputs),
    product,
    consumeInputs: source.consumeInputs !== false,
  };
}

function normalizeResearchLevels(source) {
  const levels = createDefaultResearchLevels();
  const sourceLevels =
    source.researchLevels && typeof source.researchLevels === "object"
      ? source.researchLevels
      : {};
  const ownedResearch = new Set(
    Array.isArray(source.research)
      ? source.research.filter((id) => typeof id === "string")
      : [],
  );

  allResearch.forEach((research) => {
    const rawLevel = sourceLevels[research.id];
    const fallback = startingResearch.includes(research) || ownedResearch.has(research.id) ? 1 : 0;
    const minimum = startingResearch.includes(research) ? 1 : 0;
    levels[research.id] = clampInteger(rawLevel, fallback, minimum, research.maxLevel);
  });

  return levels;
}

function normalizeActiveResearchLevels(source, purchasedLevels) {
  const sourceLevels =
    source.activeResearchLevels && typeof source.activeResearchLevels === "object"
      ? source.activeResearchLevels
      : null;
  const levels = {};

  allResearch.forEach((research) => {
    const purchasedLevel = Math.max(0, Math.floor(Number(purchasedLevels[research.id]) || 0));
    if (!isResearchToggleable(research)) {
      levels[research.id] = purchasedLevel;
      return;
    }

    const fallback = purchasedLevel;
    const rawLevel = sourceLevels ? sourceLevels[research.id] : fallback;
    levels[research.id] = clampInteger(rawLevel, fallback, 0, purchasedLevel);
  });

  return levels;
}

function normalizeUnlockedResearch(source) {
  const unlockedResearch = createDefaultUnlockedResearch();
  const sourceUnlockedResearch =
    source.unlockedResearch && typeof source.unlockedResearch === "object"
      ? source.unlockedResearch
      : {};

  allResearch.forEach((research) => {
    if (typeof sourceUnlockedResearch[research.id] === "boolean") {
      unlockedResearch[research.id] = sourceUnlockedResearch[research.id];
    }
  });

  return unlockedResearch;
}

function normalizeUnlockedFeatures(sourceFeatures, fallbackFeatures) {
  const unlockedFeatures = { ...fallbackFeatures };

  featureIds.forEach((featureId) => {
    unlockedFeatures[featureId] =
      typeof sourceFeatures[featureId] === "boolean"
        ? sourceFeatures[featureId]
        : Boolean(unlockedFeatures[featureId]);
  });

  return unlockedFeatures;
}

function normalizeMetallurgyState(source, fallback) {
  const safeSource = source && typeof source === "object" ? source : {};

  return {
    smeltingInputs: normalizeResourceAmounts(safeSource.smeltingInputs, fallback.smeltingInputs),
    forgingInputs: normalizeResourceAmounts(safeSource.forgingInputs, fallback.forgingInputs),
    smeltingLog: normalizeSmeltingRecords(safeSource.smeltingLog).slice(0, SMELTING_LOG_LIMIT),
    smeltingFavorites: normalizeSmeltingRecords(safeSource.smeltingFavorites).slice(
      0,
      SMELTING_FAVORITE_LIMIT,
    ),
    bladeInventory: normalizeBladeInventory(safeSource.bladeInventory),
    garbageCount: finiteNumber(safeSource.garbageCount, fallback.garbageCount),
    lastSmeltingProduct: normalizeProduct(safeSource.lastSmeltingProduct),
    lastForgingProduct: normalizeProduct(safeSource.lastForgingProduct),
  };
}

function normalizeMetaState(source, fallback = createDefaultMetaState()) {
  const safeSource = source && typeof source === "object" ? source : {};
  return {
    forgedBladeTotal: Math.floor(finiteNumber(safeSource.forgedBladeTotal, fallback.forgedBladeTotal)),
    inscriptionEpilogueAccepted:
      typeof safeSource.inscriptionEpilogueAccepted === "boolean"
        ? safeSource.inscriptionEpilogueAccepted
        : fallback.inscriptionEpilogueAccepted,
  };
}

function normalizeBattleState(source, fallback = createDefaultBattleState()) {
  const safeSource = source && typeof source === "object" ? source : {};
  const killsByCr = createDefaultBattleKillsByCr();
  const safeKills = safeSource.killsByCr && typeof safeSource.killsByCr === "object" ? safeSource.killsByCr : {};

  Object.keys(killsByCr).forEach((cr) => {
    killsByCr[cr] = Math.floor(finiteNumber(safeKills[cr], fallback.killsByCr[cr] || 0));
  });

  const maxUnlockedCr = Math.max(
    clampBattleCr(safeSource.maxUnlockedCr, fallback.maxUnlockedCr),
    getMaxBattleCrUnlockedByKills(killsByCr),
  );
  const selectedCr = Math.min(maxUnlockedCr, clampBattleCr(safeSource.selectedCr, fallback.selectedCr));
  const currentEnemy =
    safeSource.currentEnemy && typeof safeSource.currentEnemy === "object"
      ? normalizeBattleEnemy(safeSource.currentEnemy)
      : null;

  return {
    selectedBladeId: typeof safeSource.selectedBladeId === "string" ? safeSource.selectedBladeId : fallback.selectedBladeId,
    selectedCr,
    maxUnlockedCr,
    killsByCr,
    currentEnemy,
    log: normalizeBattleLog(safeSource.log || fallback.log),
    saltEarned: Math.floor(finiteNumber(safeSource.saltEarned, fallback.saltEarned)),
    attacks: Math.floor(finiteNumber(safeSource.attacks, fallback.attacks)),
    hones: Math.floor(finiteNumber(safeSource.hones, fallback.hones)),
    lastImportantPauseReason:
      typeof safeSource.lastImportantPauseReason === "string" ? safeSource.lastImportantPauseReason : null,
  };
}

function normalizeBattleSelectionAgainstInventory(targetState = state) {
  const selectedExists = targetState.metallurgy.bladeInventory.some(
    (blade) => blade.id === targetState.battle.selectedBladeId,
  );
  if (selectedExists) {
    return;
  }
  targetState.battle.selectedBladeId =
    targetState.metallurgy.bladeInventory.find(isBladeBattleComplete)?.id ||
    targetState.metallurgy.bladeInventory[0]?.id ||
    null;
}

function normalizeBattleEnemy(source) {
  const enemy = battleFormula.normalizeEnemy(source, battleFormula.defaultEnemy);
  const maxHp = Math.max(1, Math.floor(finiteNumber(source?.maxHp, enemy.hp)));
  return {
    ...enemy,
    cr: clampBattleCr(enemy.cr, 1),
    maxHp,
  };
}

function normalizeBattleLog(source) {
  if (!Array.isArray(source)) {
    return [];
  }
  return source
    .filter((entry) => entry && (typeof entry === "string" || typeof entry === "object"))
    .map((entry) => {
      if (typeof entry === "string") {
        return {
          id: createRecordId("battle-log"),
          createdAt: new Date().toISOString(),
          message: entry,
        };
      }
      return {
        id: typeof entry.id === "string" ? entry.id : createRecordId("battle-log"),
        createdAt: typeof entry.createdAt === "string" ? entry.createdAt : new Date().toISOString(),
        message: typeof entry.message === "string" ? entry.message : "",
      };
    })
    .filter((entry) => entry.message)
    .slice(0, BATTLE_LOG_LIMIT);
}

function clampBattleCr(value, fallback = 1) {
  const number = Math.floor(Number(value));
  if (!Number.isFinite(number)) {
    return fallback;
  }
  return Math.min(MAX_BATTLE_CR, Math.max(1, number));
}

function getMaxBattleCrUnlockedByKills(killsByCr) {
  let maxCr = 1;
  for (let cr = 1; cr < MAX_BATTLE_CR; cr += 1) {
    if (Math.floor(Number(killsByCr[String(cr)]) || 0) > 0) {
      maxCr = cr + 1;
    }
  }
  return maxCr;
}

function normalizeResourceAmounts(source, fallback = createResourceRecord()) {
  const safeSource = source && typeof source === "object" ? source : {};
  const amounts = createResourceRecord();

  resourceIds.forEach((resource) => {
    amounts[resource] = Math.floor(finiteNumber(safeSource[resource], fallback[resource] || 0));
  });

  return amounts;
}

function normalizeSmeltingRecords(source) {
  if (!Array.isArray(source)) {
    return [];
  }

  return source
    .filter((record) => record && typeof record === "object")
    .map((record) => ({
      id: typeof record.id === "string" ? record.id : createRecordId("smelt"),
      createdAt: typeof record.createdAt === "string" ? record.createdAt : new Date().toISOString(),
      inputs: normalizeResourceAmounts(record.inputs),
      result: typeof record.result === "string" ? record.result : "垃圾",
    }));
}

function normalizeBladeInventory(source) {
  if (!Array.isArray(source)) {
    return [];
  }

  return source
    .filter((blade) => blade && typeof blade === "object")
    .slice(0, BLADE_INVENTORY_LIMIT)
    .map(normalizeBlade);
}

function normalizeBlade(source) {
  const safeSource = source && typeof source === "object" ? source : {};
  const legacyStats = createBladeStatRecord();
  legacyStats.sharpness = Math.floor(finiteSignedNumber(safeSource.sharpness, 0));
  legacyStats.toughness = Math.floor(finiteSignedNumber(safeSource.toughness, 0));
  legacyStats.durability = Math.floor(finiteSignedNumber(safeSource.durability, 0));

  const stats = normalizeBladeStats(safeSource.stats, legacyStats);
  const maxStats = normalizeBladeStats(safeSource.maxStats, stats);

  return {
    id: typeof safeSource.id === "string" ? safeSource.id : createRecordId("blade"),
    name: typeof safeSource.name === "string" ? safeSource.name : "刃",
    stats,
    maxStats,
    createdAt: typeof safeSource.createdAt === "string" ? safeSource.createdAt : null,
    inputs: normalizeBladeInputs(safeSource.inputs),
    isFavorite: Boolean(safeSource.isFavorite),
    uses: Math.floor(finiteNumber(safeSource.uses, 0)),
    kills: Math.floor(finiteNumber(safeSource.kills, 0)),
  };
}

function createBladeStatRecord(defaultValue = 0) {
  return Object.fromEntries(bladeStatIds.map((stat) => [stat, defaultValue]));
}

function normalizeBladeStats(source, fallback = createBladeStatRecord()) {
  const safeSource = source && typeof source === "object" ? source : {};
  const stats = createBladeStatRecord();

  bladeStatIds.forEach((stat) => {
    stats[stat] = Math.floor(finiteSignedNumber(safeSource[stat], fallback[stat] ?? 0));
  });

  return stats;
}

function normalizeBladeInputs(source) {
  if (!source || typeof source !== "object") {
    return null;
  }

  const inputs = normalizeResourceAmounts(source);
  return hasAnyInput(inputs) ? inputs : null;
}

function normalizeProduct(source) {
  if (!source || typeof source !== "object") {
    return null;
  }

  const knownTypes = ["garbage", "blade", "resource", "notice"];
  const type = knownTypes.includes(source.type) ? source.type : "garbage";
  const resource = resourceIds.includes(source.resource) ? source.resource : null;

  return {
    type,
    name:
      typeof source.name === "string"
        ? source.name
        : type === "blade"
          ? "刃"
          : resource
            ? resourceLabels[resource]
            : "垃圾",
    resource,
    amount: Math.floor(finiteNumber(source.amount, 0)),
    message: typeof source.message === "string" ? source.message : "",
    ...(type === "blade" ? normalizeBlade(source) : {}),
  };
}

function finiteNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : fallback;
}

function finiteSignedNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function clampInteger(value, fallback, minimum, maximum) {
  const number = Math.floor(Number(value));
  if (!Number.isFinite(number)) {
    return fallback;
  }
  return Math.min(maximum, Math.max(minimum, number));
}

function normalizeLog(value, fallback) {
  if (!Array.isArray(value)) {
    return [...fallback];
  }
  return value.filter((item) => typeof item === "string").slice(0, HOME_LOG_LIMIT);
}

function getResearchLevel(id) {
  return getResearchLevelForState(state, id);
}

function getResearchLevelForState(targetState, id) {
  return Math.max(0, Math.floor(Number(targetState.researchLevels?.[id]) || 0));
}

function getActiveResearchLevel(id) {
  return getActiveResearchLevelForState(state, id);
}

function getActiveResearchLevelForState(targetState, id) {
  const purchasedLevel = getResearchLevelForState(targetState, id);
  if (!isResearchToggleable(id)) {
    return purchasedLevel;
  }

  const rawLevel = targetState.activeResearchLevels?.[id];
  if (rawLevel === undefined) {
    return purchasedLevel;
  }
  return clampInteger(rawLevel, purchasedLevel, 0, purchasedLevel);
}

function isResearchToggleable(researchOrId) {
  const research =
    typeof researchOrId === "string"
      ? allResearch.find((item) => item.id === researchOrId)
      : researchOrId;
  return Boolean(research?.toggleable);
}

function hasResearch(id) {
  return getResearchLevel(id) > 0;
}

function hasResearchInState(targetState, id) {
  return getResearchLevelForState(targetState, id) > 0;
}

function isResearchUnlocked(research) {
  return Boolean(state.unlockedResearch[research.id]) || isUnlockConditionMet(research, state);
}

function isUnlockConditionMet(research, targetState) {
  const rule = research.unlockRule || { type: "start" };

  if (rule.type === "start") {
    return true;
  }
  if (rule.type === "researchLevel") {
    return getResearchLevelForState(targetState, rule.researchId) >= rule.level;
  }
  if (rule.type === "resourceHistory") {
    return Object.entries(rule.resources || {}).every(
      ([resource, threshold]) => Number(targetState.highestResources[resource]) > threshold,
    );
  }
  if (rule.type === "bladeHistory") {
    const threshold = Number(rule.count ?? rule.forgedBladeTotal ?? 0);
    return Math.floor(Number(targetState.meta?.forgedBladeTotal) || 0) > threshold;
  }
  if (rule.type === "battleKill") {
    const targetCr = clampBattleCr(rule.cr, MAX_BATTLE_CR);
    const requiredKills = Math.max(1, Math.floor(Number(rule.count) || 1));
    return Math.floor(Number(targetState.battle?.killsByCr?.[String(targetCr)]) || 0) >= requiredKills;
  }
  if (rule.type === "inscriptionEpilogue") {
    const targetCr = clampBattleCr(rule.cr ?? 5, MAX_BATTLE_CR);
    const requiredKills = Math.max(1, Math.floor(Number(rule.count) || 1));
    return (
      Boolean(targetState.meta?.inscriptionEpilogueAccepted) &&
      Math.floor(Number(targetState.battle?.killsByCr?.[String(targetCr)]) || 0) >= requiredKills
    );
  }

  return false;
}

function refreshProgressState(targetState = state) {
  updateHighestResources(targetState);

  allResearch.forEach((research) => {
    if (isUnlockConditionMet(research, targetState)) {
      targetState.unlockedResearch[research.id] = true;
    }
  });

  applyOwnedFeatureUnlocks(targetState);
}

function updateHighestResources(targetState = state) {
  Object.entries(targetState.resources).forEach(([resource, amount]) => {
    targetState.highestResources[resource] = Math.max(
      Number(targetState.highestResources[resource]) || 0,
      Number(amount) || 0,
    );
  });
}

function applyOwnedFeatureUnlocks(targetState = state) {
  featureIds.forEach((featureId) => {
    targetState.unlockedFeatures[featureId] = false;
  });

  allResearch.forEach((research) => {
    const level = getActiveResearchLevelForState(targetState, research.id);

    research.levels.slice(0, level).forEach((levelData) => {
      const featureId = levelData.effects.unlockFeature;
      if (featureId) {
        targetState.unlockedFeatures[featureId] = true;
      }
    });
  });
}

function getRates() {
  const rates = {
    mercuryPerSecond: 0,
    sulfurPerClick: 0,
    sulfurPerSecond: 0,
    saltPerSecond: 0,
  };

  allResearch.forEach((research) => {
    const currentLevel = getActiveResearchLevel(research.id);
    research.levels.slice(0, currentLevel).forEach((levelData) => {
      Object.entries(levelData.effects).forEach(([effectId, amount]) => {
        if (typeof amount !== "number") {
          return;
        }
        rates[effectId] = (rates[effectId] || 0) + amount;
      });
    });
  });

  return rates;
}

function getSulfurMineCooldownSeconds(targetState = state) {
  let cooldown = DEFAULT_SULFUR_MINE_COOLDOWN_SECONDS;

  allResearch.forEach((research) => {
    const currentLevel = getActiveResearchLevelForState(targetState, research.id);
    research.levels.slice(0, currentLevel).forEach((levelData) => {
      const effectValue = levelData.effects.sulfurMineCooldown;
      if (typeof effectValue === "number" && Number.isFinite(effectValue)) {
        cooldown = Math.min(cooldown, Math.max(0, effectValue));
      }
    });
  });

  return cooldown;
}

function getActionCooldownReadyAt(actionId) {
  return Math.max(0, Math.floor(finiteNumber(state.cooldowns?.[actionId], 0)));
}

function getCooldownRemainingMs(actionId, now = Date.now()) {
  return Math.max(0, getActionCooldownReadyAt(actionId) - now);
}

function getCooldownRemainingSeconds(actionId, now = Date.now()) {
  return getCooldownRemainingMs(actionId, now) / 1000;
}

function getActionCooldownProgress(actionId, now = Date.now()) {
  const readyAt = getActionCooldownReadyAt(actionId);
  if (readyAt <= now) {
    return 1;
  }

  const pendingOperation = getPendingOperation(actionId);
  const fallbackDurationSeconds =
    actionId === "sulfurMine" ? getSulfurMineCooldownSeconds() : DEFAULT_SULFUR_MINE_COOLDOWN_SECONDS;
  const fallbackStartedAt = readyAt - fallbackDurationSeconds * 1000;
  const startedAt = Math.floor(finiteNumber(pendingOperation?.startedAt, fallbackStartedAt));
  const totalMs = Math.max(1, readyAt - startedAt);

  return Math.min(1, Math.max(0, (now - startedAt) / totalMs));
}

function isActionCoolingDown(actionId, now = Date.now()) {
  return getCooldownRemainingMs(actionId, now) > 0;
}

function startActionCooldown(actionId, durationSeconds, now = Date.now()) {
  if (!ACTION_COOLDOWN_IDS.includes(actionId)) {
    return now;
  }

  if (!state.cooldowns || typeof state.cooldowns !== "object") {
    state.cooldowns = createDefaultCooldowns();
  }

  const durationMs = Math.max(0, finiteNumber(durationSeconds, 0)) * 1000;
  const readyAt = durationMs > 0 ? now + durationMs : now;
  state.cooldowns[actionId] = readyAt;
  cooldownWasActive = cooldownWasActive || durationMs > 0;
  return readyAt;
}

function hasActiveCooldown(now = Date.now()) {
  return ACTION_COOLDOWN_IDS.some((actionId) => getCooldownRemainingMs(actionId, now) > 0);
}

function ensurePendingOperations() {
  if (!state.pendingOperations || typeof state.pendingOperations !== "object") {
    state.pendingOperations = createDefaultPendingOperations();
  }
}

function getPendingOperation(actionId) {
  return state.pendingOperations?.[actionId] || null;
}

function startPendingOperation(actionId, durationSeconds, operation, now = Date.now()) {
  ensurePendingOperations();
  const readyAt = startActionCooldown(actionId, durationSeconds, now);
  state.pendingOperations[actionId] = {
    ...operation,
    actionId,
    startedAt: now,
    readyAt,
  };
  return readyAt;
}

function completeReadyOperations(now = Date.now()) {
  ensurePendingOperations();
  let completedCount = 0;

  ACTION_COOLDOWN_IDS.forEach((actionId) => {
    const pendingOperation = getPendingOperation(actionId);
    if (!pendingOperation) {
      if (getActionCooldownReadyAt(actionId) <= now) {
        state.cooldowns[actionId] = 0;
      }
      return;
    }
    if (Math.floor(finiteNumber(pendingOperation.readyAt, 0)) > now) {
      return;
    }

    if (actionId === "sulfurMine") {
      completeSulfurMineOperation(pendingOperation);
    } else {
      completeMetallurgyOperation(actionId, pendingOperation);
    }
    state.pendingOperations[actionId] = null;
    state.cooldowns[actionId] = 0;
    completedCount += 1;
  });

  return completedCount;
}

function completeSulfurMineOperation(operation) {
  const totalSulfur = Math.floor(finiteNumber(operation.totalSulfur, 0));
  const baseSulfur = Math.floor(finiteNumber(operation.baseSulfur, totalSulfur));
  const mercuryCost = Math.floor(finiteNumber(operation.mercuryCost, 0));
  const bonusSulfur = Math.floor(finiteNumber(operation.bonusSulfur, 0));

  gainResource("sulfur", totalSulfur);

  if (operation.converted) {
    addLog(
      `硫矿床完成 +${formatNumber(totalSulfur)} 硫（汞压裂 -${formatNumber(
        mercuryCost,
      )}汞 / +${formatNumber(bonusSulfur)}硫）`,
    );
  } else if (operation.hadConversion) {
    addLog(`硫矿床完成 +${formatNumber(baseSulfur)} 硫（汞不足，汞压裂未触发）`);
  } else {
    addLog(`硫矿床完成 +${formatNumber(baseSulfur)} 硫`);
  }
}

function completeMetallurgyOperation(station, operation) {
  const inputs = normalizeResourceAmounts(operation.inputs);
  const product = normalizeProduct(operation.product);
  if (!product) {
    addLog(`${getStationName(station)}完成，但没有产物。`);
    return;
  }

  if (product.type === "resource" && product.resource) {
    gainResource(product.resource, product.amount);
  }
  if (product.type === "garbage") {
    state.metallurgy.garbageCount = Math.floor(Number(state.metallurgy.garbageCount) || 0) + 1;
  }

  if (station === "smelting") {
    state.metallurgy.lastSmeltingProduct = product;
    if (operation.consumeInputs !== false) {
      state.metallurgy.smeltingLog = [
        {
          id: createRecordId("smelt"),
          createdAt: new Date().toISOString(),
          inputs,
          result: formatProductResult(product),
        },
        ...state.metallurgy.smeltingLog,
      ].slice(0, SMELTING_LOG_LIMIT);
    }
  } else {
    const forgedBlade = normalizeBlade(product);
    if (!state.meta || typeof state.meta !== "object") {
      state.meta = createDefaultMetaState();
    }
    state.meta.forgedBladeTotal = Math.floor(Number(state.meta.forgedBladeTotal) || 0) + 1;
    state.metallurgy.bladeInventory = [
      forgedBlade,
      ...state.metallurgy.bladeInventory,
    ].slice(0, BLADE_INVENTORY_LIMIT);
    metallurgyUi.selectedBladeId = forgedBlade.id;
    if (!state.battle.selectedBladeId && isBladeBattleComplete(forgedBlade)) {
      state.battle.selectedBladeId = forgedBlade.id;
    }
    state.metallurgy.lastForgingProduct = createBladeProduct(forgedBlade);
    metallurgyUi.pendingBladeDetails = forgedBlade;
  }

  addLog(`${getStationName(station)}完成：${formatResourceBundle(inputs)} -> ${formatProductResult(product)}`);
}

function getSulfurClickMercuryConversion() {
  let conversion = null;

  allResearch.forEach((research) => {
    const currentLevel = getActiveResearchLevel(research.id);
    research.levels.slice(0, currentLevel).forEach((levelData) => {
      const effect = levelData.effects.sulfurClickMercuryConversion;
      if (!effect || typeof effect !== "object") {
        return;
      }

      conversion = {
        mercuryCost: Math.floor(finiteNumber(effect.mercuryCost, 0)),
        sulfurBonus: Math.floor(finiteNumber(effect.sulfurBonus, 0)),
      };
    });
  });

  return conversion;
}

function getSulfurClickOutcome(rates = getRates()) {
  const baseSulfur = Math.floor(Number(rates.sulfurPerClick) || 0);
  const conversion = getSulfurClickMercuryConversion();
  const canConvert =
    conversion &&
    conversion.mercuryCost > 0 &&
    conversion.sulfurBonus > 0 &&
    state.resources.mercury >= conversion.mercuryCost;
  const bonusSulfur = canConvert ? conversion.sulfurBonus : 0;

  return {
    baseSulfur,
    totalSulfur: baseSulfur + bonusSulfur,
    mercuryCost: canConvert ? conversion.mercuryCost : 0,
    bonusSulfur,
    conversion,
    converted: Boolean(canConvert),
  };
}

function getStationInputLimit(station, targetState = state) {
  const effectId = station === "forging" ? "forgingInputLimit" : "smeltingInputLimit";
  let limit = getBaseStationInputLimit(station);

  allResearch.forEach((research) => {
    const currentLevel = getActiveResearchLevelForState(targetState, research.id);
    research.levels.slice(0, currentLevel).forEach((levelData) => {
      const effectValue = levelData.effects[effectId];
      if (typeof effectValue === "number" && Number.isFinite(effectValue)) {
        limit = Math.max(limit, Math.floor(effectValue));
      }
    });
  });

  return limit;
}

function getBaseStationInputLimit(station) {
  return station === "forging" ? BASE_FORGING_INPUT_LIMIT : BASE_SMELTING_INPUT_LIMIT;
}

function getBaseInputLimitForEffect(effectId) {
  return effectId === "forgingInputLimit" ? BASE_FORGING_INPUT_LIMIT : BASE_SMELTING_INPUT_LIMIT;
}

function getStationDurationMultiplier(station, targetState = state) {
  const effectId = station === "forging" ? "forgingDurationMultiplier" : "smeltingDurationMultiplier";
  let multiplier = 1;

  allResearch.forEach((research) => {
    const currentLevel = getActiveResearchLevelForState(targetState, research.id);
    research.levels.slice(0, currentLevel).forEach((levelData) => {
      const effectValue = levelData.effects[effectId];
      if (typeof effectValue === "number" && Number.isFinite(effectValue)) {
        multiplier = Math.min(multiplier, Math.max(0, effectValue));
      }
    });
  });

  return multiplier;
}

function getNextLevelData(research) {
  const nextLevel = getResearchLevel(research.id) + 1;
  return research.levels.find((levelData) => levelData.level === nextLevel) || null;
}

function gainResource(resource, amount) {
  if (!Number.isFinite(amount) || amount <= 0) {
    return;
  }
  state.resources[resource] += amount;
  updateHighestResources();
}

function spendCost(cost) {
  Object.entries(cost).forEach(([resource, amount]) => {
    state.resources[resource] = Math.max(0, state.resources[resource] - amount);
  });
}

function canAfford(cost) {
  return Object.entries(cost).every(([resource, amount]) => state.resources[resource] >= amount);
}

function formatNumber(value) {
  const number = Math.max(0, Number(value) || 0);
  const whole = Math.floor(number);

  if (!state.settings.compactNumbers) {
    return whole.toLocaleString("zh-CN");
  }
  if (whole >= 100000000) {
    return `${trimDecimal(whole / 100000000)}亿`;
  }
  if (whole >= 10000) {
    return `${trimDecimal(whole / 10000)}万`;
  }
  return String(whole);
}

function trimDecimal(value) {
  return value.toFixed(value < 10 ? 1 : 0).replace(/\.0$/, "");
}

function formatDuration(seconds) {
  const number = Math.max(0, Number(seconds) || 0);
  return `${number.toFixed(1)}s`;
}

function formatWholeDuration(seconds) {
  const whole = Math.ceil(Math.max(0, Number(seconds) || 0));
  return `${formatNumber(whole)}s`;
}

function formatMultiplier(value) {
  const number = Math.max(0, Number(value) || 0);
  return number.toFixed(2).replace(/\.?0+$/, "");
}

function formatCost(cost) {
  const entries = Object.entries(cost);
  if (entries.length === 0) {
    return "免费";
  }
  return entries.map(([resource, amount]) => `${formatNumber(amount)}${resourceLabels[resource]}`).join(" / ");
}

function summarizeEffects(research, level) {
  const summary = {
    unlockFeatures: [],
  };

  research.levels.slice(0, level).forEach((levelData) => {
    Object.entries(levelData.effects).forEach(([effectId, amount]) => {
      if (effectId === "unlockFeature") {
        summary.unlockFeatures.push(amount);
        return;
      }
      if (effectId === "sulfurClickMercuryConversion") {
        summary.sulfurClickMercuryConversion = amount;
        return;
      }
      if (effectId === "smeltingInputLimit" || effectId === "forgingInputLimit") {
        summary[effectId] = Math.max(summary[effectId] || getBaseInputLimitForEffect(effectId), Math.floor(amount));
        return;
      }
      if (effectId === "sulfurMineCooldown") {
        summary.sulfurMineCooldown = Math.min(
          summary.sulfurMineCooldown || DEFAULT_SULFUR_MINE_COOLDOWN_SECONDS,
          Math.max(0, amount),
        );
        return;
      }
      if (effectId === "smeltingDurationMultiplier" || effectId === "forgingDurationMultiplier") {
        summary[effectId] = Math.min(summary[effectId] ?? 1, Math.max(0, amount));
        return;
      }
      if (typeof amount !== "number") {
        return;
      }
      summary[effectId] = (summary[effectId] || 0) + amount;
    });
  });

  const parts = [];
  if (summary.mercuryPerSecond) {
    parts.push(`+${formatNumber(summary.mercuryPerSecond)}汞/秒`);
  }
  if (summary.sulfurPerClick) {
    parts.push(`+${formatNumber(summary.sulfurPerClick)}硫/点击`);
  }
  if (summary.sulfurPerSecond) {
    parts.push(`+${formatNumber(summary.sulfurPerSecond)}硫/秒`);
  }
  if (summary.saltPerSecond) {
    parts.push(`+${formatNumber(summary.saltPerSecond)}盐/秒`);
  }
  if (summary.sulfurClickMercuryConversion) {
    const { mercuryCost, sulfurBonus } = summary.sulfurClickMercuryConversion;
    parts.push(`点击硫矿床消耗${formatNumber(mercuryCost)}汞，额外+${formatNumber(sulfurBonus)}硫`);
  }
  if (summary.sulfurMineCooldown || research.levels.some((levelData) => levelData.effects.sulfurMineCooldown)) {
    parts.push(`硫矿床冷却 ${formatDuration(summary.sulfurMineCooldown || DEFAULT_SULFUR_MINE_COOLDOWN_SECONDS)}`);
  }
  if (summary.smeltingInputLimit || research.levels.some((levelData) => levelData.effects.smeltingInputLimit)) {
    parts.push(`冶炼投料上限 ${formatNumber(summary.smeltingInputLimit || BASE_SMELTING_INPUT_LIMIT)}`);
  }
  if (summary.forgingInputLimit || research.levels.some((levelData) => levelData.effects.forgingInputLimit)) {
    parts.push(`锻造投料上限 ${formatNumber(summary.forgingInputLimit || BASE_FORGING_INPUT_LIMIT)}`);
  }
  if (
    summary.smeltingDurationMultiplier !== undefined ||
    research.levels.some((levelData) => levelData.effects.smeltingDurationMultiplier !== undefined)
  ) {
    parts.push(`冶炼等待 *${formatMultiplier(summary.smeltingDurationMultiplier ?? 1)}`);
  }
  if (
    summary.forgingDurationMultiplier !== undefined ||
    research.levels.some((levelData) => levelData.effects.forgingDurationMultiplier !== undefined)
  ) {
    parts.push(`锻造等待 *${formatMultiplier(summary.forgingDurationMultiplier ?? 1)}`);
  }
  summary.unlockFeatures.forEach((featureId) => {
    parts.push(`解锁${getFeatureLabel(featureId)}选项卡`);
  });

  return parts.length > 0 ? parts.join("，") : "无产出";
}

function summarizeLevelEffects(levelData) {
  const parts = [];
  if (levelData.effects.mercuryPerSecond) {
    parts.push(`+${formatNumber(levelData.effects.mercuryPerSecond)}汞/秒`);
  }
  if (levelData.effects.sulfurPerClick) {
    parts.push(`+${formatNumber(levelData.effects.sulfurPerClick)}硫/点击`);
  }
  if (levelData.effects.sulfurPerSecond) {
    parts.push(`+${formatNumber(levelData.effects.sulfurPerSecond)}硫/秒`);
  }
  if (levelData.effects.saltPerSecond) {
    parts.push(`+${formatNumber(levelData.effects.saltPerSecond)}盐/秒`);
  }
  if (levelData.effects.sulfurClickMercuryConversion) {
    const { mercuryCost, sulfurBonus } = levelData.effects.sulfurClickMercuryConversion;
    parts.push(`点击硫矿床消耗${formatNumber(mercuryCost)}汞，额外+${formatNumber(sulfurBonus)}硫`);
  }
  if (levelData.effects.sulfurMineCooldown !== undefined) {
    parts.push(`硫矿床冷却降至 ${formatDuration(levelData.effects.sulfurMineCooldown)}`);
  }
  if (levelData.effects.smeltingInputLimit) {
    parts.push(`冶炼投料上限提升至 ${formatNumber(levelData.effects.smeltingInputLimit)}`);
  }
  if (levelData.effects.forgingInputLimit) {
    parts.push(`锻造投料上限提升至 ${formatNumber(levelData.effects.forgingInputLimit)}`);
  }
  if (levelData.effects.smeltingDurationMultiplier !== undefined) {
    parts.push(`冶炼等待 *${formatMultiplier(levelData.effects.smeltingDurationMultiplier)}`);
  }
  if (levelData.effects.forgingDurationMultiplier !== undefined) {
    parts.push(`锻造等待 *${formatMultiplier(levelData.effects.forgingDurationMultiplier)}`);
  }
  if (levelData.effects.unlockFeature) {
    parts.push(`解锁${getFeatureLabel(levelData.effects.unlockFeature)}选项卡`);
  }
  return parts.length > 0 ? parts.join("，") : "解锁";
}

function getFeatureLabel(featureId) {
  return featureLabels[featureId] || featureId;
}

function addLog(message) {
  state.homeLog = [message, ...state.homeLog].slice(0, HOME_LOG_LIMIT);
}

function renderLog(element, rows) {
  element.replaceChildren(
    ...rows.map((row) => {
      const item = document.createElement("li");
      item.textContent = row;
      return item;
    }),
  );
}

function createRecordId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function getPositiveResourceEntries(amounts) {
  return resourceIds
    .map((resource) => [resource, Math.floor(Number(amounts[resource]) || 0)])
    .filter(([, amount]) => amount > 0);
}

function hasAnyInput(amounts) {
  return getPositiveResourceEntries(amounts).length > 0;
}

function formatResourceBundle(amounts) {
  const entries = getPositiveResourceEntries(amounts);
  if (entries.length === 0) {
    return "未投料";
  }
  return entries.map(([resource, amount]) => `${formatNumber(amount)}${resourceLabels[resource]}`).join(" / ");
}

function getResourceAmountTotal(amounts, resources = resourceIds) {
  return resources.reduce((total, resource) => total + Math.max(0, Math.floor(Number(amounts[resource]) || 0)), 0);
}

function calculateOperationDurationSeconds(totalAmount, factor) {
  const amount = Math.max(0, Math.floor(Number(totalAmount) || 0));
  if (amount <= 0) {
    return 0;
  }
  return factor * Math.log(1 + amount / OPERATION_DURATION_DIVISOR);
}

function getOperationDurationSecondsForInputs(station, inputs) {
  const factor = station === "forging" ? FORGING_OPERATION_DURATION_FACTOR : SMELTING_OPERATION_DURATION_FACTOR;
  const baseDuration = calculateOperationDurationSeconds(
    getResourceAmountTotal(inputs, getAllowedMetallurgyResources(station)),
    factor,
  );
  return baseDuration * getStationDurationMultiplier(station);
}

function getStationOperationDurationSeconds(station) {
  return getOperationDurationSecondsForInputs(station, getStationInputs(station));
}

function compareSmeltingRatio(mercury, sulfur, numerator, denominator) {
  return mercury * denominator - sulfur * numerator;
}

function createGarbageProduct(message = "没有属性，不进入资源或背包。") {
  return {
    type: "garbage",
    name: "垃圾",
    message,
  };
}

function createNoticeProduct(message) {
  return {
    type: "notice",
    name: "未反应",
    message,
  };
}

function createResourceProduct(resource, amount, message) {
  return {
    type: "resource",
    name: resourceLabels[resource],
    resource,
    amount,
    message,
  };
}

function buildSmeltingAdvice(resource, advice) {
  return `${resourceLabels[resource]}${advice}`;
}

function evaluateSmelting(inputs) {
  const mercury = Math.floor(Number(inputs.mercury) || 0);
  const sulfur = Math.floor(Number(inputs.sulfur) || 0);
  const positiveEntries = getPositiveResourceEntries(inputs);

  if (positiveEntries.length === 1) {
    const [resource] = positiveEntries[0];
    return {
      consumeInputs: false,
      product: createNoticeProduct(`这只是一锅${resourceLabels[resource]}`),
    };
  }

  if (compareSmeltingRatio(mercury, sulfur, 1, 1) < 0) {
    return {
      consumeInputs: true,
      product: createGarbageProduct(buildSmeltingAdvice("mercury", "太少了！")),
    };
  }
  if (compareSmeltingRatio(mercury, sulfur, 2, 1) > 0) {
    return {
      consumeInputs: true,
      product: createGarbageProduct(buildSmeltingAdvice("sulfur", "太少了！")),
    };
  }

  for (const band of smeltingRatioBands) {
    const [lowerNumerator, lowerDenominator] = band.lower;
    const [upperNumerator, upperDenominator] = band.upper;

    if (compareSmeltingRatio(mercury, sulfur, lowerNumerator, lowerDenominator) < 0) {
      return {
        consumeInputs: true,
        product: createResourceProduct(
          band.resource,
          mercury,
          buildSmeltingAdvice("mercury", band.advice),
        ),
      };
    }
    if (compareSmeltingRatio(mercury, sulfur, upperNumerator, upperDenominator) > 0) {
      return {
        consumeInputs: true,
        product: createResourceProduct(band.resource, mercury, buildSmeltingAdvice("sulfur", band.advice)),
      };
    }
  }

  return {
    consumeInputs: true,
    product: createResourceProduct("gold", mercury, "完美！"),
  };
}

function createBladeProduct(blade) {
  return {
    type: "blade",
    id: blade.id,
    name: blade.name,
    stats: { ...blade.stats },
    maxStats: { ...blade.maxStats },
    inputs: blade.inputs ? { ...blade.inputs } : null,
    createdAt: blade.createdAt,
    isFavorite: Boolean(blade.isFavorite),
    uses: blade.uses,
    kills: blade.kills,
    message: isBladeUsable(blade) ? "已收入背包。" : "该刃不可用。",
  };
}

function createBladeFromInputs(inputs) {
  const createdAt = new Date();
  const stats = calculateBladeStats(inputs);

  return {
    id: createRecordId("blade"),
    name: createUniqueBladeName(inputs, stats),
    stats,
    maxStats: { ...stats },
    createdAt: createdAt.toISOString(),
    inputs: normalizeResourceAmounts(inputs),
    isFavorite: false,
    uses: 0,
    kills: 0,
  };
}

function calculateBladeStats(inputs) {
  return forgingFormula.calculateStats(inputs);
}

function getPositiveMetalEntries(inputs) {
  return forgingFormula.getPositiveMetalEntries(inputs);
}

function formatBladeName(inputs, stats) {
  return bladeNaming.formatBladeName(inputs, stats, {
    metalIds: metalResourceIds,
    statIds: bladeStatIds,
    resourceLabels,
  });
}

function createUniqueBladeName(inputs, stats) {
  const existingNames = new Set(
    state.metallurgy.bladeInventory
      .map((blade) => blade.name)
      .filter((name) => typeof name === "string" && name.length > 0),
  );
  let fallbackName = "";

  for (let attempt = 0; attempt < BLADE_NAME_ROLL_ATTEMPTS; attempt += 1) {
    const candidate = formatBladeName(inputs, stats);
    fallbackName = fallbackName || candidate;
    if (!existingNames.has(candidate)) {
      return candidate;
    }
  }

  const baseName = fallbackName || formatBladeName(inputs, stats);
  const startIndex = Math.floor(Math.random() * BLADE_NAME_VARIANTS.length);
  for (let offset = 0; offset < BLADE_NAME_VARIANTS.length; offset += 1) {
    const suffix = BLADE_NAME_VARIANTS[(startIndex + offset) % BLADE_NAME_VARIANTS.length];
    const candidate = `${baseName}·${suffix}`;
    if (!existingNames.has(candidate)) {
      return candidate;
    }
  }

  return baseName;
}

function getBladeMaterialNamePart(inputs) {
  const entries = metalResourceIds
    .map((resource) => [resource, Math.max(0, Math.floor(Number(inputs[resource]) || 0))])
    .filter(([, amount]) => amount > 0);
  const total = entries.reduce((sum, [, amount]) => sum + amount, 0);

  if (total <= 0) {
    return "高熵";
  }

  const dominantMetals = entries
    .map(([resource, amount]) => ({
      resource,
      ratio: amount / total,
      tier: metalTierRank[resource] || 0,
    }))
    .filter((entry) => entry.ratio > BLADE_NAME_RATIO_THRESHOLD)
    .sort((a, b) => b.ratio - a.ratio || b.tier - a.tier);

  if (dominantMetals.length === 0) {
    return "高熵";
  }

  return dominantMetals.map((entry) => resourceLabels[entry.resource]).join("");
}

function getBladeTypeNamePart(stats) {
  const statValues = bladeStatIds.map((stat) => ({
    stat,
    value: Math.floor(Number(stats[stat]) || 0),
  }));
  const highestValue = Math.max(...statValues.map((entry) => entry.value));
  const highestStats = statValues.filter((entry) => entry.value === highestValue).map((entry) => entry.stat);
  const primaryStat = chooseRandomItem(highestStats);
  const topStats = statValues
    .filter((entry) => entry.value >= highestValue * BLADE_NAME_TOP_STAT_RATIO)
    .map((entry) => entry.stat);
  const intersectedStats = [
    primaryStat,
    ...topStats.filter((stat) => stat !== primaryStat),
  ];
  const sharedPool = intersectedStats.length > 1 ? getIntersectedBladeNamePool(intersectedStats) : [];
  const fallbackPool = bladeNamePools[primaryStat] || [];

  return chooseRandomItem(sharedPool.length > 0 ? sharedPool : fallbackPool) || "刃";
}

function getIntersectedBladeNamePool(stats) {
  const pools = stats.map((stat) => bladeNamePools[stat] || []).filter((pool) => pool.length > 0);
  if (pools.length === 0) {
    return [];
  }

  return pools[0].filter((word) => pools.every((pool) => pool.includes(word)));
}

function chooseRandomItem(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return null;
  }

  return items[Math.floor(Math.random() * items.length)];
}

function splitWordPool(text) {
  return text
    .split(/[、\s]+/)
    .map((word) => word.trim())
    .filter(Boolean);
}

function formatProductResult(product) {
  if (!product) {
    return "无产出";
  }
  if (product.type === "resource") {
    return `${formatNumber(product.amount)}${resourceLabels[product.resource] || product.name}`;
  }
  if (product.type === "notice") {
    return product.message || product.name || "未反应";
  }
  if (product.type === "blade") {
    return product.name || "刃";
  }
  return "垃圾";
}

function isBladeUsable(blade) {
  return bladeStatIds.every(
    (stat) => Number(blade.stats?.[stat]) > 0 && Number(blade.maxStats?.[stat]) > 0,
  );
}

function isBladeBattleComplete(blade) {
  return bladeStatIds.every((stat) => Number(blade.maxStats?.[stat]) > 0);
}

function isBladeFavorite(blade) {
  return Boolean(blade?.isFavorite);
}

function formatBladeStat(blade, stat) {
  return `${bladeStatLabels[stat]} ${formatSignedInteger(blade.stats[stat])}/${formatSignedInteger(
    blade.maxStats[stat],
  )}`;
}

function formatSignedInteger(value) {
  const number = Math.floor(Number(value) || 0);
  if (number < 0) {
    return `-${formatNumber(Math.abs(number))}`;
  }
  return formatNumber(number);
}

function formatBladeCreatedAt(value) {
  if (!value) {
    return "未知";
  }

  const createdAt = new Date(value);
  if (Number.isNaN(createdAt.getTime())) {
    return "未知";
  }
  return createdAt.toLocaleString("zh-CN", { hour12: false });
}

function formatBladeInputDetail(inputs) {
  if (!inputs) {
    return "未知";
  }

  const entries = getPositiveMetalEntries(inputs);
  const total = entries.reduce((sum, [, amount]) => sum + amount, 0);
  if (total <= 0) {
    return "未知";
  }

  return entries
    .map(([resource, amount]) => {
      const ratio = `${(amount / total * 100).toFixed(1).replace(/\.0$/, "")}%`;
      return `${resourceLabels[resource]} ${formatNumber(amount)}（${ratio}）`;
    })
    .join(" / ");
}

function formatBladeMass(inputs) {
  if (!inputs) {
    return "未知";
  }

  const total = getPositiveMetalEntries(inputs).reduce((sum, [, amount]) => sum + amount, 0);
  return total > 0 ? formatNumber(total) : "未知";
}

function buildBladeDetailsText(blade) {
  const stateText = isBladeUsable(blade) ? "可用" : "该刃不可用";
  const statRows = bladeStatIds.map((stat) => formatBladeStat(blade, stat));
  const metaRows = [
    `锻造时间：${formatBladeCreatedAt(blade.createdAt)}`,
    `投料：${formatBladeInputDetail(blade.inputs)}`,
    `质量：${formatBladeMass(blade.inputs)}`,
    `使用次数：${formatNumber(blade.uses)}`,
    `击杀数：${formatNumber(blade.kills)}`,
  ];

  return [blade.name, stateText, ...statRows, ...metaRows].join("\n");
}

function getAllowedMetallurgyResources(station) {
  return metallurgyResourceIds[station] || resourceIds;
}

function getVisibleMetallurgyResources(station) {
  const allowedResources = getAllowedMetallurgyResources(station);
  return allowedResources.filter((resource) => Number(state.highestResources[resource]) > 0);
}

function getStationInputs(station) {
  return station === "forging" ? state.metallurgy.forgingInputs : state.metallurgy.smeltingInputs;
}

function getStationName(station) {
  return station === "forging" ? "锻造" : "冶炼";
}

function sanitizeStationInputs(station) {
  const inputs = getStationInputs(station);
  const allowedResources = new Set(getAllowedMetallurgyResources(station));

  resourceIds.forEach((resource) => {
    if (!allowedResources.has(resource)) {
      inputs[resource] = 0;
      return;
    }
    inputs[resource] = Math.max(0, Math.floor(Number(inputs[resource]) || 0));
  });
  trimStationInputsToLimit(station);
}

function trimStationInputsToLimit(station) {
  const inputs = getStationInputs(station);
  const allowedResources = getAllowedMetallurgyResources(station);
  const limit = getStationInputLimit(station);
  let overflow = getResourceAmountTotal(inputs, allowedResources) - limit;

  if (overflow <= 0) {
    return;
  }

  [...allowedResources].reverse().forEach((resource) => {
    if (overflow <= 0) {
      return;
    }

    const amount = Math.max(0, Math.floor(Number(inputs[resource]) || 0));
    const reduction = Math.min(amount, overflow);
    inputs[resource] = amount - reduction;
    overflow -= reduction;
  });
}

function ensureSelectedMetallurgyResources() {
  ["smelting", "forging"].forEach((station) => {
    sanitizeStationInputs(station);
    const visibleResources = getVisibleMetallurgyResources(station);

    if (!visibleResources.includes(metallurgyUi.selectedResources[station])) {
      metallurgyUi.selectedResources[station] = visibleResources[0] || null;
    }
  });
}

function getIngredientStep(station) {
  const rawStep = Math.floor(Number(metallurgyUi.ingredientSteps[station]) || 1);
  return Math.min(MAX_INGREDIENT_STEP, getStationInputLimit(station), Math.max(1, rawStep));
}

function changeIngredientStep(station, action) {
  const currentStep = getIngredientStep(station);
  const inputLimit = getStationInputLimit(station);
  if (action === "multiply") {
    metallurgyUi.ingredientSteps[station] = Math.min(MAX_INGREDIENT_STEP, inputLimit, currentStep * 10);
  } else if (action === "divide") {
    metallurgyUi.ingredientSteps[station] = Math.min(inputLimit, Math.max(1, Math.floor(currentStep / 10)));
  }
}

function changeIngredient(station, action) {
  advancePassive();
  ensureSelectedMetallurgyResources();

  if (isActionCoolingDown(station)) {
    addLog(`${getStationName(station)}正在工作，无法调整投料。`);
    render();
    return;
  }

  if (action === "multiply" || action === "divide") {
    changeIngredientStep(station, action);
    render();
    return;
  }

  const resource = metallurgyUi.selectedResources[station];
  if (!resource) {
    return;
  }

  const inputs = getStationInputs(station);
  const currentAmount = Math.floor(Number(inputs[resource]) || 0);
  const availableAmount = Math.floor(Number(state.resources[resource]) || 0);
  const inputLimit = getStationInputLimit(station);
  const inputTotal = getResourceAmountTotal(inputs, getAllowedMetallurgyResources(station));
  const remainingCapacity = inputLimit - inputTotal;
  const step = getIngredientStep(station);
  let nextAmount = currentAmount;

  if (action === "add") {
    if (remainingCapacity <= 0) {
      addLog(`${getStationName(station)}投料上限为 ${formatNumber(inputLimit)}。`);
      render();
      return;
    }
    if (currentAmount >= availableAmount) {
      addLog(`${getStationName(station)}没有更多${resourceLabels[resource]}可投入。`);
      render();
      flashResourceIndicator(resource);
      return;
    }
    nextAmount = currentAmount + Math.min(step, remainingCapacity);
  } else if (action === "remove") {
    nextAmount = Math.max(0, currentAmount - step);
  }

  const limitedByStorage = action === "add" && nextAmount > availableAmount;
  inputs[resource] = Math.min(availableAmount, Math.max(0, nextAmount));
  render();
  if (limitedByStorage) {
    flashResourceIndicator(resource);
  }
  maybeAutoSave();
}

function flashResourceIndicator(resource) {
  if (!resource) {
    return;
  }

  $$(`[data-resource-indicator="${resource}"]`).forEach((element) => {
    element.classList.remove("is-flashing");
    void element.offsetWidth;
    element.classList.add("is-flashing");
    window.setTimeout(() => {
      element.classList.remove("is-flashing");
    }, 900);
  });
}

function clearStationInputs(station) {
  const inputs = getStationInputs(station);
  resourceIds.forEach((resource) => {
    inputs[resource] = 0;
  });
}

function runMetallurgyProcess(station) {
  advancePassive();
  sanitizeStationInputs(station);

  if (isActionCoolingDown(station)) {
    render();
    return;
  }

  if (station === "forging" && state.metallurgy.bladeInventory.length >= BLADE_INVENTORY_LIMIT) {
    addLog("锻造背包已满。");
    render();
    return;
  }

  const inputs = getStationInputs(station);
  if (!hasAnyInput(inputs)) {
    addLog(`${getStationName(station)}需要先投料。`);
    render();
    return;
  }
  const inputLimit = getStationInputLimit(station);
  if (getResourceAmountTotal(inputs, getAllowedMetallurgyResources(station)) > inputLimit) {
    addLog(`${getStationName(station)}投料上限为 ${formatNumber(inputLimit)}。`);
    render();
    return;
  }
  if (!canAfford(inputs)) {
    addLog(`${getStationName(station)}投料不足。`);
    render();
    return;
  }

  const spentInputs = normalizeResourceAmounts(inputs);
  const operationSeconds = getOperationDurationSecondsForInputs(station, spentInputs);
  let product = createGarbageProduct();
  let forgedBlade = null;
  let consumeInputs = true;

  if (station === "smelting") {
    const smeltingResult = evaluateSmelting(spentInputs);
    product = smeltingResult.product;
    consumeInputs = smeltingResult.consumeInputs;
  } else {
    forgedBlade = createBladeFromInputs(spentInputs);
    product = createBladeProduct(forgedBlade);
  }

  if (consumeInputs) {
    spendCost(spentInputs);
    clearStationInputs(station);
  }

  startPendingOperation(station, operationSeconds, {
    station,
    inputs: spentInputs,
    product,
    consumeInputs,
  });
  addLog(`${getStationName(station)}开始：${formatResourceBundle(spentInputs)}，${formatDuration(operationSeconds)}后完成。`);
  render();
  persistImportantChange();
}

function favoriteSmeltingRecord(recordId) {
  const alreadyFavorited = state.metallurgy.smeltingFavorites.some((record) => record.id === recordId);
  if (alreadyFavorited) {
    return;
  }
  if (state.metallurgy.smeltingFavorites.length >= SMELTING_FAVORITE_LIMIT) {
    addLog("冶炼收藏已满。");
    render();
    return;
  }

  const record = state.metallurgy.smeltingLog.find((item) => item.id === recordId);
  if (!record) {
    return;
  }

  state.metallurgy.smeltingFavorites = [{ ...record, inputs: { ...record.inputs } }, ...state.metallurgy.smeltingFavorites];
  render();
  persistImportantChange();
}

function removeSmeltingFavorite(recordId) {
  const confirmed = window.confirm("确认取消收藏这条冶炼记录？");
  if (!confirmed) {
    return;
  }

  state.metallurgy.smeltingFavorites = state.metallurgy.smeltingFavorites.filter(
    (record) => record.id !== recordId,
  );
  render();
  persistImportantChange();
}

function findSmeltingRecord(recordId) {
  return (
    state.metallurgy.smeltingLog.find((record) => record.id === recordId) ||
    state.metallurgy.smeltingFavorites.find((record) => record.id === recordId) ||
    null
  );
}

function createStationRecipeInputs(station, sourceInputs) {
  const allowedResources = new Set(getAllowedMetallurgyResources(station));
  const normalizedInputs = normalizeResourceAmounts(sourceInputs);
  const recipeInputs = createResourceRecord();

  resourceIds.forEach((resource) => {
    recipeInputs[resource] = allowedResources.has(resource) ? normalizedInputs[resource] : 0;
  });

  return recipeInputs;
}

function reproduceStationInputs(station, sourceInputs) {
  advancePassive();

  if (isActionCoolingDown(station)) {
    addLog(`${getStationName(station)}正在工作，无法再生产。`);
    render();
    return;
  }

  const recipeInputs = createStationRecipeInputs(station, sourceInputs);
  const total = getResourceAmountTotal(recipeInputs, getAllowedMetallurgyResources(station));
  const limit = getStationInputLimit(station);

  if (total <= 0) {
    addLog(`${getStationName(station)}没有可再生产的投料。`);
    render();
    return;
  }
  if (total > limit) {
    addLog(`${getStationName(station)}投料上限为 ${formatNumber(limit)}，无法放入 ${formatNumber(total)}。`);
    render();
    return;
  }
  if (!canAfford(recipeInputs)) {
    addLog(`再生产需要 ${formatResourceBundle(recipeInputs)}。`);
    render();
    return;
  }

  clearStationInputs(station);
  Object.entries(recipeInputs).forEach(([resource, amount]) => {
    getStationInputs(station)[resource] = amount;
  });

  const firstResource = getPositiveResourceEntries(recipeInputs)[0]?.[0];
  if (firstResource) {
    metallurgyUi.selectedResources[station] = firstResource;
  }
  metallurgyUi.activeStation = station;

  addLog(`${getStationName(station)}再生产：${formatResourceBundle(recipeInputs)}`);
  render();
  maybeAutoSave();
}

function reproduceSmeltingRecord(recordId) {
  const record = findSmeltingRecord(recordId);
  if (!record) {
    return;
  }

  reproduceStationInputs("smelting", record.inputs);
}

function toggleMetallurgyDrawer(station) {
  metallurgyUi.drawers[station] = !metallurgyUi.drawers[station];
  renderMetallurgy();
}

function toggleSmeltingLogMode() {
  metallurgyUi.smeltingLogMode = metallurgyUi.smeltingLogMode === "all" ? "favorites" : "all";
  renderSmeltingLog({ preserveScroll: false });
}

function setMetallurgyStation(station) {
  if (!metallurgyResourceIds[station] || !isMetallurgyStationUnlocked(station)) {
    return;
  }

  metallurgyUi.activeStation = station;
  renderMetallurgyTabs();
}

function acceptInscriptionEpilogue() {
  advancePassive();
  if (state.meta.inscriptionEpilogueAccepted) {
    render();
    return;
  }

  state.meta.inscriptionEpilogueAccepted = true;
  refreshProgressState();
  addLog("铭文页的线索浮现。");
  render();
  persistImportantChange();
}

function isMetallurgyStationUnlocked(station) {
  const featureId = metallurgyStationFeatureRequirements[station];
  return !featureId || Boolean(state.unlockedFeatures[featureId]);
}

function ensureActiveMetallurgyStation() {
  if (
    !metallurgyResourceIds[metallurgyUi.activeStation] ||
    !isMetallurgyStationUnlocked(metallurgyUi.activeStation)
  ) {
    metallurgyUi.activeStation = "smelting";
  }
}

function selectMetallurgyResource(station, resource) {
  if (!getVisibleMetallurgyResources(station).includes(resource)) {
    return;
  }

  metallurgyUi.selectedResources[station] = resource;
  renderMetallurgy();
}

function selectBlade(bladeId) {
  if (metallurgyUi.batchDeleteMode) {
    toggleBatchDeleteBlade(bladeId);
    return;
  }

  if (metallurgyUi.selectedBladeId !== bladeId) {
    metallurgyUi.bladeMetaScrollTop = 0;
  }
  metallurgyUi.selectedBladeId = bladeId;
  renderBladeInventory();
}

function getSelectedBladeIdForContext(context = "metallurgy") {
  return context === "battle" ? state.battle.selectedBladeId : metallurgyUi.selectedBladeId;
}

function getSelectedBladeForContext(context = "metallurgy") {
  const selectedBladeId = getSelectedBladeIdForContext(context);
  return state.metallurgy.bladeInventory.find((blade) => blade.id === selectedBladeId) || null;
}

function syncBladeSelectionsAfterDeletion(deletedIds) {
  if (deletedIds.has(metallurgyUi.selectedBladeId)) {
    metallurgyUi.selectedBladeId = null;
    metallurgyUi.bladeMetaScrollTop = 0;
  }

  deletedIds.forEach((bladeId) => {
    metallurgyUi.batchDeleteBladeIds.delete(bladeId);
  });

  if (deletedIds.has(state.battle.selectedBladeId)) {
    stopBattleAuto();
    state.battle.selectedBladeId = null;
    state.battle.lastImportantPauseReason = null;
    battleUi.bladeInfoOpen = false;
    battleUi.bladeInfoScrollTop = 0;
    normalizeBattleSelectionAgainstInventory(state);
  }
}

function deleteSelectedBlade(context = "metallurgy") {
  const selectedBlade = getSelectedBladeForContext(context);
  if (!selectedBlade) {
    return;
  }
  if (isBladeFavorite(selectedBlade)) {
    const message = "请先取消收藏。";
    addLog(message);
    if (context === "battle") {
      addBattleLog(message);
    }
    render();
    return;
  }

  const confirmed = window.confirm(`${selectedBlade.name}\n\n确认销毁这把刃？`);
  if (!confirmed) {
    return;
  }

  state.metallurgy.bladeInventory = state.metallurgy.bladeInventory.filter(
    (blade) => blade.id !== selectedBlade.id,
  );
  syncBladeSelectionsAfterDeletion(new Set([selectedBlade.id]));
  addLog(`销毁刃：${selectedBlade.name}`);
  render();
  persistImportantChange();
}

function toggleBatchDeleteMode() {
  metallurgyUi.batchDeleteMode = !metallurgyUi.batchDeleteMode;
  metallurgyUi.batchDeleteBladeIds.clear();
  if (metallurgyUi.batchDeleteMode) {
    metallurgyUi.selectedBladeId = null;
    metallurgyUi.bladeMetaScrollTop = 0;
  }
  renderBladeInventoryViews();
}

function toggleBatchDeleteBlade(bladeId) {
  const blade = state.metallurgy.bladeInventory.find((item) => item.id === bladeId);
  if (!blade) {
    return;
  }
  if (isBladeFavorite(blade)) {
    addLog("收藏刃不能加入批量销毁。");
    renderBladeInventoryViews();
    return;
  }

  if (metallurgyUi.batchDeleteBladeIds.has(bladeId)) {
    metallurgyUi.batchDeleteBladeIds.delete(bladeId);
  } else {
    metallurgyUi.batchDeleteBladeIds.add(bladeId);
  }
  renderBladeInventoryViews();
}

function deleteBatchSelectedBlades() {
  const selectedBlades = getBatchDeleteSelectedBlades();
  if (selectedBlades.length === 0) {
    addLog("批量销毁需要先选择刃。");
    render();
    return;
  }

  const names = selectedBlades.map((blade) => blade.name);
  const confirmed = window.confirm(`确认销毁以下 ${formatNumber(selectedBlades.length)} 把刃？\n\n${names.join("\n")}`);
  if (!confirmed) {
    return;
  }

  const selectedIds = new Set(selectedBlades.map((blade) => blade.id));
  state.metallurgy.bladeInventory = state.metallurgy.bladeInventory.filter((blade) => !selectedIds.has(blade.id));
  syncBladeSelectionsAfterDeletion(selectedIds);
  metallurgyUi.batchDeleteMode = false;
  metallurgyUi.batchDeleteBladeIds.clear();
  metallurgyUi.bladeMetaScrollTop = 0;
  addLog(`批量销毁刃：${names.join(" / ")}`);
  render();
  persistImportantChange();
}

function getBatchDeleteSelectedBlades() {
  return state.metallurgy.bladeInventory.filter(
    (blade) => metallurgyUi.batchDeleteBladeIds.has(blade.id) && !isBladeFavorite(blade),
  );
}

function toggleSelectedBladeFavorite(context = "metallurgy") {
  const selectedBlade = getSelectedBladeForContext(context);
  if (!selectedBlade) {
    return;
  }

  selectedBlade.isFavorite = !isBladeFavorite(selectedBlade);
  addLog(`${selectedBlade.isFavorite ? "收藏" : "取消收藏"}刃：${selectedBlade.name}`);
  render();
  persistImportantChange();
}

function reproduceSelectedBlade() {
  const selectedBlade = state.metallurgy.bladeInventory.find(
    (blade) => blade.id === metallurgyUi.selectedBladeId,
  );
  if (!selectedBlade) {
    return;
  }

  reproduceStationInputs("forging", selectedBlade.inputs);
}

function renderOwnedResearch() {
  const ownedResearch = allResearch.filter((research) => hasResearch(research.id));
  elements.ownedResearchList.replaceChildren(
    ...ownedResearch.map((research) => {
      const purchasedLevel = getResearchLevel(research.id);
      const isToggleable = isResearchToggleable(research);
      const activeLevel = getActiveResearchLevel(research.id);
      const effectLevel = isToggleable ? activeLevel : purchasedLevel;
      const effectText = effectLevel > 0 ? summarizeEffects(research, effectLevel) : "无产出";
      const card = document.createElement("article");
      card.className = `research-card${isToggleable ? ` owned-research-card${activeLevel <= 0 ? " is-inactive" : ""}` : ""}`;
      card.innerHTML = `
        <div>
          <strong>${research.name}</strong>
          <p>${research.description}</p>
          <div class="research-meta">
            <small>Lv.${purchasedLevel}/${research.maxLevel}</small>
            ${isToggleable ? `<small>启用 Lv.${activeLevel}/${purchasedLevel}</small>` : ""}
            <small>${effectText}</small>
          </div>
        </div>
        ${renderResearchActiveControls(research, purchasedLevel, activeLevel)}
      `;
      return card;
    }),
  );
}

function renderResearchActiveControls(research, purchasedLevel, activeLevel) {
  if (!isResearchToggleable(research)) {
    return "";
  }

  return `
    <div class="research-active-controls" aria-label="${research.name}启用等级">
      <button class="secondary-action" type="button" data-research-active="${research.id}" data-research-level="${Math.max(0, activeLevel - 1)}" ${activeLevel <= 0 ? "disabled" : ""}>-1</button>
      <button class="secondary-action" type="button" data-research-active="${research.id}" data-research-level="0" ${activeLevel <= 0 ? "disabled" : ""}>停用</button>
      <button class="secondary-action" type="button" data-research-active="${research.id}" data-research-level="${Math.min(purchasedLevel, activeLevel + 1)}" ${activeLevel >= purchasedLevel ? "disabled" : ""}>+1</button>
      <button class="secondary-action" type="button" data-research-active="${research.id}" data-research-level="${purchasedLevel}" ${activeLevel >= purchasedLevel ? "disabled" : ""}>启满</button>
    </div>
  `;
}

function renderAvailableResearch() {
  const availableResearch = upgradeResearch
    .map((research, index) => {
      const nextLevelData = getNextLevelData(research);
      return {
        research,
        index,
        nextLevelData,
        affordable: Boolean(nextLevelData && canAfford(nextLevelData.cost)),
      };
    })
    .filter(({ research, nextLevelData }) => isResearchUnlocked(research) && nextLevelData)
    .sort((a, b) => {
      if (a.affordable !== b.affordable) {
        return a.affordable ? -1 : 1;
      }
      return a.index - b.index;
    });

  elements.availableResearchList.replaceChildren(
    ...availableResearch.map(({ research, nextLevelData, affordable }) => {
      const level = getResearchLevel(research.id);
      const card = document.createElement("article");
      card.className = "research-card upgrade-research-card";
      card.innerHTML = `
        <div>
          <strong>${research.name} Lv.${level}/${research.maxLevel}</strong>
          <p>${research.description}</p>
          <div class="research-meta">
            <small>已研发 ${summarizeEffects(research, level)}</small>
            <small>下级 ${summarizeLevelEffects(nextLevelData)}</small>
          </div>
        </div>
        <button class="secondary-action" type="button" data-research-upgrade="${research.id}" ${!affordable ? "disabled" : ""}>
          ${formatCost(nextLevelData.cost)}
        </button>
      `;
      return card;
    }),
  );
}

function hasAffordableResearch() {
  return upgradeResearch.some((research) => {
    const nextLevelData = getNextLevelData(research);
    return isResearchUnlocked(research) && nextLevelData && canAfford(nextLevelData.cost);
  });
}

function renderLockedResearch() {
  const lockedResearch = upgradeResearch.filter((research) => !isResearchUnlocked(research));

  elements.lockedResearchList.replaceChildren(
    ...lockedResearch.map((research) => {
      const card = document.createElement("article");
      card.className = "research-card";
      card.innerHTML = `
        <div>
          <strong>${research.name}</strong>
          <p>${research.description}</p>
          <div class="research-meta">
            <small>Lv.0/${research.maxLevel}</small>
          </div>
        </div>
        <small>未解锁</small>
      `;
      return card;
    }),
  );
}

function renderResearchSectionToggles() {
  $$(".research-section").forEach((section) => {
    const sectionKey = section.dataset.researchSection;
    const collapsed = Boolean(collapsedResearchSections[sectionKey]);
    const toggle = section.querySelector(".research-section-toggle");
    const arrow = toggle?.querySelector("span");
    const label = toggle?.querySelector("small");

    section.classList.toggle("is-collapsed", collapsed);
    if (toggle) {
      toggle.setAttribute("aria-expanded", String(!collapsed));
    }
    if (arrow) {
      arrow.textContent = collapsed ? "▾" : "▴";
    }
    if (label) {
      label.textContent = collapsed ? "展开" : "折叠";
    }
  });
}

function isScreenUnlocked(screenName) {
  const featureId = screenFeatureRequirements[screenName];
  return !featureId || Boolean(state.unlockedFeatures[featureId]);
}

function renderNavigation() {
  const researchReady = hasAffordableResearch();

  $$(".tab-button").forEach((button) => {
    const target = button.dataset.target;
    const visible = isScreenUnlocked(target);
    button.hidden = !visible;
    button.setAttribute("aria-hidden", String(!visible));
    button.classList.toggle("has-research-ready", target === "research" && visible && researchReady);
  });

  $$(".tab-button, .settings-shortcut").forEach((button) => {
    const selected = button.dataset.target === activeScreen;
    button.classList.toggle("is-active", selected);
    button.setAttribute("aria-selected", String(selected));
  });
}

function getOwnedResearchCount() {
  return allResearch.filter((research) => hasResearch(research.id)).length;
}

function getUnlockedResearchCount() {
  return allResearch.filter((research) => isResearchUnlocked(research)).length;
}

function getUpgradeResearchLevelTotal() {
  return upgradeResearch.reduce((total, research) => total + getResearchLevel(research.id), 0);
}

function getAllResearchLevelTotal() {
  return allResearch.reduce((total, research) => total + getResearchLevel(research.id), 0);
}

function getHighestResourceAmount(resource) {
  return Math.max(0, Number(state.highestResources?.[resource]) || 0, Number(state.resources?.[resource]) || 0);
}

function hasAnyMetalResource() {
  return metalResourceIds.some((resource) => getHighestResourceAmount(resource) > 0);
}

function hasCompletedSmelting() {
  return (
    Boolean(state.metallurgy?.lastSmeltingProduct) ||
    Math.floor(Number(state.metallurgy?.smeltingLog?.length) || 0) > 0 ||
    Math.floor(Number(state.metallurgy?.garbageCount) || 0) > 0 ||
    hasAnyMetalResource()
  );
}

function getBattleKillsForCr(cr) {
  return Math.floor(Number(state.battle?.killsByCr?.[String(clampBattleCr(cr, 1))]) || 0);
}

function getBattleKillTotal() {
  return Object.values(state.battle?.killsByCr || {}).reduce(
    (total, kills) => total + Math.max(0, Math.floor(Number(kills) || 0)),
    0,
  );
}

function isResearchUnlockedById(researchId) {
  const research = allResearch.find((item) => item.id === researchId);
  return research ? isResearchUnlocked(research) : false;
}

function getUnlockedFeatureText() {
  const names = Object.entries(state.unlockedFeatures)
    .filter(([, unlocked]) => unlocked)
    .map(([featureId]) => featureLabels[featureId] || featureId);

  return names.length ? names.join(" / ") : "无";
}

function formatSavedAt(value) {
  if (!value) {
    return "未保存";
  }

  const savedAt = new Date(value);
  if (Number.isNaN(savedAt.getTime())) {
    return "未知";
  }

  return savedAt.toLocaleString("zh-CN", { hour12: false });
}

function setSettingsTab(tab) {
  const exists = elements.settingsPanels.some((panel) => panel.dataset.settingsPanel === tab);
  if (!exists) {
    return;
  }

  settingsUi.activeTab = tab;
  renderSettingsTabs();
}

function renderSettingsTabs() {
  elements.settingsSubtabs.forEach((button) => {
    const selected = button.dataset.settingsTab === settingsUi.activeTab;
    button.classList.toggle("is-active", selected);
    button.setAttribute("aria-selected", String(selected));
  });

  elements.settingsPanels.forEach((panel) => {
    panel.classList.toggle("is-active", panel.dataset.settingsPanel === settingsUi.activeTab);
  });
}

function renderStats() {
  if (!elements.statsList) {
    return;
  }

  const scrollTop = elements.statsList.scrollTop;
  const statCards = [];
  const addStatCard = (title, rows) => {
    const visibleRows = rows.filter(Boolean);
    if (visibleRows.length) {
      statCards.push(createStatCard(title, visibleRows));
    }
  };

  addStatCard(
    "资源",
    resourceIds
      .filter((resource) => Math.floor(getHighestResourceAmount(resource)) > 0)
      .map((resource) => {
        const currentAmount = Math.max(0, Math.floor(Number(state.resources[resource]) || 0));
        const highestAmount = Math.floor(getHighestResourceAmount(resource));
        return [
          resourceLabels[resource],
          currentAmount > 0
            ? `${formatNumber(currentAmount)} / 历史 ${formatNumber(highestAmount)}`
            : `历史 ${formatNumber(highestAmount)}`,
        ];
      }),
  );

  const ownedResearchCount = getOwnedResearchCount();
  const unlockedResearchCount = getUnlockedResearchCount();
  const researchLevelTotal = getAllResearchLevelTotal();
  const unlockedFeatureText = getUnlockedFeatureText();
  addStatCard("研究", [
    ownedResearchCount > 0 ? ["已持有研究", formatNumber(ownedResearchCount)] : null,
    unlockedResearchCount > 0 ? ["已解锁研究", formatNumber(unlockedResearchCount)] : null,
    researchLevelTotal > 0 ? ["研究等级合计", formatNumber(researchLevelTotal)] : null,
    unlockedFeatureText !== "无" ? ["已解锁功能", unlockedFeatureText] : null,
  ]);

  if (state.unlockedFeatures.metallurgy) {
    const smeltingLogCount = state.metallurgy.smeltingLog.length;
    const smeltingFavoriteCount = state.metallurgy.smeltingFavorites.length;
    const bladeInventoryCount = state.metallurgy.bladeInventory.length;
    addStatCard("冶金", [
      state.metallurgy.garbageCount > 0 ? ["垃圾", formatNumber(state.metallurgy.garbageCount)] : null,
      state.meta.forgedBladeTotal > 0 ? ["历史锻造刃", formatNumber(state.meta.forgedBladeTotal)] : null,
      smeltingLogCount > 0
        ? ["冶炼记录", `${formatNumber(smeltingLogCount)} / ${formatNumber(SMELTING_LOG_LIMIT)}`]
        : null,
      smeltingFavoriteCount > 0
        ? ["收藏记录", `${formatNumber(smeltingFavoriteCount)} / ${formatNumber(SMELTING_FAVORITE_LIMIT)}`]
        : null,
      bladeInventoryCount > 0
        ? ["背包", `${formatNumber(bladeInventoryCount)} / ${formatNumber(BLADE_INVENTORY_LIMIT)}`]
        : null,
    ]);
  }

  if (state.unlockedFeatures.battle) {
    const battleKillTotal = getBattleKillTotal();
    addStatCard("战斗", [
      state.battle.maxUnlockedCr > 0 ? ["已解锁 CR", `CR${formatNumber(state.battle.maxUnlockedCr)}`] : null,
      battleKillTotal > 0 ? ["击败敌人", formatNumber(battleKillTotal)] : null,
      state.battle.saltEarned > 0 ? ["战斗获得盐", formatNumber(state.battle.saltEarned)] : null,
      state.battle.attacks > 0 ? ["攻击", formatNumber(state.battle.attacks)] : null,
      state.battle.hones > 0 ? ["磨刃", formatNumber(state.battle.hones)] : null,
    ]);
  }

  addStatCard("系统", [
    state.homeLog.length > 0 ? ["主页记录", `${formatNumber(state.homeLog.length)} / ${formatNumber(HOME_LOG_LIMIT)}`] : null,
    ["游戏版本", `v${GAME_VERSION}`],
    ["存档结构", `v${formatNumber(SAVE_VERSION)}`],
    ["最近保存", formatSavedAt(state.lastSavedAt)],
  ]);

  elements.statsList.replaceChildren(...statCards);
  elements.statsList.scrollTop = scrollTop;
}

function renderMilestones() {
  if (!elements.milestoneList) {
    return;
  }

  const scrollTop = elements.milestoneList.scrollTop;
  elements.milestoneList.replaceChildren(
    ...milestoneDefinitions.map((milestone, index) => createMilestoneCard(milestone, index)),
  );
  elements.milestoneList.scrollTop = scrollTop;
}

function createMilestoneCard(milestone, index) {
  const complete = Boolean(milestone.isComplete());
  const card = document.createElement("article");
  card.className = `milestone-card${complete ? " is-complete" : " is-locked"}`;

  const copy = document.createElement("div");
  copy.className = "milestone-copy";

  const title = document.createElement("strong");
  title.textContent = complete ? milestone.title : "？？？";

  copy.append(title);

  const meta = document.createElement("div");
  meta.className = "milestone-meta";
  meta.setAttribute("aria-label", complete ? "已完成" : "未完成");

  const count = document.createElement("small");
  count.className = "milestone-count";
  count.textContent = `${formatNumber(index + 1)}/${formatNumber(milestoneDefinitions.length)}`;
  meta.append(count);

  if (complete && milestone.badge) {
    const badge = document.createElement("span");
    badge.className = "milestone-badge";
    badge.textContent = milestone.badge;
    meta.append(badge);
  }

  card.append(copy, meta);
  return card;
}

function createStatCard(title, rows) {
  const card = document.createElement("article");
  card.className = "stat-card";

  const heading = document.createElement("strong");
  heading.textContent = title;

  const list = document.createElement("div");
  list.className = "stat-rows";

  rows.forEach(([label, value]) => {
    const row = document.createElement("div");
    row.className = "stat-row";

    const rowLabel = document.createElement("span");
    rowLabel.textContent = label;

    const rowValue = document.createElement("strong");
    rowValue.textContent = value;

    row.append(rowLabel, rowValue);
    list.append(row);
  });

  card.append(heading, list);
  return card;
}

function renderBattle() {
  if (!elements.battleEnemyCard) {
    return;
  }

  if (!state.unlockedFeatures.battle) {
    stopBattleAuto();
    battleUi.drawerOpen = false;
    elements.battleEnemyCard.replaceChildren(createEmptyNote("战斗尚未解锁。"));
    elements.battleSelectedBlade.replaceChildren(createEmptyNote("研究战斗后选择刃。"));
    elements.battleBladeList.replaceChildren();
    elements.battleLogList.replaceChildren();
    elements.battleLogSummary.textContent = "0 条";
    battleUi.bladeInfoOpen = false;
    renderBattleBladeInfoOverlay();
    if (elements.battleFleeButton) {
      elements.battleFleeButton.disabled = true;
    }
    if (elements.battleCrSelect) {
      elements.battleCrSelect.disabled = true;
    }
    if (elements.battleAutoToggle) {
      elements.battleAutoToggle.disabled = true;
    }
    if (elements.battleAttackButton) {
      elements.battleAttackButton.disabled = true;
    }
    if (elements.battleHoneButton) {
      elements.battleHoneButton.disabled = true;
      renderBattleHoneButtonContent(null);
    }
    if (elements.battleInscriptionButton) {
      elements.battleInscriptionButton.hidden = true;
      elements.battleInscriptionButton.setAttribute("aria-hidden", "true");
      elements.battleInscriptionButton.disabled = true;
    }
    renderBattleDrawer();
    return;
  }

  normalizeBattleSelectionAgainstInventory(state);
  ensureBattleEnemy();
  renderBattleEnemyCard();
  renderBattleSelectedBlade();
  renderBattleInventory();
  renderBattleDrawer();
  renderBattleLog();
  renderBattleButtons();
  renderBattleBladeInfoOverlay();
}

function ensureBattleEnemy() {
  if (!state.battle.currentEnemy || Number(state.battle.currentEnemy.hp) <= 0) {
    state.battle.currentEnemy = createBattleEnemy(state.battle.selectedCr, state.battle.currentEnemy?.name || "");
  } else {
    state.battle.currentEnemy = normalizeBattleEnemy(state.battle.currentEnemy);
  }
}

function createBattleEnemy(cr, previousEnemyName = "") {
  const enemy = battleFormula.generateEnemy({
    ...battleFormula.defaultEnemyGenerationConfig,
    cr: clampBattleCr(cr, state.battle.selectedCr),
    previousEnemyName,
  });
  return normalizeBattleEnemy({
    ...enemy,
    maxHp: enemy.hp,
  });
}

function getSelectedBattleBlade() {
  return state.metallurgy.bladeInventory.find((blade) => blade.id === state.battle.selectedBladeId) || null;
}

function renderBattleEnemyCard() {
  const enemy = state.battle.currentEnemy;
  const maxHp = Math.max(1, Math.floor(Number(enemy.maxHp) || Number(enemy.hp) || 1));
  const hp = Math.max(0, Math.floor(Number(enemy.hp) || 0));
  const hpRatio = Math.max(0, Math.min(1, hp / maxHp));

  const head = document.createElement("div");
  head.className = "battle-card-head";

  const identity = document.createElement("div");
  identity.className = "battle-enemy-identity";
  const avatar = document.createElement("span");
  avatar.className = "battle-enemy-avatar";
  avatar.setAttribute("aria-hidden", "true");
  avatar.textContent = Number(enemy.cr) >= 5 ? "☠️" : "💀";

  const title = document.createElement("div");
  const heading = document.createElement("strong");
  heading.textContent = `${enemy.name || "敌人"} CR${formatNumber(enemy.cr)}`;
  const reward = document.createElement("small");
  reward.textContent = `胜利 +${formatNumber(battleFormula.getEnemySaltReward(enemy))}盐`;
  title.append(heading, reward);
  identity.append(avatar, title);
  head.append(identity);

  const hpRow = document.createElement("div");
  hpRow.className = "battle-hp-row";
  const hpText = document.createElement("strong");
  hpText.textContent = `HP ${formatNumber(hp)} / ${formatNumber(maxHp)}`;
  const hpMeter = document.createElement("div");
  hpMeter.className = "battle-hp-meter";
  const hpFill = document.createElement("span");
  hpFill.style.width = `${Math.round(hpRatio * 100)}%`;
  hpMeter.append(hpFill);
  hpRow.append(hpText, hpMeter);

  const stats = document.createElement("div");
  stats.className = "battle-enemy-stats";
  [
    ["坚硬", enemy.hardness],
    ["崩裂", enemy.fracture],
    ["磨损", enemy.wear],
    ["锈蚀", enemy.rust],
  ].forEach(([label, value]) => {
    stats.append(createBattleStatPill(label, value));
  });

  elements.battleEnemyCard.replaceChildren(head, hpRow, stats);
}

function createBattleStatPill(label, value) {
  const item = document.createElement("span");
  item.className = "battle-stat-pill";
  item.textContent = `${label} ${formatSignedInteger(value)}`;
  return item;
}

function renderBattleSelectedBlade() {
  const blade = getSelectedBattleBlade();
  if (!blade) {
    const head = document.createElement("div");
    head.className = "battle-card-head";
    const title = document.createElement("div");
    const name = document.createElement("strong");
    name.textContent = "当前刃";
    const status = document.createElement("small");
    status.textContent = "未选择";
    title.append(name, status);
    head.append(title, createBattleBladeInfoButton());
    elements.battleSelectedBlade.replaceChildren(head, createEmptyNote("选择一把刃。"));
    return;
  }

  const head = document.createElement("div");
  head.className = "battle-card-head";
  const title = document.createElement("div");
  const name = document.createElement("strong");
  name.textContent = blade.name;
  const status = document.createElement("small");
  const pauseReason = battleFormula.getPauseReason(blade);
  status.textContent = !isBladeBattleComplete(blade)
    ? "不可用"
    : pauseReason
      ? `暂停：${pauseReason.label}`
      : "待战";
  title.append(name, status);
  head.append(title, createBattleBladeInfoButton());

  const body = document.createElement("div");
  body.className = "battle-blade-body";
  body.append(createBladeDetailStats(blade), createBladeRadarChart(blade));

  elements.battleSelectedBlade.replaceChildren(head, body);
}

function createBattleBladeInfoButton() {
  const button = document.createElement("button");
  button.className = "battle-info-button";
  button.type = "button";
  button.dataset.battleBladeInfo = "toggle";
  button.textContent = "i";
  button.setAttribute("aria-label", "查看战斗属性说明");
  button.setAttribute("aria-expanded", String(battleUi.bladeInfoOpen));
  return button;
}

function rememberBattleBladeInfoScroll() {
  const panel = elements.battleLayout?.querySelector(".battle-info-popover");
  if (panel) {
    battleUi.bladeInfoScrollTop = panel.scrollTop;
  }
}

function renderBattleBladeInfoOverlay() {
  if (!elements.battleLayout) {
    return;
  }

  rememberBattleBladeInfoScroll();
  elements.battleLayout.querySelector(".battle-info-popover")?.remove();

  if (!battleUi.bladeInfoOpen) {
    return;
  }

  const panel = createBattleBladeInfoPopover();
  elements.battleLayout.append(panel);
  panel.scrollTop = battleUi.bladeInfoScrollTop;
}

function createBattleBladeInfoPopover() {
  const panel = document.createElement("section");
  panel.className = "battle-info-popover";
  panel.setAttribute("aria-label", "战斗属性说明");

  const head = document.createElement("div");
  head.className = "battle-info-popover-head";
  const title = document.createElement("strong");
  title.textContent = "战斗属性";
  const closeButton = document.createElement("button");
  closeButton.className = "battle-info-close";
  closeButton.type = "button";
  closeButton.dataset.battleBladeInfo = "close";
  closeButton.textContent = "×";
  closeButton.setAttribute("aria-label", "关闭战斗属性说明");
  head.append(title, closeButton);

  const list = document.createElement("div");
  list.className = "battle-info-list";
  BATTLE_ATTRIBUTE_NOTES.forEach(([label, description]) => {
    const item = document.createElement("article");
    item.className = "battle-info-item";
    const term = document.createElement("strong");
    term.textContent = label;
    const detail = document.createElement("p");
    detail.textContent = description;
    item.append(term, detail);
    list.append(item);
  });

  panel.append(head, list);
  return panel;
}

function renderBattleInventory() {
  const blades = state.metallurgy.bladeInventory;
  const selectedBlade = blades.find((blade) => blade.id === state.battle.selectedBladeId);
  const batchSelectedBlades = getBatchDeleteSelectedBlades();
  const batchMode = metallurgyUi.batchDeleteMode;
  elements.battleInventorySummary.textContent = `${formatNumber(blades.length)} / ${formatNumber(BLADE_INVENTORY_LIMIT)}`;

  elements.battleBladeList.replaceChildren(
    ...Array.from({ length: BLADE_INVENTORY_LIMIT }, (_, index) => {
      const blade = blades[index] || null;
      const slot = document.createElement("button");
      slot.className = "blade-slot";
      slot.type = "button";
      slot.classList.toggle("is-empty", !blade);

      if (blade) {
        const isFavorite = isBladeFavorite(blade);
        slot.dataset.battleBladeId = blade.id;
        slot.classList.toggle("is-selected", !batchMode && blade.id === state.battle.selectedBladeId);
        slot.classList.toggle("is-batch-selected", batchMode && metallurgyUi.batchDeleteBladeIds.has(blade.id));
        slot.classList.toggle("is-favorite", isFavorite);
        slot.classList.toggle("is-batch-locked", batchMode && isFavorite);
        slot.classList.toggle("is-unusable", !isBladeUsable(blade));
        slot.setAttribute(
          "aria-label",
          `${blade.name}${isFavorite ? "，已收藏" : ""}${isBladeUsable(blade) ? "" : "，不可用"}`,
        );

        const icon = document.createElement("span");
        icon.className = "blade-icon";
        icon.textContent = "🔪";

        const favoriteMark = document.createElement("span");
        favoriteMark.className = "blade-favorite-mark";
        favoriteMark.textContent = "★";
        favoriteMark.setAttribute("aria-hidden", "true");

        const name = document.createElement("small");
        name.textContent = blade.name;

        slot.append(icon, favoriteMark, name);
      } else {
        slot.disabled = true;
        slot.textContent = String(index + 1);
      }

      return slot;
    }),
  );

  if (elements.battleBladeBatchDeleteToggle) {
    elements.battleBladeBatchDeleteToggle.textContent = batchMode ? "取消批量" : "批量";
    elements.battleBladeBatchDeleteToggle.classList.toggle("is-active", batchMode);
  }
  if (elements.battleBladeBatchDeleteButton) {
    elements.battleBladeBatchDeleteButton.hidden = !batchMode;
    elements.battleBladeBatchDeleteButton.disabled = batchSelectedBlades.length === 0;
    elements.battleBladeBatchDeleteButton.textContent = `销毁所选 ${formatNumber(batchSelectedBlades.length)}`;
  }
  if (elements.battleBladeFavoriteButton) {
    elements.battleBladeFavoriteButton.hidden = batchMode;
    elements.battleBladeFavoriteButton.disabled = batchMode || !selectedBlade;
    elements.battleBladeFavoriteButton.textContent =
      selectedBlade && isBladeFavorite(selectedBlade) ? "取消收藏" : "收藏";
    elements.battleBladeFavoriteButton.classList.toggle(
      "is-active",
      Boolean(selectedBlade && isBladeFavorite(selectedBlade)),
    );
  }
  if (elements.battleBladeDeleteButton) {
    elements.battleBladeDeleteButton.hidden = batchMode;
    elements.battleBladeDeleteButton.disabled = batchMode || !selectedBlade;
  }
}

function renderBladeInventoryViews() {
  renderBladeInventory();
  renderBattleInventory();
}

function renderBattleDrawer() {
  renderDrawer(elements.battleDrawer, elements.battleDrawerToggle, battleUi.drawerOpen);
}

function renderBattleLog() {
  const rows = [...state.battle.log].reverse();
  elements.battleLogSummary.textContent = `${formatNumber(state.battle.log.length)} 条`;
  elements.battleLogList.replaceChildren(
    ...rows.map((entry) => {
      const item = document.createElement("li");
      item.textContent = entry.message;
      return item;
    }),
  );
  elements.battleLogList.scrollTop = elements.battleLogList.scrollHeight;
}

function renderBattleButtons() {
  const battleUnlocked = Boolean(state.unlockedFeatures.battle);
  const blade = getSelectedBattleBlade();
  const pauseReason = blade ? battleFormula.getPauseReason(blade) : null;
  const isAutoBattling = Boolean(battleAutoTimer);
  const canUseBlade = Boolean(battleUnlocked && blade && isBladeBattleComplete(blade) && !pauseReason && !battleHoneTimer);
  const fleeRemaining = getCooldownRemainingSeconds("battleFlee");

  if (elements.battleFleeButton) {
    elements.battleFleeButton.disabled = !battleUnlocked || fleeRemaining > 0;
    elements.battleFleeButton.textContent = fleeRemaining > 0 ? `逃跑 ${formatWholeDuration(fleeRemaining)}` : "逃跑";
  }

  renderBattleCrSelect(battleUnlocked);

  if (elements.battleAutoToggle) {
    elements.battleAutoToggle.disabled = !canUseBlade;
    elements.battleAutoToggle.textContent = isAutoBattling ? "暂停战斗" : "自动战斗";
    elements.battleAutoToggle.classList.toggle("is-active", isAutoBattling);
  }

  if (elements.battleAttackButton) {
    elements.battleAttackButton.disabled = !canUseBlade || isAutoBattling;
  }

  if (elements.battleHoneButton) {
    elements.battleHoneButton.disabled =
      !battleUnlocked ||
      !blade ||
      !isBladeBattleComplete(blade) ||
      Number(blade.stats.durability) <= 0 ||
      isAutoBattling ||
      Boolean(battleHoneTimer);
    renderBattleHoneButtonContent(blade);
  }

  if (elements.battleInscriptionButton) {
    const inscriptionUnlocked = Boolean(state.unlockedFeatures.inscription);
    const canUseInscription = Boolean(
      battleUnlocked &&
      inscriptionUnlocked &&
      blade &&
      hasActivatableBladeInscription(blade),
    );
    elements.battleInscriptionButton.hidden = !inscriptionUnlocked;
    elements.battleInscriptionButton.setAttribute("aria-hidden", String(!inscriptionUnlocked));
    elements.battleInscriptionButton.disabled = !canUseInscription;
    elements.battleInscriptionButton.classList.toggle("is-active", canUseInscription);
  }
}

function renderBattleCrSelect(battleUnlocked = Boolean(state.unlockedFeatures.battle)) {
  if (!elements.battleCrSelect) {
    return;
  }

  const maxVisibleCr = battleUnlocked ? clampBattleCr(state.battle.maxUnlockedCr, 1) : 1;
  const visibleValues = Array.from({ length: maxVisibleCr }, (_, index) => String(index + 1));
  const currentValues = Array.from(elements.battleCrSelect.options).map((option) => option.value);
  const needsRebuild =
    currentValues.length !== visibleValues.length ||
    currentValues.some((value, index) => value !== visibleValues[index]);

  if (needsRebuild) {
    elements.battleCrSelect.replaceChildren(
      ...visibleValues.map((value) => {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = `CR${value}`;
        return option;
      }),
    );
  }

  const selectedCr = Math.min(maxVisibleCr, clampBattleCr(state.battle.selectedCr, 1));
  if (state.battle.selectedCr !== selectedCr) {
    state.battle.selectedCr = selectedCr;
  }

  elements.battleCrSelect.disabled = !battleUnlocked;
  const selectedCrValue = String(selectedCr);
  if (document.activeElement !== elements.battleCrSelect && elements.battleCrSelect.value !== selectedCrValue) {
    elements.battleCrSelect.value = selectedCrValue;
  }
}

function renderBattleHoneButtonContent(blade) {
  if (!elements.battleHoneButton) {
    return;
  }

  const label = document.createElement("strong");
  label.textContent = "磨刃";

  const detail = document.createElement("small");
  detail.textContent = formatBattleHoneButtonDetail(blade);

  elements.battleHoneButton.replaceChildren(label, detail);
}

function formatBattleHoneButtonDetail(blade) {
  if (!blade || !isBladeBattleComplete(blade)) {
    return "锋利+0";
  }
  if (Number(blade.stats.durability) <= 0) {
    return "耐久不足";
  }
  return `锋利+${formatNumber(getBattleEstimatedHoneGain(blade))}`;
}

function hasActivatableBladeInscription(blade) {
  const inscriptions = Array.isArray(blade?.inscriptions) ? blade.inscriptions : [];
  return inscriptions.some((inscription) =>
    Boolean(inscription && (inscription.canActivate || inscription.isActive || inscription.active)),
  );
}

function getBattleEstimatedHoneGain(blade) {
  const currentSharpness = Math.max(0, Math.floor(Number(blade.stats.sharpness) || 0));
  const maxSharpness = Math.max(0, Math.floor(Number(blade.maxStats.sharpness) || 0));
  const restorableSharpness = Math.max(0, maxSharpness - currentSharpness);
  if (restorableSharpness <= 0) {
    return 0;
  }

  const params = battleFormula.defaultParams;
  const quality = battleFormula.reciprocalPowerProbability(blade.stats.hardness, params.honingK);
  return Math.min(restorableSharpness, Math.max(0, Math.round(quality * params.honingS)));
}

function addBattleLog(message) {
  if (!state.battle || typeof state.battle !== "object") {
    state.battle = createDefaultBattleState();
  }
  state.battle.log = [
    {
      id: createRecordId("battle-log"),
      createdAt: new Date().toISOString(),
      message,
    },
    ...state.battle.log,
  ].slice(0, BATTLE_LOG_LIMIT);
}

function setBattleCr(value) {
  const nextCr = Math.min(state.battle.maxUnlockedCr, clampBattleCr(value, state.battle.selectedCr));
  if (nextCr === state.battle.selectedCr) {
    renderBattle();
    return;
  }
  state.battle.selectedCr = nextCr;
  addBattleLog(`下一只敌人设为 CR${formatNumber(nextCr)}`);
  render();
  maybeAutoSave();
}

function selectBattleBlade(bladeId) {
  if (metallurgyUi.batchDeleteMode) {
    toggleBatchDeleteBlade(bladeId);
    return;
  }

  const blade = state.metallurgy.bladeInventory.find((item) => item.id === bladeId);
  if (!blade) {
    return;
  }
  state.battle.selectedBladeId = blade.id;
  addBattleLog(`换刃：${blade.name}`);
  renderBattle();
  maybeAutoSave();
}

function toggleBattleDrawer() {
  battleUi.drawerOpen = !battleUi.drawerOpen;
  renderBattleDrawer();
}

function fleeBattle() {
  advancePassive();
  if (!state.unlockedFeatures.battle || isActionCoolingDown("battleFlee")) {
    renderBattle();
    return;
  }
  stopBattleAuto();
  state.battle.currentEnemy = createBattleEnemy(state.battle.selectedCr, state.battle.currentEnemy?.name || "");
  state.battle.lastImportantPauseReason = null;
  startActionCooldown("battleFlee", BATTLE_FLEE_COOLDOWN_SECONDS);
  addBattleLog(`逃跑：刷新为 ${state.battle.currentEnemy.name || "敌人"} CR${formatNumber(state.battle.selectedCr)}`);
  render();
  persistImportantChange();
}

function toggleBattleAuto() {
  if (battleAutoTimer) {
    stopBattleAuto();
    addBattleLog("自动战斗暂停");
    render();
    maybeAutoSave();
    return;
  }

  const blade = getSelectedBattleBlade();
  if (!blade || !isBladeBattleComplete(blade)) {
    addBattleLog("无法战斗：没有可用刃");
    renderBattle();
    return;
  }
  const pauseReason = battleFormula.getPauseReason(blade);
  if (pauseReason) {
    addBattleLog(`无法战斗：${pauseReason.message}`);
    renderBattle();
    return;
  }

  ensureBattleEnemy();
  const intervalMs = battleFormula.defaultParams.attackIntervalSeconds * 1000;
  battleAutoTimer = window.setInterval(() => performBattleAttack("自动攻击"), intervalMs);
  addBattleLog("自动战斗开始");
  render();
  maybeAutoSave();
}

function stopBattleAuto() {
  if (!battleAutoTimer) {
    return;
  }
  window.clearInterval(battleAutoTimer);
  battleAutoTimer = null;
}

function clearBattleTimers() {
  stopBattleAuto();
  if (battleHoneTimer) {
    window.clearTimeout(battleHoneTimer);
    battleHoneTimer = null;
  }
}

function performBattleAttack(sourceLabel = "自动攻击") {
  const blade = getSelectedBattleBlade();
  if (!blade || !isBladeBattleComplete(blade)) {
    stopBattleAuto();
    addBattleLog("暂停：没有可用刃");
    render();
    return;
  }

  const startPauseReason = battleFormula.getPauseReason(blade);
  if (startPauseReason) {
    stopBattleAuto();
    addBattleLog(`暂停：${startPauseReason.message}`);
    if (sourceLabel === "自动攻击") {
      addLog(`自动战斗暂停：${startPauseReason.message}`);
    }
    render();
    persistImportantChange();
    return;
  }

  ensureBattleEnemy();
  const enemyBefore = { ...state.battle.currentEnemy };
  const result = battleFormula.resolveAttack(blade, state.battle.currentEnemy, battleFormula.defaultParams);
  Object.assign(blade.stats, result.blade.stats);
  blade.uses = Math.floor(Number(blade.uses) || 0) + 1;
  state.battle.currentEnemy = normalizeBattleEnemy({
    ...result.enemy,
    maxHp: enemyBefore.maxHp,
  });
  state.battle.attacks += 1;

  addBattleLog(formatBattleAttackResult(result));

  if (result.victory) {
    completeBattleVictory(enemyBefore, blade, result);
  } else if (result.pauseReasons.length > 0) {
    const pauseText = result.pauseReasons.map((reason) => reason.message).join(" / ");
    state.battle.lastImportantPauseReason = pauseText;
    stopBattleAuto();
    addBattleLog(`暂停：${pauseText}`);
    if (sourceLabel === "自动攻击") {
      addLog(`自动战斗暂停：${pauseText}`);
    }
  }

  render();
  maybeAutoSave();
}

function formatBattleAttackResult(result) {
  const parts = [`攻击：造成 ${formatNumber(result.damage)} 伤害`];
  parts.push(`敌 HP ${formatNumber(Math.max(0, result.enemy.hp))}`);
  const deltaText = formatBattleDeltas(result.deltas);
  if (deltaText) {
    parts.push(deltaText);
  }
  return parts.join("，");
}

function formatBattleDeltas(deltas) {
  const rows = bladeStatIds
    .filter((stat) => Number(deltas[stat]) !== 0)
    .map((stat) => `${bladeStatLabels[stat]} ${formatSignedInteger(deltas[stat])}`);
  return rows.join(" / ");
}

function completeBattleVictory(enemyBefore, blade, result) {
  const defeatedCr = clampBattleCr(enemyBefore.cr, state.battle.selectedCr);
  const crKey = String(defeatedCr);
  const reward = result.saltReward;

  gainResource("salt", reward);
  state.battle.saltEarned += reward;
  state.battle.killsByCr[crKey] = Math.floor(Number(state.battle.killsByCr[crKey]) || 0) + 1;
  blade.kills = Math.floor(Number(blade.kills) || 0) + 1;
  stopBattleAuto();

  addBattleLog(`胜利：击败 ${enemyBefore.name || "敌人"}，获得 ${formatNumber(reward)}盐`);

  if (defeatedCr >= state.battle.maxUnlockedCr && defeatedCr < MAX_BATTLE_CR) {
    state.battle.maxUnlockedCr = defeatedCr + 1;
    addBattleLog(`CR${formatNumber(state.battle.maxUnlockedCr)} 已开放`);
    addLog(`击败 CR${formatNumber(defeatedCr)}，CR${formatNumber(state.battle.maxUnlockedCr)} 敌人开放。`);
  }

  state.battle.selectedCr = Math.min(state.battle.selectedCr, state.battle.maxUnlockedCr);
  state.battle.currentEnemy = createBattleEnemy(state.battle.selectedCr, enemyBefore.name || "");
}

function honeBattleBlade() {
  const isAutoBattling = Boolean(battleAutoTimer);
  if (isAutoBattling || battleHoneTimer) {
    renderBattleButtons();
    return;
  }

  const blade = getSelectedBattleBlade();
  if (!blade || !isBladeBattleComplete(blade) || Number(blade.stats.durability) <= 0) {
    addBattleLog("无法磨刃：没有可用刃");
    renderBattle();
    return;
  }

  const isFullSharpness = Number(blade.stats.sharpness) >= Number(blade.maxStats.sharpness);
  if (isFullSharpness) {
    const delayMs = battleFormula.defaultParams.fullSharpnessHoneDelaySeconds * 1000;
    battleHoneTimer = window.setTimeout(() => {
      battleHoneTimer = null;
      applyBattleHone();
    }, delayMs);
    addBattleLog(`满锋磨刃：等待 ${formatDuration(delayMs / 1000)}`);
    renderBattleButtons();
    return;
  }

  applyBattleHone();
}

function applyBattleHone() {
  const blade = getSelectedBattleBlade();
  if (!blade) {
    renderBattle();
    return;
  }

  const result = battleFormula.resolveHone(blade, battleFormula.defaultParams);
  if (result.blocked) {
    addBattleLog(`磨刃失败：${result.reason}`);
    render();
    return;
  }

  Object.assign(blade.stats, result.blade.stats);
  state.battle.hones += 1;

  const sharpnessGain = Number(result.deltas.sharpness) || 0;
  const durabilityLoss = Math.abs(Number(result.deltas.durability) || 0);
  addBattleLog(`磨刃：锋利 +${formatNumber(sharpnessGain)}，耐久 -${formatNumber(durabilityLoss)}`);

  if (result.pauseReasons.length > 0) {
    const pauseText = result.pauseReasons.map((reason) => reason.message).join(" / ");
    addBattleLog(`暂停：${pauseText}`);
  }

  render();
  maybeAutoSave();
}

function renderMetallurgy() {
  ensureActiveMetallurgyStation();
  ensureSelectedMetallurgyResources();
  renderMetallurgyTabs();
  renderInscriptionPanel();
  renderIngredientStation("smelting");
  renderIngredientStation("forging");
  renderMetallurgyProcessButtons();
  renderMetallurgyProducts();
  renderMetallurgyDrawers();
  renderSmeltingLog();
  renderBladeInventory();
}

function renderInscriptionPanel() {
  if (!elements.inscriptionPanel) {
    return;
  }
  if (!state.unlockedFeatures.inscription) {
    elements.inscriptionPanel.replaceChildren();
    return;
  }

  const content = document.createElement("div");
  content.className = "inscription-epilogue";

  const textBox = document.createElement("div");
  textBox.className = "inscription-epilogue-text";
  INSCRIPTION_EPILOGUE_TEXT.forEach((line) => {
    const paragraph = document.createElement("p");
    paragraph.textContent = line;
    textBox.append(paragraph);
  });

  content.append(
    textBox,
    state.meta.inscriptionEpilogueAccepted
      ? createW7WheelHint()
      : createInscriptionEpilogueButton(),
  );
  elements.inscriptionPanel.replaceChildren(content);
}

function createInscriptionEpilogueButton() {
  const button = document.createElement("button");
  button.className = "primary-action inscription-epilogue-button";
  button.type = "button";
  button.dataset.inscriptionEpilogueAccept = "true";

  const label = document.createElement("strong");
  label.textContent = "好耶！";
  button.append(label);
  return button;
}

function createW7WheelHint() {
  const wrapper = document.createElement("div");
  wrapper.className = "w7-wheel-hint";
  wrapper.setAttribute("role", "img");
  wrapper.setAttribute("aria-label", "灰色 W7 轮图，六个外侧节点，一个中心节点，十二条边相连");

  const svg = createSvgElement("svg", {
    viewBox: "0 0 160 160",
    focusable: "false",
    "aria-hidden": "true",
  });
  const center = { x: 80, y: 80 };
  const outerRadius = 54;
  const outerNodes = Array.from({ length: 6 }, (_, index) => {
    const angle = -Math.PI / 2 + (Math.PI * 2 * index) / 6;
    return {
      x: center.x + Math.cos(angle) * outerRadius,
      y: center.y + Math.sin(angle) * outerRadius,
    };
  });

  outerNodes.forEach((point, index) => {
    const nextPoint = outerNodes[(index + 1) % outerNodes.length];
    svg.append(createW7WheelEdge(point, nextPoint));
  });
  outerNodes.forEach((point) => {
    svg.append(createW7WheelEdge(center, point));
  });
  outerNodes.forEach((point) => {
    svg.append(createW7WheelNode(point, false));
  });
  svg.append(createW7WheelNode(center, true));

  wrapper.append(svg);
  return wrapper;
}

function createW7WheelEdge(from, to) {
  return createSvgElement("line", {
    class: "w7-wheel-edge",
    x1: from.x.toFixed(2),
    y1: from.y.toFixed(2),
    x2: to.x.toFixed(2),
    y2: to.y.toFixed(2),
  });
}

function createW7WheelNode(point, isCenter) {
  return createSvgElement("circle", {
    class: `w7-wheel-node${isCenter ? " is-center" : ""}`,
    cx: point.x.toFixed(2),
    cy: point.y.toFixed(2),
    r: isCenter ? 8 : 7,
  });
}

function renderIngredientStation(station) {
  const listElement =
    station === "forging" ? elements.forgingResourceList : elements.smeltingResourceList;
  const selectedElement =
    station === "forging" ? elements.forgingSelectedResource : elements.smeltingSelectedResource;
  const currentInputsElement =
    station === "forging" ? elements.forgingCurrentInputs : elements.smeltingCurrentInputs;
  const inputs = getStationInputs(station);
  const visibleResources = getVisibleMetallurgyResources(station);
  const selectedResource = metallurgyUi.selectedResources[station];
  const step = getIngredientStep(station);
  const inputLimit = getStationInputLimit(station);
  const inputTotal = getResourceAmountTotal(inputs, getAllowedMetallurgyResources(station));
  const isProcessing = isActionCoolingDown(station);
  renderIngredientStepControls(station);

  if (visibleResources.length === 0) {
    listElement.replaceChildren(createEmptyNote("尚未持有过任何可投资源。"));
    selectedElement.textContent = `未选择 / 步长 ${formatNumber(step)}`;
    renderCurrentLoadout(currentInputsElement, inputs, inputTotal, inputLimit);
    return;
  }

  listElement.replaceChildren(
    ...visibleResources.map((resource) => {
      const button = document.createElement("button");
      button.className = "ingredient-option";
      button.type = "button";
      button.dataset.station = station;
      button.dataset.resource = resource;
      button.classList.toggle("is-selected", selectedResource === resource);
      button.disabled = isProcessing;

      const label = document.createElement("strong");
      label.textContent = resourceLabels[resource];
      const planned = document.createElement("span");
      planned.textContent = `投入 ${formatNumber(inputs[resource])}`;

      button.append(label, planned);
      return button;
    }),
  );

  if (selectedResource) {
    selectedElement.textContent = `已投 ${formatNumber(inputs[selectedResource])} / 步长 ${formatNumber(step)}`;
  } else {
    selectedElement.textContent = `未选择 / 步长 ${formatNumber(step)}`;
  }
  renderCurrentLoadout(currentInputsElement, inputs, inputTotal, inputLimit);
}

function renderCurrentLoadout(element, inputs, inputTotal, inputLimit) {
  const bundle = document.createElement("span");
  bundle.className = inputTotal >= inputLimit ? "loadout-limit is-full" : "loadout-limit";
  bundle.textContent = `${formatResourceBundle(inputs)} · 总投料 ${formatNumber(inputTotal)} / 上限 ${formatNumber(inputLimit)}`;

  element.replaceChildren(bundle);
}

function renderMetalResourcePanels() {
  renderMetalResources(elements.homeMetalResources);
  renderMetalResources(elements.metallurgyMetalResources);
}

function renderMetalResources(container) {
  if (!container) {
    return;
  }

  container.replaceChildren(
    ...metalResourceIds.map((resource) => {
      const item = document.createElement("div");
      const amount = Math.floor(Number(state.resources[resource]) || 0);

      item.className = "metal-resource-item resource-indicator";
      item.classList.toggle("is-empty", amount <= 0);
      item.dataset.resourceIndicator = resource;

      const label = document.createElement("span");
      label.textContent = resourceLabels[resource];

      const value = document.createElement("strong");
      value.textContent = formatNumber(amount);

      item.append(label, value);
      return item;
    }),
  );
}

function renderIngredientStepControls(station) {
  const step = getIngredientStep(station);
  const removeButton = $(`[data-station="${station}"][data-ingredient-action="remove"]`);
  const addButton = $(`[data-station="${station}"][data-ingredient-action="add"]`);
  const multiplyButton = $(`[data-station="${station}"][data-ingredient-action="multiply"]`);
  const divideButton = $(`[data-station="${station}"][data-ingredient-action="divide"]`);
  const selectedResource = metallurgyUi.selectedResources[station];
  const inputs = getStationInputs(station);
  const inputLimit = getStationInputLimit(station);
  const inputTotal = getResourceAmountTotal(inputs, getAllowedMetallurgyResources(station));
  const currentAmount = selectedResource ? Math.floor(Number(inputs[selectedResource]) || 0) : 0;
  const availableAmount = selectedResource ? Math.floor(Number(state.resources[selectedResource]) || 0) : 0;
  const isProcessing = isActionCoolingDown(station);

  if (multiplyButton) {
    multiplyButton.disabled = isProcessing || step >= inputLimit;
  }
  if (divideButton) {
    divideButton.disabled = isProcessing || step <= 1;
  }
  if (removeButton) {
    removeButton.textContent = `-${formatNumber(step)}`;
    removeButton.disabled = isProcessing || !selectedResource || currentAmount <= 0;
  }
  if (addButton) {
    addButton.textContent = `+${formatNumber(step)}`;
    addButton.disabled = isProcessing || !selectedResource || inputTotal >= inputLimit;
  }
}

function renderMetallurgyTabs() {
  elements.metallurgySubtabs.forEach((button) => {
    const unlocked = isMetallurgyStationUnlocked(button.dataset.metallurgyTab);
    const selected = unlocked && button.dataset.metallurgyTab === metallurgyUi.activeStation;
    button.hidden = !unlocked;
    button.setAttribute("aria-hidden", String(!unlocked));
    button.classList.toggle("is-active", selected);
    button.setAttribute("aria-selected", String(selected));
  });

  elements.metallurgyPanels.forEach((panel) => {
    const unlocked = isMetallurgyStationUnlocked(panel.dataset.metallurgyPanel);
    panel.classList.toggle("is-active", unlocked && panel.dataset.metallurgyPanel === metallurgyUi.activeStation);
  });
}

function createEmptyNote(text) {
  const note = document.createElement("p");
  note.className = "empty-note";
  note.textContent = text;
  return note;
}

function renderMetallurgyProducts() {
  renderStationProduct(
    "smelting",
    elements.smeltingProduct,
    elements.smeltingProductNote,
    state.metallurgy.lastSmeltingProduct,
    "尚未冶炼",
    "投入资源后确认。",
  );
  renderStationProduct(
    "forging",
    elements.forgingProduct,
    elements.forgingProductNote,
    state.metallurgy.lastForgingProduct,
    "尚未锻造",
    "投料后确认。",
  );
}

function renderStationProduct(station, element, noteElement, product, emptyTitle, emptyDetail) {
  const pendingOperation = getPendingOperation(station);
  const remainingSeconds = getCooldownRemainingSeconds(station);

  if (pendingOperation && remainingSeconds > 0) {
    renderPendingProduct(element, noteElement, station, pendingOperation, remainingSeconds);
    return;
  }

  renderProduct(element, noteElement, product, emptyTitle, emptyDetail);
}

function renderPendingProduct(element, noteElement, station, operation, remainingSeconds) {
  const title = document.createElement("span");
  const note = `${formatResourceBundle(operation.inputs)}，剩余 ${formatWholeDuration(remainingSeconds)}`;

  title.textContent = `${getStationName(station)}中`;
  title.title = `${title.textContent}：${note}`;
  renderProductNote(noteElement, note);
  element.replaceChildren(title);
}

function renderProduct(element, noteElement, product, emptyTitle, emptyDetail) {
  const title = document.createElement("span");
  let note = emptyDetail;

  if (!product) {
    title.textContent = emptyTitle;
  } else if (product.type === "resource") {
    const result = formatProductResult(product);
    const message = product.message || "冶炼成功。";
    title.textContent = result;
    note = `${result}：${message}`;
  } else if (product.type === "notice") {
    const name = product.name || "未反应";
    const message = product.message || "没有发生变化。";
    title.textContent = name;
    note = `${name}：${message}`;
  } else if (product.type === "blade") {
    title.textContent = product.name || "刃";
    title.title = buildBladeDetailsText(product);
    renderProductNote(noteElement, "已收入背包。");
    element.replaceChildren(title);
    return;
  } else {
    const message = product.message || "没有属性，不进入资源或背包。";
    title.textContent = "垃圾";
    note = `垃圾：${message}`;
  }

  title.title = title.textContent;
  renderProductNote(noteElement, note);
  element.replaceChildren(title);
}

function renderProductNote(noteElement, text) {
  if (!noteElement) {
    return;
  }
  noteElement.textContent = text || "";
  noteElement.title = noteElement.textContent;
}

function maybeShowForgedBladeDetails() {
  elements.metallurgyLayout?.querySelector(".metallurgy-result-popover")?.remove();

  const blade = metallurgyUi.pendingBladeDetails;
  if (!blade || !elements.metallurgyLayout) {
    return;
  }

  elements.metallurgyLayout.append(createForgingResultPopover(blade));
}

function closeForgingResultPopover() {
  metallurgyUi.pendingBladeDetails = null;
  maybeShowForgedBladeDetails();
}

function createForgingResultPopover(blade) {
  const panel = document.createElement("section");
  panel.className = "metallurgy-result-popover";
  panel.setAttribute("aria-label", "锻造结果");

  const head = document.createElement("div");
  head.className = "battle-info-popover-head";
  const heading = document.createElement("strong");
  heading.textContent = "锻造完成";
  const closeButton = document.createElement("button");
  closeButton.className = "battle-info-close";
  closeButton.type = "button";
  closeButton.dataset.forgingResultClose = "true";
  closeButton.textContent = "×";
  closeButton.setAttribute("aria-label", "关闭锻造结果");
  head.append(heading, closeButton);

  const title = document.createElement("div");
  title.className = "blade-detail-title metallurgy-result-title";
  const name = document.createElement("strong");
  name.textContent = blade.name;
  const status = document.createElement("small");
  const usable = isBladeUsable(blade);
  status.textContent = usable ? "可用" : "该刃不可用";
  status.classList.toggle("is-unusable", !usable);
  title.append(name, status);

  const body = document.createElement("div");
  body.className = "blade-detail-body metallurgy-result-body";
  body.append(createBladeDetailStats(blade), createBladeRadarChart(blade, { labels: false }));

  panel.append(head, title, body, createBladeMetaPanel(blade));
  return panel;
}

function renderMetallurgyProcessButtons() {
  renderMetallurgyProcessButton("smelting", elements.smeltButton);
  renderMetallurgyProcessButton("forging", elements.forgeButton);
}

function renderMetallurgyProcessButton(station, button) {
  const label = button.querySelector("strong");
  const now = Date.now();
  const remainingSeconds = getCooldownRemainingSeconds(station, now);
  const operationSeconds = getStationOperationDurationSeconds(station);
  const isFull = station === "forging" && state.metallurgy.bladeInventory.length >= BLADE_INVENTORY_LIMIT;

  button.disabled = isFull || remainingSeconds > 0;
  if (!label) {
    return;
  }

  if (isFull) {
    label.textContent = "背包已满";
  } else if (remainingSeconds > 0) {
    label.textContent = `工作中 ${formatWholeDuration(remainingSeconds)}`;
  } else {
    const actionLabel = PROCESS_ACTION_LABELS[station] || getStationName(station);
    label.textContent = operationSeconds > 0 ? `${actionLabel} ${formatDuration(operationSeconds)}` : actionLabel;
  }
}

function createBladeStatList(blade) {
  const list = document.createElement("div");
  list.className = "blade-stat-list";

  bladeStatIds.forEach((stat) => {
    const row = document.createElement("span");
    row.textContent = formatBladeStat(blade, stat);
    list.append(row);
  });

  return list;
}

function createBladeDetailStats(blade) {
  const list = document.createElement("div");
  list.className = "blade-detail-stats";

  bladeStatIds.forEach((stat) => {
    const row = document.createElement("div");
    row.className = "blade-detail-stat-row";

    const label = document.createElement("span");
    label.textContent = bladeStatLabels[stat];

    const value = document.createElement("strong");
    value.textContent = `${formatSignedInteger(blade.stats[stat])}/${formatSignedInteger(blade.maxStats[stat])}`;

    row.append(label, value);
    list.append(row);
  });

  return list;
}

function createBladeRadarChart(blade, options = {}) {
  const wrapper = document.createElement("div");
  wrapper.className = "blade-radar";
  const showLabels = options.labels !== false;

  const svg = createSvgElement("svg", {
    viewBox: showLabels ? "0 0 160 160" : "24 24 112 112",
    role: "img",
    "aria-label": "刃属性雷达图",
  });
  const center = 80;
  const radius = 44;
  const labelRadius = 65;
  const scaleMax = Math.max(
    1,
    ...bladeStatIds.map((stat) =>
      Math.max(0, Number(blade.stats?.[stat]) || 0, Number(blade.maxStats?.[stat]) || 0),
    ),
  );

  [1 / 3, 2 / 3, 1].forEach((scale) => {
    svg.append(
      createSvgElement("polygon", {
        class: "blade-radar-grid",
        points: formatRadarPoints(bladeStatIds.map((_, index) => getRadarPoint(index, bladeStatIds.length, radius * scale, center))),
      }),
    );
  });

  bladeStatIds.forEach((_, index) => {
    const point = getRadarPoint(index, bladeStatIds.length, radius, center);
    svg.append(
      createSvgElement("line", {
        class: "blade-radar-axis",
        x1: center,
        y1: center,
        x2: point.x,
        y2: point.y,
      }),
    );
  });

  const valuePoints = bladeStatIds.map((stat, index) => {
    const value = Math.max(0, Number(blade.stats?.[stat]) || 0);
    return getRadarPoint(index, bladeStatIds.length, radius * Math.min(1, value / scaleMax), center);
  });
  const maxPoints = bladeStatIds.map((stat, index) => {
    const value = Math.max(0, Number(blade.maxStats?.[stat]) || 0);
    return getRadarPoint(index, bladeStatIds.length, radius * Math.min(1, value / scaleMax), center);
  });

  svg.append(
    createSvgElement("polygon", {
      class: "blade-radar-area blade-radar-area-max",
      points: formatRadarPoints(maxPoints),
    }),
  );

  svg.append(
    createSvgElement("polygon", {
      class: "blade-radar-area",
      points: formatRadarPoints(valuePoints),
    }),
  );

  valuePoints.forEach((point) => {
    svg.append(
      createSvgElement("circle", {
        class: "blade-radar-point",
        cx: point.x,
        cy: point.y,
        r: 2,
      }),
    );
  });

  if (showLabels) {
    bladeStatIds.forEach((stat, index) => {
      svg.append(createBladeRadarLabel(blade, stat, index, bladeStatIds.length, labelRadius, center));
    });
  }

  wrapper.append(svg);
  return wrapper;
}

function createBladeRadarLabel(blade, stat, index, total, radius, center) {
  const point = getRadarPoint(index, total, radius, center);
  const label = createSvgElement("text", {
    class: "blade-radar-label",
    x: point.x,
    y: point.y - 4,
    "text-anchor": "middle",
  });
  const name = createSvgElement("tspan", {
    x: point.x,
    dy: 0,
  });
  const value = createSvgElement("tspan", {
    class: "blade-radar-label-value",
    x: point.x,
    dy: "1.15em",
  });

  name.textContent = bladeStatLabels[stat];
  value.textContent = `${formatSignedInteger(blade.stats[stat])}/${formatSignedInteger(blade.maxStats[stat])}`;
  label.append(name, value);
  return label;
}

function createSvgElement(tagName, attributes = {}) {
  const element = document.createElementNS("http://www.w3.org/2000/svg", tagName);
  Object.entries(attributes).forEach(([name, value]) => {
    element.setAttribute(name, String(value));
  });
  return element;
}

function getRadarPoint(index, total, radius, center) {
  const angle = -Math.PI / 2 + (Math.PI * 2 * index) / total;
  return {
    x: center + Math.cos(angle) * radius,
    y: center + Math.sin(angle) * radius,
  };
}

function formatRadarPoints(points) {
  return points.map((point) => `${point.x.toFixed(2)},${point.y.toFixed(2)}`).join(" ");
}

function renderMetallurgyDrawers() {
  renderDrawer(elements.smeltingDrawer, elements.smeltingDrawerToggle, metallurgyUi.drawers.smelting);
  renderDrawer(elements.forgingDrawer, elements.forgingDrawerToggle, metallurgyUi.drawers.forging);
}

function renderDrawer(drawer, toggle, isOpen) {
  drawer.classList.toggle("is-open", isOpen);
  toggle.setAttribute("aria-expanded", String(isOpen));
  toggle.querySelector("span").textContent = isOpen ? "›" : "‹";
}

function renderSmeltingLog(options = {}) {
  const preserveScroll = options.preserveScroll ?? true;
  const favorites = state.metallurgy.smeltingFavorites;
  const favoriteIds = new Set(favorites.map((record) => record.id));
  const showingFavorites = metallurgyUi.smeltingLogMode === "favorites";
  const records = showingFavorites ? favorites : state.metallurgy.smeltingLog;
  const signature = [
    showingFavorites ? "favorites" : "all",
    state.settings.compactNumbers ? "compact" : "full",
    records
      .map((record) =>
        [
          record.id,
          record.result,
          resourceIds.map((resource) => Math.floor(Number(record.inputs?.[resource]) || 0)).join(","),
        ].join(":"),
      )
      .join("|"),
    [...favoriteIds].sort().join("|"),
    favorites.length >= SMELTING_FAVORITE_LIMIT ? "favorites-full" : "favorites-open",
  ].join("::");

  elements.smeltingLogTitle.textContent = showingFavorites ? "收藏记录" : "完整记录";
  elements.smeltingLogModeToggle.textContent = showingFavorites ? "完整" : "收藏";

  if (signature === smeltingLogRenderSignature) {
    return;
  }

  const scrollTop = preserveScroll ? elements.smeltingLogList.scrollTop : 0;
  smeltingLogRenderSignature = signature;

  if (records.length === 0) {
    elements.smeltingLogList.replaceChildren(
      createEmptyNote(showingFavorites ? "暂无收藏。" : "暂无冶炼记录。"),
    );
    elements.smeltingLogList.scrollTop = scrollTop;
    return;
  }

  elements.smeltingLogList.replaceChildren(
    ...records.map((record) => {
      const item = document.createElement("li");
      item.className = "drawer-record";

      const text = document.createElement("span");
      text.textContent = `${formatResourceBundle(record.inputs)} -> ${record.result}`;

      const actions = document.createElement("div");
      actions.className = "record-actions";

      const reproduceButton = document.createElement("button");
      reproduceButton.className = "record-reproduce";
      reproduceButton.type = "button";
      reproduceButton.dataset.recordId = record.id;
      reproduceButton.dataset.recordAction = "reproduce";
      reproduceButton.textContent = "再生产";
      reproduceButton.setAttribute("aria-label", "再生产这条冶炼记录");

      const button = document.createElement("button");
      button.className = "record-star";
      button.type = "button";
      button.dataset.recordId = record.id;

      if (showingFavorites) {
        button.dataset.recordAction = "unfavorite";
        button.textContent = "★";
        button.setAttribute("aria-label", "取消收藏");
      } else {
        const isFavorited = favoriteIds.has(record.id);
        button.dataset.recordAction = "favorite";
        button.textContent = isFavorited ? "★" : "☆";
        button.disabled = isFavorited || favorites.length >= SMELTING_FAVORITE_LIMIT;
        button.setAttribute("aria-label", isFavorited ? "已收藏" : "收藏");
      }

      actions.append(reproduceButton, button);
      item.append(text, actions);
      return item;
    }),
  );
  elements.smeltingLogList.scrollTop = scrollTop;
}

function renderBladeInventory() {
  rememberBladeMetaScroll();

  const blades = state.metallurgy.bladeInventory;
  const selectedBlade = blades.find((blade) => blade.id === metallurgyUi.selectedBladeId);
  const batchSelectedBlades = getBatchDeleteSelectedBlades();
  const batchMode = metallurgyUi.batchDeleteMode;

  elements.bladeInventoryGrid.replaceChildren(
    ...Array.from({ length: BLADE_INVENTORY_LIMIT }, (_, index) => {
      const blade = blades[index] || null;
      const slot = document.createElement("button");
      slot.className = "blade-slot";
      slot.type = "button";
      slot.classList.toggle("is-empty", !blade);

      if (blade) {
        const isFavorite = isBladeFavorite(blade);
        slot.dataset.bladeId = blade.id;
        slot.classList.toggle("is-selected", !batchMode && metallurgyUi.selectedBladeId === blade.id);
        slot.classList.toggle("is-batch-selected", batchMode && metallurgyUi.batchDeleteBladeIds.has(blade.id));
        slot.classList.toggle("is-favorite", isFavorite);
        slot.classList.toggle("is-batch-locked", batchMode && isFavorite);
        slot.classList.toggle("is-unusable", !isBladeUsable(blade));
        slot.setAttribute("aria-label", `${blade.name}${isFavorite ? "，已收藏" : ""}`);

        const icon = document.createElement("span");
        icon.className = "blade-icon";
        icon.textContent = "🔪";

        const favoriteMark = document.createElement("span");
        favoriteMark.className = "blade-favorite-mark";
        favoriteMark.textContent = "★";
        favoriteMark.setAttribute("aria-hidden", "true");

        const name = document.createElement("small");
        name.textContent = blade.name;

        slot.append(icon, favoriteMark, name);
      } else {
        slot.disabled = true;
        slot.textContent = String(index + 1);
      }

      return slot;
    }),
  );

  if (elements.bladeBatchDeleteToggle) {
    elements.bladeBatchDeleteToggle.textContent = batchMode ? "取消批量" : "批量";
    elements.bladeBatchDeleteToggle.classList.toggle("is-active", batchMode);
  }
  if (elements.bladeBatchDeleteButton) {
    elements.bladeBatchDeleteButton.hidden = !batchMode;
    elements.bladeBatchDeleteButton.disabled = batchSelectedBlades.length === 0;
    elements.bladeBatchDeleteButton.textContent = `销毁所选 ${formatNumber(batchSelectedBlades.length)}`;
  }
  if (elements.bladeFavoriteButton) {
    elements.bladeFavoriteButton.hidden = batchMode;
    elements.bladeFavoriteButton.disabled = batchMode || !selectedBlade;
    elements.bladeFavoriteButton.textContent = selectedBlade && isBladeFavorite(selectedBlade) ? "取消收藏" : "收藏";
    elements.bladeFavoriteButton.classList.toggle("is-active", Boolean(selectedBlade && isBladeFavorite(selectedBlade)));
  }
  if (elements.bladeReproduceButton) {
    elements.bladeReproduceButton.hidden = batchMode;
    elements.bladeReproduceButton.disabled = batchMode || !selectedBlade || !hasAnyInput(selectedBlade.inputs || {});
  }
  if (elements.bladeDeleteButton) {
    elements.bladeDeleteButton.hidden = batchMode;
    elements.bladeDeleteButton.disabled = batchMode || !selectedBlade;
  }

  if (batchMode) {
    renderBatchDeleteDetail(batchSelectedBlades);
    return;
  }

  if (!selectedBlade) {
    elements.bladeDetail.replaceChildren(createEmptyNote("选择一把刃查看属性"));
    return;
  }

  const title = document.createElement("div");
  title.className = "blade-detail-title";

  const name = document.createElement("strong");
  name.textContent = selectedBlade.name;

  const status = document.createElement("small");
  const usable = isBladeUsable(selectedBlade);
  const favoriteText = isBladeFavorite(selectedBlade) ? "已收藏 / " : "";
  status.textContent = `${favoriteText}${usable ? "可用" : "该刃不可用"}`;
  status.classList.toggle("is-unusable", !usable);
  status.classList.toggle("is-favorite", isBladeFavorite(selectedBlade));

  title.append(name, status);

  const body = document.createElement("div");
  body.className = "blade-detail-body";
  body.append(createBladeDetailStats(selectedBlade), createBladeRadarChart(selectedBlade, { labels: false }));

  elements.bladeDetail.replaceChildren(title, body, createBladeMetaPanel(selectedBlade));
  restoreBladeMetaScroll();
}

function rememberBladeMetaScroll() {
  const meta = elements.bladeDetail.querySelector(".blade-meta-panel");
  if (meta?.dataset.bladeId === metallurgyUi.selectedBladeId) {
    metallurgyUi.bladeMetaScrollTop = meta.scrollTop;
  }
}

function restoreBladeMetaScroll() {
  const meta = elements.bladeDetail.querySelector(".blade-meta-panel");
  if (meta) {
    meta.scrollTop = metallurgyUi.bladeMetaScrollTop;
  }
}

function renderBatchDeleteDetail(selectedBlades) {
  const title = document.createElement("div");
  title.className = "blade-detail-title";

  const heading = document.createElement("strong");
  heading.textContent = "批量销毁";

  const count = document.createElement("small");
  count.textContent = `已选择 ${formatNumber(selectedBlades.length)}`;
  count.classList.toggle("is-unusable", selectedBlades.length > 0);

  title.append(heading, count);

  if (selectedBlades.length === 0) {
    elements.bladeDetail.replaceChildren(title, createEmptyNote("选择要销毁的刃。"));
    return;
  }

  const list = document.createElement("div");
  list.className = "blade-batch-delete-list";
  selectedBlades.forEach((blade) => {
    const row = document.createElement("span");
    row.textContent = blade.name;
    list.append(row);
  });

  elements.bladeDetail.replaceChildren(title, list);
}

function createBladeMetaPanel(blade) {
  const meta = document.createElement("div");
  meta.className = "blade-meta-panel";
  meta.dataset.bladeId = blade.id;

  const rows = document.createElement("div");
  rows.className = "blade-meta-list";
  [
    ["锻造时间", formatBladeCreatedAt(blade.createdAt)],
    ["投料", formatBladeInputDetail(blade.inputs)],
    ["质量", formatBladeMass(blade.inputs)],
    ["使用次数", formatNumber(blade.uses)],
    ["击杀数", formatNumber(blade.kills)],
  ].forEach(([label, value]) => {
    rows.append(createBladeMetaRow(label, value));
  });

  meta.append(rows);
  return meta;
}

function createBladeMetaRow(label, value) {
  const row = document.createElement("span");
  row.textContent = `${label}：${value}`;
  return row;
}

function renderScreens() {
  $$(".screen").forEach((screen) => {
    screen.classList.toggle("is-active", screen.dataset.screen === activeScreen);
  });
}

function render() {
  refreshProgressState();
  if (!isScreenUnlocked(activeScreen)) {
    activeScreen = "home";
  }
  renderScreens();

  const rates = getRates();
  const sulfurOutcome = getSulfurClickOutcome(rates);
  const now = Date.now();
  const battleUnlocked = Boolean(state.unlockedFeatures.battle);

  elements.screenTitle.textContent = screenTitles[activeScreen];
  elements.titleMercury.textContent = formatNumber(state.resources.mercury);
  elements.titleSulfur.textContent = formatNumber(state.resources.sulfur);
  elements.titleSalt.textContent = formatNumber(state.resources.salt);

  elements.homeMercury.textContent = formatNumber(state.resources.mercury);
  elements.homeSulfur.textContent = formatNumber(state.resources.sulfur);
  elements.homeSalt.textContent = formatNumber(state.resources.salt);
  elements.mercuryRate.textContent = `+${formatNumber(rates.mercuryPerSecond)} / 秒`;
  if (elements.saltRate) {
    elements.saltRate.textContent =
      rates.saltPerSecond > 0 ? `+${formatNumber(rates.saltPerSecond)} / 秒` : "战斗获得";
  }
  renderSulfurMineAction(rates, sulfurOutcome, now);
  renderMetalResourcePanels();
  renderLog(elements.homeLog, state.homeLog);

  renderOwnedResearch();
  renderAvailableResearch();
  renderLockedResearch();
  renderResearchSectionToggles();
  renderMetallurgy();
  renderBattle();
  renderNavigation();

  if (elements.battleState) {
    elements.battleState.textContent = battleUnlocked ? "已解锁" : "未解锁";
  }

  elements.autosaveToggle.checked = state.settings.autoSave;
  elements.autosaveState.textContent = state.settings.autoSave ? "开启" : "关闭";
  elements.compactToggle.checked = state.settings.compactNumbers;
  elements.compactState.textContent = state.settings.compactNumbers ? "开启" : "关闭";
  if (elements.versionLabel) {
    elements.versionLabel.textContent = `v${GAME_VERSION}`;
  }
  renderSettingsTabs();
  renderStats();
  renderMilestones();
  maybeShowForgedBladeDetails();
}

function renderActionCooldownState() {
  const rates = getRates();
  const sulfurOutcome = getSulfurClickOutcome(rates);
  const now = Date.now();
  renderSulfurMineAction(rates, sulfurOutcome, now);
  renderMetallurgyProcessButtons();
  renderMetallurgyProducts();
  renderBattleButtons();
}

function renderSulfurMineAction(rates, sulfurOutcome, now = Date.now()) {
  const sulfurMineRemainingSeconds = getCooldownRemainingSeconds("sulfurMine", now);
  const sulfurRateParts = [`+${formatNumber(sulfurOutcome.totalSulfur)} / 次`];

  if (rates.sulfurPerSecond > 0) {
    sulfurRateParts.push(`+${formatNumber(rates.sulfurPerSecond)} / 秒`);
  }
  const cooldownProgress = sulfurMineRemainingSeconds > 0 ? getActionCooldownProgress("sulfurMine", now) : 0;

  elements.sulfurRate.textContent = sulfurRateParts.join(" · ");
  elements.sulfurGain.textContent =
    sulfurMineRemainingSeconds > 0 ? "开采中" : `+${formatNumber(sulfurOutcome.totalSulfur)} 硫`;
  elements.sulfurButton.disabled = sulfurOutcome.baseSulfur <= 0 || sulfurMineRemainingSeconds > 0;
  elements.sulfurButton.classList.toggle("is-cooling", sulfurMineRemainingSeconds > 0);
  elements.sulfurButton.style.setProperty("--cooldown-progress", `${Math.round(cooldownProgress * 100)}%`);
}

function setScreen(screenName) {
  activeScreen = screenTitles[screenName] && isScreenUnlocked(screenName) ? screenName : "home";
  renderScreens();

  render();
}

function advancePassive() {
  const now = Date.now();
  const elapsed = Math.max(0, (now - lastTickAt) / 1000);
  lastTickAt = now;

  const rates = getRates();
  const completedOperations = completeReadyOperations(now);
  lastAdvanceCompletedOperations = completedOperations;
  if (elapsed <= 0) {
    return completedOperations;
  }

  let gained = 0;
  resourceIds.forEach((resource) => {
    const rate = Number(rates[`${resource}PerSecond`]) || 0;
    if (rate <= 0) {
      return;
    }
    const resourceGained = rate * elapsed;
    gainResource(resource, resourceGained);
    gained += resourceGained;
  });
  return gained + completedOperations;
}

function mineSulfur() {
  advancePassive();
  const now = Date.now();
  if (isActionCoolingDown("sulfurMine", now)) {
    render();
    return;
  }

  const rates = getRates();
  const sulfurOutcome = getSulfurClickOutcome(rates);

  if (sulfurOutcome.baseSulfur <= 0) {
    addLog("硫矿床未解锁。");
    render();
    return;
  }

  if (sulfurOutcome.converted) {
    spendCost({ mercury: sulfurOutcome.mercuryCost });
  }
  const cooldownSeconds = getSulfurMineCooldownSeconds();
  startPendingOperation("sulfurMine", cooldownSeconds, {
    baseSulfur: sulfurOutcome.baseSulfur,
    totalSulfur: sulfurOutcome.totalSulfur,
    mercuryCost: sulfurOutcome.mercuryCost,
    bonusSulfur: sulfurOutcome.bonusSulfur,
    converted: sulfurOutcome.converted,
    hadConversion: Boolean(sulfurOutcome.conversion),
  }, now);

  addLog("硫矿床开采中。");
  render();
  persistImportantChange();
}

function buyResearch(researchId) {
  advancePassive();

  const research = upgradeResearch.find((item) => item.id === researchId);
  if (!research) {
    return;
  }
  if (!isResearchUnlocked(research)) {
    addLog(`${research.name} 尚未解锁。`);
    render();
    return;
  }

  const nextLevelData = getNextLevelData(research);
  if (!nextLevelData) {
    addLog(`${research.name} 已达上限。`);
    render();
    return;
  }
  if (!canAfford(nextLevelData.cost)) {
    addLog(`${research.name} 需要 ${formatCost(nextLevelData.cost)}。`);
    render();
    return;
  }

  spendCost(nextLevelData.cost);
  state.researchLevels[research.id] = nextLevelData.level;
  if (!state.activeResearchLevels || typeof state.activeResearchLevels !== "object") {
    state.activeResearchLevels = {};
  }
  state.activeResearchLevels[research.id] = nextLevelData.level;
  refreshProgressState();
  addLog(`${research.name} 升至 Lv.${nextLevelData.level}`);
  render();
  maybeAutoSave();
}

function setResearchActiveLevel(researchId, nextLevel) {
  const research = allResearch.find((item) => item.id === researchId);
  if (!research) {
    return;
  }
  if (!isResearchToggleable(research)) {
    render();
    return;
  }

  const purchasedLevel = getResearchLevel(research.id);
  if (purchasedLevel <= 0) {
    return;
  }

  if (!state.activeResearchLevels || typeof state.activeResearchLevels !== "object") {
    state.activeResearchLevels = normalizeActiveResearchLevels(state, state.researchLevels);
  }

  const previousLevel = getActiveResearchLevel(research.id);
  const activeLevel = clampInteger(nextLevel, previousLevel, 0, purchasedLevel);
  if (activeLevel === previousLevel) {
    render();
    return;
  }

  state.activeResearchLevels[research.id] = activeLevel;
  refreshProgressState();
  addLog(`${research.name} 启用 Lv.${activeLevel}/${purchasedLevel}`);
  render();
  persistImportantChange();
}

function buildSavePayload() {
  return {
    version: SAVE_VERSION,
    state,
  };
}

function persistSave(mode = "manual") {
  try {
    state.lastSavedAt = new Date().toISOString();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(buildSavePayload()));
    if (mode === "manual") {
      setSettingsMessage("已保存到本地。");
    }
  } catch {
    setSettingsMessage("保存失败：浏览器拒绝写入。");
  }
}

function maybeAutoSave() {
  if (!state.settings.autoSave) {
    return;
  }

  const now = Date.now();
  if (now - lastAutoSaveAt < 2500) {
    return;
  }

  lastAutoSaveAt = now;
  persistSave("silent");
  render();
}

function persistImportantChange() {
  if (!state.settings.autoSave) {
    return;
  }

  lastAutoSaveAt = Date.now();
  persistSave("silent");
}

function encodeSave(text) {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function decodeSave(code) {
  const binary = atob(code);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

async function exportSave() {
  advancePassive();
  persistSave("silent");
  const code = encodeSave(JSON.stringify(buildSavePayload()));
  elements.saveCode.value = code;

  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(code);
      setSettingsMessage("存档码已导出并复制。");
      render();
      return;
    } catch {
      setSettingsMessage("存档码已导出，复制被浏览器拦截。");
      render();
      return;
    }
  }

  setSettingsMessage("存档码已导出。");
  render();
}

function importSave() {
  const code = elements.saveCode.value.trim();
  if (!code) {
    setSettingsMessage("没有可导入的存档码。");
    return;
  }

  try {
    const text = code.startsWith("{") ? code : decodeSave(code);
    const parsed = JSON.parse(text);
    clearBattleTimers();
    state = normalizeState(parsed.state || parsed);
    refreshProgressState();
    lastTickAt = Date.now();
    persistSave("silent");
    render();
    setSettingsMessage("存档已导入。");
  } catch {
    setSettingsMessage("导入失败：存档码无效。");
  }
}

function resetSave() {
  const confirmed = window.confirm("确认重置本地存档？");
  if (!confirmed) {
    return;
  }

  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Reset can still continue in memory when localStorage is unavailable.
  }

  state = createDefaultState();
  clearBattleTimers();
  refreshProgressState();
  lastTickAt = Date.now();
  elements.saveCode.value = "";
  render();
  setSettingsMessage("已重置。");
}

function setSettingsMessage(message) {
  elements.settingsMessage.textContent = message;
}

function bindEvents() {
  $$(".tab-button, .settings-shortcut").forEach((button) => {
    button.addEventListener("click", () => {
      setScreen(button.dataset.target);
    });
  });

  elements.sulfurButton.addEventListener("click", mineSulfur);
  elements.smeltButton.addEventListener("click", () => {
    runMetallurgyProcess("smelting");
  });
  elements.forgeButton.addEventListener("click", () => {
    runMetallurgyProcess("forging");
  });
  elements.metallurgySubtabs.forEach((button) => {
    button.addEventListener("click", () => {
      setMetallurgyStation(button.dataset.metallurgyTab);
    });
  });
  if (elements.metallurgyLayout) {
    elements.metallurgyLayout.addEventListener("click", (event) => {
      if (!event.target.closest("[data-forging-result-close]")) {
        return;
      }
      closeForgingResultPopover();
    });
  }
  if (elements.inscriptionPanel) {
    elements.inscriptionPanel.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-inscription-epilogue-accept]");
      if (!button) {
        return;
      }
      acceptInscriptionEpilogue();
    });
  }
  elements.settingsSubtabs.forEach((button) => {
    button.addEventListener("click", () => {
      setSettingsTab(button.dataset.settingsTab);
    });
  });
  elements.smeltingDrawerToggle.addEventListener("click", () => {
    toggleMetallurgyDrawer("smelting");
  });
  elements.forgingDrawerToggle.addEventListener("click", () => {
    toggleMetallurgyDrawer("forging");
  });
  elements.smeltingLogModeToggle.addEventListener("click", toggleSmeltingLogMode);
  [elements.smeltingResourceList, elements.forgingResourceList].forEach((listElement) => {
    listElement.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-resource][data-station]");
      if (!button) {
        return;
      }
      selectMetallurgyResource(button.dataset.station, button.dataset.resource);
    });
  });
  $$("[data-ingredient-action]").forEach((button) => {
    button.addEventListener("click", () => {
      changeIngredient(button.dataset.station, button.dataset.ingredientAction);
    });
  });
	  elements.smeltingLogList.addEventListener("click", (event) => {
	    const button = event.target.closest("button[data-record-action][data-record-id]");
	    if (!button) {
	      return;
	    }
	    if (button.dataset.recordAction === "reproduce") {
	      reproduceSmeltingRecord(button.dataset.recordId);
	    } else if (button.dataset.recordAction === "unfavorite") {
	      removeSmeltingFavorite(button.dataset.recordId);
	    } else {
	      favoriteSmeltingRecord(button.dataset.recordId);
	    }
	  });
  elements.bladeInventoryGrid.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-blade-id]");
    if (!button) {
      return;
    }
    selectBlade(button.dataset.bladeId);
  });
  if (elements.bladeDeleteButton) {
    elements.bladeDeleteButton.addEventListener("click", deleteSelectedBlade);
  }
  if (elements.bladeBatchDeleteToggle) {
    elements.bladeBatchDeleteToggle.addEventListener("click", toggleBatchDeleteMode);
  }
  if (elements.bladeBatchDeleteButton) {
    elements.bladeBatchDeleteButton.addEventListener("click", deleteBatchSelectedBlades);
  }
  if (elements.bladeFavoriteButton) {
    elements.bladeFavoriteButton.addEventListener("click", toggleSelectedBladeFavorite);
  }
  if (elements.bladeReproduceButton) {
    elements.bladeReproduceButton.addEventListener("click", reproduceSelectedBlade);
  }
  if (elements.battleCrSelect) {
    elements.battleCrSelect.addEventListener("change", () => {
      setBattleCr(elements.battleCrSelect.value);
    });
  }
  if (elements.battleFleeButton) {
    elements.battleFleeButton.addEventListener("click", fleeBattle);
  }
  if (elements.battleAutoToggle) {
    elements.battleAutoToggle.addEventListener("click", toggleBattleAuto);
  }
  if (elements.battleAttackButton) {
    elements.battleAttackButton.addEventListener("click", () => {
      performBattleAttack("手动攻击");
    });
  }
  if (elements.battleHoneButton) {
    elements.battleHoneButton.addEventListener("click", honeBattleBlade);
  }
  if (elements.battleDrawerToggle) {
    elements.battleDrawerToggle.addEventListener("click", toggleBattleDrawer);
  }
  if (elements.battleBladeBatchDeleteToggle) {
    elements.battleBladeBatchDeleteToggle.addEventListener("click", toggleBatchDeleteMode);
  }
  if (elements.battleBladeBatchDeleteButton) {
    elements.battleBladeBatchDeleteButton.addEventListener("click", deleteBatchSelectedBlades);
  }
  if (elements.battleBladeFavoriteButton) {
    elements.battleBladeFavoriteButton.addEventListener("click", () => {
      toggleSelectedBladeFavorite("battle");
    });
  }
  if (elements.battleBladeDeleteButton) {
    elements.battleBladeDeleteButton.addEventListener("click", () => {
      deleteSelectedBlade("battle");
    });
  }
  if (elements.battleLayout) {
    elements.battleLayout.addEventListener("click", (event) => {
      const button = event.target.closest("[data-battle-blade-info]");
      if (!button) {
        return;
      }
      const shouldOpen = button.dataset.battleBladeInfo === "toggle" ? !battleUi.bladeInfoOpen : false;
      if (shouldOpen && !battleUi.bladeInfoOpen) {
        battleUi.bladeInfoScrollTop = 0;
      }
      battleUi.bladeInfoOpen = shouldOpen;
      renderBattleSelectedBlade();
      renderBattleBladeInfoOverlay();
    });
  }
  if (elements.battleBladeList) {
    elements.battleBladeList.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-battle-blade-id]");
      if (!button) {
        return;
      }
      selectBattleBlade(button.dataset.battleBladeId);
    });
  }
  elements.availableResearchList.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-research-upgrade]");
    if (!button) {
      return;
    }
    buyResearch(button.dataset.researchUpgrade);
  });
  elements.ownedResearchList.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-research-active][data-research-level]");
    if (!button) {
      return;
    }
    setResearchActiveLevel(button.dataset.researchActive, button.dataset.researchLevel);
  });
  $$(".research-section-toggle").forEach((button) => {
    button.addEventListener("click", () => {
      const sectionKey = button.dataset.sectionToggle;
      collapsedResearchSections[sectionKey] = !collapsedResearchSections[sectionKey];
      renderResearchSectionToggles();
    });
  });

  elements.autosaveToggle.addEventListener("change", () => {
    state.settings.autoSave = elements.autosaveToggle.checked;
    setSettingsMessage(state.settings.autoSave ? "自动保存开启。" : "自动保存关闭。");
    render();
    persistSave("silent");
  });

  elements.compactToggle.addEventListener("change", () => {
    state.settings.compactNumbers = elements.compactToggle.checked;
    setSettingsMessage(state.settings.compactNumbers ? "紧凑数字开启。" : "紧凑数字关闭。");
    render();
    persistSave("silent");
  });

  elements.saveButton.addEventListener("click", () => {
    advancePassive();
    persistSave("manual");
    render();
  });
  elements.exportButton.addEventListener("click", exportSave);
  elements.importButton.addEventListener("click", importSave);
  elements.resetButton.addEventListener("click", resetSave);
}

const loadedOperationCompletions = completeReadyOperations(Date.now());
if (loadedOperationCompletions > 0) {
  persistImportantChange();
}

bindEvents();
render();

setInterval(() => {
  const gained = advancePassive();
  const now = Date.now();
  const cooldownActive = hasActiveCooldown(now);
  const completedOperation = lastAdvanceCompletedOperations > 0;
  const shouldRenderPassive = gained > 0 && now - lastPassiveRenderAt >= 1000;
  const shouldCheckAutosave = gained > 0 && now - lastPassiveAutosaveCheckAt >= 1000;

  if (completedOperation || shouldRenderPassive) {
    render();
    lastPassiveRenderAt = now;
  } else if (cooldownActive || cooldownWasActive) {
    renderActionCooldownState();
  }
  if (completedOperation) {
    lastPassiveAutosaveCheckAt = now;
    persistImportantChange();
  } else if (shouldCheckAutosave) {
    lastPassiveAutosaveCheckAt = now;
    maybeAutoSave();
  }
  cooldownWasActive = cooldownActive;
}, 100);
