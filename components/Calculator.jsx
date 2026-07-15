'use client';

import { useState, useMemo, useRef } from 'react';
import Image from 'next/image';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  LogarithmicScale,
  PointElement,
  LineElement,
  Tooltip,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import s from './Calculator.module.css';

ChartJS.register(
  CategoryScale, LinearScale, LogarithmicScale,
  PointElement, LineElement, Tooltip, Filler
);

/* ── Constants ── */
const STOICH       = 1.833;   // kg CO₂ per kg dry biomass (report: 44/12 × 50% C)
const K_DEFAULT    = 0.6;     // OD → productivity calibration: P = k × OD (g/L/day)
const OAK_TREE_CO2 = 22.44;  // kg CO₂/year absorbed per mature oak tree (Kumar 2026)
const CAR_KM_CO2   = 0.166;  // kg CO₂/km (IEA 2021 global avg passenger car)

const OD_POINTS  = [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4];
const VOL_POINTS = [0, 100, 250, 500, 1000, 2000, 3500, 6000, 10000];

const SCENARIOS  = {
  conservative: { k: 0.50, label: 'Conservative', desc: 'Low light, suboptimal mixing, lower-productivity strains (P ≈ 1.5 g/L/day at OD 3)' },
  standard:     { k: 0.60, label: 'Standard',     desc: 'Validated reference — Carbelim PRO15 measured productivity (P = 1.8 g/L/day at OD 3)' },
  optimized:    { k: 0.70, label: 'Optimized',    desc: 'High-PAR, CO₂-enriched, tuned strain, automated pH (P ≈ 2.1 g/L/day at OD 3)' },
};

/* ── Formatters ── */
const fmt    = (n, d = 2) => isFinite(n) ? n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d }) : '—';
const fmtInt = (n) => n.toLocaleString('en-US', { maximumFractionDigits: 0 });

/* ── Chart colours ── */
const GREEN      = '#3d7b2e';
const GREEN_DARK = '#28551e';
const INK_MUTE   = '#6b7280';
const GRID_COLOR = 'rgba(61,123,46,0.07)';
const TICK_FONT  = { family: '"JetBrains Mono", monospace', size: 10 };

const tooltipDefaults = {
  backgroundColor: GREEN_DARK, titleColor: '#fff', bodyColor: '#dff0d8',
  titleFont: { family: '"JetBrains Mono", monospace', size: 10 },
  bodyFont:  { family: '"JetBrains Mono", monospace', size: 11 },
  padding: 10, displayColors: false,
};

export default function Calculator() {
  /* ── State ── */
  const [od,       setOd]       = useState(3.0);
  const [vol,      setVol]      = useState(500);
  const [days,     setDays]     = useState(365);
  const [eff,      setEff]      = useState(100);
  const [scenario, setScenario] = useState('standard');

  const k          = SCENARIOS[scenario].k;
  const effDecimal = eff / 100;

  /* ── Derived: Volumetric-Productivity Model ──
     P (g/L/day) = k × OD
     Annual CO₂ (kg/yr) = V × P × τ × D × η / 1000
     This fixes the days bug (D now enters the annual formula)
     and aligns with the study report's validated chain.
  */
  const productivity  = k * od;                                          // g/L/day
  const daily_biomass_g  = vol * productivity;                           // g/day
  const daily_co2_g      = daily_biomass_g * STOICH;                     // g CO₂/day
  const yearly_kg     = (vol * productivity * STOICH * days * effDecimal) / 1000;
  const monthly_kg    = yearly_kg / 12;
  const daily_kg      = days > 0 ? yearly_kg / days : 0;
  const biomass_kg    = days > 0 ? daily_biomass_g / 1000 : 0;           // kg/day
  const biomass_yr_kg = (vol * productivity * days * effDecimal) / 1000; // kg/yr
  const tons_yr       = yearly_kg / 1000;

  // O₂ production: CO₂ × 32/44 (stoichiometric)
  const daily_o2_g    = daily_co2_g * (32 / 44) * effDecimal;
  const yearly_o2_kg  = yearly_kg * (32 / 44);

  // Equivalences
  const oakTrees   = yearly_kg / OAK_TREE_CO2;
  const carKm      = yearly_kg / CAR_KM_CO2;

  const treeEquiv = (kg) =>
    `≈ ${fmt(kg / OAK_TREE_CO2, 1)} mature oak trees absorbing CO₂ for a year`;
  const carEquiv = (kg) =>
    `Offsets ${fmtInt(kg / CAR_KM_CO2)} km of passenger-car driving`;

  /* ── Validation ── */
  const validationMsgs = [
    od > 4               ? 'OD must be 0 – 4'            : null,
    vol > 10000          ? 'Volume must be 0 – 10,000 L' : null,
    days > 365           ? 'Days must be 0 – 365'        : null,
    eff > 100            ? 'Efficiency must be 0 – 100%' : null,
  ].filter(Boolean);

  /* ── Chart highlight plugin (reads live state via ref) ── */
  const calcRef = useRef();
  calcRef.current = { od, vol, k, effDecimal, days };

  function computeAnnual(odVal, volVal) {
    const { k, effDecimal, days } = calcRef.current;
    return (volVal * (k * odVal) * STOICH * days * effDecimal) / 1000;
  }

  function drawHighlight(chart, type) {
    const { od, vol } = calcRef.current;
    const xVal = type === 'od' ? od : vol;
    const yVal = computeAnnual(
      type === 'od' ? od : calcRef.current.od,
      type === 'od' ? calcRef.current.vol : vol
    );
    const xs = chart.scales.x, ys = chart.scales.y;
    if (!xs || !ys) return;
    const xPx = xs.getPixelForValue(xVal);
    const yPx = ys.getPixelForValue(yVal);
    const ctx = chart.ctx;
    /* guide line */
    ctx.save();
    ctx.strokeStyle = 'rgba(61,123,46,0.35)'; ctx.setLineDash([3,3]); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(xPx, ys.bottom); ctx.lineTo(xPx, yPx); ctx.stroke();
    ctx.restore();
    /* dot */
    ctx.save();
    ctx.beginPath(); ctx.arc(xPx, yPx, 7, 0, Math.PI * 2);
    ctx.fillStyle = GREEN; ctx.strokeStyle = GREEN_DARK; ctx.lineWidth = 2.5;
    ctx.fill(); ctx.stroke();
    ctx.restore();
    /* label */
    const label = type === 'od'
      ? `OD ${xVal.toFixed(1)} · ${fmt(yVal, 0)} kg`
      : `${fmtInt(xVal)} L · ${fmt(yVal, 0)} kg`;
    ctx.save();
    ctx.font = '600 11px "JetBrains Mono", monospace';
    const tw = ctx.measureText(label).width + 14;
    const lx = Math.min(xPx + 10, xs.right - tw - 4);
    const ly = Math.max(yPx - 22, ys.top + 4);
    ctx.fillStyle = GREEN_DARK; ctx.fillRect(lx, ly, tw, 18);
    ctx.fillStyle = '#fff'; ctx.textBaseline = 'middle';
    ctx.fillText(label, lx + 7, ly + 9);
    ctx.restore();
  }

  const odPlugin  = useMemo(() => ({ id: 'od-hi',  afterDatasetsDraw: (c) => drawHighlight(c, 'od')  }), []);
  const volPlugin = useMemo(() => ({ id: 'vol-hi', afterDatasetsDraw: (c) => drawHighlight(c, 'vol') }), []);

  /* ── Chart data ── */
  const odData = { datasets: [{
    data: OD_POINTS.map((o) => ({ x: o, y: computeAnnual(o, vol) })),
    borderColor: GREEN, backgroundColor: 'rgba(61,123,46,0.06)',
    borderWidth: 2, pointRadius: 3, pointBackgroundColor: GREEN, tension: 0.25, fill: true,
  }]};
  const volData = { datasets: [{
    data: VOL_POINTS.map((v) => ({ x: v, y: computeAnnual(od, v) })),
    borderColor: GREEN, backgroundColor: 'rgba(61,123,46,0.06)',
    borderWidth: 2, pointRadius: 3, pointBackgroundColor: GREEN, tension: 0.25, fill: true,
  }]};

  const sharedY = {
    title: { display: true, text: 'KG CO₂ / YEAR', color: INK_MUTE,
      font: { family: '"JetBrains Mono", monospace', size: 10, weight: 600 } },
    grid: { color: GRID_COLOR },
    ticks: { color: INK_MUTE, font: TICK_FONT, callback: (v) => fmtInt(v) },
    beginAtZero: true,
  };
  const odOptions = {
    responsive: true, maintainAspectRatio: false, animation: { duration: 200 },
    plugins: { legend: { display: false }, tooltip: { ...tooltipDefaults,
      callbacks: { title: (i) => 'OD = ' + i[0].parsed.x, label: (i) => fmt(i.parsed.y, 1) + ' kg CO₂/yr' } } },
    scales: { x: { type: 'linear',
      title: { display: true, text: 'OPTICAL DENSITY (OD)', color: INK_MUTE,
        font: { family: '"JetBrains Mono", monospace', size: 10, weight: 600 } },
      grid: { color: GRID_COLOR }, ticks: { color: INK_MUTE, font: TICK_FONT } }, y: sharedY },
  };
  const volOptions = {
    responsive: true, maintainAspectRatio: false, animation: { duration: 200 },
    plugins: { legend: { display: false }, tooltip: { ...tooltipDefaults,
      callbacks: { title: (i) => 'Volume = ' + fmtInt(i[0].parsed.x) + ' L',
        label: (i) => fmt(i.parsed.y, 0) + ' kg CO₂/yr' } } },
    scales: { x: { type: 'logarithmic',
      title: { display: true, text: 'PBR VOLUME (LITERS)', color: INK_MUTE,
        font: { family: '"JetBrains Mono", monospace', size: 10, weight: 600 } },
      grid: { color: GRID_COLOR },
      ticks: { color: INK_MUTE, font: TICK_FONT,
        callback: (v) => [100,1000,10000,100000].includes(v) ? fmtInt(v) : '' } }, y: sharedY },
  };

  /* ── Render ── */
  return (
    <div className={s.root}>

      {/* ══ STICKY HEADER ══ */}
      <header className={s.header}>
        <div className={s.headerLeft}>
          <a href="https://carbelim.io" className={s.logoLink} aria-label="Back to Carbelim home">
            <Image src="/logo.png" alt="Carbelim" width={160} height={53} className={s.logo} priority />
          </a>
          <div className={s.headerDivider} />
          <div className={s.headerTitle}>
            <span className={s.toolName}>Microalgae Carbon Capture Calculator</span>
            <span className={s.toolSub}>Sequestration Estimator</span>
          </div>
        </div>
        <div className={s.headerRight}>
          <a href="https://carbelim.io" className={s.backLink}>
            ← carbelim.io
          </a>
          <div className={s.livePill}>
            <span className={s.liveDot} />
            <span className={s.liveLabel}>Live</span>
            <span className={s.liveValue}>{fmt(tons_yr, 2)} t CO₂/yr</span>
          </div>
        </div>
      </header>

      {/* ══ TOOL BANNER ══ */}
      <div className={s.toolBanner}>
        <div className={s.bannerLeft}>
          <span className={s.bannerIcon}>🌿</span>
          <span className={s.bannerText}>
            Adjust any parameter — outputs update in real time. Defaults match the Carbelim study report (PRO15 / 500 L).
          </span>
        </div>
        <div className={s.bannerRight}>
          <span className={s.bannerBadge}>
            <span className={s.bannerDot} />
            Real-time
          </span>
          <span className={s.bannerBadge}>v2.0</span>
          <span className={s.bannerBadge}>V·P·τ·D·η</span>
        </div>
      </div>

      {/* ══ MAIN CALCULATOR ══ */}
      <div className={s.page}>
        <div className={s.calculatorGrid}>

          {/* ── LEFT: CONTROL PANEL ── */}
          <aside className={s.inputPanel}>
            <div className={s.panelHead}>
              <span className={s.panelHeadTitle}>Control Panel</span>
              <span className={s.panelHeadSub}>PBR System Parameters</span>
            </div>

            <div className={s.fieldsWrap}>

              <SliderField
                label="Optical Density (OD₆₈₀)"
                hint="Measured at 680 nm · range 0 – 4"
                min={0} max={4} step={0.1} value={od}
                onChange={setOd}
              />

              {/* Biomass Productivity — interactive, linked to OD via k */}
              <SliderField
                label="Biomass Productivity"
                unit="g/L/d"
                hint={`Linked to OD via P = k × OD (k = ${k.toFixed(2)}) · Report reference: 1.8 g/L/day at OD 3.0`}
                min={0} max={Math.round(k * 4 * 100) / 100} step={0.05}
                value={Math.round(productivity * 100) / 100}
                onChange={(p) => setOd(Math.min(4, Math.max(0, p / k)))}
              />

              <SliderField
                label="PBR Working Volume"
                unit="L"
                hint="0 – 10,000 L · Default 500 L (PRO15)"
                min={0} max={10000} step={10} value={vol}
                onChange={setVol}
              />
              <SliderField
                label="Operating Days / Year"
                unit="days"
                hint="Default 365 days = continuous operation (per report)"
                min={1} max={365} step={1} value={days}
                onChange={setDays}
              />
              <SliderField
                label="System Efficiency"
                unit="%"
                hint="Covers downtime, harvest loss, respiration · 100% = raw (report baseline)"
                min={0} max={100} step={1} value={eff}
                onChange={setEff}
              />

              {/* Scenario */}
              <div className={s.field}>
                <div className={s.fieldHeader}>
                  <label className={s.fieldLabel}>Productivity Scenario</label>
                  <div className={s.fieldValGroup}>
                    <span className={s.fieldVal}>k = {k.toFixed(2)}</span>
                  </div>
                </div>
                <div className={s.scenarioGrid}>
                  {Object.entries(SCENARIOS).map(([key, sc]) => (
                    <button
                      key={key}
                      className={`${s.scenBtn} ${scenario === key ? s.scenBtnOn : ''}`}
                      onClick={() => setScenario(key)}
                    >
                      <span className={s.scenName}>{sc.label}</span>
                      <span className={s.scenVal}>k = {sc.k.toFixed(2)}</span>
                    </button>
                  ))}
                </div>
                <p className={s.fieldHint}>{SCENARIOS[scenario].desc}</p>
              </div>

              {validationMsgs.length > 0 && (
                <div className={s.validation}>⚠ {validationMsgs.join(' · ')}</div>
              )}
            </div>

            {/* Model equation */}
            <div className={s.modelEq}>
              <span className={s.modelEqLabel}>Model equation</span>
              <div className={s.modelEqRow}>
                <code className={s.modelEqFormula}>Y = V × P × τ × D × η / 1000</code>
              </div>
              <code className={s.modelEqValues}>
                {fmtInt(vol)} L × {fmt(productivity, 2)} g/L/d × {STOICH} × {days} d × {effDecimal.toFixed(2)}
              </code>
            </div>
          </aside>

          {/* ── RIGHT: LIVE RESULTS ── */}
          <div className={s.resultsPanel}>

            {/* Results header */}
            <div className={s.resultsHead}>
              <div className={s.resultsHeadLeft}>
                <span className={s.resultsDot} />
                <h2 className={s.resultsTitle}>Live Results</h2>
              </div>
              <span className={s.resultsNote}>Updates live on every input change</span>
            </div>

            {/* Primary KPI */}
            <div className={s.primaryKpi}>
              <div className={s.kpiInner}>
                <div>
                  <div className={s.kpiLabel}>Annual CO₂ Sequestration</div>
                  <div className={s.kpiValue}>{fmt(yearly_kg, 1)}</div>
                  <div className={s.kpiUnit}>kg CO₂ per year</div>
                </div>
                <div className={s.kpiTonneBadge}>
                  <span className={s.kpiTonneNum}>{fmt(tons_yr, 2)}</span>
                  <span className={s.kpiTonneSub}>tonnes/yr</span>
                </div>
              </div>
              <div className={s.kpiEquiv}>{treeEquiv(yearly_kg)}</div>
              <div className={s.kpiEquivSecondary}>{carEquiv(yearly_kg)}</div>
            </div>

            {/* 3 × 2 secondary metrics */}
            <div className={s.metricsGrid}>
              <MetricCard label="Monthly Capture"     value={fmt(monthly_kg, 1)} unit="kg CO₂ / month"        />
              <MetricCard label="Daily CO₂ Capture"   value={fmt(daily_co2_g * effDecimal, 1)}   unit="g CO₂ / day"           />
              <MetricCard label="Daily Biomass Yield"  value={fmt(daily_biomass_g * effDecimal / 1000, 3)} unit="kg dry mass / day"  />
              <MetricCard label="Annual Biomass"       value={fmt(biomass_yr_kg, 1)} unit="kg dry mass / year"    />
              <MetricCard label="Annual O₂ Released"   value={fmt(yearly_o2_kg, 1)} unit="kg O₂ / year"          />
              <MetricCard label="Oak Tree Equivalent"  value={fmt(oakTrees, 1)}      unit="mature oak trees"      />
            </div>

            {/* Auto-narrative */}
            <div className={s.narrative}>
              <div className={s.narrativeTag}>System Summary</div>
              <p className={s.narrativeText}>
                A <strong>{fmtInt(vol)} L</strong> flat-panel PBR at OD{' '}
                <strong>{od.toFixed(2)}</strong> (effective productivity{' '}
                <strong>{fmt(productivity, 2)} g/L/day</strong>), operating under the{' '}
                <strong>{SCENARIOS[scenario].label}</strong> scenario for{' '}
                <strong>{days} days/yr</strong> at <strong>{eff}%</strong> efficiency,
                will sequester approximately{' '}
                <strong>{fmt(tons_yr, 2)} t CO₂</strong> annually, release{' '}
                <strong>{fmt(yearly_o2_kg, 1)} kg O₂</strong>, and yield around{' '}
                <strong>{fmt(biomass_yr_kg, 1)} kg</strong> of dry algal biomass — equivalent to{' '}
                <strong>{fmt(oakTrees, 1)} mature oak trees</strong>.
              </p>
            </div>
          </div>
        </div>

        {/* ══ SENSITIVITY CHARTS ══ */}
        <SectionHead num="01" title="Sensitivity analysis" />

        <div className={s.chartsGrid}>
          <div className={s.chartCard}>
            <div className={s.chartHead}>
              <span className={s.chartTitle}>OD vs Annual CO₂ Capture</span>
              <span className={s.chartMeta}>Volume &amp; Days held constant</span>
            </div>
            <div className={s.chartWrap}>
              <Line data={odData}  options={odOptions}  plugins={[odPlugin]}  />
            </div>
          </div>
          <div className={s.chartCard}>
            <div className={s.chartHead}>
              <span className={s.chartTitle}>Volume vs Annual CO₂ Capture</span>
              <span className={s.chartMeta}>OD &amp; Days held constant · log scale</span>
            </div>
            <div className={s.chartWrap}>
              <Line data={volData} options={volOptions} plugins={[volPlugin]} />
            </div>
          </div>
        </div>

        {/* ══ METHODOLOGY ══ */}
        <SectionHead num="02" title="Methodology &amp; assumptions" />

        <section className={s.methodology}>

          {/* 1 · Core Model */}
          <div className={s.methodBlock}>
            <h3 className={s.methodH3}>1 · Core Model Equation</h3>
            <div className={s.methodEq}>
              Y<sub>CO₂</sub> (kg yr⁻¹) = V (L) × P (g·L⁻¹·d⁻¹) × τ × D (days) × η / 1000
            </div>
            <div className={s.methodTerms}>
              <div className={s.methodTerm}>
                <span className={s.methodTermKey}>V</span>
                <span className={s.methodTermDef}>
                  Working volume of the flat-panel photobioreactor in litres. Default 500 L corresponds
                  to the Carbelim PRO15 culture volume (~495 L in a 500 L tank).
                </span>
              </div>
              <div className={s.methodTerm}>
                <span className={s.methodTermKey}>P</span>
                <span className={s.methodTermDef}>
                  Volumetric biomass productivity in g·L⁻¹·d⁻¹ (dry weight). Derived from optical density
                  via the calibration <strong>P = k × OD</strong>, where k = {K_DEFAULT} maps OD₆₈₀ to measured
                  productivity. At the default OD = 3.0 and k = {K_DEFAULT}, P = 1.8 g·L⁻¹·d⁻¹ — matching
                  the Carbelim study report's validated measurement on the 60 L reference system.<sup className={s.citeSup}>[1, 11]</sup>
                </span>
              </div>
              <div className={s.methodTerm}>
                <span className={s.methodTermKey}>OD</span>
                <span className={s.methodTermDef}>
                  Optical density at 680 nm — the chlorophyll <em>a</em> absorption peak. Used as a linear proxy for volumetric biomass
                  concentration under Beer–Lambert conditions (valid for OD₆₈₀ 0–4 in well-mixed cultures).<sup className={s.citeSup}>[1, 4]</sup>
                </span>
              </div>
              <div className={s.methodTerm}>
                <span className={s.methodTermKey}>τ</span>
                <span className={s.methodTermDef}>
                  CO₂ fixation stoichiometry: 1.833 kg CO₂ per kg dry biomass (= 0.50 × 44.01/12.01).
                  Consistent with the study report's value.<sup className={s.citeSup}>[8, 9, 11]</sup>
                </span>
              </div>
              <div className={s.methodTerm}>
                <span className={s.methodTermKey}>D</span>
                <span className={s.methodTermDef}>
                  Operating days per year. Default 365 = continuous operation, matching the study
                  report's annual projection (daily rate × 365).<sup className={s.citeSup}>[11]</sup>
                </span>
              </div>
              <div className={s.methodTerm}>
                <span className={s.methodTermKey}>η</span>
                <span className={s.methodTermDef}>
                  System efficiency (0–1). Accounts for scheduled downtime, harvest losses, evaporation, self-shading
                  at high OD, and respiratory CO₂ release (typically 15–25% of gross fixation). Default 100% matches
                  the report's raw-productivity baseline; reduce to 70–90% for real-world annual estimates.<sup className={s.citeSup}>[2, 8]</sup>
                </span>
              </div>
            </div>
          </div>

          {/* 2 · Productivity Scenarios */}
          <div className={s.methodBlock}>
            <h3 className={s.methodH3}>2 · Productivity Scenarios (k calibration)</h3>
            <p className={s.methodPara}>
              The calibration constant <strong>k</strong> translates OD₆₈₀ into volumetric biomass productivity (P = k × OD).
              The three scenarios bracket the performance range documented in the Carbelim study report
              and peer-reviewed pilot studies:
            </p>
            <table className={s.methodTable}>
              <thead>
                <tr>
                  <th className={s.methodTh}>Scenario</th>
                  <th className={s.methodTh}>k value</th>
                  <th className={s.methodTh}>P at OD 3</th>
                  <th className={s.methodTh}>Conditions</th>
                  <th className={s.methodTh}>Refs</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className={s.methodTd}><strong>Conservative</strong></td>
                  <td className={s.methodTd}><code>0.50</code></td>
                  <td className={s.methodTd}>1.5 g/L/day</td>
                  <td className={s.methodTd}>PAR &lt;150 µmol m⁻² s⁻¹, suboptimal CO₂ supply,
                    non-optimised wild-type strains</td>
                  <td className={s.methodTd}>[2, 6]</td>
                </tr>
                <tr>
                  <td className={s.methodTd}><strong>Standard</strong></td>
                  <td className={s.methodTd}><code>0.60</code></td>
                  <td className={s.methodTd}>1.8 g/L/day</td>
                  <td className={s.methodTd}>Validated Carbelim reference — PRO15 measured productivity
                    at OD 3, CO₂ sparging, controlled pH 7–8</td>
                  <td className={s.methodTd}>[3, 5, 11]</td>
                </tr>
                <tr>
                  <td className={s.methodTd}><strong>Optimised</strong></td>
                  <td className={s.methodTd}><code>0.70</code></td>
                  <td className={s.methodTd}>2.1 g/L/day</td>
                  <td className={s.methodTd}>High-PAR (&gt;300 µmol m⁻² s⁻¹), 5–10% CO₂-enriched sparging,
                    selected/engineered strain, automated pH control</td>
                  <td className={s.methodTd}>[3, 7]</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* 3 · Stoichiometry */}
          <div className={s.methodBlock}>
            <h3 className={s.methodH3}>3 · CO₂ Fixation Stoichiometry</h3>
            <div className={s.methodEq}>
              τ = C<sub>frac</sub> × (M<sub>CO₂</sub> / M<sub>C</sub>) = 0.50 × (44.01 / 12.01) ={' '}
              <strong>1.833 kg CO₂ kg⁻¹ dry biomass</strong>
            </div>
            <p className={s.methodPara}>
              Microalgal dry biomass contains approximately 48–52% carbon by mass across commonly
              cultivated genera — <em>Chlorella, Scenedesmus, Nannochloropsis,</em> and <em>Spirulina.</em>
              <sup className={s.citeSup}>[1, 8]</sup> The representative empirical formula CH₁.₈O₀.₅N₀.₂ implies a
              carbon mass fraction of 48.8%, yielding τ ≈ 1.79–1.83 kg CO₂/kg.<sup className={s.citeSup}>[9]</sup>{' '}
              The value τ = 1.833 (50% C assumption) is consistent with the Carbelim study report and
              the de facto standard in microalgae life-cycle assessment literature.<sup className={s.citeSup}>[8, 9, 11]</sup>
            </p>

            <h3 className={s.methodH3}>O₂ Release Stoichiometry</h3>
            <div className={s.methodEq}>
              O₂ (kg/yr) = Y<sub>CO₂</sub> × (M<sub>O₂</sub> / M<sub>CO₂</sub>) = Y<sub>CO₂</sub> × (32 / 44) ={' '}
              Y<sub>CO₂</sub> × <strong>0.727</strong>
            </div>
            <p className={s.methodPara}>
              Photosynthesis releases O₂ stoichiometrically with CO₂ fixation.
              The Carbelim study report uses this ratio to compute annual O₂ output alongside CO₂ capture.<sup className={s.citeSup}>[11]</sup>
            </p>
          </div>

          {/* 4 · Operating Envelope */}
          <div className={s.methodBlock}>
            <h3 className={s.methodH3}>4 · Operating Envelope &amp; Constraints</h3>
            <ul className={s.methodList}>
              <li>
                <strong>OD₆₈₀ 0–4:</strong> Chlorophyll <em>a</em> absorbs maximally near 680 nm;
                the Beer–Lambert linear relationship between OD and biomass concentration holds in
                well-stirred suspensions up to OD₆₈₀ ≈ 4. Beyond this threshold, mutual shading
                limits productive culture depth and the linear model overestimates CO₂ fixation.<sup className={s.citeSup}>[4]</sup>
              </li>
              <li>
                <strong>PAR ≥ 200 µmol photons m⁻² s⁻¹:</strong> Light saturation for photoautotrophic
                growth typically falls in the range 150–350 µmol m⁻² s⁻¹ depending on species and
                acclimation state. Below this threshold, photosynthetic rate and CO₂ fixation drop
                non-linearly (photolimitation regime).<sup className={s.citeSup}>[5, 6]</sup>
              </li>
              <li>
                <strong>Flat-panel geometry:</strong> Flat-panel PBRs offer surface-to-volume ratios
                of 80–300 m² m⁻³, outperforming tubular reactors (30–80 m² m⁻³) and open raceways
                (&lt;10 m² m⁻³), enabling the higher volumetric productivities underpinning the model.<sup className={s.citeSup}>[5, 7]</sup>
              </li>
              <li>
                <strong>System efficiency η:</strong> The default 100% represents the report's raw-productivity
                baseline. Outdoor systems under variable irradiance typically achieve η ≈ 60–80%;
                factoring in seasonal variation and non-productive periods (cleaning, harvest,
                maintenance) brings realistic annual η to 70–90%.<sup className={s.citeSup}>[2, 3]</sup>
              </li>
            </ul>
          </div>

          {/* 5 · Equivalence */}
          <div className={s.methodBlock}>
            <h3 className={s.methodH3}>5 · CO₂ Equivalence Metrics</h3>
            <p className={s.methodPara}>
              CO₂ capture is expressed via two equivalence benchmarks:
            </p>
            <div className={s.methodEq}>
              Trees<sub>equiv</sub> = Y<sub>CO₂</sub> (kg) / 22.44 kg tree⁻¹ yr⁻¹
            </div>
            <p className={s.methodPara}>
              A mature oak tree absorbs approximately 22.44 kg CO₂/year. This figure is adopted
              from the Carbelim study report (Kumar 2026).<sup className={s.citeSup}>[11]</sup>
            </p>
            <div className={s.methodEq}>
              d<sub>offset</sub> (km) = Y<sub>CO₂</sub> (kg) / 0.166 kg km⁻¹
            </div>
            <p className={s.methodPara}>
              The factor 0.166 kg CO₂ km⁻¹ (= 166 g CO₂ km⁻¹) is derived from the IEA Global Fuel
              Economy Initiative 2021 report, documenting a global average of 167 g km⁻¹ for new
              light-duty vehicles.<sup className={s.citeSup}>[10]</sup>
            </p>
          </div>

          {/* 6 · Scope & Limitations */}
          <div className={s.methodBlock}>
            <h3 className={s.methodH3}>6 · Model Scope &amp; Limitations</h3>
            <ul className={s.methodList}>
              <li>
                <strong>OD as biomass proxy:</strong> OD₆₈₀ is sensitive to cell size, pigmentation,
                and suspended debris. A strain-specific OD-to-dry-weight calibration curve is required
                for quantitative pilot validation.
              </li>
              <li>
                <strong>Linear volume scaling:</strong> The model assumes constant CO₂ uptake per unit
                volume. Real systems experience light attenuation at high volume with fixed
                illumination area — estimates for V &gt; 2,000 L with fixed lighting should be treated
                as upper bounds without proportional illumination scaling.
              </li>
              <li>
                <strong>k calibration uncertainty:</strong> The default k = 0.6 is calibrated to the
                Carbelim PRO15 reference system. Different strains, reactor geometries, and growth
                conditions may require k recalibration (±20–30%).
              </li>
              <li>
                <strong>Steady-state assumption:</strong> The model assumes continuous or semi-continuous
                operation at constant OD. Batch or fed-batch systems will yield lower effective annual
                capture due to lag and stationary phases.
              </li>
              <li>
                <strong>Energy &amp; cost:</strong> The study report includes energy (kWh) and cost (₹) per
                product model; these are product-specific values that do not scale with volume
                and are not computed by this calculator.
              </li>
            </ul>
            <div className={s.methodNote}>
              All estimates carry ±20–30% uncertainty at laboratory/pilot scale. This tool is
              intended for preliminary sizing and scenario comparison — not for bankable yield
              guarantees. Independent pilot-scale validation is recommended before commercial investment.
            </div>
          </div>

          {/* References */}
          <div className={s.methodRefs}>
            <h3 className={s.methodH3}>References</h3>
            <ol className={s.methodRefList}>
              <li className={s.methodRefItem}>
                Chisti, Y. (2007). Biodiesel from microalgae. <em>Biotechnology Advances</em>, 25(3), 294–306.{' '}
                <a className={s.methodRefLink} href="https://doi.org/10.1016/j.biotechadv.2007.02.001" target="_blank" rel="noopener noreferrer">
                  https://doi.org/10.1016/j.biotechadv.2007.02.001
                </a>
              </li>
              <li className={s.methodRefItem}>
                Acién, F.G., Fernández, J.M., Magán, J.J., &amp; Molina, E. (2012). Production cost of a real
                microalgae production plant and strategies to reduce it. <em>Biotechnology Advances</em>, 30(6), 1344–1353.{' '}
                <a className={s.methodRefLink} href="https://doi.org/10.1016/j.biotechadv.2012.02.005" target="_blank" rel="noopener noreferrer">
                  https://doi.org/10.1016/j.biotechadv.2012.02.005
                </a>
              </li>
              <li className={s.methodRefItem}>
                Slegers, P.M., Wijffels, R.H., van Straten, G., &amp; van Boxtel, A.J.B. (2011). Design scenarios
                for flat panel photobioreactors. <em>Applied Energy</em>, 88(10), 3342–3353.{' '}
                <a className={s.methodRefLink} href="https://doi.org/10.1016/j.apenergy.2010.12.037" target="_blank" rel="noopener noreferrer">
                  https://doi.org/10.1016/j.apenergy.2010.12.037
                </a>
              </li>
              <li className={s.methodRefItem}>
                Ugwu, C.U., Aoyagi, H., &amp; Uchiyama, H. (2008). Photobioreactors for mass cultivation of algae.{' '}
                <em>Bioresource Technology</em>, 99(10), 4021–4028.{' '}
                <a className={s.methodRefLink} href="https://doi.org/10.1016/j.biortech.2007.01.046" target="_blank" rel="noopener noreferrer">
                  https://doi.org/10.1016/j.biortech.2007.01.046
                </a>
              </li>
              <li className={s.methodRefItem}>
                Posten, C. (2009). Design principles of photo-bioreactors for cultivation of microalgae.{' '}
                <em>Engineering in Life Sciences</em>, 9(3), 165–177.{' '}
                <a className={s.methodRefLink} href="https://doi.org/10.1002/elsc.200900003" target="_blank" rel="noopener noreferrer">
                  https://doi.org/10.1002/elsc.200900003
                </a>
              </li>
              <li className={s.methodRefItem}>
                Wijffels, R.H., &amp; Barbosa, M.J. (2010). An Outlook on Microalgal Biofuels.{' '}
                <em>Science</em>, 329(5993), 796–799.{' '}
                <a className={s.methodRefLink} href="https://doi.org/10.1126/science.1189003" target="_blank" rel="noopener noreferrer">
                  https://doi.org/10.1126/science.1189003
                </a>
              </li>
              <li className={s.methodRefItem}>
                Molina, E., Fernández, J., Acién, F.G., &amp; Chisti, Y. (2001). Tubular photobioreactor design
                for algal cultures. <em>Journal of Biotechnology</em>, 92(2), 113–131.{' '}
                <a className={s.methodRefLink} href="https://doi.org/10.1016/S0168-1656(01)00353-4" target="_blank" rel="noopener noreferrer">
                  https://doi.org/10.1016/S0168-1656(01)00353-4
                </a>
              </li>
              <li className={s.methodRefItem}>
                Lardon, L., Hélias, A., Sialve, B., Steyer, J.-P., &amp; Bernard, O. (2009). Life-Cycle Assessment
                of Biodiesel Production from Microalgae. <em>Environmental Science &amp; Technology</em>, 43(17), 6475–6481.{' '}
                <a className={s.methodRefLink} href="https://doi.org/10.1021/es900705j" target="_blank" rel="noopener noreferrer">
                  https://doi.org/10.1021/es900705j
                </a>
              </li>
              <li className={s.methodRefItem}>
                Williams, P.J. le B., &amp; Laurens, L.M.L. (2010). Microalgae as biodiesel &amp; biomass feedstocks:
                Review &amp; analysis of the biochemistry, energetics &amp; economics.{' '}
                <em>Energy &amp; Environmental Science</em>, 3(5), 554–590.{' '}
                <a className={s.methodRefLink} href="https://doi.org/10.1039/b924978h" target="_blank" rel="noopener noreferrer">
                  https://doi.org/10.1039/b924978h
                </a>
              </li>
              <li className={s.methodRefItem}>
                IEA (2021). <em>Global Fuel Economy Initiative 2021</em>. International Energy Agency, Paris.{' '}
                <a className={s.methodRefLink} href="https://www.iea.org/reports/global-fuel-economy-initiative-2021" target="_blank" rel="noopener noreferrer">
                  https://www.iea.org/reports/global-fuel-economy-initiative-2021
                </a>
              </li>
              <li className={s.methodRefItem}>
                Carbelim (2026). <em>Microalgae-Based Carbon Capture Using Photobioreactors: A Comprehensive Study Report</em>.
                Carbelim Technologies. Internal validated reference for PRO15 productivity (1.8 g/L/day),
                CO₂ stoichiometry (1.833), and oak-tree equivalence (22.44 kg CO₂/tree/yr).
              </li>
            </ol>
          </div>

        </section>

        {/* ══ FOOTER ══ */}
        <footer className={s.footer}>
          <div>© {new Date().getFullYear()} Carbelim · Microalgae Carbon Capture Calculator v2.0</div>
          <div>OD: 0–4 · Volume: 0–10,000 L · Days: 1–365 · Model: V·P·τ·D·η</div>
        </footer>
      </div>
    </div>
  );
}

/* ─── Sub-components ─────────────────────────────────────── */

function SectionHead({ num, title }) {
  return (
    <div className={s.sectionHead}>
      <span className={s.sectionNum}>{num} ▸</span>
      <h2 className={s.sectionTitle} dangerouslySetInnerHTML={{ __html: title }} />
      <div className={s.sectionRule} />
    </div>
  );
}

function SliderField({ label, unit, hint, min, max, step, value, onChange }) {
  const pct = ((value - min) / (max - min)) * 100;

  const adjust = (dir) => {
    const raw = Math.round((value + dir * step) * 10000) / 10000;
    onChange(Math.min(max, Math.max(min, raw)));
  };
  const handleSlider = (e) => {
    onChange(step < 1 ? parseFloat(e.target.value) : parseInt(e.target.value, 10));
  };
  const handleNumber = (e) => {
    const raw = parseFloat(e.target.value);
    if (!isNaN(raw)) onChange(Math.min(max, Math.max(min, raw)));
  };

  return (
    <div className={s.field}>
      <div className={s.fieldHeader}>
        <label className={s.fieldLabel}>{label}</label>
        <div className={s.stepper}>
          <button className={s.stepBtn} onClick={() => adjust(-1)} tabIndex={-1} aria-label="Decrease">−</button>
          <input
            type="number" min={min} max={max} step={step} value={value}
            onChange={handleNumber} className={s.numInput}
          />
          <button className={s.stepBtn} onClick={() => adjust(+1)} tabIndex={-1} aria-label="Increase">+</button>
          {unit && <span className={s.stepUnit}>{unit}</span>}
        </div>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={handleSlider} className={s.slider}
        style={{ '--pct': `${pct}%` }}
      />
      {hint && <p className={s.fieldHint}>{hint}</p>}
    </div>
  );
}

function MetricCard({ label, value, unit }) {
  return (
    <div className={s.metricCard}>
      <div className={s.metricLabel}>{label}</div>
      <div className={s.metricValue}>{value}</div>
      <div className={s.metricUnit}>{unit}</div>
    </div>
  );
}
