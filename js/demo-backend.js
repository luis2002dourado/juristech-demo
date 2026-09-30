/* ===================================================================
   JurisTech — Backend de DEMONSTRAÇÃO (roda no navegador)

   Esta versão não tem servidor. Este arquivo intercepta o fetch() e
   responde com dados fictícios, para que a interface funcione igual
   à do sistema real durante uma apresentação.

   Nada é enviado para lugar nenhum: tudo fica na memória da aba e,
   opcionalmente, no localStorage do próprio navegador.
   =================================================================== */
(() => {
  const CHAVE_DADOS = 'juristech.demo.dados';
  const fetchOriginal = window.fetch.bind(window);

  let BASE = null;   // fixtures originais
  let D = null;      // estado mutável da demonstração

  const clonar = (o) => JSON.parse(JSON.stringify(o));

  // ---------------------------------------------------------------- estado
  async function carregar() {
    const resp = await fetchOriginal('dados.json', { cache: 'no-store' });
    BASE = await resp.json();
    const salvo = localStorage.getItem(CHAVE_DADOS);
    if (salvo) {
      try { D = JSON.parse(salvo); return; } catch { /* recomeça */ }
    }
    D = clonar(BASE);
  }

  function salvar() {
    try { localStorage.setItem(CHAVE_DADOS, JSON.stringify(D)); } catch { /* cota cheia */ }
  }

  window.DEMO_REINICIAR = () => {
    localStorage.removeItem(CHAVE_DADOS);
    localStorage.removeItem('juristech.sessao');
    location.reload();
  };

  // ---------------------------------------------------------------- utilidades
  const J = (dados, status = 200) => new Response(
    dados === null ? '' : JSON.stringify(dados),
    { status, headers: { 'Content-Type': 'application/json' } },
  );
  const erro = (status, detalhe) => J({ detail: detalhe }, status);

  const lista = (rota) => Array.isArray(D[rota]) ? D[rota] : [];
  const novoId = (arr) => (arr.reduce((m, x) => Math.max(m, x.id || 0), 0) + 1);
  const agora = () => new Date().toISOString().slice(0, 19).replace('T', ' ');
  const hoje = () => new Date().toISOString().slice(0, 10);

  function nomeDe(colecao, id, campo = 'nome') {
    const x = lista(colecao).find((i) => i.id === Number(id));
    return x ? x[campo] : null;
  }

  // Recalcula o painel a partir do estado atual, para que as alterações
  // feitas durante a demonstração apareçam nos números.
  function recalcularPainel() {
    const p = lista('/api/processos');
    const c = lista('/api/clientes');
    const l = lista('/api/leads');
    const a = lista('/api/atividades');
    const f = lista('/api/financeiro');
    const d = D['/api/dashboard/geral'];
    if (!d) return;

    const ativos = p.filter((x) => (x.status || '') !== 'Encerrado');
    d.processos.total = p.length;
    d.processos.ativos = ativos.length;
    d.processos.encerrados = p.length - ativos.length;
    d.processos.valor_em_curso = ativos.reduce((s, x) => s + (x.valor_causa || 0), 0);

    const porStatus = {};
    ativos.forEach((x) => { porStatus[x.status] = (porStatus[x.status] || 0) + 1; });
    d.processos.por_status = Object.entries(porStatus).map(([status, qtd]) => ({ status, qtd }));

    d.clientes.total = c.length;

    const etapas = {};
    l.forEach((x) => {
      const e = x.etapa || 'Novo';
      etapas[e] = etapas[e] || { etapa: e, qtd: 0, valor: 0 };
      etapas[e].qtd += 1;
      etapas[e].valor += (x.valor_estimado || 0);
    });
    d.funil.por_etapa = Object.values(etapas);

    d.atividades.por_fazer = a.filter((x) => x.status === 'Por fazer').length;

    const rec = f.filter((x) => x.tipo === 'receita');
    d.financeiro.a_receber = rec.filter((x) => x.status !== 'Pago' && x.status !== 'Cancelado')
      .reduce((s, x) => s + (x.valor || 0), 0);
    d.financeiro.recebido_mes = rec.filter((x) => x.status === 'Pago' && (x.pagamento || '').slice(0, 7) === hoje().slice(0, 7))
      .reduce((s, x) => s + (x.valor || 0), 0);
    d.financeiro.inadimplencia = rec.filter((x) => x.status === 'Atrasado')
      .reduce((s, x) => s + (x.valor || 0), 0);

    const hj = new Date(hoje());
    const prazos = ativos.filter((x) => x.prazo_fatal).map((x) => {
      const dias = Math.round((new Date(x.prazo_fatal) - hj) / 86400000);
      return { id: x.id, numero: x.numero, acao: x.acao, prazo_fatal: x.prazo_fatal,
               cliente: nomeDe('/api/clientes', x.cliente_id), dias };
    });
    d.prazos.vencidos = prazos.filter((x) => x.dias < 0).length;
    d.prazos.hoje = prazos.filter((x) => x.dias === 0).length;
    d.prazos.em_7_dias = prazos.filter((x) => x.dias > 0 && x.dias <= 7).length;
    d.prazos.criticos = prazos.filter((x) => x.dias <= 7).sort((x, y) => x.dias - y.dias).slice(0, 8);
  }

  function auditar(acao, detalhes) {
    const arr = lista('/api/auditoria?limite=300');
    arr.unshift({
      id: novoId(arr), data: agora(), usuario: 'Luis Dourado (demonstração)',
      acao, sucesso: 1, ip: '—',
      detalhes: typeof detalhes === 'string' ? detalhes : JSON.stringify(detalhes || {}),
    });
    if (arr.length > 300) arr.pop();
  }

  // ---------------------------------------------------------------- CRUD
  // Cada coleção declara a rota de lista e como enriquecer um item novo.
  const COLECOES = {
    '/api/clientes': (item) => item,
    '/api/leads': (item) => ({ etapa: 'Novo', probabilidade: 50, valor_estimado: 0, ...item }),
    '/api/processos': (item) => ({
      ...item,
      cliente: nomeDe('/api/clientes', item.cliente_id),
      advogado: nomeDe('/api/usuarios', item.advogado_id),
      status: item.status || 'Fase inicial',
    }),
    '/api/atividades': (item) => ({
      ...item,
      cliente: nomeDe('/api/clientes', item.cliente_id),
      usuario: nomeDe('/api/usuarios', item.usuario_id) || 'Luis Dourado',
      status: item.status || 'Por fazer',
    }),
    '/api/financeiro': (item) => ({
      ...item,
      cliente: nomeDe('/api/clientes', item.cliente_id),
      status: item.status || 'Pendente',
    }),
    '/api/interacoes': (item) => ({ ...item, cliente: nomeDe('/api/clientes', item.cliente_id) }),
    '/api/usuarios': (item) => ({ ...item, ativo: 1, criado_em: agora() }),
    '/api/documentos': (item) => item,
  };

  function tratarColecao(metodo, caminho, corpo) {
    for (const rota of Object.keys(COLECOES)) {
      if (caminho !== rota && !caminho.startsWith(rota + '/')) continue;
      const arr = lista(rota);
      const resto = caminho.slice(rota.length).replace(/^\//, '');
      const id = Number(resto.split('/')[0]);
      const sub = resto.split('/')[1];

      if (metodo === 'POST' && !resto) {
        const item = { id: novoId(arr), criado_em: agora(), ...COLECOES[rota](corpo || {}) };
        arr.unshift(item);
        auditar(`criar ${rota.split('/')[2]}`, { id: item.id });
        recalcularPainel(); salvar();
        return J(item, 201);
      }
      if (!Number.isFinite(id)) continue;
      const i = arr.findIndex((x) => x.id === id);
      if (i < 0) return erro(404, 'Registro não encontrado.');

      if (metodo === 'GET') return J(arr[i]);
      if (metodo === 'PUT' || metodo === 'PATCH') {
        arr[i] = { ...arr[i], ...(corpo || {}) };
        if (rota === '/api/processos') arr[i].cliente = nomeDe('/api/clientes', arr[i].cliente_id);
        if (sub === 'etapa' && corpo?.etapa) arr[i].etapa = corpo.etapa;
        auditar(`editar ${rota.split('/')[2]}`, { id });
        recalcularPainel(); salvar();
        return J(arr[i]);
      }
      if (metodo === 'DELETE') {
        arr.splice(i, 1);
        auditar(`excluir ${rota.split('/')[2]}`, { id });
        recalcularPainel(); salvar();
        return J({ ok: true });
      }
    }
    return null;
  }

  // ---------------------------------------------------------------- rotas especiais
  function tratarEspecial(metodo, caminho, corpo) {
    // --- login: qualquer senha entra, para facilitar a apresentação
    if (caminho === '/api/auth/login' && metodo === 'POST') {
      const email = (corpo?.email || '').trim().toLowerCase();
      if (!email) return erro(422, 'Informe o e-mail.');
      const s = clonar(BASE.__sessao__);
      s.token = 'demo.' + btoa(email).replace(/=/g, '') + '.token';
      auditar('login', { email });
      salvar();
      return J(s);
    }
    if (caminho === '/api/auth/eu') return J(D['/api/auth/eu']);
    if (caminho === '/api/auth/trocar-senha') return J({ ok: true, mensagem: 'Senha alterada (demonstração).' });

    // --- cronômetro do timesheet
    const m = caminho.match(/^\/api\/atividades\/(\d+)\/(iniciar|parar)$/);
    if (m) {
      const arr = lista('/api/atividades');
      const a = arr.find((x) => x.id === Number(m[1]));
      if (!a) return erro(404, 'Atividade não encontrada.');
      if (m[2] === 'iniciar') { a.status = 'Em andamento'; a.hora_inicio = new Date().toTimeString().slice(0, 5); }
      else { a.status = 'Realizada'; a.hora_termino = new Date().toTimeString().slice(0, 5); }
      recalcularPainel(); salvar();
      return J(a);
    }

    // --- baixa de lançamento financeiro
    const b = caminho.match(/^\/api\/financeiro\/(\d+)\/baixar/);
    if (b) {
      const arr = lista('/api/financeiro');
      const f = arr.find((x) => x.id === Number(b[1]));
      if (!f) return erro(404, 'Lançamento não encontrado.');
      f.status = 'Pago'; f.pagamento = hoje();
      auditar('baixar lançamento', { id: f.id });
      recalcularPainel(); salvar();
      return J(f);
    }

    // --- notificações
    if (caminho.startsWith('/api/notificacoes')) {
      const n = D['/api/notificacoes'];
      if (caminho.endsWith('/ler-todas') || /\/\d+\/lida$/.test(caminho)) {
        if (n?.itens) n.itens.forEach((x) => { x.lida = 1; });
        if (n) n.nao_lidas = 0;
        salvar();
        return J(n || { itens: [], nao_lidas: 0 });
      }
      return J(n || { itens: [], nao_lidas: 0 });
    }

    // --- consulta ao DataJud (simulada)
    if (caminho.startsWith('/api/processos/consulta/cnj')) {
      const numero = new URLSearchParams(caminho.split('?')[1] || '').get('numero') || '';
      return J({
        encontrado: true, fonte: 'DataJud/CNJ (demonstração)',
        numero, tribunal: 'TJAL', classe: 'Procedimento Comum Cível',
        assunto: 'Cobrança de valores', orgao: '3ª Vara Cível de Maceió',
        data_ajuizamento: '2018-06-14',
        movimentos: [
          { data: '2025-08-12', descricao: 'Conclusos para decisão' },
          { data: '2025-06-30', descricao: 'Juntada de petição' },
          { data: '2025-04-18', descricao: 'Audiência de conciliação designada' },
          { data: '2024-11-05', descricao: 'Citação cumprida' },
          { data: '2018-06-14', descricao: 'Distribuído por sorteio' },
        ],
        aviso: 'Demonstração: em produção estes dados vêm da API pública do CNJ, em tempo real.',
      });
    }
    if (caminho.startsWith('/api/processos/importar-cnj')) return erro(403, 'Importação desativada na demonstração.');
    if (/\/api\/processos\/\d+\/sincronizar/.test(caminho)) {
      return J({ atualizado: true, movimentos_novos: 3,
                 aviso: 'Demonstração: nenhuma consulta real foi feita ao CNJ.' });
    }

    // --- recursos que gravariam arquivos
    if (caminho.startsWith('/api/backup')) {
      if (metodo !== 'GET') return erro(403, 'Backup desativado na demonstração.');
      return J(D['/api/backup'] || { itens: [] });
    }
    if (caminho.startsWith('/api/mfa/')) {
      if (caminho.endsWith('/status')) return J(D['/api/mfa/status'] || { ativo: false });
      return erro(403, 'Verificação em duas etapas desativada na demonstração.');
    }
    if (caminho.startsWith('/api/licenca/ativar')) return erro(403, 'Ativação desativada na demonstração.');
    if (caminho.startsWith('/api/dashboard/exportar')) return erro(403, 'Exportação desativada na demonstração.');
    if (/\/api\/documentos\/\d+\/baixar/.test(caminho)) return erro(403, 'Download desativado na demonstração.');

    return null;
  }

  // ---------------------------------------------------------------- interceptador
  window.fetch = async (entrada, opcoes = {}) => {
    const url = typeof entrada === 'string' ? entrada : entrada.url;
    const metodo = (opcoes.method || 'GET').toUpperCase();

    if (!url.includes('/api/')) return fetchOriginal(entrada, opcoes);
    if (!D) await carregar();

    const caminho = '/api/' + url.split('/api/')[1];
    const semQuery = caminho.split('?')[0];
    let corpo = null;
    if (opcoes.body && typeof opcoes.body === 'string') {
      try { corpo = JSON.parse(opcoes.body); } catch { corpo = null; }
    }
    if (opcoes.body instanceof FormData) {
      return erro(403, 'Envio de arquivos desativado na demonstração.');
    }

    await new Promise((r) => setTimeout(r, 90 + Math.random() * 160)); // latência realista

    try {
      const especial = tratarEspecial(metodo, caminho, corpo);
      if (especial) return especial;

      if (metodo === 'GET') {
        if (D[caminho] !== undefined) return J(D[caminho]);
        if (D[semQuery] !== undefined) return J(D[semQuery]);
      }

      const crud = tratarColecao(metodo, semQuery, corpo);
      if (crud) return crud;

      if (metodo === 'GET') return J([]);
      return erro(404, 'Recurso indisponível na demonstração.');
    } catch (e) {
      console.error('[demo]', e);
      return erro(500, 'Erro na demonstração: ' + e.message);
    }
  };

  carregar();
})();
