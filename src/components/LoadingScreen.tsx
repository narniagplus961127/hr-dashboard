import './LoadingScreen.css';

export default function LoadingScreen() {
  return (
    <main className="loading-screen" aria-busy="true">
      <span className="brand-mark" aria-hidden="true">
        h.
      </span>
      <p role="status">Opening your workspace…</p>
    </main>
  );
}
