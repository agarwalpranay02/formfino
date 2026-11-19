import {notFound} from 'next/navigation';
import QA from '../../components/qa';
export default function QAPage(){if(process.env.NODE_ENV !== 'development')notFound();return <QA/>}
