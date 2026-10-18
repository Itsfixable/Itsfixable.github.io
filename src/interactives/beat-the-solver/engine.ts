/**
 * The EcoPulse dispatch loop, trimmed to what the "Beat the solver" game
 * needs, and run against the same saved Ta'ū forecast as the case study.
 *
 * Ported from EcoPulse's `lib/dispatch.ts` (`solve`, fixed-schedule mode) and
 * `lib/island.ts`. The only change is that the deferrable loads' hours come
 * from the player instead of a timer. With the timer's hours plugged in, this
 * reproduces EcoPulse's own fixed-schedule result (302.78 L) exactly — see
 * `FIXED_SCHEDULE` below.
 */

export const HOURS = 24;

/**
 * Renewable output per hour in kW, from EcoPulse's generation model applied to
 * `data/tau-raw.json` (Open-Meteo, Ta'ū, 2026-08-30 00:00–23:00 local).
 */
export const SOLAR_KW = [
  0, 0, 0, 0, 0, 0, 0, 22.77, 226.52, 487.79, 613.63, 898.88, 1007.94, 1004.34,
  979.17, 803, 626.82, 354.76, 101.87, 1.2, 0, 0, 0, 0,
] as const;

export const WIND_KW = [
  119.24, 100.71, 86.37, 86.69, 91.33, 100.36, 101.43, 108.41, 121.24, 142.89,
  169.84, 160.52, 160.52, 153.87, 143.34, 116.86, 113.36, 101.43, 104.33, 96.47,
  92.69, 88.99, 91, 88.66,
] as const;

/* Island constants (EcoPulse `TAU`). */
const BATTERY_KWH = 2500;
const BATTERY_MAX_KW = 900;
const BATTERY_START_SOC = 0.55;
const BATTERY_RESERVE_SOC = 0.15;
const DIESEL_MAX_KW = 800;
const DIESEL_FUEL_L = 2000;
export const DIESEL_L_PER_KWH = 0.28;
export const DIESEL_CO2_PER_L = 2.68;
export const TANK_M3 = 500;
const TANK_START_M3 = 300;
const WATER_DEMAND_M3_PER_HOUR = 5;

const HOME_PROFILE = [
  0.55, 0.5, 0.48, 0.48, 0.52, 0.68, 0.88, 1.0, 0.92, 0.8, 0.72, 0.7, 0.72,
  0.72, 0.75, 0.82, 0.95, 1.15, 1.3, 1.28, 1.15, 0.95, 0.75, 0.62,
];
const SCHOOL_PROFILE = [
  0.1, 0.1, 0.1, 0.1, 0.1, 0.15, 0.4, 0.9, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 0.9,
  0.5, 0.25, 0.15, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1,
];

export type BaseLoadId = "clinic" | "pumps" | "comms" | "homes" | "school";

/** Loads that always run, highest priority first (EcoPulse tiers 1 and 2). */
const BASE_LOADS: { id: BaseLoadId; kw: number; profile?: number[] }[] = [
  { id: "clinic", kw: 40 },
  { id: "pumps", kw: 60 },
  { id: "comms", kw: 15 },
  { id: "homes", kw: 260, profile: HOME_PROFILE },
  { id: "school", kw: 70, profile: SCHOOL_PROFILE },
];

/** One always-on load's draw at a given hour, in kW. */
export function loadKwAt(id: BaseLoadId, hour: number): number {
  const load = BASE_LOADS.find((l) => l.id === id);
  return load ? load.kw * (load.profile?.[hour] ?? 1) : 0;
}

export type ShiftableId = "desal" | "ice";

/** The two loads the player schedules (EcoPulse tier 3). */
export const SHIFTABLE: Record<
  ShiftableId,
  { name: string; kw: number; hoursNeeded: number; unit: string }
> = {
  // 5 m³/h of demand × 24 h ÷ 12 m³ per running hour = 10 hours a day.
  desal: { name: "Desalination", kw: 220, hoursNeeded: 10, unit: "fresh water" },
  ice: { name: "Ice plant", kw: 120, hoursNeeded: 8, unit: "ice for the fishing fleet" },
};

const DESAL_M3_PER_HOUR = 12;

export type Schedule = Record<ShiftableId, readonly boolean[]>;

/** EcoPulse's timer: desalination 8 am–6 pm, ice plant 8 am–4 pm. */
export const FIXED_SCHEDULE: Schedule = {
  desal: hoursToRow([8, 9, 10, 11, 12, 13, 14, 15, 16, 17]),
  ice: hoursToRow([8, 9, 10, 11, 12, 13, 14, 15]),
};

export function hoursToRow(hours: readonly number[]): boolean[] {
  const set = new Set(hours);
  return Array.from({ length: HOURS }, (_, h) => set.has(h));
}

export function baseLoadKw(hour: number): number {
  return BASE_LOADS.reduce((sum, load) => sum + load.kw * (load.profile?.[hour] ?? 1), 0);
}

export type HourResult = {
  solarKw: number;
  windKw: number;
  /** Positive while the battery discharges, negative while it charges. */
  batteryKw: number;
  dieselKw: number;
  batterySoc: number;
  tankM3: number;
  /** Whether each schedulable load actually ran this hour. */
  ran: Record<ShiftableId, boolean>;
};

export type PlanResult = {
  hours: HourResult[];
  dieselL: number;
  co2Kg: number;
  tankMinM3: number;
};

/**
 * One day of dispatch. Every scheduled load runs: renewables first, then the
 * battery down to its reserve, then the diesel generator for whatever is left
 * — the same rule EcoPulse's fixed schedule plays by.
 */
export function simulate(schedule: Schedule): PlanResult {
  let soc = BATTERY_START_SOC;
  let fuelL = DIESEL_FUEL_L;
  let tank = TANK_START_M3;
  const hours: HourResult[] = [];

  for (let h = 0; h < HOURS; h++) {
    let renewLeft = SOLAR_KW[h] + WIND_KW[h];
    let batteryLeft = Math.min(
      Math.max(0, (soc - BATTERY_RESERVE_SOC) * BATTERY_KWH),
      BATTERY_MAX_KW,
    );
    let dieselLeft = Math.min(DIESEL_MAX_KW, fuelL / DIESEL_L_PER_KWH);

    const loads = [
      ...BASE_LOADS.map((load) => load.kw * (load.profile?.[h] ?? 1)),
      ...(schedule.desal[h] ? [SHIFTABLE.desal.kw] : []),
      ...(schedule.ice[h] ? [SHIFTABLE.ice.kw] : []),
    ];

    let usedBattery = 0;
    let usedDiesel = 0;
    let madeWater = false;
    const ran: Record<ShiftableId, boolean> = { desal: false, ice: false };
    const iceIndex = BASE_LOADS.length + (schedule.desal[h] ? 1 : 0);

    loads.forEach((kw, index) => {
      if (renewLeft + batteryLeft + dieselLeft + 1e-6 < kw) return;
      let need = kw;
      const fromRenew = Math.min(renewLeft, need);
      renewLeft -= fromRenew;
      need -= fromRenew;
      const fromBattery = Math.min(batteryLeft, need);
      batteryLeft -= fromBattery;
      need -= fromBattery;
      usedBattery += fromBattery;
      if (need > 1e-9) {
        const fromDiesel = Math.min(dieselLeft, need);
        dieselLeft -= fromDiesel;
        usedDiesel += fromDiesel;
      }
      if (index === BASE_LOADS.length && schedule.desal[h]) {
        madeWater = true;
        ran.desal = true;
      }
      if (index === iceIndex && schedule.ice[h]) ran.ice = true;
    });

    const chargeRoom = Math.max(0, (1 - soc) * BATTERY_KWH);
    const charged = Math.min(renewLeft, chargeRoom, BATTERY_MAX_KW);

    soc = Math.max(0, Math.min(1, soc + (charged - usedBattery) / BATTERY_KWH));
    fuelL = Math.max(0, fuelL - usedDiesel * DIESEL_L_PER_KWH);
    tank = Math.max(
      0,
      Math.min(TANK_M3, tank + (madeWater ? DESAL_M3_PER_HOUR : 0) - WATER_DEMAND_M3_PER_HOUR),
    );

    hours.push({
      solarKw: SOLAR_KW[h],
      windKw: WIND_KW[h],
      batteryKw: usedBattery - charged,
      dieselKw: usedDiesel,
      batterySoc: soc,
      tankM3: tank,
      ran,
    });
  }

  const dieselKwh = hours.reduce((sum, hour) => sum + hour.dieselKw, 0);
  const dieselL = dieselKwh * DIESEL_L_PER_KWH;

  return {
    hours,
    dieselL,
    co2Kg: dieselL * DIESEL_CO2_PER_L,
    tankMinM3: Math.min(...hours.map((hour) => hour.tankM3)),
  };
}

export function hoursPlaced(row: readonly boolean[]): number {
  return row.reduce((count, on) => count + (on ? 1 : 0), 0);
}
