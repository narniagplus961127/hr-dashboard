import { Link } from 'react-router';
import type { BrandProps } from '../types/components';
import './Brand.css';

export default function Brand({ light = false }: BrandProps) {
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
    <Link className="brand" to="/profile">
      {content}
    </Link>
  );
}
