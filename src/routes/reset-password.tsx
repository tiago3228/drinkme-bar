import {createFileRoute} from '@tanstack/react-router';
import {ResetPage} from '@/features/auth-page';
import {seo} from '@/features/seo';
export const Route=createFileRoute('/reset-password')({head:()=>seo('Redefinir senha','Redefina sua senha de acesso à escola BAR PROFISSIONAL.'),component:ResetPage});
