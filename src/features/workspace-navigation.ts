import {
  BookOpen,
  FolderOpen,
  GraduationCap,
  Images,
  LayoutDashboard,
  MessageCircle,
  Music2,
  Settings,
  UserPlus,
  UserRound,
  Users,
} from "lucide-react";

const ADMIN_ITEMS = [
  ["Visão geral", LayoutDashboard],
  ["Cursos", BookOpen],
  ["Aulas", GraduationCap],
  ["Biblioteca", FolderOpen],
  ["Música ambiente", Music2],
  ["Alunos", Users],
  ["Comunidade", MessageCircle],
  ["Galeria", Images],
  ["Conteúdo do site", Settings],
  ["Configurações", UserPlus],
] as const;

const STUDENT_ITEMS = [
  ["Comunidade", MessageCircle],
  ["Meus cursos", BookOpen],
  ["Histórico", GraduationCap],
  ["Meu perfil", UserRound],
] as const;

export function workspaceNavigationItems(admin: boolean) {
  return admin ? ADMIN_ITEMS : STUDENT_ITEMS;
}
