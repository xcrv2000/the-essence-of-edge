(function (global) {
  const metalIds = ["lead", "tin", "copper", "iron", "silver", "gold"];
  const statIds = [
    "sharpness",
    "toughness",
    "durability",
    "hardness",
    "stability",
    "conductivity",
  ];
  const metalLabels = {
    lead: "铅",
    tin: "锡",
    copper: "铜",
    iron: "铁",
    silver: "银",
    gold: "金",
  };
  const statLabels = {
    sharpness: "锋利",
    toughness: "韧性",
    durability: "耐久",
    hardness: "硬度",
    stability: "稳定",
    conductivity: "导能",
  };
  const statPerformanceTable = {
    sharpness: 12.2,
    toughness: 8.8,
    durability: 11.2,
    hardness: 11.8,
    stability: 9.8,
    conductivity: 11.4,
  };
  const baseTable = {
    lead: { sharpness: 0.8, toughness: 0.5, durability: 3, hardness: 0.4, stability: 4, conductivity: 0.8 },
    tin: { sharpness: 2, toughness: 2, durability: 4, hardness: 0.5, stability: 0.8, conductivity: 0.8 },
    copper: { sharpness: 4, toughness: 0.8, durability: 0.5, hardness: 3, stability: 0.8, conductivity: 1 },
    iron: { sharpness: 1, toughness: 3, durability: 0.8, hardness: 4, stability: 0.4, conductivity: 0.4 },
    silver: { sharpness: 0.5, toughness: 2, durability: 0.8, hardness: 0.8, stability: 2, conductivity: 4 },
    gold: { sharpness: 0.5, toughness: 4, durability: 0.5, hardness: 0.5, stability: 3, conductivity: 2 },
  };
  const modifierTable = {
    lead: { sharpness: 0.8, toughness: 2, durability: 0.8, hardness: 0.5, stability: 1.4, conductivity: 0.8 },
    tin: { sharpness: 0.5, toughness: 0.8, durability: 1.4, hardness: 1.4, stability: 1.1, conductivity: 0.8 },
    copper: { sharpness: 1.4, toughness: 0.5, durability: 0.8, hardness: 2, stability: 0.8, conductivity: 0.8 },
    iron: { sharpness: 0.8, toughness: 1.4, durability: 2, hardness: 0.8, stability: 0.8, conductivity: 0.5 },
    silver: { sharpness: 2, toughness: 0.8, durability: 0.5, hardness: 0.8, stability: 1.4, conductivity: 0.8 },
    gold: { sharpness: 0.8, toughness: 0.8, durability: 0.7, hardness: 0.7, stability: 0.7, conductivity: 3.3 },
  };
  const entropyPenaltyTable = {
    1: 1,
    2: 1,
    3: 1.2,
    4: 1.5,
    5: 1.9,
    6: 2.4,
  };
  const formulaParameters = {
    majorExponent: 2,
    modifierExponent: 16,
  };

  function createStatRecord(defaultValue = 0) {
    return Object.fromEntries(statIds.map((stat) => [stat, defaultValue]));
  }

  function normalizeInputs(inputs) {
    const safeInputs = inputs && typeof inputs === "object" ? inputs : {};
    return Object.fromEntries(
      metalIds.map((resource) => {
        const amount = Math.floor(Number(safeInputs[resource]) || 0);
        return [resource, Math.max(0, amount)];
      }),
    );
  }

  function getPositiveMetalEntries(inputs) {
    const normalized = normalizeInputs(inputs);
    return metalIds.map((resource) => [resource, normalized[resource]]).filter(([, amount]) => amount > 0);
  }

  function getInputTotal(inputs) {
    return getPositiveMetalEntries(inputs).reduce((total, [, amount]) => total + amount, 0);
  }

  function factorial(value) {
    let result = 1;
    for (let index = 2; index <= value; index += 1) {
      result *= index;
    }
    return result;
  }

  function normalizeFormulaTable(source, fallbackTable) {
    const safeSource = source && typeof source === "object" ? source : {};
    return Object.fromEntries(
      metalIds.map((resource) => {
        const row = safeSource[resource] && typeof safeSource[resource] === "object" ? safeSource[resource] : {};
        return [
          resource,
          Object.fromEntries(
            statIds.map((stat) => {
              const value = Number(row[stat]);
              return [stat, Number.isFinite(value) ? value : fallbackTable[resource][stat]];
            }),
          ),
        ];
      }),
    );
  }

  function normalizeStatPerformanceTable(source, fallbackTable = statPerformanceTable) {
    const safeSource = source && typeof source === "object" ? source : {};
    return Object.fromEntries(
      statIds.map((stat) => {
        const value = Number(safeSource[stat]);
        return [stat, Number.isFinite(value) ? value : fallbackTable[stat]];
      }),
    );
  }

  function normalizeEntropyPenaltyTable(source, fallbackTable = entropyPenaltyTable) {
    const safeSource = source && typeof source === "object" ? source : {};
    return Object.fromEntries(
      metalIds.map((_, index) => {
        const activeMetalCount = index + 1;
        const value = Number(safeSource[activeMetalCount]);
        return [
          activeMetalCount,
          Number.isFinite(value) && value > 0 ? value : fallbackTable[activeMetalCount],
        ];
      }),
    );
  }

  function interpolateEntropyPenalty(tableData, effectiveMetalCount) {
    if (!Number.isFinite(effectiveMetalCount) || effectiveMetalCount <= 0) {
      return 1;
    }
    const clampedCount = Math.min(metalIds.length, Math.max(1, effectiveMetalCount));
    const lowerCount = Math.floor(clampedCount);
    const upperCount = Math.ceil(clampedCount);
    const lowerValue = tableData[lowerCount];
    const upperValue = tableData[upperCount];
    if (lowerCount === upperCount || !Number.isFinite(upperValue)) {
      return lowerValue;
    }
    return lowerValue + (upperValue - lowerValue) * (clampedCount - lowerCount);
  }

  function calculateEffectiveMetalCountFromRatios(ratios) {
    const concentration = metalIds.reduce((sum, resource) => {
      const ratio = Number(ratios?.[resource]) || 0;
      return sum + ratio * ratio;
    }, 0);
    return concentration > 0 ? 1 / concentration : 0;
  }

  function getEffectiveMetalCount(inputs) {
    const normalizedInputs = normalizeInputs(inputs);
    const totalAmount = getInputTotal(normalizedInputs);
    const ratios = Object.fromEntries(
      metalIds.map((resource) => [
        resource,
        totalAmount > 0 ? normalizedInputs[resource] / totalAmount : 0,
      ]),
    );
    return calculateEffectiveMetalCountFromRatios(ratios);
  }

  function normalizeFormulaParameters(source, fallbackParameters = formulaParameters) {
    const safeSource = source && typeof source === "object" ? source : {};
    const majorExponent = Number(safeSource.majorExponent);
    const modifierExponent = Number(safeSource.modifierExponent);
    return {
      majorExponent: Number.isFinite(majorExponent) && majorExponent > 0
        ? majorExponent
        : fallbackParameters.majorExponent,
      modifierExponent: Number.isFinite(modifierExponent) && modifierExponent > 0
        ? modifierExponent
        : fallbackParameters.modifierExponent,
    };
  }

  function calculateDetails(inputs, options = {}) {
    const normalizedInputs = normalizeInputs(inputs);
    const activeBaseTable = normalizeFormulaTable(options.baseTable, baseTable);
    const activeModifierTable = normalizeFormulaTable(options.modifierTable, modifierTable);
    const activeStatPerformanceTable = normalizeStatPerformanceTable(
      options.statPerformanceTable || options.performanceTable,
      statPerformanceTable,
    );
    const activeEntropyPenaltyTable = normalizeEntropyPenaltyTable(
      options.entropyPenaltyTable || options.entropyTable,
      entropyPenaltyTable,
    );
    const activeFormulaParameters = normalizeFormulaParameters(
      options.formulaParameters || options.curveParameters || options,
      formulaParameters,
    );
    const majorExponent = activeFormulaParameters.majorExponent;
    const modifierExponent = activeFormulaParameters.modifierExponent;
    const totalAmount = getInputTotal(normalizedInputs);
    const activeMetalCount = getPositiveMetalEntries(normalizedInputs).length;
    const quantityScale = totalAmount > 0 ? Math.log10(totalAmount) : 0;
    const ratios = Object.fromEntries(
      metalIds.map((resource) => [
        resource,
        totalAmount > 0 ? normalizedInputs[resource] / totalAmount : 0,
      ]),
    );
    const effectiveMetalCount = calculateEffectiveMetalCountFromRatios(ratios);
    const entropyPenalty = effectiveMetalCount > 0
      ? interpolateEntropyPenalty(activeEntropyPenaltyTable, effectiveMetalCount)
      : 1;
    const stats = createStatRecord();
    const statDetails = {};

    statIds.forEach((stat) => {
      let major = 0;
      let modifierBonus = 0;

      const metals = metalIds.map((resource) => {
        const ratio = ratios[resource];
        const baseValue = activeBaseTable[resource][stat];
        const modifierValue = activeModifierTable[resource][stat];
        const baseCurve = Math.log(14 * ratio + 1) / Math.log(15);
        const majorShare = Math.pow(baseCurve, majorExponent);
        const majorContribution = majorShare * baseValue;
        const modifierBase = Math.pow(1 - ratio, modifierExponent);
        const modifierCurve = modifierBase * (1 - modifierBase);
        const modifierContribution = modifierCurve * modifierValue;

        major += majorContribution;
        modifierBonus += modifierContribution;

        return {
          resource,
          amount: normalizedInputs[resource],
          ratio,
          baseValue,
          modifierValue,
          baseCurve,
          majorShare,
          majorContribution,
          modifierCurve,
          modifierContribution,
        };
      });

      const modifier = 1 + modifierBonus;
      const statPerformance = activeStatPerformanceTable[stat];
      const raw = entropyPenalty > 0 ? (major * modifier * statPerformance * quantityScale) / entropyPenalty : 0;
      const final = Math.max(0, Math.floor(raw));

      stats[stat] = final;
      statDetails[stat] = {
        major,
        modifierBonus,
        modifier,
        statPerformance,
        entropy: entropyPenalty,
        entropyPenalty,
        raw,
        final,
        metals,
      };
    });

    return {
      inputs: normalizedInputs,
      totalAmount,
      activeMetalCount,
      effectiveMetalCount,
      entropy: entropyPenalty,
      entropyPenalty,
      entropyPenaltyTable: activeEntropyPenaltyTable,
      formulaParameters: activeFormulaParameters,
      majorExponent,
      modifierExponent,
      quantityScale,
      ratios,
      stats,
      statDetails,
    };
  }

  function calculateStats(inputs, options = {}) {
    return calculateDetails(inputs, options).stats;
  }

  const api = {
    metalIds,
    statIds,
    metalLabels,
    statLabels,
    statPerformanceTable,
    baseTable,
    modifierTable,
    entropyPenaltyTable,
    formulaParameters,
    createStatRecord,
    normalizeInputs,
    getPositiveMetalEntries,
    getInputTotal,
    getEffectiveMetalCount,
    factorial,
    normalizeFormulaTable,
    normalizeStatPerformanceTable,
    normalizeEntropyPenaltyTable,
    interpolateEntropyPenalty,
    calculateEffectiveMetalCountFromRatios,
    normalizeFormulaParameters,
    calculateDetails,
    calculateStats,
  };

  global.ForgingFormula = api;
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
