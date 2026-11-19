'use client';
import {ArrowRight, FilePenLine, Files, Image as ImageIcon, Minimize2} from 'lucide-react';
import {RouteLink} from './route-link';

const shortcuts = [
  {id: 'fill', title: 'Fill out a PDF', detail: 'Type answers into an interactive form', Icon: FilePenLine},
  {id: 'image-target', title: 'Shrink a photo', detail: 'Get an image under a KB limit', Icon: ImageIcon},
  {id: 'merge-pdf', title: 'Merge PDFs', detail: 'Combine documents in your order', Icon: Files},
  {id: 'pdf-compress', title: 'Compress a scanned PDF', detail: 'Make an image-based copy', Icon: Minimize2},
];
export function DeskSidebar({open}: {open: (id: string) => void}) {
  return <aside className="desk-aside" aria-labelledby="shortcuts-heading">
    <h2 id="shortcuts-heading">Quick tools</h2>
    <ul className="shortcut-list">
      {shortcuts.map(({id, title, detail, Icon}) => <li key={id}>
        <RouteLink className="shortcut" href={id === 'fill' ? '#fill' : '?tool=' + id} onNavigate={() => open(id)}>
          <span className={'shortcut-icon icon-' + id}><Icon size={22} strokeWidth={1.7}/></span>
          <span><strong>{title}</strong><small>{detail}</small></span>
          <ArrowRight className="shortcut-arrow" size={18}/>
        </RouteLink>
      </li>)}
    </ul>
    <RouteLink className="browse-all" href="#tools" onNavigate={() => open('tools')}>Browse all file tools <ArrowRight size={18}/></RouteLink>
  </aside>;
}
