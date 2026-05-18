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
const STOICH    = 1.83;
const OD_POINTS  = [0.5, 1, 1.5, 2, 2.5, 3, 4, 5, 7, 10];
const VOL_POINTS = [0, 100, 250, 500, 1000, 2000, 3500, 6000, 10000];
const SCENARIOS  = {
  conservative: { factor: 0.18, label: 'Conservative', desc: 'Low light, suboptimal mixing, lower-productivity strains' },
  standard:     { factor: 0.25, label: 'Standard',     desc: 'Typical industrial flat-panel PBR with CO₂ sparging' },
  optimized:    { factor: 0.30, label: 'Optimized',    desc: 'High-PAR, CO₂-enriched feed, tuned strain, automated pH' },
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
  const [vol,      setVol]      = useState(1000);
  const [days,     setDays]     = useState(330);
  const [eff,      setEff]      = useState(95);
  const [scenario, setScenario] = useState('standard');

  const factor     = SCENARIOS[scenario].factor;
  const effDecimal = eff / 100;

  /* ── Derived ── */
  const yearly_kg   = od * vol * factor * effDecimal;
  const monthly_kg  = yearly_kg / 12;
  const daily_kg    = yearly_kg / days;
  const biomass_kg  = daily_kg / STOICH;
  const tons_yr     = yearly_kg / 1000;
  const effective_F = factor * effDecimal;

  const carEquiv = (kg) =>
    `Equivalent to offsetting ${fmtInt(kg / 0.166)} km of passenger-car driving`;

  /* ── Validation ── */
  const validationMsgs = [
    od > 10              ? 'OD must be 0 – 10'           : null,
    vol > 10000          ? 'Volume must be 0 – 10,000 L' : null,
    days > 365           ? 'Days must be 0 – 365'        : null,
    eff > 100            ? 'Efficiency must be 0 – 100%' : null,
  ].filter(Boolean);

  /* ── Chart highlight plugin (reads live state via ref) ── */
  const calcRef = useRef();
  calcRef.current = { od, vol, factor, effDecimal };

  function drawHighlight(chart, type) {
    const { od, vol, factor, effDecimal } = calcRef.current;
    const xVal = type === 'od' ? od : vol;
    const yVal = od * vol * factor * effDecimal;
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
    data: OD_POINTS.map((o) => ({ x: o, y: o * vol * factor * effDecimal })),
    borderColor: GREEN, backgroundColor: 'rgba(61,123,46,0.06)',
    borderWidth: 2, pointRadius: 3, pointBackgroundColor: GREEN, tension: 0.25, fill: true,
  }]};
  const volData = { datasets: [{
    data: VOL_POINTS.map((v) => ({ x: v, y: od * v * factor * effDecimal })),
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
            Adjust any parameter — outputs update in real time.
          </span>
        </div>
        <div className={s.bannerRight}>
          <span className={s.bannerBadge}>
            <span className={s.bannerDot} />
            Real-time
          </span>
          <span className={s.bannerBadge}>v1.0</span>
          <span className={s.bannerBadge}>OD·V·F·η</span>
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
                hint="Measured at 680 nm · range 0 – 10"
                min={0} max={10} step={0.1} value={od}
                onChange={setOd}
              />
              <SliderField
                label="PBR Working Volume"
                unit="L"
                hint="0 – 10,000 L"
                min={0} max={10000} step={10} value={vol}
                onChange={setVol}
              />
              <SliderField
                label="Operating Days / Year"
                unit="days"
                hint="Default 330 days ≈ 90% uptime"
                min={0} max={365} step={1} value={days}
                onChange={setDays}
              />
              <SliderField
                label="System Efficiency"
                unit="%"
                hint="Covers downtime, harvest loss, respiration"
                min={0} max={100} step={1} value={eff}
                onChange={setEff}
              />

              {/* Scenario */}
              <div className={s.field}>
                <div className={s.fieldHeader}>
                  <label className={s.fieldLabel}>Capture Factor Scenario</label>
                  <span className={s.fieldVal}>{factor.toFixed(3)}</span>
                </div>
                <div className={s.scenarioGrid}>
                  {Object.entries(SCENARIOS).map(([key, sc]) => (
                    <button
                      key={key}
                      className={`${s.scenBtn} ${scenario === key ? s.scenBtnOn : ''}`}
                      onClick={() => setScenario(key)}
                    >
                      <span className={s.scenName}>{sc.label}</span>
                      <span className={s.scenVal}>{sc.factor.toFixed(2)}</span>
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
                <code className={s.modelEqFormula}>Y = OD × V × F × η</code>
              </div>
              <code className={s.modelEqValues}>
                {od.toFixed(1)} × {fmtInt(vol)} L × {factor.toFixed(2)} × {effDecimal.toFixed(2)}
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
              <div className={s.kpiEquiv}>{carEquiv(yearly_kg)}</div>
            </div>

            {/* 2 × 2 secondary metrics */}
            <div className={s.metricsGrid}>
              <MetricCard label="Monthly Capture"     value={fmt(monthly_kg, 1)} unit="kg / month"         />
              <MetricCard label="Daily Capture"       value={fmt(daily_kg, 2)}   unit="kg / day"           />
              <MetricCard label="Daily Biomass Yield" value={fmt(biomass_kg, 2)} unit="kg dry mass / day"  />
              <MetricCard label="Net Capture Factor"  value={fmt(effective_F, 3)} unit="kg CO₂ · OD⁻¹·L⁻¹·yr⁻¹" />
            </div>

            {/* Auto-narrative */}
            <div className={s.narrative}>
              <div className={s.narrativeTag}>System Summary</div>
              <p className={s.narrativeText}>
                A <strong>{fmtInt(vol)} L</strong> flat-panel PBR at OD{' '}
                <strong>{od.toFixed(2)}</strong>, operating under the{' '}
                <strong>{SCENARIOS[scenario].label}</strong> scenario for{' '}
                <strong>{days} days/yr</strong> at <strong>{eff}%</strong> efficiency,
                will sequester approximately{' '}
                <strong>{fmt(tons_yr, 2)} t CO₂</strong> annually — yielding around{' '}
                <strong>{fmt(biomass_kg, 2)} kg</strong> of dry algal biomass per operating day.
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
              Y<sub>CO₂</sub> (kg yr⁻¹) = OD × V (L) × F (kg · OD⁻¹ · L⁻¹ · yr⁻¹) × η
            </div>
            <div className={s.methodTerms}>
              <div className={s.methodTerm}>
                <span className={s.methodTermKey}>OD</span>
                <span className={s.methodTermDef}>
                  Optical density at 680 nm — the chlorophyll <em>a</em> absorption peak. Used as a linear proxy for volumetric biomass
                  concentration under Beer–Lambert conditions (valid for OD₆₈₀ 0–10 in well-mixed cultures).<sup className={s.citeSup}>[1, 4]</sup>
                </span>
              </div>
              <div className={s.methodTerm}>
                <span className={s.methodTermKey}>V</span>
                <span className={s.methodTermDef}>
                  Working volume of the flat-panel photobioreactor in litres.
                </span>
              </div>
              <div className={s.methodTerm}>
                <span className={s.methodTermKey}>F</span>
                <span className={s.methodTermDef}>
                  Empirical capture factor — maps OD-normalised volumetric productivity to annual CO₂ sequestration.
                  Calibrated from published industrial-scale flat-panel PBR productivity data.<sup className={s.citeSup}>[2, 3, 5]</sup>
                </span>
              </div>
              <div className={s.methodTerm}>
                <span className={s.methodTermKey}>η</span>
                <span className={s.methodTermDef}>
                  System efficiency (0–1). Accounts for scheduled downtime, harvest losses, evaporation, self-shading
                  at high OD, and respiratory CO₂ release (typically 15–25% of gross fixation).<sup className={s.citeSup}>[2, 8]</sup>
                </span>
              </div>
            </div>
          </div>

          {/* 2 · Capture Factor */}
          <div className={s.methodBlock}>
            <h3 className={s.methodH3}>2 · Capture-Factor Scenarios</h3>
            <p className={s.methodPara}>
              F is derived from reported areal and volumetric productivities for flat-panel PBRs,
              converted to OD-normalised units using typical path-lengths (2–5 cm) and published
              dry-weight/OD calibration data.<sup className={s.citeSup}>[2, 3, 5]</sup> The three scenarios bracket
              the performance range documented in peer-reviewed pilot and industrial studies:
            </p>
            <table className={s.methodTable}>
              <thead>
                <tr>
                  <th className={s.methodTh}>Scenario</th>
                  <th className={s.methodTh}>F value</th>
                  <th className={s.methodTh}>Productivity basis &amp; conditions</th>
                  <th className={s.methodTh}>Refs</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className={s.methodTd}><strong>Conservative</strong></td>
                  <td className={s.methodTd}><code>0.18</code></td>
                  <td className={s.methodTd}>PAR &lt;150 µmol m⁻² s⁻¹, suboptimal CO₂ supply,
                    non-optimised wild-type strains; corresponds to ~0.10–0.18 g·L⁻¹·d⁻¹ dry-weight productivity</td>
                  <td className={s.methodTd}>[2, 6]</td>
                </tr>
                <tr>
                  <td className={s.methodTd}><strong>Standard</strong></td>
                  <td className={s.methodTd}><code>0.25</code></td>
                  <td className={s.methodTd}>Typical industrial flat-panel with CO₂ sparging, ~200 µmol m⁻² s⁻¹
                    PAR, controlled pH 7–8; ~0.18–0.25 g·L⁻¹·d⁻¹</td>
                  <td className={s.methodTd}>[3, 5]</td>
                </tr>
                <tr>
                  <td className={s.methodTd}><strong>Optimised</strong></td>
                  <td className={s.methodTd}><code>0.30</code></td>
                  <td className={s.methodTd}>High-PAR (&gt;300 µmol m⁻² s⁻¹), 5–10% CO₂-enriched sparging,
                    selected/engineered strain, automated pH control; ~0.25–0.35 g·L⁻¹·d⁻¹</td>
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
              <strong>1.83 kg CO₂ kg⁻¹ dry biomass</strong>
            </div>
            <p className={s.methodPara}>
              Microalgal dry biomass contains approximately 48–52% carbon by mass across commonly
              cultivated genera — <em>Chlorella, Scenedesmus, Nannochloropsis,</em> and <em>Spirulina.</em>
              <sup className={s.citeSup}>[1, 8]</sup> The representative empirical formula CH₁.₈O₀.₅N₀.₂ implies a
              carbon mass fraction of 48.8%, yielding τ ≈ 1.79–1.83 kg CO₂/kg.<sup className={s.citeSup}>[9]</sup>{' '}
              The value τ = 1.83 (50% C assumption) is the de facto standard adopted in microalgae
              life-cycle assessment and techno-economic literature.<sup className={s.citeSup}>[8, 9]</sup>
            </p>
            <div className={s.methodNote}>
              The η term accounts for respiratory CO₂ release (≈15–25% of gross fixation), so the
              model output represents <strong>net</strong> CO₂ sequestration, not gross photosynthetic fixation.
            </div>
          </div>

          {/* 4 · Operating Envelope */}
          <div className={s.methodBlock}>
            <h3 className={s.methodH3}>4 · Operating Envelope &amp; Constraints</h3>
            <ul className={s.methodList}>
              <li>
                <strong>OD₆₈₀ 0–10:</strong> Chlorophyll <em>a</em> absorbs maximally near 680 nm;
                the Beer–Lambert linear relationship between OD and biomass concentration holds in
                well-stirred suspensions up to OD₆₈₀ ≈ 10. Beyond this threshold, mutual shading
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
                (&lt;10 m² m⁻³), enabling the higher volumetric productivities underpinning F.<sup className={s.citeSup}>[5, 7]</sup>
              </li>
              <li>
                <strong>Geometry correction ±10–20%:</strong> Switching to tubular or open-raceway
                systems typically reduces volumetric productivity by 10–30% due to longer light-path
                lengths and lower illuminated volume fraction.<sup className={s.citeSup}>[6, 7]</sup>
              </li>
              <li>
                <strong>System efficiency η:</strong> The default 95% represents an idealised controlled
                indoor system. Outdoor systems under variable irradiance typically achieve η ≈ 60–80%;
                factoring in seasonal variation and non-productive periods (cleaning, harvest,
                maintenance) brings realistic annual η to 70–90%.<sup className={s.citeSup}>[2, 3]</sup>
              </li>
            </ul>
          </div>

          {/* 5 · Emission Equivalence */}
          <div className={s.methodBlock}>
            <h3 className={s.methodH3}>5 · CO₂ Emission Equivalence Factor</h3>
            <p className={s.methodPara}>
              Captured CO₂ is expressed as an equivalent passenger-car driving distance offset using:
            </p>
            <div className={s.methodEq}>
              d<sub>offset</sub> (km) = Y<sub>CO₂</sub> (kg) / 0.166 kg km⁻¹
            </div>
            <p className={s.methodPara}>
              The factor 0.166 kg CO₂ km⁻¹ (= 166 g CO₂ km⁻¹) is derived from the IEA Global Fuel
              Economy Initiative 2021 report, which documents a global average rated CO₂ intensity
              of 167 g km⁻¹ for new light-duty vehicle registrations in 2019 (petrol, diesel, and
              hybrid combined).<sup className={s.citeSup}>[10]</sup> This figure is illustrative: regional averages
              vary significantly — EU 2022 fleet average ≈ 120 g km⁻¹; US 2022 ≈ 215 g km⁻¹.
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
                OD per unit volume. Real systems experience light attenuation at high volume with fixed
                illumination area — estimates for V &gt; 2,000 L with fixed lighting should be treated
                as upper bounds without proportional illumination scaling.
              </li>
              <li>
                <strong>F calibration uncertainty:</strong> Published F values carry ±20–30%
                inter-study variability due to differences in strain, reactor geometry, and local
                climate. Pilot-scale experimental determination of F for the specific strain–reactor
                combination is recommended before commercial sizing.
              </li>
              <li>
                <strong>Steady-state assumption:</strong> The model assumes continuous or semi-continuous
                operation at constant OD. Batch or fed-batch systems will yield lower effective annual
                capture due to lag and stationary phases.
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
            </ol>
          </div>

        </section>

        {/* ══ FOOTER ══ */}
        <footer className={s.footer}>
          <div>© {new Date().getFullYear()} Carbelim · Microalgae Carbon Capture Calculator v1.0</div>
          <div>OD: 0–10 · Volume: 0–10,000 L · Days: 0–365</div>
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
