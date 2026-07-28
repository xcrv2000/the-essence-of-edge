const forgingFormula = window.ForgingFormula;
const bladeNaming = window.BladeNaming;
const battleFormula = window.BattleFormula;

if (!forgingFormula) {
  throw new Error("Missing forgingFormula.js");
}
if (!bladeNaming) {
  throw new Error("Missing bladeNaming.js");
}
if (!battleFormula) {
  throw new Error("Missing battleFormula.js");
}

const metalIds = forgingFormula.metalIds;
const statIds = forgingFormula.statIds;
const metalLabels = forgingFormula.metalLabels;
const statLabels = forgingFormula.statLabels;
const DEBUG_MODE_STORAGE_KEY = "blade-essence-forging-debug-mode-v1";
const BATTLE_TOOLBOX_STORAGE_KEY = "blade-essence-battle-debug-toolbox-v1";
const BATTLE_LOG_LIMIT = 80;
const debugModeIds = ["forging", "battle", "inscription"];
const manualPresets = [
  { label: "100铁", inputs: { iron: 100 } },
  { label: "80铁20铜", inputs: { iron: 80, copper: 20 } },
  { label: "95铁5金", inputs: { iron: 95, gold: 5 } },
  { label: "六金属各10", inputs: { lead: 10, tin: 10, copper: 10, iron: 10, silver: 10, gold: 10 } },
];
const simulationPresets = [
  {
    label: "自由100",
    total: 100,
    mode: "distribution",
    constraints: {},
  },
  {
    label: "2属性随机模拟",
    total: 100,
    mode: "two-attribute-random",
    constraints: {},
  },
  {
    label: "3属性随机模拟",
    total: 100,
    mode: "three-attribute-random",
    constraints: {},
  },
  {
    label: "4属性随机模拟",
    total: 100,
    mode: "four-attribute-random",
    constraints: {},
  },
  {
    label: "5属性随机模拟",
    total: 100,
    mode: "five-attribute-random",
    constraints: {},
  },
  {
    label: "6属性随机模拟",
    total: 100,
    mode: "six-attribute-random",
    constraints: {},
  },
  {
    label: "铁银余量",
    total: 100,
    mode: "single-fill",
    constraints: {
      iron: [70, 80],
      silver: [10, 15],
    },
  },
  {
    label: "铁95金5",
    total: 100,
    mode: "distribution",
    constraints: {
      iron: [95, 95],
      gold: [5, 5],
    },
  },
  {
    label: "六金属5-40",
    total: 120,
    mode: "distribution",
    constraints: Object.fromEntries(metalIds.map((metal) => [metal, [5, 40]])),
  },
  {
    label: "三金属70%",
    total: 100,
    mode: "three-metal-70",
    constraints: {},
  },
];
const activeMetalCountBySimulationMode = {
  "two-attribute-random": 2,
  "three-attribute-random": 3,
  "four-attribute-random": 4,
  "five-attribute-random": 5,
  "six-attribute-random": 6,
};
const rankingMetricIds = ["total", ...statIds];
const rankingMetricLabels = {
  total: "属性总和",
  ...Object.fromEntries(statIds.map((stat) => [stat, statLabels[stat]])),
};
const simulationComparisonOptions = [
  { value: "gt", label: ">" },
  { value: "gte", label: ">=" },
  { value: "eq", label: "=" },
  { value: "lte", label: "<=" },
  { value: "lt", label: "<" },
];
const inscriptionEraseValue = "__erase";
const inscriptionOuterNodeConfigs = statIds.map((stat, index) => ({
  id: `outer-${index}`,
  label: statLabels[stat],
  stat,
  index,
}));
const inscriptionNodeConfigs = [
  ...inscriptionOuterNodeConfigs,
  {
    id: "center",
    label: "铭心",
    stat: null,
    index: 6,
  },
];
const inscriptionEdgeConfigs = [
  ...Array.from({ length: 6 }, (_, index) => ({
    id: `ring-${index}`,
    label: `环 ${index + 1}`,
    type: "ring",
    from: `outer-${index}`,
    to: `outer-${(index + 1) % 6}`,
    stat: statIds[index],
    index,
  })),
  ...Array.from({ length: 6 }, (_, index) => ({
    id: `spoke-${index}`,
    label: `辐 ${index + 1}`,
    type: "spoke",
    from: "center",
    to: `outer-${index}`,
    stat: statIds[index],
    index,
  })),
];
const inscriptionNodeIds = inscriptionNodeConfigs.map((node) => node.id);
const inscriptionEdgeIds = inscriptionEdgeConfigs.map((edge) => edge.id);
const inscriptionCostResourceOrder = ["salt", ...metalIds];
const inscriptionMetalEffectTexts = {
  lead: "承压与固定，优先把结构解释为耐久、稳定、抗损耗。",
  tin: "修补与延展，优先把结构解释为磨刃收益、损耗缓冲。",
  copper: "切割与传热，优先把结构解释为锋利、破甲、直接伤害。",
  iron: "刚骨与武备，优先把结构解释为硬度、韧性、抗崩裂。",
  silver: "导通与映照，优先把结构解释为导能触发、异常传导。",
  gold: "定约与统合，优先把结构解释为中心放大、导能容量。",
};
const inscriptionMetalColors = {
  lead: "#3f5868",
  tin: "#8f8a80",
  copper: "#39a783",
  iron: "#b4573f",
  silver: "#d8edf0",
  gold: "#f0b35a",
};
const inscriptionMetalPreferenceStats = {
  lead: "stability",
  tin: "durability",
  copper: "sharpness",
  iron: "hardness",
  silver: "conductivity",
  gold: "toughness",
};
const inscriptionMainShapePatterns = [
  { pattern: "100000", label: "1面 · 单" },
  { pattern: "110000", label: "2面 · 邻" },
  { pattern: "101000", label: "2面 · 间" },
  { pattern: "100100", label: "2面 · 对" },
  { pattern: "111000", label: "3面 · 连" },
  { pattern: "110100", label: "3面 · 偏" },
  { pattern: "101010", label: "3面 · 均" },
  { pattern: "111100", label: "4面 · 连" },
  { pattern: "111010", label: "4面 · 偏" },
  { pattern: "110110", label: "4面 · 均" },
  { pattern: "111110", label: "5面 · 缺一" },
  { pattern: "111111", label: "6面 · 全" },
];
const inscriptionEdgeHitTolerancePx = 18;

const elements = {
  debugModeTabs: Array.from(document.querySelectorAll("[data-debug-mode]")),
  debugPanels: Array.from(document.querySelectorAll("[data-debug-panel]")),
  modeTabs: Array.from(document.querySelectorAll("[data-input-mode]")),
  inputPanels: Array.from(document.querySelectorAll("[data-input-panel]")),
  manualInputs: document.querySelector("#manual-metal-inputs"),
  manualPresets: document.querySelector("#manual-presets"),
  resetManualButton: document.querySelector("#reset-manual-button"),
  forgeOnceButton: document.querySelector("#forge-once-button"),
  baseTable: document.querySelector("#base-table"),
  exportSettingsButton: document.querySelector("#export-settings-button"),
  resetBaseTableButton: document.querySelector("#reset-base-table-button"),
  modifierTable: document.querySelector("#modifier-table"),
  resetModifierTableButton: document.querySelector("#reset-modifier-table-button"),
  majorExponentInput: document.querySelector("#major-exponent-input"),
  modifierExponentInput: document.querySelector("#modifier-exponent-input"),
  resetCurveParametersButton: document.querySelector("#reset-curve-parameters-button"),
  performanceTable: document.querySelector("#performance-table"),
  resetPerformanceTableButton: document.querySelector("#reset-performance-table-button"),
  entropyTable: document.querySelector("#entropy-table"),
  resetEntropyTableButton: document.querySelector("#reset-entropy-table-button"),
  currentSummary: document.querySelector("#current-summary"),
  currentResult: document.querySelector("#current-result"),
  simulationTotal: document.querySelector("#simulation-total"),
  simulationCount: document.querySelector("#simulation-count"),
  simulationMode: document.querySelector("#simulation-mode"),
  simulationFilterMetric: document.querySelector("#simulation-filter-metric"),
  simulationFilterMin: document.querySelector("#simulation-filter-min"),
  simulationSortMetric: document.querySelector("#simulation-sort-metric"),
  simulationConditionGrid: document.querySelector("#simulation-condition-grid"),
  applySimulationFilterButton: document.querySelector("#apply-simulation-filter-button"),
  constraintSection: document.querySelector(".constraint-section"),
  constraintGrid: document.querySelector("#constraint-grid"),
  simulationPresets: document.querySelector("#simulation-presets"),
  runSimulationButton: document.querySelector("#run-simulation-button"),
  simulationMessage: document.querySelector("#simulation-message"),
  clearLogButton: document.querySelector("#clear-log-button"),
  forgeLog: document.querySelector("#forge-log"),
  battleCurrentSummary: document.querySelector("#battle-current-summary"),
  battleAutoState: document.querySelector("#battle-auto-state"),
  battleBladeEditor: document.querySelector("#battle-blade-editor"),
  battleBladeEditorRadar: document.querySelector("#battle-blade-editor-radar"),
  battleEnemyCurrent: document.querySelector("#battle-enemy-current"),
  battleEnemyInputs: document.querySelector("#battle-enemy-inputs"),
  battleEnemyMode: document.querySelector("#battle-enemy-mode"),
  battleEnemyIncrementInputs: document.querySelector("#battle-enemy-increment-inputs"),
  battleEnemySequence: document.querySelector("#battle-enemy-sequence"),
  battleEnemyGeneratorInputs: document.querySelector("#battle-enemy-generator-inputs"),
  battleGenerateEnemyButton: document.querySelector("#battle-generate-enemy-button"),
  battleExportEnemyGeneratorButton: document.querySelector("#battle-export-enemy-generator-button"),
  battleEnemyGeneratorOutput: document.querySelector("#battle-enemy-generator-output"),
  battleParamInputs: document.querySelector("#battle-param-inputs"),
  battleKHelp: document.querySelector("#battle-k-help"),
  battleFormulaPreview: document.querySelector("#battle-formula-preview"),
  battleExportConfigButton: document.querySelector("#battle-export-config-button"),
  battleMaintenanceEnabled: document.querySelector("#battle-maintenance-enabled"),
  battleMaintenanceInputs: document.querySelector("#battle-maintenance-inputs"),
  battleMaintenanceFullHone: document.querySelector("#battle-maintenance-full-hone"),
  battleManualAttackButton: document.querySelector("#battle-manual-attack-button"),
  battleAutoToggleButton: document.querySelector("#battle-auto-toggle-button"),
  battleHoneButton: document.querySelector("#battle-hone-button"),
  battleResetCurrentButton: document.querySelector("#battle-reset-current-button"),
  battleSimOnceButton: document.querySelector("#battle-sim-once-button"),
  battleSim10Button: document.querySelector("#battle-sim-10-button"),
  battleSim100Button: document.querySelector("#battle-sim-100-button"),
  battleOutcomeNote: document.querySelector("#battle-outcome-note"),
  battleStateOutput: document.querySelector("#battle-state-output"),
  battleRadarOutput: document.querySelector("#battle-radar-output"),
  battleLifetimeOutput: document.querySelector("#battle-lifetime-output"),
  battleClearLogButton: document.querySelector("#battle-clear-log-button"),
  battleLog: document.querySelector("#battle-log"),
  battleRuleOutput: document.querySelector("#battle-rule-output"),
  battleToolboxSummary: document.querySelector("#battle-toolbox-summary"),
  battleImportForgeButton: document.querySelector("#battle-import-forge-button"),
  battleNewBladeButton: document.querySelector("#battle-new-blade-button"),
  battleDuplicateBladeButton: document.querySelector("#battle-duplicate-blade-button"),
  battleRenameBladeButton: document.querySelector("#battle-rename-blade-button"),
  battleDeleteBladeButton: document.querySelector("#battle-delete-blade-button"),
  battleDeleteSelectedButton: document.querySelector("#battle-delete-selected-button"),
  battleToolboxList: document.querySelector("#battle-toolbox-list"),
  inscriptionCurrentSummary: document.querySelector("#inscription-current-summary"),
  inscriptionBladeSummary: document.querySelector("#inscription-blade-summary"),
  inscriptionToolboxSummary: document.querySelector("#inscription-toolbox-summary"),
  inscriptionImportForgeButton: document.querySelector("#inscription-import-forge-button"),
  inscriptionNewBladeButton: document.querySelector("#inscription-new-blade-button"),
  inscriptionDuplicateBladeButton: document.querySelector("#inscription-duplicate-blade-button"),
  inscriptionRenameBladeButton: document.querySelector("#inscription-rename-blade-button"),
  inscriptionDeleteBladeButton: document.querySelector("#inscription-delete-blade-button"),
  inscriptionDeleteSelectedButton: document.querySelector("#inscription-delete-selected-button"),
  inscriptionToolboxList: document.querySelector("#inscription-toolbox-list"),
  inscriptionWireTray: document.querySelector("#inscription-wire-tray"),
  inscriptionGraph: document.querySelector("#inscription-graph"),
  inscriptionPriceOutput: document.querySelector("#inscription-price-output"),
  inscriptionEffectOutput: document.querySelector("#inscription-effect-output"),
};

const initialBaseTable = cloneFormulaTable(forgingFormula.baseTable);
const initialModifierTable = cloneFormulaTable(forgingFormula.modifierTable);
const initialStatPerformanceTable = cloneStatPerformanceTable(forgingFormula.statPerformanceTable);
const initialEntropyPenaltyTable = cloneEntropyPenaltyTable(forgingFormula.entropyPenaltyTable);
const initialFormulaParameters = cloneFormulaParameters(forgingFormula.formulaParameters);
const editableTables = {
  base: cloneFormulaTable(initialBaseTable),
  modifier: cloneFormulaTable(initialModifierTable),
};
let editableStatPerformanceTable = cloneStatPerformanceTable(initialStatPerformanceTable);
let editableEntropyPenaltyTable = cloneEntropyPenaltyTable(initialEntropyPenaltyTable);
let editableFormulaParameters = cloneFormulaParameters(initialFormulaParameters);

let forgeLogEntries = [];
let latestSimulationResult = null;
let currentResultMode = "empty";
let latestManualDetails = null;
let debugMode = "forging";
let battleToolbox = loadBattleToolbox();
let selectedBattleBladeId = battleToolbox[0]?.id || null;
let battleSelectedDeleteIds = new Set();
let battleLogEntries = [];
let battleAutoTimer = null;
let battleHoneTimer = null;
let currentBattleEnemy = battleFormula.normalizeEnemy(battleFormula.defaultEnemy);
let battleKills = 0;
let battleSalt = 0;
let battleAttacks = 0;
let battleHones = 0;
let lastBattleContextPauseReason = null;
let inscriptionGesture = {
  selectedTool: metalIds[0],
  pointerId: null,
  dragging: false,
  appliedEdgeIds: new Set(),
};

function createMetalRecord(defaultValue = 0) {
  return Object.fromEntries(metalIds.map((metal) => [metal, defaultValue]));
}

function createStatRecord(defaultValue = 0) {
  return Object.fromEntries(statIds.map((stat) => [stat, defaultValue]));
}

function cloneFormulaTable(tableData) {
  return Object.fromEntries(
    metalIds.map((metal) => [
      metal,
      Object.fromEntries(statIds.map((stat) => [stat, Number(tableData[metal][stat]) || 0])),
    ]),
  );
}

function cloneStatPerformanceTable(tableData) {
  return Object.fromEntries(statIds.map((stat) => [stat, Number(tableData[stat]) || 0]));
}

function cloneEntropyPenaltyTable(tableData) {
  return Object.fromEntries(
    metalIds.map((_, index) => {
      const activeMetalCount = index + 1;
      const value = Number(tableData?.[activeMetalCount]);
      return [activeMetalCount, Number.isFinite(value) && value > 0 ? value : forgingFormula.factorial(index)];
    }),
  );
}

function cloneFormulaParameters(parameters) {
  return forgingFormula.normalizeFormulaParameters(parameters);
}

function getFormulaOptions() {
  return {
    baseTable: editableTables.base,
    modifierTable: editableTables.modifier,
    statPerformanceTable: editableStatPerformanceTable,
    entropyPenaltyTable: editableEntropyPenaltyTable,
    formulaParameters: editableFormulaParameters,
  };
}

function calculateDetails(inputs) {
  return forgingFormula.calculateDetails(inputs, getFormulaOptions());
}

function formatInputValue(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return "0";
  }
  return Number.isInteger(number) ? String(number) : String(Number(number.toFixed(4)));
}

function formatInteger(value) {
  return Math.floor(Number(value) || 0).toLocaleString("zh-CN");
}

function formatDecimal(value, digits = 3) {
  const number = Number(value) || 0;
  return number.toLocaleString("zh-CN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  });
}

function formatPercent(value) {
  return `${formatDecimal((Number(value) || 0) * 100, 1)}%`;
}

function formatInputBundle(inputs, ratios = null) {
  const entries = metalIds
    .map((metal) => [metal, Math.floor(Number(inputs[metal]) || 0)])
    .filter(([, amount]) => amount > 0);

  if (entries.length === 0) {
    return "未投料";
  }

  return entries
    .map(([metal, amount]) => {
      const ratioText = ratios ? `（${formatPercent(ratios[metal])}）` : "";
      return `${metalLabels[metal]} ${formatInteger(amount)}${ratioText}`;
    })
    .join(" / ");
}

function getMetricLabel(metric) {
  return rankingMetricLabels[metric] || metric;
}

function calculateStatTotal(stats) {
  return statIds.reduce((sum, stat) => sum + (Number(stats[stat]) || 0), 0);
}

function getSampleMetric(sample, metric) {
  if (metric === "total") {
    return Number(sample.statTotal) || calculateStatTotal(sample.stats);
  }
  return Number(sample.stats?.[metric]) || 0;
}

function createCell(content, tagName = "td") {
  const cell = document.createElement(tagName);
  if (content && typeof content === "object" && "nodeType" in content) {
    cell.append(content);
  } else {
    cell.textContent = content;
  }
  return cell;
}

function createTable(headers, rows) {
  const table = document.createElement("table");
  const thead = document.createElement("thead");
  const tbody = document.createElement("tbody");
  const headRow = document.createElement("tr");

  headers.forEach((header) => {
    headRow.append(createCell(header, "th"));
  });
  thead.append(headRow);

  rows.forEach((row) => {
    const tableRow = document.createElement("tr");
    row.forEach((value) => {
      tableRow.append(createCell(value));
    });
    tbody.append(tableRow);
  });

  table.append(thead, tbody);
  return table;
}

function renderEditableMatrixTable(container, tableKey) {
  const tableData = editableTables[tableKey];
  const table = document.createElement("table");
  table.className = "editable-matrix";
  const thead = document.createElement("thead");
  const tbody = document.createElement("tbody");
  const headRow = document.createElement("tr");

  const checkLabel = tableKey === "base" ? "校验和" : "校验积";
  ["金属", ...statIds.map((stat) => statLabels[stat]), checkLabel].forEach((header) => {
    headRow.append(createCell(header, "th"));
  });
  thead.append(headRow);

  metalIds.forEach((metal) => {
    const row = document.createElement("tr");
    row.append(createCell(metalLabels[metal]));

    statIds.forEach((stat) => {
      const cell = document.createElement("td");
      const input = document.createElement("input");
      input.className = "matrix-input";
      input.type = "number";
      input.step = "0.1";
      input.value = formatInputValue(tableData[metal][stat]);
      input.dataset.formulaTable = tableKey;
      input.dataset.tableMetal = metal;
      input.dataset.tableStat = stat;
      cell.append(input);
      row.append(cell);
    });

    const checkCell = createCell(formatDecimal(getMatrixCheckValue(tableKey, metal), 4));
    checkCell.className = "matrix-check mono";
    checkCell.dataset.tableCheck = tableKey;
    row.append(checkCell);

    tbody.append(row);
  });

  table.append(thead, tbody);
  container.replaceChildren(table);
}

function getMatrixCheckValue(tableKey, metal) {
  const values = statIds.map((stat) => Number(editableTables[tableKey][metal][stat]) || 0);
  if (tableKey === "base") {
    return values.reduce((sum, value) => sum + value, 0);
  }
  return values.reduce((product, value) => product * value, 1);
}

function updateMatrixCheckCell(input) {
  const row = input.closest("tr");
  const checkCell = row?.querySelector("[data-table-check]");
  if (!checkCell) {
    return;
  }
  checkCell.textContent = formatDecimal(getMatrixCheckValue(input.dataset.formulaTable, input.dataset.tableMetal), 4);
}

function renderPerformanceTable() {
  const table = document.createElement("table");
  table.className = "editable-matrix performance-matrix";
  const thead = document.createElement("thead");
  const tbody = document.createElement("tbody");
  const headRow = document.createElement("tr");

  statIds.map((stat) => statLabels[stat]).forEach((header) => {
    headRow.append(createCell(header, "th"));
  });
  thead.append(headRow);

  const row = document.createElement("tr");
  statIds.forEach((stat) => {
    const cell = document.createElement("td");
    const input = document.createElement("input");
    input.className = "matrix-input";
    input.type = "number";
    input.step = "0.1";
    input.value = formatInputValue(editableStatPerformanceTable[stat]);
    input.dataset.performanceStat = stat;
    cell.append(input);
    row.append(cell);
  });
  tbody.append(row);

  table.append(thead, tbody);
  elements.performanceTable.replaceChildren(table);
}

function renderEntropyPenaltyTable() {
  const table = document.createElement("table");
  table.className = "editable-matrix entropy-matrix";
  const thead = document.createElement("thead");
  const tbody = document.createElement("tbody");
  const headRow = document.createElement("tr");

  metalIds.map((_, index) => `有效${index + 1}`).forEach((header) => {
    headRow.append(createCell(header, "th"));
  });
  thead.append(headRow);

  const row = document.createElement("tr");
  metalIds.forEach((_, index) => {
    const activeMetalCount = index + 1;
    const cell = document.createElement("td");
    const input = document.createElement("input");
    input.className = "matrix-input";
    input.type = "number";
    input.min = "0.0001";
    input.step = "0.1";
    input.value = formatInputValue(editableEntropyPenaltyTable[activeMetalCount]);
    input.dataset.entropyCount = String(activeMetalCount);
    cell.append(input);
    row.append(cell);
  });
  tbody.append(row);

  table.append(thead, tbody);
  elements.entropyTable.replaceChildren(table);
}

function syncCurveParameterInputs() {
  elements.majorExponentInput.value = formatInputValue(editableFormulaParameters.majorExponent);
  elements.modifierExponentInput.value = formatInputValue(editableFormulaParameters.modifierExponent);
}

function renderManualInputs() {
  elements.manualInputs.replaceChildren(
    ...metalIds.map((metal) => {
      const row = document.createElement("label");
      row.className = "metal-input-row";

      const label = document.createElement("strong");
      label.textContent = metalLabels[metal];

      const input = document.createElement("input");
      input.type = "number";
      input.min = "0";
      input.step = "1";
      input.value = "0";
      input.dataset.manualMetal = metal;

      row.append(label, input);
      return row;
    }),
  );
}

function renderConstraintInputs() {
  elements.constraintGrid.replaceChildren(
    ...metalIds.map((metal) => {
      const row = document.createElement("div");
      row.className = "constraint-row";

      const label = document.createElement("strong");
      label.textContent = metalLabels[metal];

      const minLabel = document.createElement("label");
      const minText = document.createElement("span");
      minText.textContent = "min";
      const minInput = document.createElement("input");
      minInput.type = "number";
      minInput.min = "0";
      minInput.max = "100";
      minInput.step = "1";
      minInput.value = "0";
      minInput.dataset.constraintMetal = metal;
      minInput.dataset.constraintBound = "min";
      minLabel.append(minText, minInput);

      const maxLabel = document.createElement("label");
      const maxText = document.createElement("span");
      maxText.textContent = "max";
      const maxInput = document.createElement("input");
      maxInput.type = "number";
      maxInput.min = "0";
      maxInput.max = "100";
      maxInput.step = "1";
      maxInput.value = "100";
      maxInput.dataset.constraintMetal = metal;
      maxInput.dataset.constraintBound = "max";
      maxLabel.append(maxText, maxInput);

      row.append(label, minLabel, maxLabel);
      return row;
    }),
  );
}

function renderPresetButtons(container, presets, handler) {
  container.replaceChildren(
    ...presets.map((preset) => {
      const button = document.createElement("button");
      button.className = "secondary-action";
      button.type = "button";
      button.textContent = preset.label;
      button.addEventListener("click", () => handler(preset));
      return button;
    }),
  );
}

function getManualInputs() {
  const inputs = createMetalRecord();
  document.querySelectorAll("[data-manual-metal]").forEach((input) => {
    inputs[input.dataset.manualMetal] = Math.max(0, Math.floor(Number(input.value) || 0));
  });
  return inputs;
}

function setManualInputs(inputs) {
  document.querySelectorAll("[data-manual-metal]").forEach((input) => {
    input.value = Math.max(0, Math.floor(Number(inputs[input.dataset.manualMetal]) || 0));
  });
}

function resetManualInputs() {
  setManualInputs(createMetalRecord());
  latestManualDetails = null;
  elements.currentSummary.textContent = "尚未运行。";
  elements.currentResult.className = "result-body empty-state";
  elements.currentResult.textContent = "在左侧选择模式并运行。";
}

function renderDetails(container, details, options = {}) {
  const showBreakdown = options.showBreakdown ?? true;
  const summaryStrip = document.createElement("div");
  summaryStrip.className = "summary-strip";
  [
    `总量 ${formatInteger(details.totalAmount)}`,
    `金属种类 ${formatInteger(details.activeMetalCount)}`,
    `有效基底 ${formatDecimal(details.effectiveMetalCount, 3)}`,
    `高熵系数 ${formatDecimal(details.entropyPenalty, 4)}`,
    `基底指数 ${formatDecimal(details.majorExponent, 3)}`,
    `掺杂指数 ${formatDecimal(details.modifierExponent, 3)}`,
    `log(total) ${formatDecimal(details.quantityScale, 5)}`,
    formatInputBundle(details.inputs, details.ratios),
  ].forEach((item) => {
    const chip = document.createElement("span");
    chip.textContent = item;
    summaryStrip.append(chip);
  });
  summaryStrip.append(
    createExportToBattleButton({
      inputs: details.inputs,
      stats: details.stats,
      sourceTitle: "手动锻造",
    }),
  );

  const statGrid = document.createElement("div");
  statGrid.className = "stat-grid";
  statIds.forEach((stat) => {
    const tile = document.createElement("div");
    tile.className = "stat-tile";
    const label = document.createElement("small");
    label.textContent = statLabels[stat];
    const value = document.createElement("strong");
    value.textContent = formatInteger(details.stats[stat]);
    const raw = document.createElement("small");
    raw.textContent = `raw ${formatDecimal(details.statDetails[stat].raw, 4)}`;
    tile.append(label, value, raw);
    statGrid.append(tile);
  });

  const children = [summaryStrip, statGrid, createStatSummaryTable(details)];
  if (options.showRadar ?? true) {
    children.splice(1, 0, createRadarChart(details));
  }

  if (showBreakdown) {
    statIds.forEach((stat) => {
      children.push(createStatBreakdown(details, stat));
    });
  }

  container.classList.remove("empty-state");
  container.replaceChildren(...children);
}

function createRadarChart(details) {
  const wrap = document.createElement("div");
  wrap.className = "radar-card";
  const title = document.createElement("div");
  title.className = "radar-title";
  const maxStat = Math.max(1, ...statIds.map((stat) => details.stats[stat]));
  title.innerHTML = `<strong>六属性雷达</strong><small>外圈 ${formatInteger(maxStat)}</small>`;

  const size = 240;
  const center = size / 2;
  const radius = 76;
  const labelRadius = 100;
  const points = statIds.map((stat, index) => {
    const angle = -Math.PI / 2 + (index * Math.PI * 2) / statIds.length;
    const valueRatio = Math.max(0, details.stats[stat]) / maxStat;
    return {
      stat,
      angle,
      value: details.stats[stat],
      x: center + Math.cos(angle) * radius * valueRatio,
      y: center + Math.sin(angle) * radius * valueRatio,
      outerX: center + Math.cos(angle) * radius,
      outerY: center + Math.sin(angle) * radius,
      labelX: center + Math.cos(angle) * labelRadius,
      labelY: center + Math.sin(angle) * labelRadius,
    };
  });
  const polygonPoints = points.map((point) => `${point.x},${point.y}`).join(" ");
  const outerPoints = points.map((point) => `${point.outerX},${point.outerY}`).join(" ");

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", `0 0 ${size} ${size}`);
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", "六属性雷达图");

  [0.33, 0.66, 1].forEach((scale) => {
    const ring = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
    ring.setAttribute(
      "points",
      points
        .map((point) => `${center + Math.cos(point.angle) * radius * scale},${center + Math.sin(point.angle) * radius * scale}`)
        .join(" "),
    );
    ring.setAttribute("class", "radar-ring");
    svg.append(ring);
  });

  points.forEach((point) => {
    const axis = document.createElementNS("http://www.w3.org/2000/svg", "line");
    axis.setAttribute("x1", String(center));
    axis.setAttribute("y1", String(center));
    axis.setAttribute("x2", String(point.outerX));
    axis.setAttribute("y2", String(point.outerY));
    axis.setAttribute("class", "radar-axis");
    svg.append(axis);
  });

  const outer = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
  outer.setAttribute("points", outerPoints);
  outer.setAttribute("class", "radar-outer");
  svg.append(outer);

  const shape = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
  shape.setAttribute("points", polygonPoints);
  shape.setAttribute("class", "radar-shape");
  svg.append(shape);

  points.forEach((point) => {
    const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    dot.setAttribute("cx", String(point.x));
    dot.setAttribute("cy", String(point.y));
    dot.setAttribute("r", "3.2");
    dot.setAttribute("class", "radar-dot");
    svg.append(dot);

    const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
    label.setAttribute("x", String(point.labelX));
    label.setAttribute("y", String(point.labelY));
    label.setAttribute("class", "radar-label");
    label.setAttribute("text-anchor", point.labelX < center - 8 ? "end" : point.labelX > center + 8 ? "start" : "middle");
    label.textContent = `${statLabels[point.stat]} ${formatInteger(point.value)}`;
    svg.append(label);
  });

  wrap.append(title, svg);
  return wrap;
}

function createStatSummaryTable(details) {
  const wrap = document.createElement("div");
  wrap.className = "table-wrap";
  const rows = statIds.map((stat) => {
    const statDetail = details.statDetails[stat];
    return [
      statLabels[stat],
      formatDecimal(statDetail.major, 5),
      formatDecimal(statDetail.modifier, 5),
      formatDecimal(statDetail.entropyPenalty, 4),
      formatDecimal(statDetail.statPerformance, 3),
      formatDecimal(statDetail.raw, 5),
      formatInteger(statDetail.final),
    ];
  });
  wrap.append(createTable(["属性", "major", "modifier", "高熵系数", "修正", "raw", "final"], rows));
  return wrap;
}

function createStatBreakdown(details, stat) {
  const detail = document.createElement("details");
  detail.open = stat === "sharpness";

  const summary = document.createElement("summary");
  const statDetail = details.statDetails[stat];
  summary.textContent = `${statLabels[stat]}：floor(${formatDecimal(statDetail.major, 4)} * ${formatDecimal(
    statDetail.modifier,
    4,
  )} / ${formatDecimal(statDetail.entropyPenalty, 4)} * ${formatDecimal(statDetail.statPerformance, 3)} * log(${formatInteger(
    details.totalAmount,
  )})) = ${formatInteger(statDetail.final)}`;

  const tableWrap = document.createElement("div");
  tableWrap.className = "table-wrap";
  const rows = statDetail.metals.map((metal) => [
    metalLabels[metal.resource],
    formatInteger(metal.amount),
    formatPercent(metal.ratio),
    formatDecimal(metal.baseValue, 3),
    formatDecimal(metal.baseCurve, 6),
    formatDecimal(metal.majorShare, 6),
    formatDecimal(metal.majorContribution, 6),
    formatDecimal(metal.modifierValue, 3),
    formatDecimal(metal.modifierCurve, 6),
    formatDecimal(metal.modifierContribution, 6),
  ]);

  tableWrap.append(
    createTable(
      [
        "金属",
        "数量",
        "ratio",
        "基底表值",
        "基底原曲线",
        "major系数",
        "major贡献",
        "掺杂表值",
        "掺杂曲线",
        "modifier贡献",
      ],
      rows,
    ),
  );

  detail.append(summary, tableWrap);
  return detail;
}

function forgeOnce() {
  const inputs = getManualInputs();
  const details = calculateDetails(inputs);
  if (details.totalAmount <= 0) {
    elements.currentSummary.textContent = "未投料，无法锻造。";
    return;
  }

  const time = new Date();
  latestManualDetails = details;
  elements.currentSummary.textContent = `${time.toLocaleTimeString("zh-CN", { hour12: false })} · ${formatInputBundle(
    details.inputs,
    details.ratios,
  )}`;
  currentResultMode = "manual";
  renderDetails(elements.currentResult, details, { showBreakdown: true });

  forgeLogEntries = [
    {
      type: "manual",
      title: `手动锻造 · ${time.toLocaleTimeString("zh-CN", { hour12: false })}`,
      subtitle: formatInputBundle(details.inputs, details.ratios),
      details,
    },
    ...forgeLogEntries,
  ];
  renderForgeLog();
}

function renderForgeLog() {
  if (forgeLogEntries.length === 0) {
    elements.forgeLog.className = "forge-log empty-state";
    elements.forgeLog.textContent = "暂无记录。";
    return;
  }

  elements.forgeLog.className = "forge-log";
  elements.forgeLog.replaceChildren(
    ...forgeLogEntries.map((entry) => {
      const wrapper = document.createElement("article");
      wrapper.className = "log-entry";

      const head = document.createElement("div");
      head.className = "log-entry-head";
      const copy = document.createElement("div");
      const title = document.createElement("strong");
      title.textContent = entry.title;
      const subtitle = document.createElement("small");
      subtitle.textContent = entry.subtitle;
      copy.append(title, subtitle);
      const tag = document.createElement("small");
      tag.className = "mono";
      tag.textContent = entry.type === "manual" ? "single" : "batch";
      head.append(copy, tag);

      const body = document.createElement("div");
      body.className = "log-entry-body";
      if (entry.type === "manual") {
        renderDetails(body, entry.details, { showBreakdown: true });
      } else {
        renderSimulationResult(body, entry.result, { includeSamples: true, includeFilterResult: false });
      }

      wrapper.append(head, body);
      return wrapper;
    }),
  );
}

function readConstraints() {
  const constraints = {};
  document.querySelectorAll("[data-constraint-metal]").forEach((input) => {
    const metal = input.dataset.constraintMetal;
    const bound = input.dataset.constraintBound;
    constraints[metal] = constraints[metal] || {};
    constraints[metal][bound] = Number(input.value);
  });

  return metalIds.map((metal) => {
    const raw = constraints[metal] || {};
    const minPct = clampPercentStep(raw.min, 0);
    const maxPct = clampPercentStep(raw.max, 100);
    return {
      metal,
      minPct,
      maxPct,
      minAmount: Math.ceil((Number(elements.simulationTotal.value) || 0) * minPct / 100),
      maxAmount: Math.floor((Number(elements.simulationTotal.value) || 0) * maxPct / 100),
    };
  });
}

function clampNumber(value, fallback, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, number));
}

function clampPercentStep(value, fallback) {
  return Math.round(clampNumber(value, fallback, 0, 100));
}

function getFixedActiveMetalCount(mode) {
  return activeMetalCountBySimulationMode[mode] || 0;
}

function modeUsesConstraints(mode) {
  return mode === "distribution" || mode === "single-fill";
}

function validateConstraints(total, constraints) {
  if (!Number.isFinite(total) || total <= 0) {
    return "总原料数量需要大于 0。";
  }

  const impossibleRow = constraints.find((constraint) => constraint.minAmount > constraint.maxAmount);
  if (impossibleRow) {
    return `${metalLabels[impossibleRow.metal]} 的 min/max 在当前总量下不可实现。`;
  }

  const minSum = constraints.reduce((sum, constraint) => sum + constraint.minAmount, 0);
  const maxSum = constraints.reduce((sum, constraint) => sum + constraint.maxAmount, 0);
  if (minSum > total) {
    return `最小投料合计 ${formatInteger(minSum)}，超过总量 ${formatInteger(total)}。`;
  }
  if (maxSum < total) {
    return `最大投料合计 ${formatInteger(maxSum)}，不足总量 ${formatInteger(total)}。`;
  }

  return "";
}

function validateFixedActiveMetalCount(total, activeMetalCount) {
  if (!Number.isFinite(total) || total <= 0) {
    return "总原料数量需要大于 0。";
  }
  if (total < activeMetalCount) {
    return `${formatInteger(activeMetalCount)} 属性随机模拟需要总量至少为 ${formatInteger(activeMetalCount)}。`;
  }
  return "";
}

function validateThreeMetal70(total) {
  if (!Number.isFinite(total) || total <= 0) {
    return "总原料数量需要大于 0。";
  }
  if (total < 10) {
    return "三金属 70% 预设需要总量至少为 10，才能保留 70% 主金属与两个副金属。";
  }
  return "";
}

function randomInteger(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateRandomInputs(total, constraints, mode) {
  const fixedActiveMetalCount = getFixedActiveMetalCount(mode);
  if (fixedActiveMetalCount > 0) {
    return generateFixedActiveMetalCountInputs(total, fixedActiveMetalCount);
  }
  if (mode === "three-metal-70") {
    return generateThreeMetal70Inputs(total);
  }
  if (mode === "single-fill") {
    return generateSingleFillInputs(total, constraints);
  }
  return generateDistributedInputs(total, constraints);
}

function pickRandomMetals(count) {
  const pool = [...metalIds];
  const selected = [];

  while (selected.length < count && pool.length > 0) {
    const index = randomInteger(0, pool.length - 1);
    selected.push(pool.splice(index, 1)[0]);
  }

  return selected;
}

function generateFixedActiveMetalCountInputs(total, activeMetalCount) {
  const amounts = createMetalRecord();
  const selected = pickRandomMetals(activeMetalCount);

  if (selected.length === 1) {
    amounts[selected[0]] = total;
    return amounts;
  }

  const cuts = new Set();
  while (cuts.size < selected.length - 1) {
    cuts.add(randomInteger(1, total - 1));
  }

  // Uniformly sample positive integer partitions instead of clustering around equal splits.
  const points = [0, ...Array.from(cuts).sort((left, right) => left - right), total];
  selected.forEach((metal, index) => {
    amounts[metal] = points[index + 1] - points[index];
  });

  return amounts;
}

function generateThreeMetal70Inputs(total) {
  const amounts = createMetalRecord();
  const selected = pickRandomMetals(3);

  const primaryIndex = randomInteger(0, selected.length - 1);
  const primaryMetal = selected[primaryIndex];
  const secondaryMetals = selected.filter((metal) => metal !== primaryMetal);
  const primaryAmount = Math.floor(total * 0.7);
  const remaining = total - primaryAmount;
  const firstSecondaryAmount = randomInteger(1, remaining - 1);

  amounts[primaryMetal] = primaryAmount;
  amounts[secondaryMetals[0]] = firstSecondaryAmount;
  amounts[secondaryMetals[1]] = remaining - firstSecondaryAmount;

  return amounts;
}

function generateDistributedInputs(total, constraints) {
  const amounts = createMetalRecord();
  const constraintByMetal = Object.fromEntries(constraints.map((constraint) => [constraint.metal, constraint]));

  metalIds.forEach((metal) => {
    amounts[metal] = constraintByMetal[metal].minAmount;
  });

  let remaining = total - metalIds.reduce((sum, metal) => sum + amounts[metal], 0);
  while (remaining > 0) {
    const candidates = metalIds.filter((metal) => amounts[metal] < constraintByMetal[metal].maxAmount);
    if (candidates.length === 0) {
      return null;
    }

    const metal = candidates[Math.floor(Math.random() * candidates.length)];
    amounts[metal] += 1;
    remaining -= 1;
  }

  return amounts;
}

function generateSingleFillInputs(total, constraints) {
  const constraintByMetal = Object.fromEntries(constraints.map((constraint) => [constraint.metal, constraint]));

  for (let attempt = 0; attempt < 2000; attempt += 1) {
    const amounts = createMetalRecord();
    const controlledMetals = metalIds.filter((metal) => {
      const constraint = constraintByMetal[metal];
      return constraint.minAmount > 0 || constraint.maxAmount < total;
    });

    controlledMetals.forEach((metal) => {
      const constraint = constraintByMetal[metal];
      amounts[metal] = randomInteger(constraint.minAmount, constraint.maxAmount);
    });

    const used = metalIds.reduce((sum, metal) => sum + amounts[metal], 0);
    if (used > total) {
      continue;
    }

    const remaining = total - used;
    const emptyCandidates = metalIds.filter((metal) => {
      const constraint = constraintByMetal[metal];
      return amounts[metal] === 0 && constraint.minAmount === 0 && remaining <= constraint.maxAmount;
    });
    const candidates =
      emptyCandidates.length > 0
        ? emptyCandidates
        : metalIds.filter((metal) => amounts[metal] + remaining <= constraintByMetal[metal].maxAmount);

    if (candidates.length === 0) {
      continue;
    }

    if (remaining > 0) {
      const metal = candidates[Math.floor(Math.random() * candidates.length)];
      amounts[metal] += remaining;
    }

    const valid = metalIds.every((metal) => {
      const constraint = constraintByMetal[metal];
      return amounts[metal] >= constraint.minAmount && amounts[metal] <= constraint.maxAmount;
    });

    if (valid) {
      return amounts;
    }
  }

  return null;
}

function runSimulation() {
  const total = Math.floor(Number(elements.simulationTotal.value) || 0);
  const count = Math.floor(Number(elements.simulationCount.value) || 0);
  const mode = elements.simulationMode.value;
  const fixedActiveMetalCount = getFixedActiveMetalCount(mode);
  const constraints = modeUsesConstraints(mode) ? readConstraints() : [];
  const constraintError =
    fixedActiveMetalCount > 0
      ? validateFixedActiveMetalCount(total, fixedActiveMetalCount)
      : mode === "three-metal-70"
        ? validateThreeMetal70(total)
        : validateConstraints(total, constraints);

  if (constraintError) {
    setSimulationMessage(constraintError, true);
    return;
  }
  if (!Number.isFinite(count) || count <= 0) {
    setSimulationMessage("模拟次数需要大于 0。", true);
    return;
  }
  if (count > 20000) {
    setSimulationMessage("为了保持页面响应，单次模拟上限为 20000 次。", true);
    return;
  }

  const result = createSimulationAccumulator();

  for (let index = 0; index < count; index += 1) {
    const inputs = generateRandomInputs(total, constraints, mode);
    if (!inputs) {
      setSimulationMessage("无法在当前限制下生成随机投料。", true);
      return;
    }

    const details = calculateDetails(inputs);
    accumulateSimulation(result, details, index);
  }

  finalizeSimulation(result, count, total, mode, constraints);
  const time = new Date();
  elements.currentSummary.textContent = `${time.toLocaleTimeString("zh-CN", {
    hour12: false,
  })} · 随机模拟 ${formatInteger(count)} 次 · ${formatInteger(total)} 总量`;
  latestSimulationResult = result;
  currentResultMode = "simulation";
  renderCurrentSimulationResult();
  setSimulationMessage(`已完成 ${formatInteger(count)} 次模拟。`, false);

  forgeLogEntries = [
    {
      type: "simulation",
      title: `随机模拟 · ${formatInteger(count)} 次`,
      subtitle: `${formatInteger(total)} 总量 · ${getSimulationModeLabel(mode)}`,
      result: createSimulationLogResult(result),
    },
    ...forgeLogEntries,
  ];
  renderForgeLog();
}

function createSimulationAccumulator() {
  return {
    averageStats: createStatRecord(),
    statSquares: createStatRecord(),
    varianceStats: createStatRecord(),
    statDistributions: Object.fromEntries(statIds.map((stat) => [stat, []])),
    globalStatVariance: 0,
    minStats: Object.fromEntries(statIds.map((stat) => [stat, Infinity])),
    maxStats: createStatRecord(),
    averageInputs: createMetalRecord(),
    samples: [],
    count: 0,
    total: 0,
    mode: "",
    constraints: [],
    leaderboards: {},
  };
}

function accumulateSimulation(result, details, index) {
  statIds.forEach((stat) => {
    const value = details.stats[stat];
    result.averageStats[stat] += value;
    result.statSquares[stat] += value * value;
    result.statDistributions[stat].push(value);
    result.minStats[stat] = Math.min(result.minStats[stat], value);
    result.maxStats[stat] = Math.max(result.maxStats[stat], value);
  });

  metalIds.forEach((metal) => {
    result.averageInputs[metal] += details.inputs[metal];
  });

  result.samples.push(createSimulationSample(details, index));
}

function createSimulationSample(details, index) {
  return {
    index: index + 1,
    inputs: { ...details.inputs },
    ratios: { ...details.ratios },
    stats: { ...details.stats },
    statTotal: calculateStatTotal(details.stats),
  };
}

function finalizeSimulation(result, count, total, mode, constraints) {
  result.count = count;
  result.total = total;
  result.mode = mode;
  result.constraints = constraints.map((constraint) => ({ ...constraint }));

  statIds.forEach((stat) => {
    result.averageStats[stat] /= count;
    result.varianceStats[stat] = Math.max(0, result.statSquares[stat] / count - result.averageStats[stat] ** 2);
  });
  metalIds.forEach((metal) => {
    result.averageInputs[metal] /= count;
  });
  result.globalStatVariance = calculateVariance(statIds.map((stat) => result.averageStats[stat]));
  result.leaderboards = createLeaderboardData(result.samples);
}

function createSimulationLogResult(result) {
  return {
    ...result,
    samples: result.samples.slice(0, 20).map(cloneSimulationSample),
    leaderboards: cloneLeaderboardData(result.leaderboards),
  };
}

function cloneLeaderboardData(leaderboards) {
  return Object.fromEntries(
    rankingMetricIds.map((metric) => [metric, (leaderboards?.[metric] || []).map(cloneSimulationSample)]),
  );
}

function cloneSimulationSample(sample) {
  return {
    index: sample.index,
    inputs: { ...sample.inputs },
    ratios: { ...sample.ratios },
    stats: { ...sample.stats },
    statTotal: sample.statTotal,
  };
}

function calculateVariance(values) {
  if (values.length === 0) {
    return 0;
  }
  const average = values.reduce((sum, value) => sum + value, 0) / values.length;
  return values.reduce((sum, value) => sum + (value - average) ** 2, 0) / values.length;
}

function getSimulationModeLabel(mode) {
  if (mode === "single-fill") {
    return "单一余量";
  }
  if (mode === "two-attribute-random") {
    return "2属性随机";
  }
  if (mode === "three-attribute-random") {
    return "3属性随机";
  }
  if (mode === "four-attribute-random") {
    return "4属性随机";
  }
  if (mode === "five-attribute-random") {
    return "5属性随机";
  }
  if (mode === "six-attribute-random") {
    return "6属性随机";
  }
  if (mode === "three-metal-70") {
    return "三金属 70%";
  }
  return "随机分配";
}

function createSvgElement(tagName, attributes = {}) {
  const element = document.createElementNS("http://www.w3.org/2000/svg", tagName);
  Object.entries(attributes).forEach(([key, value]) => {
    element.setAttribute(key, String(value));
  });
  return element;
}

function createViolinChart(result) {
  const allValues = statIds.flatMap((stat) => result.statDistributions?.[stat] || []);
  const wrap = document.createElement("div");
  wrap.className = "violin-card";

  const title = document.createElement("div");
  title.className = "violin-title";
  const maxValue = Math.max(1, ...allValues);
  title.innerHTML = `<strong>六属性分布小提琴图</strong><small>共享纵轴：0 - ${formatInteger(maxValue)}</small>`;

  if (allValues.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "暂无分布数据。";
    wrap.append(title, empty);
    return wrap;
  }

  const width = 900;
  const height = 320;
  const margin = { top: 26, right: 22, bottom: 56, left: 48 };
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;
  const yMin = 0;
  const yMax = maxValue;
  const yRange = Math.max(1, yMax - yMin);
  const xStep = plotWidth / statIds.length;
  const halfWidth = Math.min(48, xStep * 0.34);
  const yScale = (value) => margin.top + plotHeight - ((value - yMin) / yRange) * plotHeight;

  const svg = createSvgElement("svg", {
    viewBox: `0 0 ${width} ${height}`,
    role: "img",
    "aria-label": "批量模拟六属性小提琴图",
  });

  [0, 0.25, 0.5, 0.75, 1].forEach((ratio) => {
    const value = yMin + yRange * ratio;
    const y = yScale(value);
    svg.append(
      createSvgElement("line", {
        x1: margin.left,
        y1: y,
        x2: width - margin.right,
        y2: y,
        class: "violin-grid-line",
      }),
    );
    const label = createSvgElement("text", {
      x: margin.left - 8,
      y: y,
      class: "violin-axis-label",
      "text-anchor": "end",
    });
    label.textContent = formatDecimal(value, 0);
    svg.append(label);
  });

  statIds.forEach((stat, index) => {
    const values = result.statDistributions?.[stat] || [];
    const x = margin.left + xStep * (index + 0.5);
    const group = createSvgElement("g", { class: "violin-stat" });
    const histogram = createHistogram(values, yMin, yMax);
    const maxCount = Math.max(1, ...histogram.map((bin) => bin.count));
    const leftPoints = histogram.map((bin) => {
      const y = yScale(bin.center);
      const spread = Math.max(2, (bin.count / maxCount) * halfWidth);
      return [x - spread, y];
    });
    const rightPoints = [...histogram].reverse().map((bin) => {
      const y = yScale(bin.center);
      const spread = Math.max(2, (bin.count / maxCount) * halfWidth);
      return [x + spread, y];
    });
    const points = [...leftPoints, ...rightPoints];
    const pathData = points
      .map(([pointX, pointY], pointIndex) => `${pointIndex === 0 ? "M" : "L"} ${pointX.toFixed(2)} ${pointY.toFixed(2)}`)
      .join(" ");

    const path = createSvgElement("path", {
      d: `${pathData} Z`,
      class: "violin-shape",
    });
    const titleNode = createSvgElement("title");
    titleNode.textContent = `${statLabels[stat]}：平均 ${formatDecimal(result.averageStats[stat], 3)}，方差 ${formatDecimal(
      result.varianceStats[stat],
      3,
    )}`;
    path.append(titleNode);
    group.append(path);

    const meanY = yScale(result.averageStats[stat]);
    group.append(
      createSvgElement("line", {
        x1: x - halfWidth * 0.75,
        y1: meanY,
        x2: x + halfWidth * 0.75,
        y2: meanY,
        class: "violin-mean",
      }),
    );
    group.append(
      createSvgElement("line", {
        x1: x,
        y1: yScale(result.minStats[stat]),
        x2: x,
        y2: yScale(result.maxStats[stat]),
        class: "violin-range",
      }),
    );

    const label = createSvgElement("text", {
      x,
      y: height - 22,
      class: "violin-label",
      "text-anchor": "middle",
    });
    label.textContent = statLabels[stat];
    group.append(label);

    const meanLabel = createSvgElement("text", {
      x,
      y: height - 8,
      class: "violin-mean-label",
      "text-anchor": "middle",
    });
    meanLabel.textContent = `均 ${formatDecimal(result.averageStats[stat], 1)}`;
    group.append(meanLabel);

    svg.append(group);
  });

  wrap.append(title, svg);
  return wrap;
}

function createHistogram(values, yMin, yMax) {
  const binCount = Math.min(34, Math.max(10, Math.ceil(Math.sqrt(values.length || 1))));
  const span = Math.max(1, yMax - yMin);
  const binSize = span / binCount;
  const bins = Array.from({ length: binCount }, (_, index) => ({
    center: yMin + binSize * (index + 0.5),
    count: 0,
  }));

  values.forEach((value) => {
    const rawIndex = Math.floor((value - yMin) / binSize);
    const index = Math.min(binCount - 1, Math.max(0, rawIndex));
    bins[index].count += 1;
  });

  return bins;
}

function renderCurrentSimulationResult() {
  if (!latestSimulationResult) {
    return;
  }
  renderSimulationResult(elements.currentResult, latestSimulationResult, {
    includeSamples: true,
    includeFilterResult: true,
  });
}

function renderSimulationResult(container, result, options = {}) {
  const includeSamples = options.includeSamples ?? false;
  const includeLeaderboards = options.includeLeaderboards ?? true;
  const includeFilterResult = options.includeFilterResult ?? false;
  container.classList.remove("empty-state");

  const summary = document.createElement("div");
  summary.className = "summary-strip";
  [
    `次数 ${formatInteger(result.count)}`,
    `总量 ${formatInteger(result.total)}`,
    getSimulationModeLabel(result.mode),
    `六属性全局方差 ${formatDecimal(result.globalStatVariance, 3)}`,
  ].forEach((item) => {
    const chip = document.createElement("span");
    chip.textContent = item;
    summary.append(chip);
  });

  const statRows = statIds.map((stat) => [
    statLabels[stat],
    formatDecimal(result.averageStats[stat], 3),
    formatDecimal(result.varianceStats[stat], 3),
    formatInteger(result.minStats[stat]),
    formatInteger(result.maxStats[stat]),
  ]);
  const statWrap = document.createElement("div");
  statWrap.className = "table-wrap";
  statWrap.append(createTable(["属性", "平均 final", "属性方差", "最小", "最大"], statRows));

  const inputRows = metalIds.map((metal) => [
    metalLabels[metal],
    formatDecimal(result.averageInputs[metal], 3),
    formatPercent(result.total > 0 ? result.averageInputs[metal] / result.total : 0),
  ]);
  const inputWrap = document.createElement("div");
  inputWrap.className = "table-wrap";
  inputWrap.append(createTable(["金属", "平均数量", "平均占比"], inputRows));

  const children = [summary, createViolinChart(result)];

  if (includeLeaderboards) {
    children.push(createLeaderboardSection(result));
  }

  if (includeFilterResult) {
    children.push(createFilteredTopSection(result, readSimulationFilterConfig()));
  }

  children.push(statWrap, inputWrap);

  if (includeSamples) {
    children.push(createSampleTable(result.samples));
  }

  container.replaceChildren(...children);
}

function createLeaderboardSection(result) {
  const section = document.createElement("section");
  section.className = "leaderboard-section";

  const title = document.createElement("div");
  title.className = "section-title result-section-title";
  const heading = document.createElement("h3");
  heading.textContent = "本次模拟 Top7";
  const note = document.createElement("small");
  note.textContent = "分别按属性总和与六个单项属性取最高七把刃。";
  title.append(heading, note);

  const grid = document.createElement("div");
  grid.className = "leaderboard-grid";
  const leaderboards = result.leaderboards || createLeaderboardData(result.samples);
  rankingMetricIds.forEach((metric) => {
    grid.append(createLeaderboardCard(`${getMetricLabel(metric)} Top7`, metric, leaderboards[metric] || []));
  });

  section.append(title, grid);
  return section;
}

function createLeaderboardCard(titleText, metric, samples) {
  const card = document.createElement("article");
  card.className = "leaderboard-card";

  const head = document.createElement("div");
  head.className = "leaderboard-head";
  const title = document.createElement("strong");
  title.textContent = titleText;
  const note = document.createElement("small");
  note.textContent = `按 ${getMetricLabel(metric)} 降序`;
  head.append(title, note);

  const rows = samples.map((sample) => [
    `#${sample.index}`,
    formatInteger(getSampleMetric(sample, metric)),
    formatInputBundle(sample.inputs, sample.ratios),
    formatStatBundle(sample.stats),
    createExportToBattleButton({
      inputs: sample.inputs,
      stats: sample.stats,
      sourceTitle: `模拟样本 #${sample.index}`,
    }),
  ]);
  const tableWrap = document.createElement("div");
  tableWrap.className = "table-wrap compact-table";
  tableWrap.append(createTable(["样本", "得分", "投料", "六属性", "操作"], rows));

  card.append(head, tableWrap);
  return card;
}

function getTopSamples(samples, metric, limit) {
  return [...samples]
    .sort((left, right) => compareSamplesByMetric(left, right, metric))
    .slice(0, limit);
}

function createLeaderboardData(samples) {
  return Object.fromEntries(rankingMetricIds.map((metric) => [metric, getTopSamples(samples, metric, 7)]));
}

function compareSamplesByMetric(left, right, metric) {
  const metricDiff = getSampleMetric(right, metric) - getSampleMetric(left, metric);
  if (metricDiff !== 0) {
    return metricDiff;
  }
  const totalDiff = getSampleMetric(right, "total") - getSampleMetric(left, "total");
  if (totalDiff !== 0) {
    return totalDiff;
  }
  return left.index - right.index;
}

function readSimulationFilterConfig() {
  const rawMin = elements.simulationFilterMin.value.trim();
  const minValue = rawMin === "" ? null : Number(rawMin);
  if (rawMin !== "" && !Number.isFinite(minValue)) {
    return {
      invalid: true,
      message: "筛选阈值需要是数字。",
      filterMetric: elements.simulationFilterMetric.value,
      sortMetric: elements.simulationSortMetric.value,
      minValue: null,
      conditions: [],
    };
  }

  const conditions = [];
  for (const stat of statIds) {
    const input = elements.simulationConditionGrid.querySelector(`[data-simulation-condition-value="${stat}"]`);
    const select = elements.simulationConditionGrid.querySelector(`[data-simulation-condition-operator="${stat}"]`);
    const rawValue = input?.value.trim() || "";
    if (rawValue === "") {
      continue;
    }
    const value = Number(rawValue);
    if (!Number.isFinite(value)) {
      return {
        invalid: true,
        message: `${statLabels[stat]}条件需要是数字。`,
        filterMetric: elements.simulationFilterMetric.value,
        sortMetric: elements.simulationSortMetric.value,
        minValue,
        conditions,
      };
    }
    conditions.push({
      stat,
      operator: simulationComparisonOptions.some((option) => option.value === select?.value) ? select.value : "gt",
      value,
    });
  }

  return {
    invalid: false,
    filterMetric: elements.simulationFilterMetric.value,
    sortMetric: elements.simulationSortMetric.value,
    minValue,
    conditions,
  };
}

function createFilteredTopSection(result, config) {
  const section = document.createElement("section");
  section.className = "filter-result-card";

  const title = document.createElement("div");
  title.className = "section-title result-section-title";
  const heading = document.createElement("h3");
  heading.textContent = "筛选 Top20";
  const note = document.createElement("small");
  title.append(heading, note);
  section.append(title);

  if (config.invalid) {
    note.textContent = config.message;
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = config.message;
    section.append(empty);
    return section;
  }

  const filteredSamples = getFilteredSamples(result.samples, config);
  note.textContent = getFilterSummary(config, result.samples.length, filteredSamples.length);
  const samples = getFilteredTopSamples(filteredSamples, config, 20);
  if (samples.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "没有样本符合当前筛选条件。";
    section.append(empty);
    return section;
  }

  const rows = samples.map((sample) => [
    `#${sample.index}`,
    formatInteger(getSampleMetric(sample, config.sortMetric)),
    formatInputBundle(sample.inputs, sample.ratios),
    formatStatBundle(sample.stats),
    createExportToBattleButton({
      inputs: sample.inputs,
      stats: sample.stats,
      sourceTitle: `筛选样本 #${sample.index}`,
    }),
  ]);
  const tableWrap = document.createElement("div");
  tableWrap.className = "table-wrap filter-table";
  tableWrap.append(
    createTable(
      [
        "样本",
        `${getMetricLabel(config.sortMetric)}排序值`,
        "投料",
        "六属性",
        "操作",
      ],
      rows,
    ),
  );
  section.append(tableWrap);
  return section;
}

function getFilteredTopSamples(samples, config, limit) {
  return [...samples].sort((left, right) => compareSamplesByMetric(left, right, config.sortMetric)).slice(0, limit);
}

function getFilteredSamples(samples, config) {
  return samples.filter((sample) => sampleMatchesSimulationFilter(sample, config));
}

function sampleMatchesSimulationFilter(sample, config) {
  if (config.minValue !== null && getSampleMetric(sample, config.filterMetric) <= config.minValue) {
    return false;
  }
  return config.conditions.every((condition) =>
    compareSimulationCondition(getSampleMetric(sample, condition.stat), condition.operator, condition.value),
  );
}

function compareSimulationCondition(value, operator, threshold) {
  if (operator === "gte") {
    return value >= threshold;
  }
  if (operator === "eq") {
    return value === threshold;
  }
  if (operator === "lte") {
    return value <= threshold;
  }
  if (operator === "lt") {
    return value < threshold;
  }
  return value > threshold;
}

function getFilterSummary(config, totalCount, matchedCount) {
  if (config.invalid) {
    return config.message;
  }
  const conditions = getSimulationFilterConditionLabels(config);
  const filterText = conditions.length > 0 ? conditions.join(" 且 ") : `全部 ${formatInteger(totalCount)} 个样本`;
  return `${filterText} · 命中 ${formatInteger(matchedCount)}/${formatInteger(totalCount)} · 按 ${getMetricLabel(
    config.sortMetric,
  )} 取前 20`;
}

function getSimulationFilterConditionLabels(config) {
  const conditions = [];
  if (config.minValue !== null) {
    conditions.push(`${getMetricLabel(config.filterMetric)} > ${formatDecimal(config.minValue, 3)}`);
  }
  config.conditions.forEach((condition) => {
    conditions.push(
      `${statLabels[condition.stat]} ${getSimulationComparisonLabel(condition.operator)} ${formatDecimal(
        condition.value,
        3,
      )}`,
    );
  });
  return conditions;
}

function getSimulationComparisonLabel(operator) {
  return simulationComparisonOptions.find((option) => option.value === operator)?.label || ">";
}

function formatStatBundle(stats) {
  return statIds.map((stat) => `${statLabels[stat]} ${formatInteger(stats[stat])}`).join(" / ");
}

function createSampleTable(samples) {
  const wrap = document.createElement("div");
  wrap.className = "table-wrap simulation-samples";
  const title = document.createElement("div");
  title.className = "section-title result-section-title";
  const heading = document.createElement("h3");
  heading.textContent = "样本预览";
  const note = document.createElement("small");
  note.textContent = `显示前 ${formatInteger(Math.min(20, samples.length))} 个样本，完整样本已用于 Top7 与筛选 Top20。`;
  title.append(heading, note);

  const rows = samples.slice(0, 20).map((sample) => [
    `#${sample.index}`,
    formatInputBundle(sample.inputs, sample.ratios),
    formatStatBundle(sample.stats),
    createExportToBattleButton({
      inputs: sample.inputs,
      stats: sample.stats,
      sourceTitle: `预览样本 #${sample.index}`,
    }),
  ]);
  wrap.append(title, createTable(["样本", "投料", "六属性", "操作"], rows));
  return wrap;
}

function setSimulationMessage(message, isError) {
  elements.simulationMessage.textContent = message;
  elements.simulationMessage.classList.toggle("is-error", Boolean(isError));
}

function buildSettingsExport() {
  return {
    type: "blade-essence-forging-debug-settings",
    exportedAt: new Date().toISOString(),
    formula: "final = floor(major * modifier / interpolate(entropyPenaltyTable, effectiveN) * statPerformance * log10(total))",
    majorFormula: "major = sum((log(14 * ratio + 1) / log(15)) ^ majorExponent * baseTableValue)",
    modifierFormula:
      "modifier = 1 + sum(((1 - ratio) ^ modifierExponent * (1 - (1 - ratio) ^ modifierExponent)) * modifierTableValue)",
    effectiveMetalCountFormula: "effectiveN = 1 / sum(ratio ^ 2)",
    quantityLogBase: 10,
    formulaParameters: cloneFormulaParameters(editableFormulaParameters),
    baseTable: cloneFormulaTable(editableTables.base),
    modifierTable: cloneFormulaTable(editableTables.modifier),
    statPerformanceTable: cloneStatPerformanceTable(editableStatPerformanceTable),
    entropyPenaltyTable: cloneEntropyPenaltyTable(editableEntropyPenaltyTable),
  };
}

function copyTextFallback(text) {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  document.body.append(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  textarea.remove();
  if (!copied) {
    throw new Error("copy command failed");
  }
}

async function copyTextToClipboard(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  copyTextFallback(text);
}

async function exportCurrentSettings() {
  const text = JSON.stringify(buildSettingsExport(), null, 2);
  elements.currentSummary.textContent = "正在导出当前公式设置。";
  try {
    await copyTextToClipboard(text);
    elements.currentSummary.textContent = "当前公式设置已复制到剪贴板。";
  } catch {
    elements.currentSummary.textContent = "复制失败：浏览器阻止了剪贴板写入。";
  }
}

function setInputMode(mode) {
  elements.modeTabs.forEach((button) => {
    const selected = button.dataset.inputMode === mode;
    button.classList.toggle("is-active", selected);
    button.setAttribute("aria-selected", String(selected));
  });

  elements.inputPanels.forEach((panel) => {
    const selected = panel.dataset.inputPanel === mode;
    panel.hidden = !selected;
    panel.classList.toggle("is-active", selected);
  });
}

function renderSimulationAnalysisControls() {
  const metricOptions = rankingMetricIds.map((metric) => {
    const option = document.createElement("option");
    option.value = metric;
    option.textContent = getMetricLabel(metric);
    return option;
  });

  elements.simulationFilterMetric.replaceChildren(...metricOptions);
  elements.simulationSortMetric.replaceChildren(...metricOptions.map((option) => option.cloneNode(true)));
  elements.simulationFilterMetric.value = "sharpness";
  elements.simulationSortMetric.value = "total";
  renderSimulationConditionControls();
}

function renderSimulationConditionControls() {
  const rows = statIds.map((stat) => {
    const row = document.createElement("div");
    row.className = "simulation-condition-row";

    const label = document.createElement("strong");
    label.textContent = statLabels[stat];

    const controls = document.createElement("div");
    controls.className = "simulation-condition-control";

    const operator = document.createElement("select");
    operator.dataset.simulationConditionOperator = stat;
    simulationComparisonOptions.forEach((optionConfig) => {
      const option = document.createElement("option");
      option.value = optionConfig.value;
      option.textContent = optionConfig.label;
      operator.append(option);
    });
    operator.value = "gt";

    const value = document.createElement("input");
    value.type = "number";
    value.step = "1";
    value.placeholder = "-";
    value.dataset.simulationConditionValue = stat;

    controls.append(operator, value);
    row.append(label, controls);
    return row;
  });

  elements.simulationConditionGrid.replaceChildren(...rows);
}

function syncConstraintControls() {
  const usesConstraints = modeUsesConstraints(elements.simulationMode.value);
  elements.constraintSection.classList.toggle("is-disabled", !usesConstraints);
  document.querySelectorAll("[data-constraint-metal]").forEach((input) => {
    input.disabled = !usesConstraints;
  });
}

function applySimulationFilter() {
  if (!latestSimulationResult) {
    setSimulationMessage("请先运行一次随机模拟，再应用筛选。", true);
    return;
  }

  currentResultMode = "simulation";
  renderCurrentSimulationResult();
  const config = readSimulationFilterConfig();
  setSimulationMessage(config.invalid ? config.message : "筛选结果已更新。", config.invalid);
}

function handleSimulationFilterInput() {
  if (latestSimulationResult && currentResultMode === "simulation") {
    renderCurrentSimulationResult();
  }
}

function applyManualPreset(preset) {
  setManualInputs(preset.inputs);
}

function applySimulationPreset(preset) {
  elements.simulationTotal.value = String(preset.total);
  elements.simulationMode.value = preset.mode;
  document.querySelectorAll("[data-constraint-metal]").forEach((input) => {
    const presetRange = preset.constraints[input.dataset.constraintMetal] || [0, 100];
    input.value = String(input.dataset.constraintBound === "min" ? presetRange[0] : presetRange[1]);
  });
  syncConstraintControls();
  setSimulationMessage(`已填入预设：${preset.label}`, false);
}

function handleFormulaTableInput(event) {
  const input = event.target;
  if (!input.matches("[data-formula-table]")) {
    return;
  }

  const value = Number(input.value);
  if (!Number.isFinite(value)) {
    return;
  }

  const tableKey = input.dataset.formulaTable;
  const metal = input.dataset.tableMetal;
  const stat = input.dataset.tableStat;
  editableTables[tableKey][metal][stat] = value;
  updateMatrixCheckCell(input);
  elements.currentSummary.textContent = "表参数已变更，请重新运行左侧当前模式。";
}

function handlePerformanceTableInput(event) {
  const input = event.target;
  if (!input.matches("[data-performance-stat]")) {
    return;
  }

  const value = Number(input.value);
  if (!Number.isFinite(value)) {
    return;
  }

  editableStatPerformanceTable[input.dataset.performanceStat] = value;
  elements.currentSummary.textContent = "属性表现修正已变更，请重新运行左侧当前模式。";
}

function handleEntropyTableInput(event) {
  const input = event.target;
  if (!input.matches("[data-entropy-count]")) {
    return;
  }

  const value = Number(input.value);
  if (!Number.isFinite(value) || value <= 0) {
    return;
  }

  editableEntropyPenaltyTable[input.dataset.entropyCount] = value;
  elements.currentSummary.textContent = "高熵系数已变更，请重新运行左侧当前模式。";
}

function handleCurveParameterInput(event) {
  const input = event.target;
  const parameterKey = input.id === "major-exponent-input"
    ? "majorExponent"
    : input.id === "modifier-exponent-input"
      ? "modifierExponent"
      : "";
  if (!parameterKey) {
    return;
  }

  const value = Number(input.value);
  if (!Number.isFinite(value) || value <= 0) {
    return;
  }

  editableFormulaParameters[parameterKey] = value;
  elements.currentSummary.textContent = "曲线参数已变更，请重新运行左侧当前模式。";
}

function resetFormulaTable(tableKey) {
  editableTables[tableKey] = cloneFormulaTable(tableKey === "base" ? initialBaseTable : initialModifierTable);
  renderEditableMatrixTable(tableKey === "base" ? elements.baseTable : elements.modifierTable, tableKey);
  elements.currentSummary.textContent =
    tableKey === "base" ? "表1已重置，请重新运行左侧当前模式。" : "表2已重置，请重新运行左侧当前模式。";
}

function resetPerformanceTable() {
  editableStatPerformanceTable = cloneStatPerformanceTable(initialStatPerformanceTable);
  renderPerformanceTable();
  elements.currentSummary.textContent = "属性表现修正已重置，请重新运行左侧当前模式。";
}

function resetEntropyPenaltyTable() {
  editableEntropyPenaltyTable = cloneEntropyPenaltyTable(initialEntropyPenaltyTable);
  renderEntropyPenaltyTable();
  elements.currentSummary.textContent = "高熵系数已重置，请重新运行左侧当前模式。";
}

function resetCurveParameters() {
  editableFormulaParameters = cloneFormulaParameters(initialFormulaParameters);
  syncCurveParameterInputs();
  elements.currentSummary.textContent = "曲线参数已重置，请重新运行左侧当前模式。";
}

function clearLog() {
  forgeLogEntries = [];
  renderForgeLog();
}

function createEmptyInscription() {
  return {
    version: 1,
    nodes: Object.fromEntries(inscriptionNodeIds.map((nodeId) => [nodeId, null])),
    edges: Object.fromEntries(inscriptionEdgeIds.map((edgeId) => [edgeId, null])),
  };
}

function normalizeBladeInscription(source) {
  const normalized = createEmptyInscription();
  const sourceEdges = source && typeof source === "object" && source.edges && typeof source.edges === "object"
    ? source.edges
    : {};

  inscriptionEdgeIds.forEach((edgeId) => {
    const value = sourceEdges[edgeId];
    normalized.edges[edgeId] = metalIds.includes(value) ? value : null;
  });
  return normalized;
}

function cloneInscription(inscription) {
  return normalizeBladeInscription(inscription);
}

function hasInscriptionContent(inscription) {
  const normalized = normalizeBladeInscription(inscription);
  return inscriptionEdgeIds.some((edgeId) => normalized.edges[edgeId]);
}

function getInscriptionCounts(inscription) {
  const normalized = normalizeBladeInscription(inscription);
  const edgeCounts = Object.fromEntries(metalIds.map((metal) => [metal, 0]));
  let filledEdges = 0;
  let filledRingEdges = 0;
  let filledSpokeEdges = 0;

  inscriptionEdgeConfigs.forEach((edge) => {
    const metal = normalized.edges[edge.id];
    if (!metal) {
      return;
    }
    filledEdges += 1;
    edgeCounts[metal] += 1;
    if (edge.type === "ring") {
      filledRingEdges += 1;
    } else {
      filledSpokeEdges += 1;
    }
  });

  return {
    normalized,
    edgeCounts,
    filledEdges,
    filledRingEdges,
    filledSpokeEdges,
    completedRing: filledRingEdges === 6,
    completedSpokes: filledSpokeEdges === 6,
  };
}

function addInscriptionCost(cost, resource, amount = 1) {
  const value = Math.max(0, Math.floor(Number(amount) || 0));
  if (value <= 0) {
    return;
  }
  cost[resource] = (cost[resource] || 0) + value;
}

function calculateInscriptionCost(counts) {
  const cost = {};

  metalIds.forEach((metal) => {
    const count = counts.edgeCounts[metal] || 0;
    addInscriptionCost(cost, metal, count);
    addInscriptionCost(cost, "salt", count * 2);
  });

  if (counts.completedRing) {
    addInscriptionCost(cost, "silver", 6);
  }
  if (counts.completedSpokes) {
    addInscriptionCost(cost, "silver", 6);
  }

  return cost;
}

function getInscriptionConductivityDemand(counts) {
  const activeEdgeCount = Math.max(0, Math.floor(Number(counts.filledEdges) || 0));
  return activeEdgeCount * 6 + activeEdgeCount * activeEdgeCount;
}

function buildInscriptionInterpretation(inscription) {
  const normalized = normalizeBladeInscription(inscription);
  const graph = buildInscriptionGraphModel(normalized);
  const components = graph.components.map((component, index) => interpretInscriptionComponent(component, graph, index));
  return {
    components,
    componentCount: components.length,
    edgeCount: graph.activeEdges.length,
  };
}

function buildInscriptionGraphModel(inscription) {
  const normalized = normalizeBladeInscription(inscription);
  const edgeById = Object.fromEntries(inscriptionEdgeConfigs.map((edge) => [edge.id, edge]));
  const activeEdges = inscriptionEdgeConfigs
    .map((edge) => ({
      ...edge,
      metal: normalized.edges[edge.id],
    }))
    .filter((edge) => edge.metal);
  const adjacency = Object.fromEntries(inscriptionNodeIds.map((nodeId) => [nodeId, []]));
  activeEdges.forEach((edge) => {
    adjacency[edge.from].push(edge);
    adjacency[edge.to].push(edge);
  });

  const visitedEdgeIds = new Set();
  const components = [];
  activeEdges.forEach((edge) => {
    if (visitedEdgeIds.has(edge.id)) {
      return;
    }
    const edgeStack = [edge];
    const componentEdgeIds = new Set();
    const componentNodeIds = new Set();
    while (edgeStack.length > 0) {
      const currentEdge = edgeStack.pop();
      if (!currentEdge || visitedEdgeIds.has(currentEdge.id)) {
        continue;
      }
      visitedEdgeIds.add(currentEdge.id);
      componentEdgeIds.add(currentEdge.id);
      [currentEdge.from, currentEdge.to].forEach((nodeId) => {
        componentNodeIds.add(nodeId);
        adjacency[nodeId].forEach((nextEdge) => {
          if (!visitedEdgeIds.has(nextEdge.id)) {
            edgeStack.push(nextEdge);
          }
        });
      });
    }
    const edges = inscriptionEdgeConfigs
      .filter((item) => componentEdgeIds.has(item.id))
      .map((item) => ({ ...item, metal: normalized.edges[item.id] }));
    const nodeIds = inscriptionNodeIds.filter((nodeId) => componentNodeIds.has(nodeId));
    const degrees = Object.fromEntries(nodeIds.map((nodeId) => [nodeId, adjacency[nodeId].length]));
    components.push({
      id: `component-${components.length + 1}`,
      edgeIds: edges.map((item) => item.id),
      nodeIds,
      edges,
      degrees,
      hasCycle: edges.length >= nodeIds.length,
    });
  });

  return {
    normalized,
    edgeById,
    activeEdges,
    activeEdgeById: Object.fromEntries(activeEdges.map((edge) => [edge.id, edge])),
    adjacency,
    components,
  };
}

function interpretInscriptionComponent(component, graph, index) {
  const faces = findInscriptionComponentFaces(component, graph);
  if (faces.length > 0) {
    return {
      index: index + 1,
      kind: "face",
      label: "面铭文",
      edgeCount: component.edgeIds.length,
      nodeCount: component.nodeIds.length,
      faceInterpretation: buildInscriptionFaceInterpretation(faces, graph),
    };
  }

  const chain = buildInscriptionChainInterpretation(component, graph);
  return {
    index: index + 1,
    kind: chain.isStar ? "star-chain" : "single-chain",
    label: chain.isStar ? "星链" : "单链",
    edgeCount: component.edgeIds.length,
    nodeCount: component.nodeIds.length,
    chain,
  };
}

function findInscriptionComponentFaces(component, graph) {
  const cycles = enumerateInscriptionComponentCycles(component, graph);
  const candidates = cycles
    .map((cycle) => {
      const points = cycle.nodeIds.map(getInscriptionNodePosition);
      const area = Math.abs(getPolygonSignedArea(points));
      const sectorIds = getInscriptionFaceSectorIds(points);
      const edgeRanks = cycle.edgeIds.map((edgeId) => getInscriptionMetalRank(graph.activeEdgeById[edgeId]?.metal));
      const gradeRank = Math.min(...edgeRanks);
      const topRank = Math.max(...edgeRanks);
      return {
        ...cycle,
        points,
        area,
        centroid: getPolygonCentroid(points),
        sectorIds,
        gradeRank,
        gradeMetal: metalIds[gradeRank],
        topRank,
        topMetal: metalIds[topRank],
      };
    })
    .filter((face) => face.area > 0.001 && face.sectorIds.length > 0);

  return candidates
    .filter(
      (candidate) =>
        !candidates.some(
          (other) =>
            other.key !== candidate.key &&
            other.area < candidate.area - 0.001 &&
            isPointInPolygon(other.centroid, candidate.points),
        ),
    )
    .sort((a, b) => {
      const sectorA = Math.min(...a.sectorIds);
      const sectorB = Math.min(...b.sectorIds);
      return sectorA === sectorB ? a.area - b.area : sectorA - sectorB;
    })
    .map((face, faceIndex) => ({
      ...face,
      index: faceIndex + 1,
    }));
}

function enumerateInscriptionComponentCycles(component, graph) {
  const componentEdgeIds = new Set(component.edgeIds);
  const cyclesByKey = new Map();
  component.nodeIds.forEach((startNodeId) => {
    const visitedNodeIds = new Set([startNodeId]);
    const pathNodeIds = [startNodeId];
    const pathEdgeIds = [];

    function walk(currentNodeId) {
      graph.adjacency[currentNodeId].forEach((edge) => {
        if (!componentEdgeIds.has(edge.id)) {
          return;
        }
        const nextNodeId = edge.from === currentNodeId ? edge.to : edge.from;
        if (nextNodeId === startNodeId && pathNodeIds.length >= 3) {
          const cycleNodeIds = [...pathNodeIds];
          const cycleEdgeIds = [...pathEdgeIds, edge.id];
          const key = getCanonicalInscriptionCycleKey(cycleNodeIds);
          if (!cyclesByKey.has(key)) {
            cyclesByKey.set(key, {
              key,
              nodeIds: cycleNodeIds,
              edgeIds: cycleEdgeIds,
            });
          }
          return;
        }
        if (visitedNodeIds.has(nextNodeId) || pathNodeIds.length >= component.nodeIds.length) {
          return;
        }
        visitedNodeIds.add(nextNodeId);
        pathNodeIds.push(nextNodeId);
        pathEdgeIds.push(edge.id);
        walk(nextNodeId);
        pathEdgeIds.pop();
        pathNodeIds.pop();
        visitedNodeIds.delete(nextNodeId);
      });
    }

    walk(startNodeId);
  });
  return Array.from(cyclesByKey.values());
}

function getCanonicalInscriptionCycleKey(nodeIds) {
  const variants = [];
  const reversed = [...nodeIds].reverse();
  [nodeIds, reversed].forEach((sequence) => {
    sequence.forEach((_, index) => {
      variants.push([...sequence.slice(index), ...sequence.slice(0, index)].join(">"));
    });
  });
  return variants.sort()[0];
}

function buildInscriptionFaceInterpretation(faces, graph) {
  const highestGradeRank = Math.max(...faces.map((face) => face.gradeRank));
  const mainFaces = faces.filter((face) => face.gradeRank === highestGradeRank);
  const mainEdgeIds = Array.from(new Set(mainFaces.flatMap((face) => face.edgeIds)));
  const mainMetal = getHighestInscriptionMetal(mainEdgeIds.map((edgeId) => graph.activeEdgeById[edgeId]?.metal));
  const mainSectorIds = Array.from(new Set(mainFaces.flatMap((face) => face.sectorIds))).sort((a, b) => a - b);
  const pattern = getInscriptionSectorPattern(mainSectorIds);
  const shape = classifyInscriptionMainShape(pattern);
  return {
    faces,
    mainFaces,
    mainEdgeIds,
    mainMetal,
    mainSectorIds,
    pattern,
    shape,
    gradeMetal: metalIds[highestGradeRank],
  };
}

function buildInscriptionChainInterpretation(component, graph) {
  const branchNodeIds = component.nodeIds.filter((nodeId) => component.degrees[nodeId] > 2);
  const leafNodeIds = component.nodeIds.filter((nodeId) => component.degrees[nodeId] === 1);
  const isStar = branchNodeIds.length > 0;
  const branches = [];

  if (isStar) {
    leafNodeIds.forEach((fromNodeId, fromIndex) => {
      leafNodeIds.slice(fromIndex + 1).forEach((toNodeId) => {
        const path = findInscriptionPathBetweenNodes(component, graph, fromNodeId, toNodeId);
        if (path) {
          branches.push(createInscriptionBranch(path, graph));
        }
      });
    });
  } else if (component.edgeIds.length > 0) {
    const endpoints = leafNodeIds.length >= 2 ? [leafNodeIds[0], leafNodeIds[1]] : component.nodeIds.slice(0, 2);
    const path = findInscriptionPathBetweenNodes(component, graph, endpoints[0], endpoints[1]);
    if (path) {
      branches.push(createInscriptionBranch(path, graph));
    }
  }

  const totalMetalCounts = createMetalRecord(0);
  branches.forEach((branch) => {
    metalIds.forEach((metal) => {
      totalMetalCounts[metal] += branch.metalCounts[metal] || 0;
    });
  });
  const scale = isStar ? 0.05 : 0.1;
  return {
    isStar,
    formula: isStar ? "优化基底" : "优化掺杂",
    formulaTarget: isStar ? "major_attr" : "modifier_attr",
    branchNodeIds,
    leafNodeIds,
    branches,
    totalMetalCounts,
    corrections: buildInscriptionCorrectionEntries(totalMetalCounts, scale),
  };
}

function findInscriptionPathBetweenNodes(component, graph, fromNodeId, toNodeId) {
  if (!fromNodeId || !toNodeId) {
    return null;
  }
  const componentEdgeIds = new Set(component.edgeIds);
  const visitedNodeIds = new Set([fromNodeId]);
  const pathNodeIds = [fromNodeId];
  const pathEdgeIds = [];

  function walk(currentNodeId) {
    if (currentNodeId === toNodeId) {
      return {
        nodeIds: [...pathNodeIds],
        edgeIds: [...pathEdgeIds],
      };
    }
    for (const edge of graph.adjacency[currentNodeId]) {
      if (!componentEdgeIds.has(edge.id)) {
        continue;
      }
      const nextNodeId = edge.from === currentNodeId ? edge.to : edge.from;
      if (visitedNodeIds.has(nextNodeId)) {
        continue;
      }
      visitedNodeIds.add(nextNodeId);
      pathNodeIds.push(nextNodeId);
      pathEdgeIds.push(edge.id);
      const result = walk(nextNodeId);
      if (result) {
        return result;
      }
      pathEdgeIds.pop();
      pathNodeIds.pop();
      visitedNodeIds.delete(nextNodeId);
    }
    return null;
  }

  return walk(fromNodeId);
}

function createInscriptionBranch(path, graph) {
  const metalCounts = createMetalRecord(0);
  const metalSequence = path.edgeIds.map((edgeId) => {
    const metal = graph.activeEdgeById[edgeId]?.metal;
    if (metal) {
      metalCounts[metal] += 1;
    }
    return metal;
  });
  return {
    nodeIds: path.nodeIds,
    edgeIds: path.edgeIds,
    length: path.edgeIds.length,
    metalCounts,
    metalSequence,
  };
}

function buildInscriptionCorrectionEntries(metalCounts, scale) {
  return metalIds
    .map((metal) => {
      const count = metalCounts[metal] || 0;
      const stat = inscriptionMetalPreferenceStats[metal];
      return {
        metal,
        count,
        stat,
        amount: count * scale,
      };
    })
    .filter((entry) => entry.count > 0);
}

function getInscriptionMetalRank(metal) {
  return metalIds.indexOf(metal);
}

function getHighestInscriptionMetal(metals) {
  return metals.filter(Boolean).reduce(
    (best, metal) => (getInscriptionMetalRank(metal) > getInscriptionMetalRank(best) ? metal : best),
    null,
  );
}

function getInscriptionFaceSectorIds(points) {
  return Array.from({ length: 6 }, (_, index) => index).filter((index) =>
    isPointInPolygon(getInscriptionSectorCentroid(index), points),
  );
}

function getInscriptionSectorCentroid(index) {
  const center = getInscriptionNodePosition("center");
  const from = getInscriptionNodePosition(`outer-${index}`);
  const to = getInscriptionNodePosition(`outer-${(index + 1) % 6}`);
  return {
    x: (center.x + from.x + to.x) / 3,
    y: (center.y + from.y + to.y) / 3,
  };
}

function getPolygonSignedArea(points) {
  return (
    points.reduce((sum, point, index) => {
      const next = points[(index + 1) % points.length];
      return sum + point.x * next.y - next.x * point.y;
    }, 0) / 2
  );
}

function getPolygonCentroid(points) {
  const signedArea = getPolygonSignedArea(points);
  if (Math.abs(signedArea) < 0.001) {
    return {
      x: points.reduce((sum, point) => sum + point.x, 0) / Math.max(1, points.length),
      y: points.reduce((sum, point) => sum + point.y, 0) / Math.max(1, points.length),
    };
  }
  let x = 0;
  let y = 0;
  points.forEach((point, index) => {
    const next = points[(index + 1) % points.length];
    const cross = point.x * next.y - next.x * point.y;
    x += (point.x + next.x) * cross;
    y += (point.y + next.y) * cross;
  });
  return {
    x: x / (6 * signedArea),
    y: y / (6 * signedArea),
  };
}

function isPointInPolygon(point, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const current = polygon[i];
    const previous = polygon[j];
    if (isPointOnSegment(point, previous, current)) {
      return true;
    }
    const intersects =
      current.y > point.y !== previous.y > point.y &&
      point.x < ((previous.x - current.x) * (point.y - current.y)) / (previous.y - current.y) + current.x;
    if (intersects) {
      inside = !inside;
    }
  }
  return inside;
}

function isPointOnSegment(point, from, to) {
  const cross = (point.y - from.y) * (to.x - from.x) - (point.x - from.x) * (to.y - from.y);
  if (Math.abs(cross) > 0.001) {
    return false;
  }
  const dot = (point.x - from.x) * (to.x - from.x) + (point.y - from.y) * (to.y - from.y);
  if (dot < -0.001) {
    return false;
  }
  const lengthSquared = (to.x - from.x) ** 2 + (to.y - from.y) ** 2;
  return dot <= lengthSquared + 0.001;
}

function getInscriptionSectorPattern(sectorIds) {
  const sectorSet = new Set(sectorIds);
  return Array.from({ length: 6 }, (_, index) => (sectorSet.has(index) ? "1" : "0")).join("");
}

function classifyInscriptionMainShape(pattern) {
  const match = inscriptionMainShapePatterns.find((shape) => getInscriptionPatternVariants(shape.pattern).includes(pattern));
  return match || { pattern, label: "未分类" };
}

function getInscriptionPatternVariants(pattern) {
  const variants = new Set();
  [pattern, pattern.split("").reverse().join("")].forEach((source) => {
    for (let index = 0; index < source.length; index += 1) {
      variants.add(source.slice(index) + source.slice(0, index));
    }
  });
  return Array.from(variants);
}

function buildInscriptionPreview(blade) {
  const inscription = normalizeBladeInscription(blade?.inscription);
  const counts = getInscriptionCounts(inscription);
  const cost = calculateInscriptionCost(counts);
  const demand = getInscriptionConductivityDemand(counts);
  const capacity = Math.max(0, Math.floor(Number(blade?.maxStats?.conductivity ?? blade?.stats?.conductivity) || 0));
  const margin = capacity - demand;
  const hasContent = counts.filledEdges > 0;

  return {
    hasContent,
    inscription,
    cost,
    conductivity: {
      demand,
      capacity,
      margin,
    },
    structure: {
      filledEdges: counts.filledEdges,
      filledRingEdges: counts.filledRingEdges,
      filledSpokeEdges: counts.filledSpokeEdges,
      completedRing: counts.completedRing,
      completedSpokes: counts.completedSpokes,
      edgeCounts: { ...counts.edgeCounts },
    },
    interpretation: buildInscriptionInterpretation(inscription),
    effects: buildInscriptionEffectLines(counts, { demand, capacity, margin }),
  };
}

function buildInscriptionEffectLines(counts, conductivity) {
  if (counts.filledEdges === 0) {
    return ["尚未绘制金属边。"];
  }
  return [
    "当前阶段只生成铭文解析，不生成最终战斗效果。",
    `导能需求 ${formatInteger(conductivity.demand)} / 容量 ${formatInteger(conductivity.capacity)}：${
      conductivity.margin >= 0 ? "当前刃可承载。" : `当前刃超载 ${formatInteger(Math.abs(conductivity.margin))}。`
    }`,
  ];
}

function getInscriptionResourceLabel(resource) {
  return resource === "salt" ? "盐" : metalLabels[resource] || resource;
}

function getInscriptionMetalColor(metal) {
  return inscriptionMetalColors[metal] || "var(--accent-2)";
}

function getInscriptionCostEntries(cost) {
  return inscriptionCostResourceOrder
    .map((resource) => [resource, Math.max(0, Math.floor(Number(cost[resource]) || 0))])
    .filter(([, amount]) => amount > 0);
}

function formatBattleBladeInscriptionLine(blade) {
  const preview = buildInscriptionPreview(blade);
  if (!preview.hasContent) {
    return "铭文：空";
  }
  return `铭文：${formatInteger(preview.structure.filledEdges)}/12 边 · 导能 ${formatInteger(preview.conductivity.demand)}`;
}

function getInscriptionNodePosition(nodeId) {
  if (nodeId === "center") {
    return { x: 50, y: 50 };
  }
  const node = inscriptionOuterNodeConfigs.find((item) => item.id === nodeId);
  const index = node?.index || 0;
  const angle = -Math.PI / 2 + (Math.PI * 2 * index) / 6;
  const radius = 36;
  return {
    x: 50 + Math.cos(angle) * radius,
    y: 50 + Math.sin(angle) * radius,
  };
}

function getInscriptionEdgePosition(edge) {
  const from = getInscriptionNodePosition(edge.from);
  const to = getInscriptionNodePosition(edge.to);
  if (edge.type === "spoke") {
    return {
      x: from.x + (to.x - from.x) * 0.58,
      y: from.y + (to.y - from.y) * 0.58,
    };
  }
  const midpoint = {
    x: (from.x + to.x) / 2,
    y: (from.y + to.y) / 2,
  };
  const dx = midpoint.x - 50;
  const dy = midpoint.y - 50;
  const length = Math.max(1, Math.sqrt(dx * dx + dy * dy));
  return {
    x: midpoint.x + (dx / length) * 6,
    y: midpoint.y + (dy / length) * 6,
  };
}

function loadBattleToolbox() {
  try {
    const raw = localStorage.getItem(BATTLE_TOOLBOX_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.map(normalizeBattleToolboxBlade);
  } catch {
    return [];
  }
}

function saveBattleToolbox() {
  try {
    localStorage.setItem(BATTLE_TOOLBOX_STORAGE_KEY, JSON.stringify(battleToolbox));
  } catch {
    addBattleLog("工具箱保存失败", "浏览器阻止了 localStorage 写入。");
  }
}

function normalizeDebugMode(mode) {
  return debugModeIds.includes(mode) ? mode : "forging";
}

function loadDebugMode() {
  try {
    return normalizeDebugMode(localStorage.getItem(DEBUG_MODE_STORAGE_KEY));
  } catch {
    return "forging";
  }
}

function saveDebugMode(mode) {
  try {
    localStorage.setItem(DEBUG_MODE_STORAGE_KEY, normalizeDebugMode(mode));
  } catch {
    // The tab choice is only a convenience setting; the tool can continue without it.
  }
}

function normalizeBattleToolboxBlade(source) {
  const normalized = battleFormula.normalizeBlade(source);
  const normalizedBlade = {
    ...normalized,
    name: typeof source?.name === "string" ? source.name : normalized.name,
    isComplete: Boolean(source?.isComplete),
    inscription: normalizeBladeInscription(source?.inscription),
  };
  normalizedBlade.isComplete = isBattleBladeComplete(normalizedBlade);
  return {
    ...normalizedBlade,
  };
}

function createBattleBlade({ stats = createStatRecord(), inputs = null, name = "", isComplete = true } = {}) {
  const normalizedStats = battleFormula.normalizeStats(stats);
  const blade = normalizeBattleToolboxBlade({
    id: createBattleRecordId("debug-blade"),
    name: name || "",
    stats: normalizedStats,
    maxStats: { ...normalizedStats },
    inputs,
    createdAt: new Date().toISOString(),
    uses: 0,
    kills: 0,
    inscription: createEmptyInscription(),
    isComplete,
  });
  if (!blade.name && isBattleBladeComplete(blade)) {
    blade.name = generateBattleBladeName(blade);
  }
  if (!blade.name) {
    blade.name = "待命名";
  }
  return blade;
}

function createBattleRecordId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function getSelectedBattleBlade() {
  ensureSelectedBattleBlade();
  return battleToolbox.find((blade) => blade.id === selectedBattleBladeId) || null;
}

function ensureSelectedBattleBlade() {
  if (battleToolbox.length === 0) {
    selectedBattleBladeId = null;
    battleSelectedDeleteIds.clear();
    return null;
  }
  if (!battleToolbox.some((blade) => blade.id === selectedBattleBladeId)) {
    selectedBattleBladeId = battleToolbox[0].id;
  }
  battleSelectedDeleteIds.forEach((bladeId) => {
    if (!battleToolbox.some((blade) => blade.id === bladeId)) {
      battleSelectedDeleteIds.delete(bladeId);
    }
  });
  return selectedBattleBladeId;
}

function setSelectedBattleBlade(bladeId) {
  selectedBattleBladeId = battleToolbox.some((blade) => blade.id === bladeId) ? bladeId : null;
  battleSelectedDeleteIds.delete(bladeId);
  resetInteractiveBattleState();
  renderActiveDebugMode();
}

function isBattleBladeComplete(blade) {
  return Boolean(blade) && hasBattleBladeNumericStats(blade) && hasBattleBladeUsableFactoryStats(blade);
}

function hasBattleBladeNumericStats(blade) {
  if (!blade) {
    return false;
  }
  return statIds.every((stat) => {
    const maxValue = Number(blade.maxStats?.[stat]);
    const currentValue = Number(blade.stats?.[stat]);
    if (!Number.isFinite(maxValue) || !Number.isFinite(currentValue)) {
      return false;
    }
    return maxValue >= 0 && currentValue >= 0;
  });
}

function hasBattleBladeUsableFactoryStats(blade) {
  return battleFormula.pauseStatIds.every((stat) => Number(blade.maxStats?.[stat]) > 0);
}

function ensureBattleBladeName(blade) {
  if (!blade || !isBattleBladeComplete(blade)) {
    return;
  }
  if (!blade.name || blade.name === "待命名" || blade.name === "未命名刃") {
    blade.name = generateBattleBladeName(blade);
    blade.isComplete = true;
  }
}

function generateBattleBladeName(blade) {
  return bladeNaming.formatBladeName(blade.inputs || {}, blade.maxStats || blade.stats, {
    metalIds,
    statIds,
    resourceLabels: metalLabels,
  });
}

function setDebugMode(mode) {
  debugMode = normalizeDebugMode(mode);
  saveDebugMode(debugMode);
  elements.debugModeTabs.forEach((button) => {
    const selected = button.dataset.debugMode === debugMode;
    button.classList.toggle("is-active", selected);
    button.setAttribute("aria-selected", String(selected));
  });
  elements.debugPanels.forEach((panel) => {
    const selected = panel.dataset.debugPanel === debugMode;
    panel.hidden = !selected;
    panel.classList.toggle("is-active", selected);
  });
  renderActiveDebugMode();
}

function renderActiveDebugMode() {
  if (debugMode === "battle") {
    renderBattleDebug();
    return;
  }
  if (debugMode === "inscription") {
    renderInscriptionDebug();
  }
}

function renderBattleStaticControls() {
  renderBattleEnemyInputs();
  renderBattleEnemyIncrementInputs();
  renderBattleEnemyGeneratorInputs();
  renderBattleParamInputs();
  renderBattleKHelp();
  renderBattleMaintenanceInputs();
  syncBattleEnemyModeControls();
  renderBattleRuleOutput();
}

function renderBattleEnemyInputs() {
  renderBattleNumberInputs(elements.battleEnemyInputs, [
    { id: "cr", label: "CR", min: 0, value: battleFormula.defaultEnemy.cr },
    { id: "hp", label: "HP", min: -999999, value: battleFormula.defaultEnemy.hp },
    { id: "hardness", label: "坚硬", min: -999999, value: battleFormula.defaultEnemy.hardness },
    { id: "fracture", label: "崩裂", min: -999999, value: battleFormula.defaultEnemy.fracture },
    { id: "wear", label: "磨损", min: -999999, value: battleFormula.defaultEnemy.wear },
    { id: "rust", label: "锈蚀", min: -999999, value: battleFormula.defaultEnemy.rust },
  ], "battleEnemy");
}

function renderBattleEnemyIncrementInputs() {
  renderBattleNumberInputs(elements.battleEnemyIncrementInputs, [
    { id: "cr", label: "CR递增", min: 0, value: 0 },
    { id: "hp", label: "HP递增", min: -999999, value: 0 },
    { id: "hardness", label: "坚硬递增", min: -999999, value: 0 },
    { id: "fracture", label: "崩裂递增", min: -999999, value: 0 },
    { id: "wear", label: "磨损递增", min: -999999, value: 0 },
    { id: "rust", label: "锈蚀递增", min: -999999, value: 0 },
  ], "battleEnemyIncrement");
}

function renderBattleEnemyGeneratorInputs() {
  renderBattleNumberInputs(elements.battleEnemyGeneratorInputs, [
    { id: "cr", label: "CR", min: 0, step: 1, value: battleFormula.defaultEnemyGenerationConfig.cr },
    {
      id: "hpK",
      label: "HP k",
      min: 0.01,
      step: 0.01,
      value: battleFormula.defaultEnemyGenerationConfig.hpK,
    },
    {
      id: "hpS",
      label: "HP s",
      min: 0.01,
      step: 0.01,
      value: battleFormula.defaultEnemyGenerationConfig.hpS,
    },
    {
      id: "hpMultiplierMin",
      label: "HP倍率低",
      min: 0.01,
      step: 0.01,
      value: battleFormula.defaultEnemyGenerationConfig.hpMultiplierMin,
    },
    {
      id: "hpMultiplierMax",
      label: "HP倍率高",
      min: 0.01,
      step: 0.01,
      value: battleFormula.defaultEnemyGenerationConfig.hpMultiplierMax,
    },
    {
      id: "pointK",
      label: "购点 k",
      min: 0.01,
      step: 0.01,
      value: battleFormula.defaultEnemyGenerationConfig.pointK,
    },
    {
      id: "pointS",
      label: "购点 s",
      min: 0.01,
      step: 0.01,
      value: battleFormula.defaultEnemyGenerationConfig.pointS,
    },
    {
      id: "focusShareMin",
      label: "优势额外低",
      min: 0,
      step: 0.01,
      value: battleFormula.defaultEnemyGenerationConfig.focusShareMin,
    },
    {
      id: "focusShareMax",
      label: "优势额外高",
      min: 0,
      step: 0.01,
      value: battleFormula.defaultEnemyGenerationConfig.focusShareMax,
    },
  ], "battleEnemyGenerator");
}

function renderBattleParamInputs() {
  renderBattleNumberInputs(elements.battleParamInputs, [
    { id: "dullingK", label: "钝化 k", min: 0, step: 0.1, value: battleFormula.defaultParams.dullingK },
    { id: "dullingS", label: "钝化 s", min: 0, step: 0.1, value: battleFormula.defaultParams.dullingS },
    { id: "honingK", label: "磨刃 k", min: 0, step: 0.1, value: battleFormula.defaultParams.honingK },
    { id: "honingS", label: "磨刃 s", min: 0, step: 0.1, value: battleFormula.defaultParams.honingS },
    { id: "conductivityK", label: "导能 k", min: 0, step: 0.1, value: battleFormula.defaultParams.conductivityK },
    { id: "rustK", label: "锈蚀 k", min: 0, step: 0.1, value: battleFormula.defaultParams.rustK },
    {
      id: "attackIntervalSeconds",
      label: "攻击间隔",
      min: 0.05,
      step: 0.05,
      value: battleFormula.defaultParams.attackIntervalSeconds,
    },
    {
      id: "fullSharpnessHoneDelaySeconds",
      label: "满锋延迟",
      min: 0.05,
      step: 0.05,
      value: battleFormula.defaultParams.fullSharpnessHoneDelaySeconds,
    },
  ], "battleParam");
}

function renderBattleMaintenanceInputs() {
  elements.battleMaintenanceEnabled.checked = battleFormula.defaultMaintenancePolicy.enabled;
  elements.battleMaintenanceFullHone.checked = battleFormula.defaultMaintenancePolicy.allowFullSharpnessHone;
  renderBattleNumberInputs(elements.battleMaintenanceInputs, [
    {
      id: "sharpenAtOrBelow",
      label: "锋利 <=",
      min: 0,
      step: 1,
      value: battleFormula.defaultMaintenancePolicy.sharpenAtOrBelow,
    },
    {
      id: "sharpenToAtLeast",
      label: "磨到 >=",
      min: 0,
      step: 1,
      value: battleFormula.defaultMaintenancePolicy.sharpenToAtLeast,
    },
    {
      id: "minDurability",
      label: "最低耐久",
      min: 0,
      step: 1,
      value: battleFormula.defaultMaintenancePolicy.minDurability,
    },
    {
      id: "maxHonesPerBattle",
      label: "最大磨刃",
      min: 0,
      step: 1,
      value: battleFormula.defaultMaintenancePolicy.maxHonesPerBattle,
    },
  ], "battleMaintenance");
}

function renderBattleNumberInputs(container, fields, dataPrefix) {
  container.replaceChildren(
    ...fields.map((field) => {
      const label = document.createElement("label");
      const span = document.createElement("span");
      const input = document.createElement("input");
      span.textContent = field.label;
      input.type = "number";
      input.step = String(field.step ?? 1);
      if (Number.isFinite(field.min)) {
        input.min = String(field.min);
      }
      input.value = String(field.value);
      input.dataset[dataPrefix] = field.id;
      label.append(span, input);
      return label;
    }),
  );
}

function renderBattleDebug() {
  ensureSelectedBattleBlade();
  renderBattleToolbox();
  renderBattleBladeEditor();
  renderBattleOutputs();
  renderBattleButtons();
  renderBattleRuleOutput();
}

function renderInscriptionDebug() {
  ensureSelectedBattleBlade();
  renderBattleToolbox();
  renderInscriptionBladeSummary();
  renderInscriptionEditor();
  renderBattleButtons();
}

function renderInscriptionBladeSummary() {
  const blade = getSelectedBattleBlade();
  if (!blade) {
    elements.inscriptionCurrentSummary.textContent = "选择一把刃，或从锻造调校导入。";
    elements.inscriptionBladeSummary.className = "battle-state-grid empty-state";
    elements.inscriptionBladeSummary.textContent = "选择或新建一把刃。";
    return;
  }

  elements.inscriptionCurrentSummary.textContent = `${blade.name || "待命名"} · ${getBattleBladeStatusText(
    blade,
  )} · ${formatBattleBladeInscriptionLine(blade)}`;
  elements.inscriptionBladeSummary.className = "battle-state-grid inscription-blade-summary";
  elements.inscriptionBladeSummary.replaceChildren(
    ...statIds.map((stat) =>
      createBattleMiniStat(
        statLabels[stat],
        `${formatInteger(blade.stats[stat])} / ${formatInteger(blade.maxStats[stat])}`,
        stat === "conductivity" ? "当前 / 出厂；铭文以出厂导能估承载" : "",
      ),
    ),
  );
}

function renderBattleToolbox() {
  getBattleToolboxSummaryElements().forEach((summary) => {
    summary.textContent = `${formatInteger(battleToolbox.length)} 把 · 本地保存`;
  });
  getBattleToolboxListElements().forEach(renderBattleToolboxList);
}

function getBattleToolboxSummaryElements() {
  return [elements.battleToolboxSummary, elements.inscriptionToolboxSummary].filter(Boolean);
}

function getBattleToolboxListElements() {
  return [elements.battleToolboxList, elements.inscriptionToolboxList].filter(Boolean);
}

function renderBattleToolboxList(container) {
  if (battleToolbox.length === 0) {
    container.className = "battle-toolbox-list empty-state";
    container.textContent = "暂无刃。";
    return;
  }

  container.className = "battle-toolbox-list";
  container.replaceChildren(
    ...battleToolbox.map((blade) => {
      const item = document.createElement("article");
      item.className = "battle-toolbox-item";
      item.classList.toggle("is-selected", blade.id === selectedBattleBladeId);

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = battleSelectedDeleteIds.has(blade.id);
      checkbox.dataset.battleToolboxCheck = blade.id;
      checkbox.setAttribute("aria-label", `多选 ${blade.name}`);

      const button = document.createElement("button");
      button.className = "battle-toolbox-button";
      button.type = "button";
      button.dataset.battleToolboxBlade = blade.id;
      const name = document.createElement("strong");
      name.textContent = blade.name || "待命名";
      const stats = document.createElement("small");
      stats.textContent = formatBattleBladeLine(blade);
      const status = document.createElement("small");
      status.textContent = getBattleBladeStatusText(blade);
      const inscription = document.createElement("small");
      inscription.textContent = formatBattleBladeInscriptionLine(blade);
      button.append(name, stats, status, inscription);
      item.append(checkbox, button);
      return item;
    }),
  );
}

function formatBattleBladeLine(blade) {
  return statIds
    .map((stat) => `${statLabels[stat]} ${formatInteger(blade.stats[stat])}/${formatInteger(blade.maxStats[stat])}`)
    .join(" · ");
}

function getBattleBladeStatusText(blade) {
  if (!isBattleBladeComplete(blade)) {
    return "属性未填完";
  }
  const pauseReason = battleFormula.getPauseReason(blade);
  if (pauseReason) {
    return `暂停：${pauseReason.label}`;
  }
  const damaged = statIds.some((stat) => Number(blade.stats[stat]) < Number(blade.maxStats[stat]));
  return damaged ? "已损耗" : "完整";
}

function renderInscriptionWireTray() {
  const tray = elements.inscriptionWireTray;
  if (!tray) {
    return;
  }
  const choices = [
    ...metalIds.map((metal) => ({
      value: metal,
      label: metalLabels[metal],
      color: getInscriptionMetalColor(metal),
    })),
    {
      value: inscriptionEraseValue,
      label: "删除",
      color: "#e8ded2",
    },
  ];
  tray.replaceChildren(
    ...choices.map((choice) => {
      const tool = document.createElement("button");
      tool.type = "button";
      tool.className = `inscription-wire-tool${choice.value === inscriptionEraseValue ? " is-erase" : ""}${
        inscriptionGesture.selectedTool === choice.value ? " is-selected" : ""
      }`;
      tool.dataset.inscriptionWireTool = choice.value;
      tool.style.setProperty("--wire-color", choice.color);
      tool.setAttribute("aria-pressed", inscriptionGesture.selectedTool === choice.value ? "true" : "false");
      tool.title = choice.value === inscriptionEraseValue ? "删除已绘制的金属边" : `使用${choice.label}丝绘制`;

      const strand = document.createElement("span");
      strand.className = "inscription-wire-strand";
      const label = document.createElement("span");
      label.className = "inscription-wire-label";
      label.textContent = choice.label;
      tool.append(strand, label);
      return tool;
    }),
  );
}

function renderInscriptionEditor() {
  stopInscriptionStroke();
  renderInscriptionWireTray();
  const blade = getSelectedBattleBlade();
  if (!blade) {
    elements.inscriptionGraph.className = "inscription-graph is-empty";
    elements.inscriptionGraph.replaceChildren(createInscriptionEmptyNote("选择或新建一把刃。"));
    renderInscriptionPreview(null);
    return;
  }

  blade.inscription = normalizeBladeInscription(blade.inscription);
  elements.inscriptionGraph.className = "inscription-graph";
  elements.inscriptionGraph.replaceChildren(createInscriptionGraphSvg(blade.inscription));
  renderInscriptionPreview(blade);
}

function createInscriptionGraphSvg(inscription) {
  const normalized = normalizeBladeInscription(inscription);
  const svg = createSvgElement("svg", {
    class: "inscription-svg",
    viewBox: "0 0 100 100",
    role: "application",
    "aria-label": "铭文图",
  });
  const visualEdges = createSvgElement("g", { class: "inscription-visual-edges" });
  const visualNodes = createSvgElement("g", { class: "inscription-visual-nodes" });
  const hitEdges = createSvgElement("g", { class: "inscription-hit-edges" });

  inscriptionEdgeConfigs.forEach((edge) => {
    const from = getInscriptionNodePosition(edge.from);
    const to = getInscriptionNodePosition(edge.to);
    const metal = normalized.edges[edge.id];
    const lineAttributes = {
      class: `inscription-edge-line ${edge.type === "ring" ? "is-ring" : "is-spoke"}${metal ? " is-filled" : ""}`,
      x1: from.x,
      y1: from.y,
      x2: to.x,
      y2: to.y,
      "data-inscription-edge-visual": edge.id,
    };
    if (metal) {
      lineAttributes.style = `--inscription-fill-color: ${getInscriptionMetalColor(metal)}`;
    }
    const line = createSvgElement("line", lineAttributes);
    const hit = createSvgElement("line", {
      class: "inscription-edge-hit",
      x1: from.x,
      y1: from.y,
      x2: to.x,
      y2: to.y,
      "data-inscription-edge": edge.id,
      "aria-label": `${edge.type === "ring" ? "车轮边" : "辐射边"} ${edge.index + 1}`,
    });
    visualEdges.append(line);
    hitEdges.append(hit);
  });

  inscriptionNodeConfigs.forEach((node) => {
    const position = getInscriptionNodePosition(node.id);
    const circleAttributes = {
      class: `inscription-node-circle${node.id === "center" ? " is-center" : ""}`,
      cx: position.x,
      cy: position.y,
      r: node.id === "center" ? 6.1 : 4.9,
    };
    const circle = createSvgElement("circle", circleAttributes);
    visualNodes.append(circle);
  });

  svg.append(visualEdges, visualNodes, hitEdges);
  return svg;
}

function renderInscriptionPreview(blade) {
  if (!blade) {
    elements.inscriptionPriceOutput.className = "inscription-output empty-state";
    elements.inscriptionPriceOutput.textContent = "选择刃后显示解读。";
    elements.inscriptionEffectOutput.className = "inscription-output empty-state";
    elements.inscriptionEffectOutput.textContent = "选择刃后显示效果。";
    return;
  }

  const preview = buildInscriptionPreview(blade);
  renderInscriptionInterpretationPreview(preview);
  renderInscriptionEffectPreview(preview);
}

function renderInscriptionInterpretationPreview(preview) {
  const wrapper = document.createElement("div");
  wrapper.className = "inscription-interpretation";
  const grid = document.createElement("div");
  grid.className = "battle-state-grid inscription-summary-grid";
  grid.append(
    createBattleMiniStat("边", `${formatInteger(preview.structure.filledEdges)} / 12`),
    createBattleMiniStat("联通分量", formatInteger(preview.interpretation.componentCount)),
    createBattleMiniStat(
      "导能需求",
      `6 × ${formatInteger(preview.structure.filledEdges)} + ${formatInteger(preview.structure.filledEdges)}² = ${formatInteger(
        preview.conductivity.demand,
      )}`,
    ),
    createBattleMiniStat(
      "承载",
      `${formatInteger(preview.conductivity.demand)} / ${formatInteger(preview.conductivity.capacity)}`,
      preview.conductivity.margin >= 0 ? "可承载" : `超载 ${formatInteger(Math.abs(preview.conductivity.margin))}`,
    ),
  );
  wrapper.append(grid);

  if (!preview.hasContent) {
    wrapper.append(createInscriptionEmptyNote("尚未绘制金属边。"));
    elements.inscriptionPriceOutput.className = "inscription-output empty-state";
    elements.inscriptionPriceOutput.replaceChildren(wrapper);
    return;
  }

  preview.interpretation.components.forEach((component) => {
    wrapper.append(createInscriptionComponentInterpretationNode(component));
  });
  elements.inscriptionPriceOutput.className = "inscription-output";
  elements.inscriptionPriceOutput.replaceChildren(wrapper);
}

function createInscriptionComponentInterpretationNode(component) {
  const section = document.createElement("article");
  section.className = "inscription-interpretation-section";
  const header = document.createElement("div");
  header.className = "inscription-interpretation-head";
  const title = document.createElement("h4");
  title.textContent = `分量 ${formatInteger(component.index)} · ${component.label}`;
  const summary = document.createElement("small");
  summary.textContent = `${formatInteger(component.edgeCount)} 边 · ${formatInteger(component.nodeCount)} 顶点`;
  header.append(title, summary);
  section.append(header);

  if (component.kind === "face") {
    section.append(createInscriptionFaceInterpretationNode(component.faceInterpretation));
  } else {
    section.append(createInscriptionChainInterpretationNode(component.chain));
  }
  return section;
}

function createInscriptionChainInterpretationNode(chain) {
  const content = document.createElement("div");
  content.className = "inscription-chain-readout";
  const summary = document.createElement("div");
  summary.className = "inscription-chip-list";
  summary.append(
    createInscriptionChip(chain.formula),
    createInscriptionChip(chain.formulaTarget),
    createInscriptionChip(`${formatInteger(chain.branches.length)} 支链`),
  );
  content.append(summary);

  const branchList = document.createElement("div");
  branchList.className = "inscription-branch-list";
  if (chain.branches.length === 0) {
    branchList.append(createInscriptionEmptyNote("没有可解析的支链。"));
  } else {
    chain.branches.forEach((branch, index) => {
      branchList.append(createInscriptionBranchNode(branch, index));
    });
  }
  content.append(branchList);

  const corrections = document.createElement("div");
  corrections.className = "inscription-correction-list";
  if (chain.corrections.length === 0) {
    corrections.append(createInscriptionChip("无修正", "is-empty"));
  } else {
    chain.corrections.forEach((entry) => {
      corrections.append(
        createInscriptionChip(
          `${statLabels[entry.stat]} +${formatDecimal(entry.amount, 2)}（${metalLabels[entry.metal]} ${formatInteger(entry.count)}边）`,
        ),
      );
    });
  }
  content.append(corrections);
  return content;
}

function createInscriptionBranchNode(branch, index) {
  const item = document.createElement("div");
  item.className = "inscription-branch-item";
  const title = document.createElement("strong");
  title.textContent = `支链 ${formatInteger(index + 1)} · ${formatInteger(branch.length)} 边`;
  const path = document.createElement("small");
  path.textContent = branch.nodeIds.map(getInscriptionNodeDisplayLabel).join(" → ");
  const metals = document.createElement("span");
  metals.className = "inscription-branch-metals";
  metals.textContent = branch.metalSequence.map((metal) => metalLabels[metal] || "空").join(" - ");
  item.append(title, path, metals);
  return item;
}

function createInscriptionFaceInterpretationNode(faceInterpretation) {
  const content = document.createElement("div");
  content.className = "inscription-face-readout";
  const map = createInscriptionFaceMapSvg(faceInterpretation.mainSectorIds, faceInterpretation.mainMetal);
  const details = document.createElement("div");
  details.className = "inscription-face-details";
  const summary = document.createElement("div");
  summary.className = "inscription-chip-list";
  summary.append(
    createInscriptionChip(`分类：${faceInterpretation.shape.label}`),
    createInscriptionChip(`图式：${faceInterpretation.shape.pattern}`),
    createInscriptionChip(`主金属：${metalLabels[faceInterpretation.mainMetal] || "无"}`),
    createInscriptionChip(`下限阶级：${metalLabels[faceInterpretation.gradeMetal] || "无"}`),
  );
  const faceList = document.createElement("div");
  faceList.className = "inscription-face-list";
  faceInterpretation.faces.forEach((face) => {
    const isMain = faceInterpretation.mainFaces.some((mainFace) => mainFace.key === face.key);
    faceList.append(
      createInscriptionChip(
        `面${formatInteger(face.index)}：${formatInscriptionSectorIds(face.sectorIds)} · 阶级${metalLabels[face.gradeMetal]} · 上限${metalLabels[face.topMetal]}`,
        isMain ? "is-main" : "",
      ),
    );
  });
  details.append(summary, faceList);
  content.append(map, details);
  return content;
}

function createInscriptionChip(text, extraClass = "") {
  const chip = document.createElement("span");
  chip.className = `inscription-chip${extraClass ? ` ${extraClass}` : ""}`;
  chip.textContent = text;
  return chip;
}

function createInscriptionFaceMapSvg(sectorIds, metal) {
  const selectedSectorIds = new Set(sectorIds);
  const svg = createSvgElement("svg", {
    class: "inscription-face-map",
    viewBox: "0 0 100 100",
    "aria-label": "主符号面图",
  });
  svg.style.setProperty("--face-color", getInscriptionMetalColor(metal));
  Array.from({ length: 6 }, (_, index) => index).forEach((index) => {
    const center = getInscriptionNodePosition("center");
    const from = getInscriptionNodePosition(`outer-${index}`);
    const to = getInscriptionNodePosition(`outer-${(index + 1) % 6}`);
    svg.append(
      createSvgElement("polygon", {
        class: `inscription-face-sector${selectedSectorIds.has(index) ? " is-selected" : ""}`,
        points: `${center.x},${center.y} ${from.x},${from.y} ${to.x},${to.y}`,
      }),
    );
  });
  inscriptionEdgeConfigs.forEach((edge) => {
    const from = getInscriptionNodePosition(edge.from);
    const to = getInscriptionNodePosition(edge.to);
    svg.append(
      createSvgElement("line", {
        class: "inscription-face-map-line",
        x1: from.x,
        y1: from.y,
        x2: to.x,
        y2: to.y,
      }),
    );
  });
  return svg;
}

function getInscriptionNodeDisplayLabel(nodeId) {
  if (nodeId === "center") {
    return "中心";
  }
  const match = /^outer-(\d+)$/.exec(nodeId);
  return match ? `外${formatInteger(Number(match[1]) + 1)}` : nodeId;
}

function formatInscriptionSectorIds(sectorIds) {
  return sectorIds.map((index) => `面${formatInteger(index + 1)}`).join("+");
}

function renderInscriptionEffectPreview(preview) {
  const list = document.createElement("ul");
  list.className = "inscription-effect-list";
  list.append(
    ...preview.effects.map((effect) => {
      const item = document.createElement("li");
      item.textContent = effect;
      return item;
    }),
  );
  elements.inscriptionEffectOutput.className = `inscription-output${preview.hasContent ? "" : " empty-state"}`;
  elements.inscriptionEffectOutput.replaceChildren(list);
}

function createInscriptionEmptyNote(text) {
  const note = document.createElement("div");
  note.className = "inscription-empty-note";
  note.textContent = text;
  return note;
}

function renderBattleBladeEditor() {
  const blade = getSelectedBattleBlade();
  if (!blade) {
    elements.battleBladeEditor.className = "battle-stat-editor empty-state";
    elements.battleBladeEditor.textContent = "选择或新建一把刃。";
    renderBattleBladeEditorRadar(null);
    elements.battleCurrentSummary.textContent = "选择一把刃，或从锻造调校导入。";
    return;
  }

  elements.battleBladeEditor.className = "battle-stat-editor";
  elements.battleCurrentSummary.textContent = `${blade.name || "待命名"} · ${getBattleBladeStatusText(blade)}`;
  elements.battleBladeEditor.replaceChildren(
    ...statIds.map((stat) => {
      const wrapper = document.createElement("label");
      wrapper.className = "battle-stat-input";
      const title = document.createElement("span");
      title.textContent = statLabels[stat];
      const pair = document.createElement("div");
      pair.className = "battle-stat-pair";

      const maxInput = document.createElement("input");
      maxInput.type = "number";
      maxInput.min = "0";
      maxInput.step = "1";
      maxInput.value = String(blade.maxStats[stat]);
      maxInput.title = "出厂值";
      maxInput.dataset.battleBladeStat = stat;
      maxInput.dataset.battleBladeStatKind = "max";

      const currentInput = document.createElement("input");
      currentInput.type = "number";
      currentInput.min = "0";
      currentInput.step = "1";
      currentInput.value = String(blade.stats[stat]);
      currentInput.title = "当前值";
      currentInput.dataset.battleBladeStat = stat;
      currentInput.dataset.battleBladeStatKind = "current";

      pair.append(maxInput, currentInput);
      wrapper.append(title, pair);
      return wrapper;
    }),
  );
  renderBattleBladeEditorRadar(blade);
}

function renderBattleBladeEditorRadar(blade) {
  renderBattleRadarInto(elements.battleBladeEditorRadar, blade, "battle-editor-radar");
}

function renderBattleOutputs() {
  const blade = getSelectedBattleBlade();
  elements.battleAutoState.textContent = battleAutoTimer ? "自动中" : "暂停";
  elements.battleAutoState.classList.toggle("is-active", Boolean(battleAutoTimer));
  renderBattleEnemyCurrent(blade);
  renderBattleFormulaPreview(blade);
  renderBattleStateOutput(blade);
  renderBattleRadar(blade);
  renderBattleLog();
}

function renderBattleEnemyCurrent(blade) {
  const enemy = battleFormula.normalizeEnemy(currentBattleEnemy);
  const baseEnemy = getInteractiveEnemyForBattle(battleKills);
  const hpBase = Number(baseEnemy.hp) || 0;
  const hpCurrent = Number(enemy.hp) || 0;
  const hpScale = Math.max(1, hpBase, hpCurrent);
  const hpRatio = Math.max(0, Math.min(1, hpCurrent / hpScale));
  const wrapper = document.createElement("div");
  wrapper.className = "battle-enemy-current";

  const head = document.createElement("div");
  head.className = "battle-enemy-current-head";
  const title = document.createElement("strong");
  title.textContent = `第 ${formatInteger(battleKills + 1)} 场 · ${enemy.name || "敌人"} · CR ${formatInteger(enemy.cr)}`;
  const status = document.createElement("small");
  status.textContent = battleAutoTimer ? "自动战斗中" : blade ? "暂停中" : "未选刃";
  head.append(title, status);

  const hpRow = document.createElement("div");
  hpRow.className = "battle-enemy-hp-row";
  const hpText = document.createElement("strong");
  hpText.textContent = `HP ${formatInteger(hpCurrent)} / ${formatInteger(hpBase)}`;
  const hpMeter = document.createElement("div");
  hpMeter.className = "battle-enemy-hp-meter";
  const hpFill = document.createElement("span");
  hpFill.style.width = `${formatDecimal(hpRatio * 100, 2)}%`;
  hpMeter.append(hpFill);
  hpRow.append(hpText, hpMeter);

  const statGrid = document.createElement("div");
  statGrid.className = "battle-enemy-stat-grid";
  [
    ["盐奖励", battleFormula.getEnemySaltReward(enemy)],
    ["坚硬", enemy.hardness],
    ["崩裂", enemy.fracture],
    ["磨损", enemy.wear],
    ["锈蚀", enemy.rust],
  ].forEach(([label, value]) => {
    statGrid.append(createBattleMiniStat(label, formatInteger(value)));
  });

  wrapper.append(head, hpRow, statGrid);
  elements.battleEnemyCurrent.className = "battle-enemy-current-slot";
  elements.battleEnemyCurrent.replaceChildren(wrapper);
}

function renderBattleStateOutput(blade) {
  if (!blade) {
    elements.battleOutcomeNote.textContent = "尚未开始。";
    elements.battleStateOutput.className = "battle-state-output empty-state";
    elements.battleStateOutput.textContent = "等待选择刃。";
    return;
  }

  const pauseReason = battleFormula.getPauseReason(blade);
  elements.battleOutcomeNote.textContent = pauseReason
    ? `暂停：${pauseReason.message}`
    : lastBattleContextPauseReason
      ? `暂停：${lastBattleContextPauseReason.message}`
      : "可以战斗。";
  elements.battleStateOutput.className = "battle-state-output";
  const enemy = currentBattleEnemy;
  const grid = document.createElement("div");
  grid.className = "battle-state-grid";
  [
    ["敌人", enemy.name || "敌人"],
    ["CR", enemy.cr],
    ["敌人 HP", enemy.hp],
    ["盐奖励", battleFormula.getEnemySaltReward(enemy)],
    ["坚硬", enemy.hardness],
    ["崩裂", enemy.fracture],
    ["磨损", enemy.wear],
    ["锈蚀", enemy.rust],
    ["击杀", battleKills],
    ["盐", battleSalt],
    ["攻击", battleAttacks],
    ["磨刃", battleHones],
  ].forEach(([label, value]) => {
    grid.append(createBattleMiniStat(label, formatInteger(value)));
  });
  elements.battleStateOutput.replaceChildren(grid);
}

function createBattleMiniStat(label, value, note = "") {
  const item = document.createElement("div");
  item.className = "battle-mini-stat";
  const span = document.createElement("span");
  span.textContent = label;
  const strong = document.createElement("strong");
  strong.textContent = value;
  item.append(span, strong);
  if (note) {
    const small = document.createElement("small");
    small.textContent = note;
    item.append(small);
  }
  return item;
}

function renderBattleKHelp() {
  elements.battleKHelp.replaceChildren(
    ...battleFormula.getKParameterSections(readBattleParams()).map((section) => {
      const item = document.createElement("article");
      item.className = "battle-k-item";
      const head = document.createElement("div");
      head.className = "battle-k-head";
      const title = document.createElement("strong");
      title.textContent = section.label;
      const value = document.createElement("small");
      value.textContent = `当前 ${formatDecimal(section.value, 3)}`;
      head.append(title, value);
      const meaning = document.createElement("small");
      meaning.textContent = section.meaning;
      const formula = document.createElement("code");
      formula.textContent = section.formula;
      item.append(head, meaning, formula);
      return item;
    }),
  );
}

function renderBattleFormulaPreview(blade) {
  if (!blade || !isBattleBladeComplete(blade)) {
    elements.battleFormulaPreview.className = "battle-formula-preview empty-state";
    elements.battleFormulaPreview.textContent = "选择一把完整刃后显示公式代入。";
    return;
  }

  elements.battleFormulaPreview.className = "battle-formula-preview";
  elements.battleFormulaPreview.replaceChildren(
    ...battleFormula.getFormulaPreview(blade, currentBattleEnemy, readBattleParams()).map(createBattleFormulaPreviewLine),
  );
}

function createBattleFormulaPreviewLine(item) {
  const line = document.createElement("article");
  line.className = "battle-formula-line";
  const head = document.createElement("div");
  head.className = "battle-formula-head";
  const label = document.createElement("strong");
  label.textContent = item.label;
  const result = document.createElement("strong");
  result.className = "battle-formula-result";
  result.textContent = formatBattleFormulaResult(item);
  head.append(label, result);

  const formula = document.createElement("code");
  formula.textContent = item.formula;
  const substitution = document.createElement("small");
  substitution.textContent = `${item.substitution} = ${formatBattleFormulaResult(item)}`;
  line.append(head, formula, substitution);
  if (item.note) {
    const note = document.createElement("small");
    note.textContent = item.note;
    line.append(note);
  }
  return line;
}

function formatBattleFormulaResult(item) {
  if (item.resultType === "probability") {
    return formatPercent(item.result);
  }
  if (item.resultType === "boolean") {
    return item.result ? "触发" : "不触发";
  }
  return formatDecimal(item.result, 2);
}

function renderBattleRadar(blade) {
  renderBattleRadarInto(elements.battleRadarOutput, blade, "battle-radar-output");
}

function renderBattleRadarInto(container, blade, className) {
  if (!blade) {
    container.className = `${className} empty-state`;
    container.textContent = "暂无刃。";
    return;
  }

  try {
    container.className = className;
    container.replaceChildren(createBattleRadarSvg(blade));
  } catch (error) {
    container.className = `${className} empty-state`;
    container.textContent = `雷达图渲染失败：${error?.message || "未知错误"}`;
  }
}

function createBattleRadarSvg(blade) {
  const size = 300;
  const center = size / 2;
  const radius = 96;
  const labelRadius = 128;
  const scaleMax = Math.max(
    1,
    ...statIds.flatMap((stat) => [Number(blade.stats[stat]) || 0, Number(blade.maxStats[stat]) || 0]),
  );
  const svg = createSvgElement("svg", {
    viewBox: `0 0 ${size} ${size}`,
    role: "img",
    "aria-label": "战斗刃属性雷达图",
  });

  [0.5, 1].forEach((scale) => {
    svg.append(
      createSvgElement("polygon", {
        class: "battle-radar-grid",
        points: formatBattleRadarPoints(
          statIds.map((_, index) => getBattleRadarPoint(index, statIds.length, radius * scale, center)),
        ),
      }),
    );
  });
  statIds.forEach((_, index) => {
    const point = getBattleRadarPoint(index, statIds.length, radius, center);
    svg.append(createSvgElement("line", {
      class: "battle-radar-axis",
      x1: center,
      y1: center,
      x2: point.x,
      y2: point.y,
    }));
  });
  svg.append(createBattleRadarPolygon(blade.maxStats, scaleMax, radius, center, "battle-radar-max"));
  svg.append(createBattleRadarPolygon(blade.stats, scaleMax, radius, center, "battle-radar-current"));
  statIds.forEach((stat, index) => {
    const point = getBattleRadarPoint(index, statIds.length, labelRadius, center);
    const label = createSvgElement("text", {
      class: "battle-radar-label",
      x: point.x,
      y: point.y,
    });
    label.textContent = `${statLabels[stat]} ${formatInteger(blade.stats[stat])}/${formatInteger(blade.maxStats[stat])}`;
    svg.append(label);
  });

  return svg;
}

function createBattleRadarPolygon(stats, scaleMax, radius, center, className) {
  return createSvgElement("polygon", {
    class: className,
    points: formatBattleRadarPoints(
      statIds.map((stat, index) => {
        const value = Math.max(0, Number(stats?.[stat]) || 0);
        return getBattleRadarPoint(index, statIds.length, radius * Math.min(1, value / scaleMax), center);
      }),
    ),
  });
}

function getBattleRadarPoint(index, total, radius, center) {
  const angle = -Math.PI / 2 + (Math.PI * 2 * index) / total;
  return {
    x: center + Math.cos(angle) * radius,
    y: center + Math.sin(angle) * radius,
  };
}

function formatBattleRadarPoints(points) {
  return points.map((point) => `${formatDecimal(point.x, 2)},${formatDecimal(point.y, 2)}`).join(" ");
}

function renderBattleButtons() {
  const blade = getSelectedBattleBlade();
  const hasBlade = Boolean(blade);
  elements.battleManualAttackButton.disabled = !hasBlade || !isBattleBladeComplete(blade);
  elements.battleAutoToggleButton.disabled = !hasBlade || !isBattleBladeComplete(blade);
  elements.battleHoneButton.disabled =
    !hasBlade || !isBattleBladeComplete(blade) || Boolean(battleAutoTimer) || Boolean(battleHoneTimer);
  elements.battleResetCurrentButton.disabled = !hasBlade;
  elements.battleDuplicateBladeButton.disabled = !hasBlade;
  elements.battleRenameBladeButton.disabled = !hasBlade;
  elements.battleDeleteBladeButton.disabled = !hasBlade;
  elements.battleDeleteSelectedButton.disabled = battleSelectedDeleteIds.size === 0;
  elements.inscriptionDuplicateBladeButton.disabled = !hasBlade;
  elements.inscriptionRenameBladeButton.disabled = !hasBlade;
  elements.inscriptionDeleteBladeButton.disabled = !hasBlade;
  elements.inscriptionDeleteSelectedButton.disabled = battleSelectedDeleteIds.size === 0;
  elements.battleSimOnceButton.disabled = !hasBlade || !isBattleBladeComplete(blade);
  elements.battleSim10Button.disabled = !hasBlade || !isBattleBladeComplete(blade);
  elements.battleSim100Button.disabled = !hasBlade || !isBattleBladeComplete(blade);
  elements.battleAutoToggleButton.textContent = battleAutoTimer ? "暂停自动" : "自动战斗";
  elements.battleHoneButton.textContent = battleHoneTimer ? "磨刃中" : "磨刃";
  elements.battleDeleteSelectedButton.textContent = `删除多选 ${formatInteger(battleSelectedDeleteIds.size)}`;
  elements.inscriptionDeleteSelectedButton.textContent = `删除多选 ${formatInteger(battleSelectedDeleteIds.size)}`;
}

function renderBattleLog() {
  if (battleLogEntries.length === 0) {
    elements.battleLog.className = "battle-log empty-state";
    elements.battleLog.textContent = "暂无记录。";
    return;
  }
  elements.battleLog.className = "battle-log";
  elements.battleLog.replaceChildren(
    ...battleLogEntries.map((entry) => {
      const item = document.createElement("article");
      item.className = "battle-log-entry";
      const title = document.createElement("strong");
      title.textContent = entry.title;
      const detail = document.createElement("small");
      detail.textContent = entry.detail;
      item.append(title, detail);
      return item;
    }),
  );
}

function renderBattleRuleOutput() {
  const params = readBattleParams();
  elements.battleRuleOutput.replaceChildren(
    ...battleFormula.getRuleSections(params).map((section) => {
      const wrapper = document.createElement("section");
      wrapper.className = "battle-rule-section";
      const title = document.createElement("h3");
      title.textContent = section.title;
      const list = document.createElement("ul");
      list.append(
        ...section.lines.map((line) => {
          const item = document.createElement("li");
          item.textContent = line;
          return item;
        }),
      );
      wrapper.append(title, list);
      return wrapper;
    }),
  );
}

function addBattleLog(title, detail = "") {
  const time = new Date().toLocaleTimeString("zh-CN", { hour12: false });
  battleLogEntries = [
    {
      title: `${time} · ${title}`,
      detail,
    },
    ...battleLogEntries,
  ].slice(0, BATTLE_LOG_LIMIT);
  renderBattleLog();
}

function readBattleNumberRecord(selector, keys, fallback = {}) {
  const record = {};
  keys.forEach((key) => {
    const input = document.querySelector(`[${selector}="${key}"]`);
    const value = Number(input?.value);
    record[key] = Number.isFinite(value) ? value : fallback[key] || 0;
  });
  return record;
}

function readBattleEnemy() {
  return battleFormula.normalizeEnemy(
    readBattleNumberRecord("data-battle-enemy", battleFormula.enemyStatIds, battleFormula.defaultEnemy),
    currentBattleEnemy || battleFormula.defaultEnemy,
  );
}

function readBattleEnemyIncrement() {
  return battleFormula.normalizeEnemy(
    readBattleNumberRecord("data-battle-enemy-increment", battleFormula.enemyStatIds, {
      cr: 0,
      hp: 0,
      hardness: 0,
      fracture: 0,
      wear: 0,
      rust: 0,
    }),
    {
      cr: 0,
      hp: 0,
      hardness: 0,
      fracture: 0,
      wear: 0,
      rust: 0,
    },
  );
}

function readBattleEnemyGenerationConfig() {
  return battleFormula.normalizeEnemyGenerationConfig(
    readBattleNumberRecord(
      "data-battle-enemy-generator",
      Object.keys(battleFormula.defaultEnemyGenerationConfig),
      battleFormula.defaultEnemyGenerationConfig,
    ),
  );
}

function setBattleEnemyInputs(enemy) {
  const normalizedEnemy = battleFormula.normalizeEnemy(enemy);
  battleFormula.enemyStatIds.forEach((stat) => {
    const input = document.querySelector(`[data-battle-enemy="${stat}"]`);
    if (input) {
      input.value = String(normalizedEnemy[stat]);
    }
  });
}

function readBattleParams() {
  return battleFormula.normalizeParams(
    readBattleNumberRecord("data-battle-param", Object.keys(battleFormula.defaultParams), battleFormula.defaultParams),
  );
}

function readBattleMaintenancePolicy(forceEnabled = null) {
  return battleFormula.normalizeMaintenancePolicy({
    ...readBattleNumberRecord(
      "data-battle-maintenance",
      ["sharpenAtOrBelow", "sharpenToAtLeast", "minDurability", "maxHonesPerBattle"],
      battleFormula.defaultMaintenancePolicy,
    ),
    enabled: forceEnabled === null ? elements.battleMaintenanceEnabled.checked : forceEnabled,
    allowFullSharpnessHone: elements.battleMaintenanceFullHone.checked,
  });
}

function readBattleEnemySequence() {
  return elements.battleEnemySequence.value
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const values = line.split(/[,\s，、]+/).map((value) => Number(value));
      const [cr, hp, hardness, fracture, wear, rust] =
        values.length >= 6 ? values : [battleFormula.defaultEnemy.cr, ...values];
      return battleFormula.normalizeEnemy({
        cr,
        hp,
        hardness,
        fracture,
        wear,
        rust,
      });
    });
}

function getBattleEnemyMode() {
  return elements.battleEnemyMode.value || "fixed";
}

function resetInteractiveBattleState(initialEnemy = null) {
  stopBattleAuto();
  currentBattleEnemy = initialEnemy ? battleFormula.normalizeEnemy(initialEnemy) : getInteractiveEnemyForBattle(0);
  battleKills = 0;
  battleSalt = 0;
  battleAttacks = 0;
  battleHones = 0;
  lastBattleContextPauseReason = null;
}

function generateBattleEnemyFromConfig() {
  const previousEnemyName = battleFormula.normalizeEnemy(currentBattleEnemy).name;
  const enemy = battleFormula.generateEnemy({
    ...readBattleEnemyGenerationConfig(),
    previousEnemyName,
  });
  elements.battleEnemyMode.value = "fixed";
  setBattleEnemyInputs(enemy);
  resetInteractiveBattleState(enemy);
  renderBattleEnemyGeneratorOutput(enemy);
  addBattleLog(
    "生成敌人",
    `${enemy.name || "敌人"} · CR ${formatInteger(enemy.cr)} · HP ${formatInteger(enemy.hp)} · 盐 ${formatInteger(
      battleFormula.getEnemySaltReward(enemy),
    )} · ${formatEnemyAttributeLine(enemy)}`,
  );
  renderBattleDebug();
}

function renderBattleEnemyGeneratorOutput(enemy) {
  if (!enemy) {
    elements.battleEnemyGeneratorOutput.className = "battle-enemy-generator-output empty-state";
    elements.battleEnemyGeneratorOutput.textContent = "生成后显示分配信息。";
    return;
  }

  const meta = enemy.generation || {};
  const grid = document.createElement("div");
  grid.className = "battle-state-grid";
  [
    ["名字", enemy.name || "敌人"],
    ["CR", enemy.cr],
    ["HP", enemy.hp],
    ["HP基准", Number.isFinite(meta.hpBase) ? formatDecimal(meta.hpBase, 2) : "-"],
    ["HP公式", Number.isFinite(meta.hpK) ? `CR^${formatDecimal(meta.hpK, 2)} * ${formatDecimal(meta.hpS, 2)}` : "-"],
    ["盐奖励", battleFormula.getEnemySaltReward(enemy)],
    ["属性点", meta.totalPoints ?? enemy.hardness + enemy.fracture + enemy.wear + enemy.rust],
    ["购点公式", Number.isFinite(meta.pointK) ? `CR^${formatDecimal(meta.pointK, 2)} * ${formatDecimal(meta.pointS, 2)}` : "-"],
    ["优势项", meta.focusAttribute ? battleFormula.enemyStatLabels[meta.focusAttribute] : "-"],
    ["优势点", meta.focusPoints ?? "-"],
    ["HP倍率", Number.isFinite(meta.hpMultiplier) ? formatDecimal(meta.hpMultiplier, 3) : "-"],
    ["基础占比", Number.isFinite(meta.baseSharePerAttribute) ? formatPercent(meta.baseSharePerAttribute) : "-"],
    ["优势额外占比", Number.isFinite(meta.focusShare) ? formatPercent(meta.focusShare) : "-"],
    ["优势最终占比", Number.isFinite(meta.focusFinalShare) ? formatPercent(meta.focusFinalShare) : "-"],
  ].forEach(([label, value]) => {
    grid.append(createBattleMiniStat(label, typeof value === "number" ? formatInteger(value) : value));
  });

  const attributes = document.createElement("div");
  attributes.className = "battle-enemy-generated-line";
  attributes.textContent = formatEnemyAttributeLine(enemy);

  elements.battleEnemyGeneratorOutput.className = "battle-enemy-generator-output";
  elements.battleEnemyGeneratorOutput.replaceChildren(grid, attributes);
}

function formatEnemyAttributeLine(enemy) {
  return ["hardness", "fracture", "wear", "rust"]
    .map((stat) => `${battleFormula.enemyStatLabels[stat]} ${formatInteger(enemy[stat])}`)
    .join(" · ");
}

function getInteractiveEnemyForBattle(battleIndex) {
  return battleFormula.getEnemyForBattle({
    battleIndex,
    enemyMode: getBattleEnemyMode(),
    baseEnemy: readBattleEnemy(),
    enemyIncrement: readBattleEnemyIncrement(),
    enemySequence: readBattleEnemySequence(),
  });
}

function createExportToBattleButton({ inputs, stats, sourceTitle }) {
  const button = document.createElement("button");
  button.className = "secondary-action mini-action export-battle-action";
  button.type = "button";
  button.textContent = "导出到战斗";
  button.addEventListener("click", () => {
    exportForgingStatsToBattle({
      inputs,
      stats,
      sourceTitle,
    });
  });
  return button;
}

function exportForgingStatsToBattle({ inputs, stats, sourceTitle = "锻造结果" }) {
  const normalizedStats = battleFormula.normalizeStats(stats);
  const normalizedInputs = forgingFormula.normalizeInputs(inputs || {});
  const blade = createBattleBlade({
    stats: normalizedStats,
    inputs: normalizedInputs,
    name: bladeNaming.formatBladeName(normalizedInputs, normalizedStats, {
      metalIds,
      statIds,
      resourceLabels: metalLabels,
    }),
    isComplete: true,
  });
  battleToolbox = [blade, ...battleToolbox];
  selectedBattleBladeId = blade.id;
  battleSelectedDeleteIds.clear();
  resetInteractiveBattleState();
  saveBattleToolbox();
  addBattleLog("导出锻造刃", `${sourceTitle} -> ${blade.name} · ${formatStatBundle(blade.stats)}`);
  if (debugMode === "battle" || debugMode === "inscription") {
    renderActiveDebugMode();
  } else {
    elements.currentSummary.textContent = `已导出到战斗工具箱：${blade.name}`;
  }
}

function importForgingResultToBattle() {
  const details = latestManualDetails || calculateDetails(getManualInputs());
  if (!details || details.totalAmount <= 0) {
    addBattleLog("无法导入", "锻造调校区还没有有效投料。");
    if (debugMode === "battle" || debugMode === "inscription") {
      renderActiveDebugMode();
    }
    return;
  }
  exportForgingStatsToBattle({
    inputs: details.inputs,
    stats: details.stats,
    sourceTitle: "当前锻造结果",
  });
}

function buildBattleConfigExport() {
  const params = readBattleParams();
  const blade = getSelectedBattleBlade();
  return {
    type: "blade-essence-battle-debug-config",
    exportedAt: new Date().toISOString(),
    kValues: {
      dullingK: params.dullingK,
      dullingS: params.dullingS,
      honingK: params.honingK,
      honingS: params.honingS,
      conductivityK: params.conductivityK,
      rustK: params.rustK,
    },
    tuningValues: {
      dullingK: params.dullingK,
      dullingS: params.dullingS,
      honingK: params.honingK,
      honingS: params.honingS,
      conductivityK: params.conductivityK,
      rustK: params.rustK,
    },
    params,
    enemyMode: getBattleEnemyMode(),
    enemy: readBattleEnemy(),
    currentEnemy: battleFormula.normalizeEnemy(currentBattleEnemy),
    enemyGeneration: readBattleEnemyGenerationConfig(),
    enemyIncrement: readBattleEnemyIncrement(),
    enemySequence: readBattleEnemySequence(),
    maintenancePolicy: readBattleMaintenancePolicy(),
    selectedBlade: blade
      ? {
          id: blade.id,
          name: blade.name,
          stats: { ...blade.stats },
          maxStats: { ...blade.maxStats },
          isComplete: isBattleBladeComplete(blade),
          inscription: cloneInscription(blade.inscription),
          inscriptionPreview: buildInscriptionPreview(blade),
        }
      : null,
    formulas: {
      k: battleFormula.getKParameterSections(params),
      preview: blade && isBattleBladeComplete(blade) ? battleFormula.getFormulaPreview(blade, currentBattleEnemy, params) : [],
    },
  };
}

async function exportBattleConfig() {
  const text = JSON.stringify(buildBattleConfigExport(), null, 2);
  try {
    await copyTextToClipboard(text);
    addBattleLog("导出战斗配置", "当前 k/s、敌人、维护策略与公式代入已复制到剪贴板。");
  } catch {
    addBattleLog("导出失败", "浏览器阻止了剪贴板写入。");
  }
}

function buildEnemyGenerationConfigExport() {
  const config = readBattleEnemyGenerationConfig();
  const previewRng = () => 0.5;
  const previewEnemy = battleFormula.generateEnemy({
    ...config,
    hpMultiplierMin: 1,
    hpMultiplierMax: 1,
    focusShareMin: config.focusShareMin,
    focusShareMax: config.focusShareMax,
  }, previewRng);
  return {
    type: "blade-essence-enemy-generation-debug-config",
    exportedAt: new Date().toISOString(),
    formula: {
      hp: "round(CR^HP_k * HP_s * HP倍率)",
      attributePoints: "round(CR^购点_k * 购点_s)",
      focusShare: "每个属性先获得 5% 基础占比；优势属性额外获得 focusShareMin 到 focusShareMax 的占比；剩余占比随机分配给其它属性；最后用购点总量换算实际属性",
    },
    enemyGeneration: config,
    deterministicPreview: {
      note: "预览固定 HP倍率为 1，并使用优势额外占比低作为示例占比；实际生成仍使用随机倍率与随机优势项。",
      enemy: previewEnemy,
    },
  };
}

async function exportBattleEnemyGenerationConfig() {
  const text = JSON.stringify(buildEnemyGenerationConfigExport(), null, 2);
  try {
    await copyTextToClipboard(text);
    addBattleLog("导出敌人生成配置", "当前 CR、HP k/s、购点 k/s、倍率与优势额外占比已复制到剪贴板。");
  } catch {
    addBattleLog("导出失败", "浏览器阻止了剪贴板写入。");
  }
}

function createManualBattleBlade() {
  const blade = createBattleBlade({ isComplete: false });
  battleToolbox = [blade, ...battleToolbox];
  selectedBattleBladeId = blade.id;
  battleSelectedDeleteIds.clear();
  resetInteractiveBattleState();
  saveBattleToolbox();
  addBattleLog("新建刃", "填完整六属性后会自动随机命名。");
  renderActiveDebugMode();
}

function duplicateSelectedBattleBlade() {
  const blade = getSelectedBattleBlade();
  if (!blade) {
    return;
  }
  const copy = createBattleBlade({
    stats: blade.maxStats,
    inputs: blade.inputs ? { ...blade.inputs } : null,
    name: generateBattleBladeName(blade),
    isComplete: true,
  });
  copy.stats = { ...blade.stats };
  copy.maxStats = { ...blade.maxStats };
  copy.inscription = cloneInscription(blade.inscription);
  battleToolbox = [copy, ...battleToolbox];
  selectedBattleBladeId = copy.id;
  battleSelectedDeleteIds.clear();
  resetInteractiveBattleState();
  saveBattleToolbox();
  addBattleLog("复制副本", `${blade.name} -> ${copy.name}`);
  renderActiveDebugMode();
}

function renameSelectedBattleBlade() {
  const blade = getSelectedBattleBlade();
  if (!blade) {
    return;
  }
  const oldName = blade.name;
  blade.name = generateBattleBladeName(blade);
  blade.isComplete = hasBattleBladeNumericStats(blade);
  saveBattleToolbox();
  addBattleLog("重新命名", `${oldName} -> ${blade.name}`);
  renderActiveDebugMode();
}

function deleteSelectedBattleBlade() {
  const blade = getSelectedBattleBlade();
  if (!blade) {
    return;
  }
  battleToolbox = battleToolbox.filter((item) => item.id !== blade.id);
  battleSelectedDeleteIds.delete(blade.id);
  selectedBattleBladeId = battleToolbox[0]?.id || null;
  resetInteractiveBattleState();
  saveBattleToolbox();
  addBattleLog("删除刃", blade.name);
  renderActiveDebugMode();
}

function deleteCheckedBattleBlades() {
  if (battleSelectedDeleteIds.size === 0) {
    return;
  }
  const deletedNames = battleToolbox
    .filter((blade) => battleSelectedDeleteIds.has(blade.id))
    .map((blade) => blade.name);
  battleToolbox = battleToolbox.filter((blade) => !battleSelectedDeleteIds.has(blade.id));
  if (!battleToolbox.some((blade) => blade.id === selectedBattleBladeId)) {
    selectedBattleBladeId = battleToolbox[0]?.id || null;
    resetInteractiveBattleState();
  }
  battleSelectedDeleteIds.clear();
  saveBattleToolbox();
  addBattleLog("删除多选", deletedNames.join(" / "));
  renderActiveDebugMode();
}

function handleBattleBladeEditorInput(event) {
  const input = event.target.closest("[data-battle-blade-stat]");
  const blade = getSelectedBattleBlade();
  if (!input || !blade) {
    return;
  }
  const stat = input.dataset.battleBladeStat;
  const kind = input.dataset.battleBladeStatKind;
  const value = Math.max(0, Math.floor(Number(input.value) || 0));
  if (kind === "max") {
    blade.maxStats[stat] = value;
    blade.stats[stat] = Math.min(Math.max(0, blade.stats[stat]), value);
  } else {
    blade.stats[stat] = Math.min(value, Math.max(0, blade.maxStats[stat]));
  }
  lastBattleContextPauseReason = null;
  ensureBattleBladeName(blade);
  blade.isComplete = isBattleBladeComplete(blade);
  saveBattleToolbox();
  renderBattleToolbox();
  renderBattleBladeEditorRadar(blade);
  renderInscriptionPreview(blade);
  renderBattleOutputs();
  renderBattleButtons();
}

function handleBattleControlInput(event) {
  if (
    event.target.matches("[data-battle-enemy]") ||
    event.target.matches("[data-battle-enemy-increment]") ||
    event.target === elements.battleEnemyMode ||
    event.target === elements.battleEnemySequence
  ) {
    lastBattleContextPauseReason = null;
    currentBattleEnemy = getInteractiveEnemyForBattle(battleKills);
    renderBattleOutputs();
  }
  if (event.target.matches("[data-battle-param]")) {
    renderBattleKHelp();
    renderBattleFormulaPreview(getSelectedBattleBlade());
    renderBattleRuleOutput();
  }
  if (event.target === elements.battleEnemyMode) {
    syncBattleEnemyModeControls();
  }
}

function syncBattleEnemyModeControls() {
  const mode = getBattleEnemyMode();
  elements.battleEnemyIncrementInputs.hidden = mode !== "incremental";
  elements.battleEnemySequence.closest(".battle-textarea-field").hidden = mode !== "sequence";
}

function performManualBattleAttack() {
  stopBattleAuto();
  performBattleAttack("手动攻击");
}

function performBattleAttack(sourceLabel = "自动攻击") {
  const blade = getSelectedBattleBlade();
  if (!blade) {
    addBattleLog("无法攻击", "没有选择刃。");
    return;
  }
  if (!isBattleBladeComplete(blade)) {
    addBattleLog("无法攻击", "这把刃的六属性还没有填完整。");
    return;
  }
  const pauseReason = battleFormula.getPauseReason(blade);
  if (pauseReason) {
    stopBattleAuto();
    addBattleLog("战斗暂停", pauseReason.message);
    renderBattleDebug();
    return;
  }

  const result = battleFormula.resolveAttack(blade, currentBattleEnemy, readBattleParams());
  Object.assign(blade.stats, result.blade.stats);
  currentBattleEnemy = result.enemy;
  lastBattleContextPauseReason =
    result.pauseReasons.find((reason) => reason.type === "sharpnessBelowHardness") || null;
  battleAttacks += 1;
  blade.uses += 1;

  if (result.victory) {
    battleKills += 1;
    battleSalt += result.saltReward;
    blade.kills += 1;
    stopBattleAuto();
    currentBattleEnemy = getInteractiveEnemyForBattle(battleKills);
  }
  if (result.pauseReasons.length > 0) {
    stopBattleAuto();
  }

  saveBattleToolbox();
  addBattleLog(sourceLabel, formatAttackResult(result));
  renderBattleDebug();
}

function formatAttackResult(result) {
  const parts = [`伤害 ${formatInteger(result.damage)}`, `敌 HP ${formatInteger(result.enemy.hp)}`];
  const changedStats = statIds
    .filter((stat) => result.deltas[stat] !== 0)
    .map((stat) => `${statLabels[stat]} ${result.deltas[stat] > 0 ? "+" : ""}${formatInteger(result.deltas[stat])}`);
  if (changedStats.length > 0) {
    parts.push(changedStats.join(" / "));
  }
  if (result.victory) {
    parts.push(`胜利 +${formatInteger(result.saltReward)}盐`);
  }
  if (result.pauseReasons.length > 0) {
    parts.push(`暂停：${result.pauseReasons.map((reason) => reason.label).join(" / ")}`);
  }
  parts.push(formatBattleRolls(result.rolls));
  return parts.filter(Boolean).join(" · ");
}

function formatBattleRolls(rolls) {
  return Object.entries(rolls || {})
    .filter(([, roll]) => roll)
    .map(([key, roll]) => {
      const label = {
        rust: "锈蚀",
        dulling: "钝化",
        conductivity: "导能",
        honing: "磨刃",
      }[key] || key;
      if (key === "honing" && Number.isFinite(Number(roll.expectedGain))) {
        const fractionalText = roll.fractionalProbability > 0
          ? ` / 小数${roll.fractionalRoll?.triggered ? "触发" : "未触发"}(${formatPercent(roll.fractionalProbability)})`
          : "";
        return `${label} 期望${formatDecimal(roll.expectedGain, 2)} / 实得+${formatInteger(roll.gain)} / s=${formatDecimal(roll.s, 2)}${fractionalText}`;
      }
      if (key === "dulling" && Number.isFinite(Number(roll.expectedLoss))) {
        const fractionalText = roll.fractionalProbability > 0
          ? ` / 小数${roll.fractionalRoll?.triggered ? "触发" : "未触发"}(${formatPercent(roll.fractionalProbability)})`
          : "";
        return `${label} 期望${formatDecimal(roll.expectedLoss, 2)} / 实损-${formatInteger(roll.loss)} / 有效韧性${formatInteger(
          roll.effectiveToughness,
        )} / s=${formatDecimal(roll.s, 2)}${fractionalText}`;
      }
      if (roll.certain) {
        return `${label} 必定${roll.targetLabel ? ` -> ${roll.targetLabel}` : ""}`;
      }
      return `${label} ${roll.triggered ? "触发" : "未触发"}(${formatPercent(roll.probability)})${
        roll.targetLabel ? ` -> ${roll.targetLabel}` : ""
      }`;
    })
    .join(" / ");
}

function honeSelectedBattleBlade() {
  if (battleAutoTimer) {
    renderBattleButtons();
    return;
  }
  const blade = getSelectedBattleBlade();
  if (!blade) {
    addBattleLog("无法磨刃", "没有选择刃。");
    return;
  }
  if (!isBattleBladeComplete(blade)) {
    addBattleLog("无法磨刃", "这把刃的六属性还没有填完整。");
    return;
  }
  if (battleHoneTimer) {
    return;
  }
  const isFullSharpness = blade.stats.sharpness >= blade.maxStats.sharpness;
  if (isFullSharpness) {
    const delayMs = readBattleParams().fullSharpnessHoneDelaySeconds * 1000;
    addBattleLog("满锋磨刃", `等待 ${formatDecimal(delayMs / 1000, 2)} 秒后结算。`);
    battleHoneTimer = window.setTimeout(() => {
      battleHoneTimer = null;
      applyBattleHone();
    }, delayMs);
    renderBattleButtons();
    return;
  }
  applyBattleHone();
}

function applyBattleHone() {
  const blade = getSelectedBattleBlade();
  if (!blade) {
    return;
  }
  const result = battleFormula.resolveHone(blade, readBattleParams());
  if (result.blocked) {
    addBattleLog("磨刃失败", result.reason);
    renderBattleDebug();
    return;
  }
  Object.assign(blade.stats, result.blade.stats);
  lastBattleContextPauseReason = null;
  battleHones += 1;
  saveBattleToolbox();
  addBattleLog("磨刃", formatHoneResult(result));
  renderBattleDebug();
}

function formatHoneResult(result) {
  const changedStats = statIds
    .filter((stat) => result.deltas[stat] !== 0)
    .map((stat) => `${statLabels[stat]} ${result.deltas[stat] > 0 ? "+" : ""}${formatInteger(result.deltas[stat])}`);
  return [
    changedStats.join(" / ") || "无属性变化",
    result.rolls.honing ? formatBattleRolls({ honing: result.rolls.honing }) : "满锋无锋利收益",
    result.rolls.conductivity ? formatBattleRolls({ conductivity: result.rolls.conductivity }) : "",
  ]
    .filter(Boolean)
    .join(" · ");
}

function resetCurrentBattleBladeStats() {
  const blade = getSelectedBattleBlade();
  if (!blade) {
    return;
  }
  blade.stats = { ...blade.maxStats };
  resetInteractiveBattleState();
  saveBattleToolbox();
  addBattleLog("当前值回满", blade.name);
  renderBattleDebug();
}

function toggleBattleAuto() {
  if (battleAutoTimer) {
    stopBattleAuto();
    renderBattleDebug();
    return;
  }
  const blade = getSelectedBattleBlade();
  if (!blade || !isBattleBladeComplete(blade)) {
    addBattleLog("无法自动战斗", "需要先选择一把完整的刃。");
    return;
  }
  const intervalMs = readBattleParams().attackIntervalSeconds * 1000;
  battleAutoTimer = window.setInterval(() => performBattleAttack("自动攻击"), intervalMs);
  addBattleLog("自动战斗开启", `间隔 ${formatDecimal(intervalMs / 1000, 2)} 秒。`);
  renderBattleDebug();
}

function stopBattleAuto() {
  if (!battleAutoTimer) {
    return;
  }
  window.clearInterval(battleAutoTimer);
  battleAutoTimer = null;
}

function runBattleLifetimeSimulation(count) {
  const blade = getSelectedBattleBlade();
  if (!blade || !isBattleBladeComplete(blade)) {
    addBattleLog("无法模拟", "需要先选择一把完整的刃。");
    return;
  }
  const baseOptions = {
    blade,
    enemy: readBattleEnemy(),
    enemyMode: getBattleEnemyMode(),
    enemyIncrement: readBattleEnemyIncrement(),
    enemySequence: readBattleEnemySequence(),
    params: readBattleParams(),
  };
  const nakedRuns = Array.from({ length: count }, () =>
    battleFormula.simulateLifetime({
      ...baseOptions,
      maintenancePolicy: { ...readBattleMaintenancePolicy(false), enabled: false },
    }),
  );
  const maintenanceEnabled = elements.battleMaintenanceEnabled.checked;
  const maintenanceRuns = maintenanceEnabled
    ? Array.from({ length: count }, () =>
        battleFormula.simulateLifetime({
          ...baseOptions,
          maintenancePolicy: readBattleMaintenancePolicy(true),
        }),
      )
    : [];
  renderBattleLifetimeOutput({
    count,
    naked: battleFormula.summarizeLifetimeRuns(nakedRuns),
    maintenance: battleFormula.summarizeLifetimeRuns(maintenanceRuns),
    maintenanceEnabled,
  });
  addBattleLog("寿命模拟完成", `${formatInteger(count)} 次样本。`);
}

function renderBattleLifetimeOutput(result) {
  const sections = [
    createLifetimeSummarySection("裸战寿命", result.naked),
    result.maintenanceEnabled
      ? createLifetimeSummarySection("维护策略寿命", result.maintenance)
      : createDisabledMaintenanceSection(),
  ];
  elements.battleLifetimeOutput.className = "battle-lifetime-output";
  elements.battleLifetimeOutput.replaceChildren(...sections);
}

function createLifetimeSummarySection(title, summary) {
  const section = document.createElement("section");
  section.className = "battle-rule-section";
  const heading = document.createElement("h3");
  heading.textContent = title;
  const grid = document.createElement("div");
  grid.className = "battle-summary-grid";
  if (!summary) {
    section.append(heading, createEmptyNote("没有样本。"));
    return section;
  }
  [
    ["样本", formatInteger(summary.count)],
    ["平均击杀", formatDecimal(summary.averageKills, 2)],
    ["平均攻击", formatDecimal(summary.averageAttacks, 2)],
    ["平均秒数", formatDecimal(summary.averageSeconds, 2)],
    ["平均盐", formatDecimal(summary.averageSalt, 2)],
    ["平均磨刃", formatDecimal(summary.averageHones, 2)],
    ["常见停因", summary.mostCommonStopReason],
    ["剩余锋利", formatDecimal(summary.averageRemainingStats.sharpness, 2)],
  ].forEach(([label, value]) => {
    grid.append(createBattleMiniStat(label, value));
  });
  section.append(heading, grid);
  return section;
}

function createDisabledMaintenanceSection() {
  const section = document.createElement("section");
  section.className = "battle-rule-section";
  const heading = document.createElement("h3");
  heading.textContent = "维护策略寿命";
  section.append(heading, createEmptyNote("维护策略未启用。"));
  return section;
}

function createEmptyNote(text) {
  const note = document.createElement("div");
  note.className = "empty-state";
  note.textContent = text;
  return note;
}

function clearBattleLog() {
  battleLogEntries = [];
  renderBattleLog();
}

function handleInscriptionWireToolClick(event) {
  const tool = event.target.closest?.("[data-inscription-wire-tool]");
  if (!tool || !elements.inscriptionWireTray.contains(tool)) {
    return;
  }
  const value = tool.dataset.inscriptionWireTool;
  if (!isValidInscriptionWireTool(value)) {
    return;
  }
  inscriptionGesture.selectedTool = value;
  renderInscriptionWireTray();
}

function handleInscriptionGraphPointerDown(event) {
  const edgeId = getInscriptionEdgeIdFromPointerEvent(event);
  if (!edgeId || (event.pointerType === "mouse" && event.button !== 0)) {
    return;
  }
  event.preventDefault();
  inscriptionGesture.pointerId = event.pointerId;
  inscriptionGesture.dragging = true;
  inscriptionGesture.appliedEdgeIds = new Set();
  elements.inscriptionGraph.classList.add("is-drawing");
  event.target.setPointerCapture?.(event.pointerId);
  applyInscriptionEdgeTool(edgeId);
}

function handleInscriptionGraphPointerMove(event) {
  if (!inscriptionGesture.dragging || inscriptionGesture.pointerId !== event.pointerId) {
    return;
  }
  event.preventDefault();
  const edgeId = getInscriptionEdgeIdAtPoint(event.clientX, event.clientY);
  if (edgeId) {
    applyInscriptionEdgeTool(edgeId);
  }
}

function handleInscriptionGraphPointerUp(event) {
  if (!inscriptionGesture.dragging || inscriptionGesture.pointerId !== event.pointerId) {
    return;
  }
  stopInscriptionStroke();
}

function handleInscriptionContextMenu(event) {
  if (getInscriptionEdgeIdFromPointerEvent(event)) {
    event.preventDefault();
  }
}

function getInscriptionEdgeIdFromPointerEvent(event) {
  return getInscriptionEdgeIdFromElement(event.target) || getInscriptionEdgeIdAtPoint(event.clientX, event.clientY);
}

function getInscriptionEdgeIdFromElement(element) {
  const edge = element?.closest?.("[data-inscription-edge]");
  if (edge && elements.inscriptionGraph.contains(edge)) {
    return edge.dataset.inscriptionEdge;
  }
  return null;
}

function getInscriptionEdgeIdAtPoint(clientX, clientY) {
  const rect = elements.inscriptionGraph.getBoundingClientRect();
  if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) {
    return null;
  }
  const best = inscriptionEdgeConfigs.reduce(
    (current, edge) => {
      const from = getInscriptionNodePosition(edge.from);
      const to = getInscriptionNodePosition(edge.to);
      const x1 = rect.left + (from.x / 100) * rect.width;
      const y1 = rect.top + (from.y / 100) * rect.height;
      const x2 = rect.left + (to.x / 100) * rect.width;
      const y2 = rect.top + (to.y / 100) * rect.height;
      const distance = getPointToSegmentDistance(clientX, clientY, x1, y1, x2, y2);
      return distance < current.distance ? { edgeId: edge.id, distance } : current;
    },
    { edgeId: null, distance: Infinity },
  );
  return best.distance <= inscriptionEdgeHitTolerancePx ? best.edgeId : null;
}

function getPointToSegmentDistance(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  if (dx === 0 && dy === 0) {
    return Math.sqrt((px - x1) ** 2 + (py - y1) ** 2);
  }
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy)));
  const closestX = x1 + t * dx;
  const closestY = y1 + t * dy;
  return Math.sqrt((px - closestX) ** 2 + (py - closestY) ** 2);
}

function applyInscriptionEdgeTool(edgeId) {
  const blade = getSelectedBattleBlade();
  if (!blade || !inscriptionEdgeIds.includes(edgeId) || inscriptionGesture.appliedEdgeIds.has(edgeId)) {
    return;
  }

  const inscription = normalizeBladeInscription(blade.inscription);
  const metal = metalIds.includes(inscriptionGesture.selectedTool) ? inscriptionGesture.selectedTool : null;
  inscriptionGesture.appliedEdgeIds.add(edgeId);
  if (inscription.edges[edgeId] === metal) {
    return;
  }
  inscription.edges[edgeId] = metal;
  blade.inscription = inscription;
  saveBattleToolbox();
  updateInscriptionEdgeVisual(edgeId, metal);
  renderBattleToolbox();
  renderInscriptionBladeSummary();
  renderInscriptionPreview(blade);
  renderBattleButtons();
}

function updateInscriptionEdgeVisual(edgeId, metal) {
  const line = elements.inscriptionGraph.querySelector(`[data-inscription-edge-visual="${edgeId}"]`);
  if (!line) {
    return;
  }
  line.classList.toggle("is-filled", Boolean(metal));
  if (metal) {
    line.style.setProperty("--inscription-fill-color", getInscriptionMetalColor(metal));
  } else {
    line.style.removeProperty("--inscription-fill-color");
  }
}

function isValidInscriptionWireTool(value) {
  return value === inscriptionEraseValue || metalIds.includes(value);
}

function stopInscriptionStroke() {
  inscriptionGesture.pointerId = null;
  inscriptionGesture.dragging = false;
  inscriptionGesture.appliedEdgeIds = new Set();
  elements.inscriptionGraph?.classList.remove("is-drawing");
}

function clearSelectedBladeInscription() {
  const blade = getSelectedBattleBlade();
  if (!blade || !hasInscriptionContent(blade.inscription)) {
    return;
  }
  blade.inscription = createEmptyInscription();
  saveBattleToolbox();
  addBattleLog("清空铭文", blade.name || "当前刃");
  renderActiveDebugMode();
}

function handleBattleToolboxListClick(event) {
  const checkbox = event.target.closest("[data-battle-toolbox-check]");
  if (checkbox) {
    if (checkbox.checked) {
      battleSelectedDeleteIds.add(checkbox.dataset.battleToolboxCheck);
    } else {
      battleSelectedDeleteIds.delete(checkbox.dataset.battleToolboxCheck);
    }
    renderBattleToolbox();
    renderBattleButtons();
    return;
  }
  const button = event.target.closest("[data-battle-toolbox-blade]");
  if (button) {
    setSelectedBattleBlade(button.dataset.battleToolboxBlade);
  }
}

function bindEvents() {
  elements.debugModeTabs.forEach((button) => {
    button.addEventListener("click", () => setDebugMode(button.dataset.debugMode));
  });
  elements.modeTabs.forEach((button) => {
    button.addEventListener("click", () => setInputMode(button.dataset.inputMode));
  });
  elements.resetManualButton.addEventListener("click", resetManualInputs);
  elements.forgeOnceButton.addEventListener("click", forgeOnce);
  elements.runSimulationButton.addEventListener("click", runSimulation);
  elements.simulationMode.addEventListener("change", syncConstraintControls);
  elements.simulationFilterMetric.addEventListener("change", handleSimulationFilterInput);
  elements.simulationFilterMin.addEventListener("input", handleSimulationFilterInput);
  elements.simulationSortMetric.addEventListener("change", handleSimulationFilterInput);
  elements.simulationConditionGrid.addEventListener("input", handleSimulationFilterInput);
  elements.simulationConditionGrid.addEventListener("change", handleSimulationFilterInput);
  elements.applySimulationFilterButton.addEventListener("click", applySimulationFilter);
  elements.baseTable.addEventListener("input", handleFormulaTableInput);
  elements.modifierTable.addEventListener("input", handleFormulaTableInput);
  elements.majorExponentInput.addEventListener("input", handleCurveParameterInput);
  elements.modifierExponentInput.addEventListener("input", handleCurveParameterInput);
  elements.performanceTable.addEventListener("input", handlePerformanceTableInput);
  elements.entropyTable.addEventListener("input", handleEntropyTableInput);
  elements.exportSettingsButton.addEventListener("click", () => {
    void exportCurrentSettings();
  });
  elements.resetBaseTableButton.addEventListener("click", () => resetFormulaTable("base"));
  elements.resetModifierTableButton.addEventListener("click", () => resetFormulaTable("modifier"));
  elements.resetCurveParametersButton.addEventListener("click", resetCurveParameters);
  elements.resetPerformanceTableButton.addEventListener("click", resetPerformanceTable);
  elements.resetEntropyTableButton.addEventListener("click", resetEntropyPenaltyTable);
  elements.clearLogButton.addEventListener("click", clearLog);
  elements.battleImportForgeButton.addEventListener("click", importForgingResultToBattle);
  elements.inscriptionImportForgeButton.addEventListener("click", importForgingResultToBattle);
  elements.battleExportConfigButton.addEventListener("click", () => {
    void exportBattleConfig();
  });
  elements.battleGenerateEnemyButton.addEventListener("click", generateBattleEnemyFromConfig);
  elements.battleExportEnemyGeneratorButton.addEventListener("click", () => {
    void exportBattleEnemyGenerationConfig();
  });
  elements.battleNewBladeButton.addEventListener("click", createManualBattleBlade);
  elements.battleDuplicateBladeButton.addEventListener("click", duplicateSelectedBattleBlade);
  elements.battleRenameBladeButton.addEventListener("click", renameSelectedBattleBlade);
  elements.battleDeleteBladeButton.addEventListener("click", deleteSelectedBattleBlade);
  elements.battleDeleteSelectedButton.addEventListener("click", deleteCheckedBattleBlades);
  elements.inscriptionNewBladeButton.addEventListener("click", createManualBattleBlade);
  elements.inscriptionDuplicateBladeButton.addEventListener("click", duplicateSelectedBattleBlade);
  elements.inscriptionRenameBladeButton.addEventListener("click", renameSelectedBattleBlade);
  elements.inscriptionDeleteBladeButton.addEventListener("click", deleteSelectedBattleBlade);
  elements.inscriptionDeleteSelectedButton.addEventListener("click", deleteCheckedBattleBlades);
  elements.battleManualAttackButton.addEventListener("click", performManualBattleAttack);
  elements.battleAutoToggleButton.addEventListener("click", toggleBattleAuto);
  elements.battleHoneButton.addEventListener("click", honeSelectedBattleBlade);
  elements.battleResetCurrentButton.addEventListener("click", resetCurrentBattleBladeStats);
  elements.battleSimOnceButton.addEventListener("click", () => runBattleLifetimeSimulation(1));
  elements.battleSim10Button.addEventListener("click", () => runBattleLifetimeSimulation(10));
  elements.battleSim100Button.addEventListener("click", () => runBattleLifetimeSimulation(100));
  elements.battleClearLogButton.addEventListener("click", clearBattleLog);
  elements.battleBladeEditor.addEventListener("input", handleBattleBladeEditorInput);
  elements.inscriptionWireTray.addEventListener("click", handleInscriptionWireToolClick);
  elements.inscriptionGraph.addEventListener("pointerdown", handleInscriptionGraphPointerDown);
  elements.inscriptionGraph.addEventListener("pointermove", handleInscriptionGraphPointerMove);
  elements.inscriptionGraph.addEventListener("pointerup", handleInscriptionGraphPointerUp);
  elements.inscriptionGraph.addEventListener("pointercancel", stopInscriptionStroke);
  elements.inscriptionGraph.addEventListener("contextmenu", handleInscriptionContextMenu);
  [
    elements.battleEnemyInputs,
    elements.battleEnemyIncrementInputs,
    elements.battleParamInputs,
    elements.battleMaintenanceInputs,
  ].forEach((container) => {
    container.addEventListener("input", handleBattleControlInput);
  });
  elements.battleEnemyMode.addEventListener("change", handleBattleControlInput);
  elements.battleEnemySequence.addEventListener("input", handleBattleControlInput);
  elements.battleMaintenanceEnabled.addEventListener("change", renderBattleButtons);
  elements.battleMaintenanceFullHone.addEventListener("change", renderBattleButtons);
  getBattleToolboxListElements().forEach((container) => {
    container.addEventListener("click", handleBattleToolboxListClick);
  });
}

function init() {
  renderManualInputs();
  renderConstraintInputs();
  renderSimulationAnalysisControls();
  renderPresetButtons(elements.manualPresets, manualPresets, applyManualPreset);
  renderPresetButtons(elements.simulationPresets, simulationPresets, applySimulationPreset);
  renderEditableMatrixTable(elements.baseTable, "base");
  renderEditableMatrixTable(elements.modifierTable, "modifier");
  syncCurveParameterInputs();
  renderPerformanceTable();
  renderEntropyPenaltyTable();
  renderBattleStaticControls();
  bindEvents();
  setInputMode("manual");
  setDebugMode(loadDebugMode());
  applyManualPreset(manualPresets[0]);
  applySimulationPreset(simulationPresets[1]);
  renderBattleDebug();
}

init();
