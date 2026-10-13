import './Brand.css';

export default function Brand({ light = false }: { light?: boolean }) {
  const content = (
    <>
      <span className="brand-mark" aria-hidden="true">
        h.
      </span>
      <span>
        HR Dashboard<span className="brand-caption">Your people, together</span>
      </span>
    </>
  );
  return light ? (
    <div className="brand light">{content}</div>
  ) : (
    <a className="brand" href="#profile">
      {content}
    </a>
  );
}
