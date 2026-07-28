(function (global) {
  const DEFAULT_RATIO_THRESHOLD = 0.35;
  const DEFAULT_TOP_STAT_RATIO = 0.9;
  const fallbackMetalIds = ["lead", "tin", "copper", "iron", "silver", "gold"];
  const fallbackStatIds = ["sharpness", "toughness", "durability", "hardness", "stability", "conductivity"];
  const fallbackResourceLabels = {
    lead: "铅",
    tin: "锡",
    copper: "铜",
    iron: "铁",
    silver: "银",
    gold: "金",
  };
  const namePools = {
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

  function splitWordPool(text) {
    return text
      .split(/[、\s]+/)
      .map((word) => word.trim())
      .filter(Boolean);
  }

  function getMetalIds(options = {}) {
    return options.metalIds || global.ForgingFormula?.metalIds || fallbackMetalIds;
  }

  function getStatIds(options = {}) {
    return options.statIds || global.ForgingFormula?.statIds || fallbackStatIds;
  }

  function getResourceLabels(options = {}) {
    return options.resourceLabels || global.GameResearch?.resourceLabels || global.ForgingFormula?.metalLabels || fallbackResourceLabels;
  }

  function formatBladeName(inputs, stats, options = {}) {
    return `${getBladeMaterialNamePart(inputs, options)}${getBladeTypeNamePart(stats, options)}`;
  }

  function getBladeMaterialNamePart(inputs, options = {}) {
    const metalIds = getMetalIds(options);
    const resourceLabels = getResourceLabels(options);
    const metalTierRank = Object.fromEntries(metalIds.map((resource, index) => [resource, index]));
    const threshold = Number.isFinite(Number(options.ratioThreshold))
      ? Number(options.ratioThreshold)
      : DEFAULT_RATIO_THRESHOLD;
    const entries = metalIds
      .map((resource) => [resource, Math.max(0, Math.floor(Number(inputs?.[resource]) || 0))])
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
      .filter((entry) => entry.ratio > threshold)
      .sort((a, b) => b.ratio - a.ratio || b.tier - a.tier);

    if (dominantMetals.length === 0) {
      return "高熵";
    }

    return dominantMetals.map((entry) => resourceLabels[entry.resource] || entry.resource).join("");
  }

  function getBladeTypeNamePart(stats, options = {}) {
    const statIds = getStatIds(options);
    const topStatRatio = Number.isFinite(Number(options.topStatRatio))
      ? Number(options.topStatRatio)
      : DEFAULT_TOP_STAT_RATIO;
    const statValues = statIds.map((stat) => ({
      stat,
      value: Math.floor(Number(stats?.[stat]) || 0),
    }));
    const highestValue = Math.max(...statValues.map((entry) => entry.value));
    const highestStats = statValues.filter((entry) => entry.value === highestValue).map((entry) => entry.stat);
    const primaryStat = chooseRandomItem(highestStats);
    const topStats = statValues
      .filter((entry) => entry.value >= highestValue * topStatRatio)
      .map((entry) => entry.stat);
    const intersectedStats = [primaryStat, ...topStats.filter((stat) => stat !== primaryStat)];
    const sharedPool = intersectedStats.length > 1 ? getIntersectedBladeNamePool(intersectedStats) : [];
    const fallbackPool = namePools[primaryStat] || [];

    return chooseRandomItem(sharedPool.length > 0 ? sharedPool : fallbackPool) || "刃";
  }

  function getIntersectedBladeNamePool(stats) {
    const pools = stats.map((stat) => namePools[stat] || []).filter((pool) => pool.length > 0);
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

  const api = {
    namePools,
    formatBladeName,
    getBladeMaterialNamePart,
    getBladeTypeNamePart,
    getIntersectedBladeNamePool,
    chooseRandomItem,
  };

  global.BladeNaming = api;
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
