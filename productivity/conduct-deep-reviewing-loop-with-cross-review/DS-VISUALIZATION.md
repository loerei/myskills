# Data Science Visualization: EDA Contracts, Web Dashboards, & Vector Exports

Audits exploratory data visualization, the Python-to-Frontend JSON contract, web dashboard engineering invariants (`CLS = 0`, 4-state lifecycle), publication-grade vector SVG generation, and executive business charting.

---

## 1. Python Data Foundation & Pre-Aggregated JSON Contract

Inspecting 100,000+ raw records directly in browser memory causes severe thread contention and unmanageable garbage collection. All visualization architectures must divide labor between Python and the presentation layer:

- [ ] **Pre-Aggregated JSON Engine**: Python must compute all statistical aggregations (univariate histograms, decile churn rates, quantiles, correlation matrices) and serialize them to compact JSON files. NEVER parse 100k raw CSV rows in Node.js or the browser.
- [ ] **Standardized Versioned Envelope**: All exported JSON artifacts must wrap payloads inside a versioned envelope:
  ```typescript
  interface DataEnvelope<T> {
    schemaVersion: 1;
    generatedAt: string;
    payload: T;
  }
  ```
- [ ] **Floating-Point Precision Preservation**: Quantiles, probabilities, and rates must be rounded to 4 decimal places ($0.0001$) during serialization to avoid IEEE-754 serialization bloat (e.g. `0.23000000000000004`). Currency totals retain exact values.

---

## 2. Structured Findings: Facts vs. Hypotheses

Exploratory analysis records (e.g. `docs/findings/data/*.md`) across functional domains (Billing, Handset, Quality, Demographics) must maintain strict epistemic hygiene:

- [ ] **Strict Partitioning**: Every findings document must explicitly segregate empirical observations into two distinct sections:
  ```markdown
  ## Empirical Facts
  - Measured: 12.4% of records have `eqpdays > 730` (2 years).
  - Measured: Missingness on `rev_Mean` is 0.35% (350 rows).

  ## Testable Hypotheses
  - Hypothesis: Handset degradation drives voluntary defection after contract expiry.
  - Test Criteria: Churn rate lift in `eqpdays` deciles 9-10 vs 1-4.
  ```
- [ ] **Zero Speculation in Fact Sections**: Fact sections must contain only verifiable measurements from the dataset. Hypotheses must specify explicit test criteria.

---

## 3. Web Dashboard & UI Engineering Invariants

When deploying interactive research dashboards (e.g. React / TypeScript shells):

- [ ] **Presentation vs. Orchestration Seam**:
  - Encapsulate data fetching, schema validation, and retry state inside custom hooks (e.g. `useDataCategory.ts`).
  - Leaf chart components (`UnivariateHistogram`, `DecileChurnChart`, `CorrelationHeatmap`) must remain pure presentational views driven solely by typed immutable props. They must never trigger side-effect fetches.
- [ ] **Four-State Lifecycle Completeness**: Every visual component must explicitly handle all four lifecycle states:
  | State | UI Behavior & Requirement |
  | :--- | :--- |
  | **Idle** | Clean initial state or placeholder before action is triggered. |
  | **Loading** | Top progress indicator or subtle inline spinner. Prohibit disruptive layout shifts. |
  | **Success** | Stable data view with interactive tooltips and crisp axis typography. |
  | **Error** | Human-readable error message with an actionable "Retry" button. Never crash to a blank screen. |
- [ ] **Cumulative Layout Shift Elimination (`CLS = 0`)**:
  - Chart viewports must declare explicit `aspect-ratio` (e.g. `16 / 9`) or fixed min-heights (`min-height: 320px`) so layout geometry is reserved before JSON payloads settle.
  - Flexible text containers must apply `min-width: 0`, `overflow: hidden`, and `text-overflow: ellipsis` to prevent container blowout on long feature names.
  - Scrollable viewports must set `scrollbar-gutter: stable`.
- [ ] **Interaction & Control Hygiene**:
  - Interactive tabs and filters must use semantic `<button>` elements with `aria-selected` and `aria-disabled` states (preserving keyboard focus during async fetches).
  - Prohibit `event.stopPropagation()`; use parent target filtering (`event.target.closest(...)`).
  - Prohibit volatile list keys (`key={index}`); use immutable entity identifiers (`key={feature.name}`).
  - Zero raw emojis in markup; render inline SVG icons bound to `currentColor` with `aria-hidden="true"`.

---

## 4. Publication-Grade Vector SVG Exports (ML & Business Plots)

Presentations and reports require high-fidelity vector graphics rather than blurry, downscaled raster PNGs:

- [ ] **Direct Vector Export**: Export specialized ML figures (SHAP beeswarm, ROC/PR curves, confusion matrices) and business diagrams (Financial Waterfall ROI, Gantt roadmaps) directly as clean vector SVGs (`.svg`).
- [ ] **SVG Viewport & Typography Rules**:
  - Include responsive `viewBox` coordinates (e.g. `viewBox="0 0 960 540"`).
  - Inline all fonts and color styles (using CSS custom properties or standard hex values) so graphics render identically across headless Chrome print and external PDF viewers.
- [ ] **Confusion Matrix Business Annotations**: Never emit raw numerical matrices without contextual business labels:
  - Rows: "Actual Churned" vs "Actual Retained".
  - Columns: "Targeted for Intervention" vs "Untargeted".
  - Annotate each quadrant with the business consequence (e.g. "Saved Subscriber", "Wasted Campaign Spend", "Lost Subscriber").

---

## Concrete Anti-Patterns

### Anti-Pattern 1: Unstable Layout Shift (CLS > 0) & Direct Raw CSV Parsing in UI

```tsx
// BAD: Parses raw CSV directly in component, flashes skeletons, and lacks aspect-ratio reservation (CLS blowout)
export const BadChart = ({ csvUrl }: { csvUrl: string }) => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(csvUrl).then(r => r.text()).then(csv => {
      setData(parseHugeCsv(csv)); // Parses 100k rows in UI thread!
      setLoading(false);
    });
  }, [csvUrl]);

  if (loading) return <div>Loading...</div>; // Sudden height collapse & layout jump!
  return <div><SvgChart data={data} /></div>; // Unbounded height creates CLS
};

// GOOD: Custom hook with pre-aggregated JSON contract, 4-state handling, and CLS=0 reservation
interface ChartProps {
  category: string;
}

export const SafeChart = ({ category }: ChartProps) => {
  const { data, state, retry } = useDataCategory(category); // Pure orchestration hook

  return (
    <div
      style={{
        aspectRatio: "16 / 9",
        minHeight: "320px",
        position: "relative",
        scrollbarGutter: "stable"
      }}
      className="chart-viewport-container"
    >
      {state === "loading" && <div className="absolute inset-0 bg-neutral-900/40 animate-pulse" />}
      {state === "error" && (
        <div className="flex flex-col items-center justify-center h-full gap-3">
          <p className="text-red-400 text-sm">Failed to load aggregated distributions.</p>
          <button onClick={retry} className="px-3 py-1 bg-neutral-800 border rounded text-xs">
            Retry
          </button>
        </div>
      )}
      {state === "success" && data && (
        <DecileChurnSvgView payload={data.payload} />
      )}
    </div>
  );
};
```
