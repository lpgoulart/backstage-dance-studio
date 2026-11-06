import { Link } from 'react-router-dom';

/**
 * Renders a link whose destination comes from editable content (CMS).
 * Only site paths ("/contato") and http(s) URLs are allowed — anything else
 * (javascript:, data:, "//host", backslashes…) falls back to a safe internal page.
 */
const INTERNAL = /^\/(?!\/)[^\s\\]*$/;
const EXTERNAL = /^https?:\/\/[^/\s\\][^\s\\]*$/i;

export const isSafeImageUrl = (v) => typeof v === 'string' && EXTERNAL.test(v) && !/["'()]/.test(v);

export default function SafeLink({ to, fallback = '/contato', children, ...rest }) {
  const v = typeof to === 'string' ? to.trim() : '';
  if (EXTERNAL.test(v)) return <a href={v} target="_blank" rel="noopener noreferrer" {...rest}>{children}</a>;
  return <Link to={INTERNAL.test(v) ? v : fallback} {...rest}>{children}</Link>;
}
