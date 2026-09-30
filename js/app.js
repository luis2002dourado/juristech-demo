/* ===================================================================
   JurisTech — Orquestrador da aplicação.
   Bloco: FRONT / APP
   Sessão, navegação, permissões de menu e notificações.
   =================================================================== */

(() => {
  let sessao = null;
  let permissoes = {};
  let paginaAtual = 'painel';

  /* ---------------------------------------------- Mapa de navegação */
  const PAGINAS = [
    { id: 'painel',      titulo: 'Painel Geral',   sub: 'Visão consolidada do escritório',        icone: 'painel',     grupo: 'Visão geral', perm: 'dashboard:ler',  render: Paginas.painel },
    { id: 'agenda',      titulo: 'Agenda',         sub: 'Prazos fatais e tarefas do período',     icone: 'agenda',     grupo: 'Visão geral', perm: 'atividade:ler',  render: Paginas.agenda },
    { id: 'clientes',    titulo: 'Clientes',       sub: 'Cadastro e histórico de relacionamento', icone: 'clientes',   grupo: 'Relacionamento', perm: 'cliente:ler',  render: Paginas.clientes },
    { id: 'funil',       titulo: 'Funil de Vendas',sub: 'Prospecção e conversão de negócios',     icone: 'funil',      grupo: 'Relacionamento', perm: 'lead:ler',     render: Paginas.funil },
    { id: 'processos',   titulo: 'Processos',      sub: 'Acervo, prazos e andamentos do tribunal',icone: 'processos',  grupo: 'Jurídico',    perm: 'processo:ler',   render: Paginas.processos },
    { id: 'atividades',  titulo: 'Atividades',     sub: 'Timesheet e controle de produtividade',  icone: 'atividades', grupo: 'Jurídico',    perm: 'atividade:ler',  render: Paginas.atividades },
    { id: 'documentos',  titulo: 'Documentos',     sub: 'Arquivos do escritório com integridade', icone: 'documentos', grupo: 'Jurídico',    perm: 'documento:ler',  render: Paginas.documentos },
    { id: 'financeiro',  titulo: 'Financeiro',     sub: 'Honorários, despesas e fluxo de caixa',  icone: 'financeiro', grupo: 'Gestão',      perm: 'financeiro:ler', render: Paginas.financeiro },
    { id: 'relatorios',  titulo: 'Relatórios',     sub: 'Produtividade e rentabilidade',          icone: 'relatorios', grupo: 'Gestão',      perm: 'relatorio:ler',  render: Paginas.relatorios },
    { id: 'auditoria',   titulo: 'Auditoria',      sub: 'Trilha imutável de todas as operações',  icone: 'auditoria',  grupo: 'Gestão',      perm: 'auditoria:ler',  render: Paginas.auditoria },
    { id: 'config',      titulo: 'Configurações',  sub: 'Conta, equipe e exportação de dados',    icone: 'config',     grupo: 'Sistema',     perm: null,             render: Paginas.config },
    { id: 'seguranca',   titulo: 'Segurança',      sub: 'Verificação em duas etapas da sua conta',icone: 'auditoria',  grupo: 'Sistema',     perm: null,             render: Paginas.seguranca },
    { id: 'sistema',     titulo: 'Licença e Backup',sub: 'Ativação, cópias de segurança e restauração', icone: 'caixa', grupo: 'Sistema',   perm: 'usuario:gerir',  render: Paginas.sistema },
  ];

  const pode = (perm) => {
    if (!perm) return true;
    const minhas = permissoes[sessao?.usuario?.papel] || [];
    return minhas.includes('*') || minhas.includes(perm);
  };

  /* ---------------------------------------------- Menu lateral */
  function montarMenu() {
    const visiveis = PAGINAS.filter(p => pode(p.perm));
    const grupos = [...new Set(visiveis.map(p => p.grupo))];
    document.getElementById('menu').innerHTML = grupos.map(g => `
      <div class="nav-group"><span>${UI.esc(g)}</span>
        ${visiveis.filter(p => p.grupo === g).map(p => `
          <button data-pag="${p.id}" class="${p.id === paginaAtual ? 'ativo' : ''}">
            ${UI.icone(p.icone)} <span>${UI.esc(p.titulo)}</span>
            ${p.id === 'agenda' ? '<span class="badge-nav escondido" id="badge-agenda">0</span>' : ''}
          </button>`).join('')}
      </div>`).join('');

    document.getElementById('menu').onclick = (e) => {
      const b = e.target.closest('[data-pag]');
      if (b) ir(b.dataset.pag);
    };
  }

  /* ---------------------------------------------- Navegação */
  async function ir(id) {
    const pag = PAGINAS.find(p => p.id === id);
    if (!pag || !pode(pag.perm)) return UI.toast('Você não tem acesso a esta área.', 'erro');
    paginaAtual = id;
    location.hash = id;

    document.querySelectorAll('#menu button').forEach(b =>
      b.classList.toggle('ativo', b.dataset.pag === id));
    document.getElementById('titulo-pagina').textContent = pag.titulo;
    document.getElementById('sub-pagina').textContent = pag.sub;
    document.getElementById('sidebar').classList.remove('aberta');

    const el = document.getElementById('conteudo');
    el.innerHTML = '<div class="aba ativa"><div class="skeleton" style="height:280px"></div></div>';
    const alvo = document.createElement('div');
    alvo.className = 'aba ativa';
    el.innerHTML = '';
    el.appendChild(alvo);

    try {
      await pag.render(alvo, sessao);
    } catch (err) {
      alvo.innerHTML = `<div class="card"><div class="vazio">
        <span style="color:var(--danger)">${UI.icone('alerta', 40)}</span>
        <p><b>Não foi possível carregar esta página.</b></p>
        <p class="muted" style="margin-top:6px">${UI.esc(err.message)}</p>
        <button class="btn btn-primario mt" onclick="location.reload()">Recarregar</button>
      </div></div>`;
    }
  }

  /* ---------------------------------------------- Notificações */
  async function atualizarNotificacoes() {
    if (!sessao) return;
    try {
      const n = await API.notificacoes();
      const pip = document.getElementById('pip-notif');
      pip.textContent = n.nao_lidas > 99 ? '99+' : n.nao_lidas;
      pip.classList.toggle('escondido', !n.nao_lidas);

      document.getElementById('lista-notif').innerHTML = n.itens.length
        ? n.itens.map(i => `
            <div class="notif-item ${i.lida ? '' : 'nao-lida'}" data-nid="${i.id}">
              <span class="notif-dot ${UI.esc(i.nivel)}"></span>
              <div style="min-width:0;flex:1">
                <b>${UI.esc(i.titulo)}</b>
                <p>${UI.esc(i.mensagem || '')}</p>
                <time>${UI.tempoRelativo(i.criado_em)}</time>
              </div></div>`).join('')
        : '<div class="vazio" style="padding:34px"><p>Nenhuma notificação.</p></div>';
    } catch { /* silencioso: não atrapalha o uso */ }

    try {
      const ag = await API.agenda(7);
      const b = document.getElementById('badge-agenda');
      if (b) {
        const n = ag.atrasados.length;
        b.textContent = n; b.classList.toggle('escondido', !n);
      }
    } catch { }
  }

  /* ---------------------------------------------- Sessão */
  /* Primeiro acesso: a senha gerada na instalação precisa ser trocada. */
  function exigirTrocaDeSenha() {
    UI.modal({
      titulo: 'Defina sua senha de acesso',
      corpo: `<div class="card" style="border-left:4px solid var(--warn);margin-bottom:16px">
          <div class="corpo" style="font-size:13.5px">
            Você entrou com a senha temporária gerada na instalação.
            Escolha agora uma senha pessoal para continuar.</div></div>
        ${UI.campo('Senha temporária (a atual)', 'tp-atual', 'password', { req: true })}
        ${UI.campo('Nova senha', 'tp-nova', 'password', { req: true,
          ajuda: 'Mínimo de 10 caracteres, com maiúscula, minúscula, número e símbolo.' })}
        ${UI.campo('Repita a nova senha', 'tp-conf', 'password', { req: true })}`,
      rodape: `<button class="btn btn-ouro" data-confirmar>Salvar e continuar</button>`,
      onConfirmar: async () => {
        const nova = UI.val('tp-nova');
        if (nova !== UI.val('tp-conf')) return UI.toast('As senhas não conferem.', 'erro');
        try {
          await API.trocarSenha(UI.val('tp-atual'), nova);
          UI.fecharModal();
          UI.toast('Senha definida. Bom trabalho!', 'sucesso');
        } catch (e) { UI.toast(e.message, 'erro', 7000); }
      },
    });
    document.querySelector('#modal [data-fechar]')?.remove();
  }

  function entrarNaApp() {
    document.getElementById('tela-login').style.display = 'none';
    document.getElementById('app').classList.add('ativo');
    const u = sessao.usuario;
    document.getElementById('u-nome').textContent = u.nome;
    document.getElementById('u-papel').textContent = u.papel;
    document.getElementById('u-avatar').textContent =
      u.nome.split(' ').filter(Boolean).slice(0, 2).map(p => p[0]).join('').toUpperCase();
    montarMenu();
    const inicial = (location.hash || '').replace('#', '');
    ir(PAGINAS.some(p => p.id === inicial && pode(p.perm)) ? inicial : 'painel');
    atualizarNotificacoes();
    setInterval(atualizarNotificacoes, 60000);
  }

  function sair() {
    API.limparSessao();
    sessao = null;
    document.getElementById('app').classList.remove('ativo');
    document.getElementById('tela-login').style.display = 'grid';
    document.getElementById('in-senha').value = '';
    const bloco = document.getElementById('bloco-mfa');
    if (bloco) { bloco.classList.add('escondido'); document.getElementById('in-mfa').value = ''; }
    location.hash = '';
  }

  /* ---------------------------------------------- Eventos globais */
  document.getElementById('form-login').onsubmit = async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btn-entrar');
    const original = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="carregando"></span> Entrando...';
    try {
      const campoMfa = document.getElementById('in-mfa');
      const r = await API.login(
        UI.val('in-email'),
        document.getElementById('in-senha').value,
        campoMfa && !campoMfa.closest('.campo').classList.contains('escondido')
          ? campoMfa.value.trim() : null
      );

      if (r.mfa_requerido) {
        document.getElementById('bloco-mfa').classList.remove('escondido');
        document.getElementById('in-mfa').focus();
        UI.toast(r.mensagem, 'aviso', 6000);
        btn.disabled = false; btn.innerHTML = original;
        return;
      }
      sessao = r;
      API.salvarSessao(r);
      permissoes = await API.permissoes();
      entrarNaApp();
      if (r.senha_temporaria) {
        exigirTrocaDeSenha();
      } else {
        UI.toast(`Bem-vindo(a), ${r.usuario.nome.split(' ')[0]}.`);
      }
    } catch (err) {
      UI.toast(err.message, 'erro', 6500);
    } finally {
      btn.disabled = false;
      btn.innerHTML = original;
    }
  };

  document.getElementById('btn-sair').onclick = () =>
    UI.confirmar('Deseja sair do sistema?', () => { UI.fecharModal(); sair(); }, 'Sair');

  document.getElementById('burger').onclick = () =>
    document.getElementById('sidebar').classList.toggle('aberta');

  document.getElementById('btn-sino').onclick = (e) => {
    e.stopPropagation();
    document.getElementById('painel-notif').classList.toggle('aberto');
  };

  document.getElementById('btn-ler-todas').onclick = async (e) => {
    e.stopPropagation();
    try { await API.lerTodas(); atualizarNotificacoes(); UI.toast('Notificações marcadas como lidas.'); }
    catch (err) { UI.toast(err.message, 'erro'); }
  };

  document.getElementById('lista-notif').onclick = async (e) => {
    const it = e.target.closest('[data-nid]');
    if (!it) return;
    try { await API.lerNotificacao(it.dataset.nid); atualizarNotificacoes(); } catch { }
  };

  document.addEventListener('click', (e) => {
    if (!e.target.closest('#painel-notif') && !e.target.closest('#btn-sino'))
      document.getElementById('painel-notif').classList.remove('aberto');
  });

  document.getElementById('modal-fechar').onclick = UI.fecharModal;
  document.getElementById('modal-fundo').onclick = (e) => {
    if (e.target.id === 'modal-fundo') UI.fecharModal();
  };

  document.addEventListener('sessao-expirada', () => {
    UI.toast('Sua sessão expirou. Entre novamente.', 'aviso', 6000);
    sair();
  });

  window.onhashchange = () => {
    const h = (location.hash || '').replace('#', '');
    if (sessao && h && h !== paginaAtual) ir(h);
  };

  /* ---------------------------------------------- Início */
  (async function iniciar() {
    const s = API.sessao();
    if (!s?.token) return;
    try {
      const u = await API.eu();
      sessao = { ...s, usuario: u };
      permissoes = await API.permissoes();
      entrarNaApp();
    } catch {
      API.limparSessao();
    }
  })();
})();
