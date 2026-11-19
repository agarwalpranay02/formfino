import {notFound} from 'next/navigation';
import ResponsiveChecks from '../../../components/responsive-checks';
export default function MobileQA(){if(process.env.NODE_ENV !== 'development')notFound();return <ResponsiveChecks/>}
