import {createFileRoute} from '@tanstack/react-router';
import {publicOptions} from '@/features/content';
import {AboutPage} from '@/features/public-pages';
import {seo} from '@/features/seo';
export const Route=createFileRoute('/sobre')({head:()=>seo('Warley Jean','Warley Jean, especialista em Coquetelaria, Gestão e Operações de Bar, à frente do BAR PROFISSIONAL.'),loader:({context})=>context.queryClient.ensureQueryData(publicOptions),component:AboutPage});
