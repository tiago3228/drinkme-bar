import {createFileRoute} from '@tanstack/react-router';
import {publicOptions} from '@/features/content';
import {HomePage} from '@/features/public-pages';
import {seo} from '@/features/seo';
export const Route=createFileRoute('/')({head:()=>seo('BAR PROFISSIONAL — Do balcão à gestão','Formação com Warley Jean em coquetelaria, gestão e operações de bar. Domine a operação e controle seus números.'),loader:({context})=>context.queryClient.ensureQueryData(publicOptions),component:HomePage});
