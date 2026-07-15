import s from './Graphs.module.css';

export default function GraphsPage() {
  return (
    <div className={s.root}>
      <h2>Analytics & Graphs</h2>
      <div className={s.placeholderWrap}>
        <div className={s.chartBox}>
          <h3>Fleet Carbon Capture (Monthly)</h3>
          <div className={s.barArea}>
             <div className={s.bar} style={{height: '40%'}}></div>
             <div className={s.bar} style={{height: '60%'}}></div>
             <div className={s.bar} style={{height: '55%'}}></div>
             <div className={s.bar} style={{height: '80%'}}></div>
             <div className={s.bar} style={{height: '100%'}}></div>
             <div className={s.bar} style={{height: '90%'}}></div>
          </div>
        </div>
        
        <div className={s.chartBox}>
          <h3>Average Productivity Trend</h3>
          <div className={s.lineArea}>
             <svg viewBox="0 0 100 50" preserveAspectRatio="none" className={s.svgLine}>
               <path d="M0,40 L20,35 L40,20 L60,25 L80,10 L100,5" fill="none" stroke="var(--brand-green)" strokeWidth="3" />
             </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
