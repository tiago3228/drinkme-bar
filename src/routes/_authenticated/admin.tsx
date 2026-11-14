import {createFileRoute,redirect} from '@tanstack/react-router';
import {memberOptions} from '@/features/content';
import {AdminPage} from '@/features/admin-page';
import {seo} from '@/features/seo';
export const Route=createFileRoute('/_authenticated/admin')({head:()=>seo('Administração','Painel administrativo da escola BAR PROFISSIONAL.'),loader:async({context})=>{const data=await context.queryClient.ensureQueryData(memberOptions);if(!data.isAdmin)throw redirect({to:'/aluno'});return data;},component:AdminPage});
