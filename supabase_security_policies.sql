-- ========================================================
-- POLÍTICAS DE SEGURANÇA SUPABASE (ROW LEVEL SECURITY - RLS)
-- ========================================================
-- Instruções: Copie este script inteiro, vá no painel do seu Supabase,
-- clique em "SQL Editor", abra um "New Query", cole o script e execute (Run).
-- Isso vai travar as permissões do banco para evitar leituras/escritas indesejadas.

-- 1. CRIAR FUNÇÃO AUXILIAR DE SEGURANÇA (Evita recursão infinita no RLS)
-- Função com SECURITY DEFINER roda com privilégios de superusuário para checar cargos.
CREATE OR REPLACE FUNCTION public.check_user_is_admin_or_gestor(user_id uuid)
RETURNS boolean SECURITY DEFINER AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.usuarios 
    WHERE id = user_id AND cargo IN ('admin', 'gestor', 'sup_tecnico')
  );
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.check_user_is_admin(user_id uuid)
RETURNS boolean SECURITY DEFINER AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.usuarios 
    WHERE id = user_id AND cargo = 'admin'
  );
END;
$$ LANGUAGE plpgsql;


-- 2. HABILITAR ROW LEVEL SECURITY (RLS) EM TODAS AS TABELAS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.logs_acesso ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.solicitacoes_brindes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.relatorios_avarias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.relatorios_visitas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notificacoes ENABLE ROW LEVEL SECURITY;


-- 3. POLÍTICAS PARA A TABELA: profiles
DROP POLICY IF EXISTS "Leitura de perfis por qualquer autenticado" ON public.profiles;
CREATE POLICY "Leitura de perfis por qualquer autenticado" ON public.profiles
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Atualização do próprio perfil" ON public.profiles;
CREATE POLICY "Atualização do próprio perfil" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id);


-- 4. POLÍTICAS PARA A TABELA: usuarios
DROP POLICY IF EXISTS "Leitura de usuarios por autenticados" ON public.usuarios;
CREATE POLICY "Leitura de usuarios por autenticados" ON public.usuarios
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Apenas admin gerencia usuarios" ON public.usuarios;
CREATE POLICY "Apenas admin gerencia usuarios" ON public.usuarios
  FOR ALL TO authenticated USING (public.check_user_is_admin(auth.uid()));


-- 5. POLÍTICAS PARA A TABELA: logs_acesso
DROP POLICY IF EXISTS "Qualquer um insere logs de acesso" ON public.logs_acesso;
CREATE POLICY "Qualquer um insere logs de acesso" ON public.logs_acesso
  FOR INSERT WITH CHECK (true); -- Necessário para registrar tentativas erradas antes de logar

DROP POLICY IF EXISTS "Apenas admin e gestor leem logs de acesso" ON public.logs_acesso;
CREATE POLICY "Apenas admin e gestor leem logs de acesso" ON public.logs_acesso
  FOR SELECT TO authenticated USING (public.check_user_is_admin_or_gestor(auth.uid()));


-- 6. POLÍTICAS PARA A TABELA: solicitacoes_brindes
DROP POLICY IF EXISTS "Promotores leem próprias solicitações" ON public.solicitacoes_brindes;
CREATE POLICY "Promotores leem próprias solicitações" ON public.solicitacoes_brindes
  FOR SELECT TO authenticated USING (auth.uid() = created_by OR public.check_user_is_admin_or_gestor(auth.uid()));

DROP POLICY IF EXISTS "Promotores inserem próprias solicitações" ON public.solicitacoes_brindes;
CREATE POLICY "Promotores inserem próprias solicitações" ON public.solicitacoes_brindes
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "Admin e gestor gerenciam solicitações" ON public.solicitacoes_brindes;
CREATE POLICY "Admin e gestor gerenciam solicitações" ON public.solicitacoes_brindes
  FOR ALL TO authenticated USING (public.check_user_is_admin_or_gestor(auth.uid()));


-- 7. POLÍTICAS PARA A TABELA: relatorios_avarias
DROP POLICY IF EXISTS "Leitura de avarias próprias ou por admin" ON public.relatorios_avarias;
CREATE POLICY "Leitura de avarias próprias ou por admin" ON public.relatorios_avarias
  FOR SELECT TO authenticated USING (auth.uid() = created_by OR public.check_user_is_admin_or_gestor(auth.uid()));

DROP POLICY IF EXISTS "Inserção de avaria pelo criador" ON public.relatorios_avarias;
CREATE POLICY "Inserção de avaria pelo criador" ON public.relatorios_avarias
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "Modificação de avarias por admin/gestor" ON public.relatorios_avarias;
CREATE POLICY "Modificação de avarias por admin/gestor" ON public.relatorios_avarias
  FOR ALL TO authenticated USING (public.check_user_is_admin_or_gestor(auth.uid()));


-- 8. POLÍTICAS PARA A TABELA: relatorios_visitas
DROP POLICY IF EXISTS "Leitura de visitas próprias ou por admin" ON public.relatorios_visitas;
CREATE POLICY "Leitura de visitas próprias ou por admin" ON public.relatorios_visitas
  FOR SELECT TO authenticated USING (auth.uid() = created_by OR public.check_user_is_admin_or_gestor(auth.uid()));

DROP POLICY IF EXISTS "Inserção de visita pelo criador" ON public.relatorios_visitas;
CREATE POLICY "Inserção de visita pelo criador" ON public.relatorios_visitas
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "Modificação de visitas por admin/gestor" ON public.relatorios_visitas;
CREATE POLICY "Modificação de visitas por admin/gestor" ON public.relatorios_visitas
  FOR ALL TO authenticated USING (public.check_user_is_admin_or_gestor(auth.uid()));


-- 9. POLÍTICAS PARA A TABELA: notificacoes
DROP POLICY IF EXISTS "Leitura de notificações para o usuário" ON public.notificacoes;
CREATE POLICY "Leitura de notificações para o usuário" ON public.notificacoes
  FOR SELECT TO authenticated USING (true); -- Permite ler avisos do sistema

DROP POLICY IF EXISTS "Inserção de notificações pelo usuário" ON public.notificacoes;
CREATE POLICY "Inserção de notificações pelo usuário" ON public.notificacoes
  FOR INSERT TO authenticated WITH CHECK (true); -- Permite disparar avisos ao criar relatórios

DROP POLICY IF EXISTS "Exclusão e atualização por admin" ON public.notificacoes;
CREATE POLICY "Exclusão e atualização por admin" ON public.notificacoes
  FOR ALL TO authenticated USING (public.check_user_is_admin_or_gestor(auth.uid()));
