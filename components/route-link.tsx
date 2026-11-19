import type {AnchorHTMLAttributes} from 'react';

type Props = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'onClick'> & {onNavigate: () => void};
export function RouteLink({onNavigate, children, ...props}: Props) {
  return <a {...props} onClick={event => {
    if (event.button || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
    event.preventDefault();
    onNavigate();
  }}>{children}</a>;
}
