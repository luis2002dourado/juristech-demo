/* ===================================================================
   JurisTech — Páginas (um bloco por setor do escritório).
   Bloco: FRONT / PÁGINAS
   =================================================================== */

const Paginas = (() => {
  const E = UI.esc;
  let cacheClientes = [];
  let cacheUsuarios = [];
  let cacheTribunais = [];

  async function clientesOpcoes() {
    if (!cacheClientes.length) cacheClientes = await API.clientes();
    return cacheClientes.map(c => ({ v: c.id, t: `${c.nome}${c.documento ? ' — ' + c.documento : ''}` }));
  }
  async function usuariosOpcoes() {
    if (!cacheUsuarios.length) cacheUsuarios = await API.usuarios();
    return cacheUsuarios.filter(u => u.ativo).map(u => ({ v: u.id, t: u.nome }));
  }
  function invalidarCache() { cacheClientes = []; cacheUsuarios = []; }

  /* ================================================================
     1. PAINEL GERAL
     ================================================================ */
  async function painel(el) {
    el.innerHTML = '<div class="grid g4">' + '<div class="skeleton" style="height:96px"></div>'.repeat(4) + '</div>';
    const d = await API.dashboard();
    const p = d.processos, pr = d.prazos, f = d.financeiro, a = d.atividades, fu = d.funil;

    const alerta = pr.vencidos > 0 ? `
      <div class="card" style="border-left:4px solid var(--danger);margin-bottom:18px">
        <div class="corpo" style="display:flex;align-items:center;gap:14px">
          <span style="color:var(--danger)">${UI.icone('alerta', 26)}</span>
          <div><b style="font-family:var(--font-body)">Atenção: ${pr.vencidos} prazo(s) fatal(is) vencido(s)</b>
          <div class="muted" style="font-size:13px">Verifique imediatamente na aba Processos.</div></div>
        </div></div>` : '';

    el.innerHTML = alerta + `
      <div class="grid g4" style="margin-bottom:18px">
        ${UI.kpi('Processos ativos', UI.numero(p.ativos), `${UI.numero(p.total)} no total`, '')}
        ${UI.kpi('Prazos em 7 dias', UI.numero(pr.em_7_dias),
            pr.vencidos ? `<span style="color:var(--danger);font-weight:700">${pr.vencidos} vencido(s)</span>` : 'Nenhum vencido',
            pr.vencidos ? 'perigo' : pr.em_7_dias ? 'alerta' : 'sucesso')}
        ${UI.kpi('A receber', UI.moeda(f.a_receber),
            f.inadimplencia ? `<span style="color:var(--danger)">${UI.moeda(f.inadimplencia)} em atraso</span>` : 'Em dia', 'ouro')}
        ${UI.kpi('Recebido no mês', UI.moeda(f.recebido_mes), `A pagar: ${UI.moeda(f.a_pagar)}`, 'sucesso')}
      </div>

      <div class="grid g4" style="margin-bottom:18px">
        ${UI.kpi('Clientes ativos', UI.numero(d.clientes.total), `+${d.clientes.novos_mes} este mês`)}
        ${UI.kpi('Pipeline ponderado', UI.moeda(fu.pipeline_ponderado), `Conversão: ${fu.taxa_conversao}%`, 'ouro')}
        ${UI.kpi('Horas no mês', UI.horas(a.horas_mes_min), `${a.por_fazer} tarefa(s) por fazer`)}
        ${UI.kpi('Valor em curso', UI.moeda(p.valor_em_curso), 'Soma das causas ativas')}
      </div>

      <div class="grid g2" style="margin-bottom:18px">
        <div class="card"><header><h3>Prazos críticos</h3><span class="dica">Próximos 7 dias</span></header>
          <div class="corpo" style="padding:0">${UI.tabela([
            { titulo: 'Prazo', render: r => UI.data(r.prazo_fatal) },
            { titulo: 'Processo', render: r => `<b style="font-family:var(--font-body)">${E(r.acao || r.numero || '—')}</b><br><small class="muted">${E(r.cliente || '')}</small>` },
            { titulo: 'Responsável', render: r => E(r.advogado || '—') },
            { titulo: 'Situação', render: r => UI.pillPrazo(r.dias) },
          ], pr.criticos, { vazio: 'Nenhum prazo crítico. Tudo sob controle.' })}</div></div>

        <div class="card"><header><h3>Fluxo de caixa</h3><span class="dica">Últimos 12 meses</span></header>
          <div class="corpo">${UI.graficoFluxo([...f.fluxo_12m].reverse())}</div></div>
      </div>

      <div class="grid g3">
        <div class="card"><header><h3>Processos por advogado</h3></header><div class="corpo">
          ${UI.barras(p.por_advogado.map(x => ({ rotulo: x.advogado, valor: x.qtd, texto: `${x.qtd} · ${UI.moeda(x.valor)}` })))}
        </div></div>
        <div class="card"><header><h3>Processos por fase</h3></header><div class="corpo">
          ${UI.barras(p.por_status.map(x => ({ rotulo: x.status, valor: x.qtd })), { cor: 'ouro' })}
        </div></div>
        <div class="card"><header><h3>Horas por advogado</h3></header><div class="corpo">
          ${UI.barras(a.horas_por_advogado.map(x => ({
            rotulo: x.advogado, valor: x.minutos,
            texto: `${UI.horas(x.minutos)} (${UI.horas(x.faturaveis)} fat.)`, cor: 'ok' })))}
        </div></div>
      </div>`;
  }

  /* ================================================================
     2. CLIENTES
     ================================================================ */
  async function clientes(el) {
    el.innerHTML = `<div class="barra">
        ${UI.busca('q-cli', 'Buscar por nome, CPF/CNPJ ou e-mail...')}
        <a class="btn btn-neutro" href="${API.urlExportar('clientes')}">${UI.icone('baixar', 16)} Exportar</a>
        <button class="btn btn-primario" id="b-novo-cli">${UI.icone('mais', 16)} Novo cliente</button>
      </div><div id="lista-cli"><div class="skeleton" style="height:200px"></div></div>`;

    async function carregar(q = '') {
      const lista = await API.clientes(q);
      document.getElementById('lista-cli').innerHTML = `<div class="card">${UI.tabela([
        { titulo: 'Nome', render: c => `<b style="font-family:var(--font-body)">${E(c.nome)}</b>
            <br><small class="muted">${E(c.documento || 'Sem documento')} · ${E(c.tipo)}</small>` },
        { titulo: 'Contato', render: c => `${E(c.email || '—')}<br><small class="muted">${E(c.telefone || '')}</small>` },
        { titulo: 'Local', render: c => E([c.cidade, c.uf].filter(Boolean).join('/') || '—') },
        { titulo: 'Origem', render: c => c.origem ? `<span class="pill neutro">${E(c.origem)}</span>` : '—' },
        { titulo: 'Processos', num: true, render: c => UI.numero(c.qtd_processos) },
        { titulo: 'Responsável', render: c => E(c.responsavel || '—') },
        { titulo: '', render: c => `<div style="display:flex;gap:5px;justify-content:flex-end">
            <button class="btn-icone" data-ver="${c.id}" title="Ver ficha">${UI.icone('olho', 15)}</button>
            <button class="btn-icone" data-edit="${c.id}" title="Editar">${UI.icone('editar', 15)}</button>
            <button class="btn-icone perigo" data-del="${c.id}" title="Excluir">${UI.icone('lixo', 15)}</button></div>` },
      ], lista, { vazio: 'Nenhum cliente cadastrado ainda. Clique em "Novo cliente" para começar.' })}</div>`;
    }
    await carregar();

    let t;
    document.getElementById('q-cli').oninput = (e) => {
      clearTimeout(t); t = setTimeout(() => carregar(e.target.value), 320);
    };
    document.getElementById('b-novo-cli').onclick = () => formCliente(null, carregar);

    document.getElementById('lista-cli').onclick = async (e) => {
      const ver = e.target.closest('[data-ver]'), ed = e.target.closest('[data-edit]'), dl = e.target.closest('[data-del]');
      if (ver) return fichaCliente(ver.dataset.ver);
      if (ed) return formCliente(await API.cliente(ed.dataset.edit), carregar);
      if (dl) UI.confirmar('Excluir este cliente permanentemente? Esta ação é registrada na auditoria.',
        async () => {
          try { await API.excluirCliente(dl.dataset.del); UI.fecharModal(); UI.toast('Cliente excluído.'); invalidarCache(); carregar(); }
          catch (err) { UI.toast(err.message, 'erro', 6000); }
        }, 'Excluir');
    };
  }

  async function formCliente(c, recarregar) {
    const usuarios = await usuariosOpcoes();
    UI.modal({
      titulo: c ? 'Editar cliente' : 'Novo cliente',
      largo: true,
      corpo: `<div class="linha">
          ${UI.select('Tipo', 'f-tipo', [{ v: 'PF', t: 'Pessoa Física' }, { v: 'PJ', t: 'Pessoa Jurídica' }], { valor: c?.tipo || 'PF', req: true })}
          ${UI.campo('Nome completo / Razão social', 'f-nome', 'text', { valor: c?.nome, req: true, ph: 'Ex.: Maria Oliveira Santos' })}
        </div>
        <div class="linha">
          ${UI.campo('CPF / CNPJ', 'f-doc', 'text', { valor: c?.documento, ajuda: 'Validado automaticamente. Pode ficar em branco.' })}
          ${UI.campo('E-mail', 'f-email', 'email', { valor: c?.email })}
          ${UI.campo('Telefone', 'f-tel', 'text', { valor: c?.telefone, ph: '(98) 90000-0000' })}
        </div>
        <div class="linha">
          ${UI.campo('Endereço', 'f-end', 'text', { valor: c?.endereco })}
          ${UI.campo('Cidade', 'f-cid', 'text', { valor: c?.cidade })}
          ${UI.campo('UF', 'f-uf', 'text', { valor: c?.uf, attrs: 'maxlength="2"' })}
        </div>
        <div class="linha">
          ${UI.select('Origem do cliente', 'f-origem', ['Indicação', 'Site', 'Google', 'Redes sociais', 'Evento', 'Cliente antigo', 'Outro'], { valor: c?.origem, vazio: 'Não informado' })}
          ${UI.select('Responsável', 'f-resp', usuarios, { valor: c?.responsavel_id, vazio: 'Sem responsável' })}
        </div>
        ${UI.textarea('Observações', 'f-obs', { valor: c?.observacoes, ph: 'Anotações internas sobre o cliente' })}`,
      onConfirmar: async () => {
        const d = {
          tipo: UI.val('f-tipo'), nome: UI.val('f-nome'), documento: UI.val('f-doc') || null,
          email: UI.val('f-email') || null, telefone: UI.val('f-tel') || null,
          endereco: UI.val('f-end') || null, cidade: UI.val('f-cid') || null,
          uf: UI.val('f-uf') || null, origem: UI.val('f-origem') || null,
          responsavel_id: Number(UI.val('f-resp')) || null, observacoes: UI.val('f-obs') || null,
        };
        if (d.nome.length < 3) return UI.toast('Informe o nome do cliente (mínimo 3 letras).', 'erro');
        try {
          c ? await API.editarCliente(c.id, d) : await API.criarCliente(d);
          UI.fecharModal(); UI.toast(c ? 'Cliente atualizado.' : 'Cliente cadastrado.');
          invalidarCache(); recarregar();
        } catch (err) { UI.toast(err.message, 'erro', 7000); }
      },
    });
  }

  async function fichaCliente(id) {
    const c = await API.cliente(id);
    UI.modal({
      titulo: c.nome, largo: true,
      rodape: '<button class="btn btn-neutro" data-fechar>Fechar</button>',
      corpo: `<div class="grid g3" style="margin-bottom:18px">
          ${UI.kpi('Processos', UI.numero(c.processos.length))}
          ${UI.kpi('Interações', UI.numero(c.interacoes.length))}
          ${UI.kpi('Financeiro', UI.moeda(c.financeiro.reduce((s, f) => s + (f.tipo === 'receita' ? f.valor : 0), 0)), 'Receitas vinculadas', 'ouro')}
        </div>
        <p class="muted" style="margin-bottom:14px">${E(c.documento || 'Sem documento')} ·
          ${E(c.email || 'sem e-mail')} · ${E(c.telefone || 'sem telefone')}
          ${c.origem ? ' · Origem: ' + E(c.origem) : ''}</p>
        <h4 style="margin:16px 0 8px;font-size:14px">Processos</h4>
        ${UI.tabela([
          { titulo: 'Nº / Ação', render: p => E(p.numero || p.acao || '—') },
          { titulo: 'Status', render: p => UI.pillStatus(p.status) },
          { titulo: 'Valor', num: true, render: p => UI.moeda(p.valor_causa) },
          { titulo: 'Prazo', render: p => UI.data(p.prazo_fatal) },
        ], c.processos, { vazio: 'Nenhum processo vinculado.' })}
        <h4 style="margin:20px 0 8px;font-size:14px">Últimas interações</h4>
        ${UI.tabela([
          { titulo: 'Data', render: i => UI.data(i.data) },
          { titulo: 'Canal', render: i => `<span class="pill neutro">${E(i.canal)}</span>` },
          { titulo: 'Assunto', render: i => E(i.assunto || '—') },
          { titulo: 'Por', render: i => E(i.usuario || '—') },
        ], c.interacoes, { vazio: 'Nenhuma interação registrada.' })}`,
    });
  }

  /* ================================================================
     3. FUNIL DE VENDAS (Kanban)
     ================================================================ */
  async function funil(el) {
    el.innerHTML = `<div class="barra">
        <div class="cresce"><span class="muted" style="font-size:13px">
          Arraste os cartões entre as colunas para avançar a negociação.</span></div>
        <a class="btn btn-neutro" href="${API.urlExportar('leads')}">${UI.icone('baixar', 16)} Exportar</a>
        <button class="btn btn-primario" id="b-novo-lead">${UI.icone('mais', 16)} Novo lead</button>
      </div>
      <div id="kpis-funil" class="grid g4" style="margin-bottom:18px"></div>
      <div class="kanban" id="kanban"></div>`;

    async function carregar() {
      const [resumo, leads] = await Promise.all([API.funil(), API.leads()]);
      const total = resumo.reduce((s, r) => s + r.qtd, 0);
      const ponderado = resumo.filter(r => !['Ganho', 'Perdido'].includes(r.etapa))
        .reduce((s, r) => s + r.valor_ponderado, 0);
      const ganho = resumo.find(r => r.etapa === 'Ganho') || { qtd: 0, valor: 0 };
      const perdido = resumo.find(r => r.etapa === 'Perdido') || { qtd: 0 };
      const conv = (ganho.qtd + perdido.qtd) ? (ganho.qtd / (ganho.qtd + perdido.qtd) * 100).toFixed(1) : '0.0';

      document.getElementById('kpis-funil').innerHTML =
        UI.kpi('Leads no funil', UI.numero(total)) +
        UI.kpi('Pipeline ponderado', UI.moeda(ponderado), 'Valor × probabilidade', 'ouro') +
        UI.kpi('Negócios ganhos', UI.numero(ganho.qtd), UI.moeda(ganho.valor), 'sucesso') +
        UI.kpi('Taxa de conversão', conv + '%', `${perdido.qtd} perdido(s)`, Number(conv) >= 50 ? 'sucesso' : 'alerta');

      document.getElementById('kanban').innerHTML = resumo.map(col => {
        const cards = leads.filter(l => l.etapa === col.etapa).map(l => `
          <div class="lead-card" draggable="true" data-id="${l.id}">
            <b>${E(l.nome)}</b>
            <div class="meta">${E(l.area_interesse || 'Área não informada')}${l.origem ? ' · ' + E(l.origem) : ''}</div>
            <div class="meta">${E(l.responsavel || 'Sem responsável')} · ${l.probabilidade}%</div>
            ${l.valor_estimado ? `<div class="valor">${UI.moeda(l.valor_estimado)}</div>` : ''}
          </div>`).join('') || '<p class="muted" style="font-size:12.5px;padding:8px">Vazio</p>';
        return `<div class="coluna" data-etapa="${E(col.etapa)}">
          <header><b>${E(col.etapa)}</b><small>${col.qtd} · ${UI.moeda(col.valor)}</small></header>
          <div class="lista">${cards}</div></div>`;
      }).join('');

      /* Drag & drop */
      let arrastando = null;
      document.querySelectorAll('.lead-card').forEach(c => {
        c.ondragstart = () => { arrastando = c.dataset.id; c.classList.add('arrastando'); };
        c.ondragend = () => c.classList.remove('arrastando');
      });
      document.querySelectorAll('.coluna').forEach(col => {
        col.ondragover = (e) => { e.preventDefault(); col.classList.add('alvo'); };
        col.ondragleave = () => col.classList.remove('alvo');
        col.ondrop = async (e) => {
          e.preventDefault(); col.classList.remove('alvo');
          if (!arrastando) return;
          const etapa = col.dataset.etapa;
          if (etapa === 'Perdido') return motivoPerda(arrastando, carregar);
          try {
            const r = await API.moverLead(arrastando, etapa);
            UI.toast(r.mensagem); if (etapa === 'Ganho') invalidarCache();
            carregar();
          } catch (err) { UI.toast(err.message, 'erro'); }
          arrastando = null;
        };
      });
    }
    await carregar();
    document.getElementById('b-novo-lead').onclick = () => formLead(carregar);
  }

  function motivoPerda(id, recarregar) {
    UI.modal({
      titulo: 'Registrar perda',
      corpo: UI.select('Motivo da perda', 'f-motivo',
        ['Preço', 'Escolheu outro escritório', 'Desistiu da ação', 'Sem retorno', 'Fora da nossa área', 'Outro'],
        { req: true }) + UI.textarea('Detalhes', 'f-det'),
      onConfirmar: async () => {
        try {
          const motivo = UI.val('f-motivo') + (UI.val('f-det') ? ' — ' + UI.val('f-det') : '');
          await API.moverLead(id, 'Perdido', motivo);
          UI.fecharModal(); UI.toast('Perda registrada.', 'aviso'); recarregar();
        } catch (e) { UI.toast(e.message, 'erro'); }
      },
    });
  }

  async function formLead(recarregar) {
    const usuarios = await usuariosOpcoes();
    UI.modal({
      titulo: 'Novo lead', largo: true,
      corpo: `<div class="linha">
          ${UI.campo('Nome do prospect', 'l-nome', 'text', { req: true, ph: 'Ex.: João Guimarães' })}
          ${UI.campo('E-mail', 'l-email', 'email')}
          ${UI.campo('Telefone', 'l-tel', 'text')}
        </div>
        <div class="linha">
          ${UI.select('Origem', 'l-origem', ['Indicação', 'Site', 'Google', 'Redes sociais', 'Evento', 'Outro'], { vazio: 'Não informado' })}
          ${UI.select('Área de interesse', 'l-area', ['Cível', 'Trabalhista', 'Criminal', 'Família', 'Previdenciário', 'Tributário', 'Empresarial', 'Consumidor'], { vazio: 'Não definida' })}
          ${UI.select('Etapa', 'l-etapa', ['Novo', 'Contato', 'Reunião', 'Proposta'], { valor: 'Novo' })}
        </div>
        <div class="linha">
          ${UI.campo('Valor estimado (R$)', 'l-valor', 'number', { valor: 0, attrs: 'min="0" step="100"' })}
          ${UI.campo('Probabilidade (%)', 'l-prob', 'number', { valor: 50, attrs: 'min="0" max="100" step="5"' })}
          ${UI.select('Responsável', 'l-resp', usuarios, { vazio: 'Eu mesmo' })}
        </div>
        ${UI.campo('Próximo contato', 'l-prox', 'date')}
        ${UI.textarea('Observações', 'l-obs')}`,
      onConfirmar: async () => {
        const d = {
          nome: UI.val('l-nome'), email: UI.val('l-email') || null, telefone: UI.val('l-tel') || null,
          origem: UI.val('l-origem') || null, area_interesse: UI.val('l-area') || null,
          etapa: UI.val('l-etapa'), valor_estimado: UI.num('l-valor'),
          probabilidade: Number(UI.val('l-prob')) || 0,
          responsavel_id: Number(UI.val('l-resp')) || null,
          proximo_contato: UI.val('l-prox') || null, observacoes: UI.val('l-obs') || null,
        };
        if (d.nome.length < 3) return UI.toast('Informe o nome do prospect.', 'erro');
        try { await API.criarLead(d); UI.fecharModal(); UI.toast('Lead cadastrado.'); recarregar(); }
        catch (e) { UI.toast(e.message, 'erro', 7000); }
      },
    });
  }

  /* ================================================================
     4. PROCESSOS
     ================================================================ */
  const STATUS_PROC = ['Fase inicial', 'Fase citação', 'Fase contestação', 'Fase conciliação',
    'Fase audiência', 'Fase sentença', 'Recurso', 'Execução', 'Suspenso', 'Encerrado'];

  async function processos(el) {
    el.innerHTML = `<div class="barra">
        ${UI.busca('q-proc', 'Buscar por número, cliente, ação ou parte contrária...')}
        <select id="f-status" style="width:auto;min-width:165px">
          <option value="">Todas as fases</option>
          ${STATUS_PROC.map(s => `<option>${s}</option>`).join('')}
        </select>
        <select id="f-prazo" style="width:auto;min-width:155px">
          <option value="">Todos os prazos</option>
          <option value="0">Vencidos / hoje</option>
          <option value="7">Vencem em 7 dias</option>
          <option value="30">Vencem em 30 dias</option>
        </select>
        <a class="btn btn-neutro" href="${API.urlExportar('processos')}">${UI.icone('baixar', 16)} Exportar</a>
        <button class="btn btn-ouro" id="b-import">${UI.icone('sync', 16)} Importar do tribunal</button>
        <button class="btn btn-primario" id="b-novo-proc">${UI.icone('mais', 16)} Novo processo</button>
      </div><div id="lista-proc"><div class="skeleton" style="height:240px"></div></div>`;

    async function carregar() {
      const q = UI.val('q-proc'), st = UI.val('f-status'), pz = UI.val('f-prazo');
      let p = '?';
      if (q) p += `busca=${encodeURIComponent(q)}&`;
      if (st) p += `status=${encodeURIComponent(st)}&`;
      if (pz !== '') p += `vencendo=${pz}&`;
      const lista = await API.processos(p);
      document.getElementById('lista-proc').innerHTML = `<div class="card">${UI.tabela([
        { titulo: 'Processo', render: p => `<b style="font-family:var(--font-body)">${E(p.numero || 'Sem número')}</b>
            <br><small class="muted">${E(p.acao || 'Ação não informada')}</small>` },
        { titulo: 'Cliente', render: p => `${E(p.cliente || '—')}${p.parte_contraria ? `<br><small class="muted">× ${E(p.parte_contraria)}</small>` : ''}` },
        { titulo: 'Fase', render: p => UI.pillStatus(p.status) },
        { titulo: 'Advogado', render: p => E(p.advogado || '—') },
        { titulo: 'Valor', num: true, render: p => UI.moeda(p.valor_causa) },
        { titulo: 'Prazo fatal', render: p => p.prazo_fatal ? `${UI.data(p.prazo_fatal)}<br>${UI.pillPrazo(p.dias_restantes)}` : '<span class="muted">—</span>' },
        { titulo: '', render: p => `<div style="display:flex;gap:5px;justify-content:flex-end">
            <button class="btn-icone" data-ver="${p.id}" title="Ver detalhes">${UI.icone('olho', 15)}</button>
            <button class="btn-icone" data-sync="${p.id}" title="Sincronizar com o tribunal">${UI.icone('sync', 15)}</button>
            <button class="btn-icone" data-edit="${p.id}" title="Editar">${UI.icone('editar', 15)}</button>
            <button class="btn-icone perigo" data-del="${p.id}" title="Excluir">${UI.icone('lixo', 15)}</button></div>` },
      ], lista, { vazio: 'Nenhum processo encontrado com esses filtros.' })}</div>`;
    }
    await carregar();

    let t;
    document.getElementById('q-proc').oninput = () => { clearTimeout(t); t = setTimeout(carregar, 330); };
    document.getElementById('f-status').onchange = carregar;
    document.getElementById('f-prazo').onchange = carregar;
    document.getElementById('b-novo-proc').onclick = () => formProcesso(null, carregar);
    document.getElementById('b-import').onclick = () => importarTribunal(carregar);

    document.getElementById('lista-proc').onclick = async (e) => {
      const ver = e.target.closest('[data-ver]'), sy = e.target.closest('[data-sync]');
      const ed = e.target.closest('[data-edit]'), dl = e.target.closest('[data-del]');
      if (ver) return detalheProcesso(ver.dataset.ver);
      if (ed) return formProcesso(await API.processo(ed.dataset.edit), carregar);
      if (sy) {
        sy.innerHTML = '<span class="carregando" style="border-color:rgba(0,0,0,.2);border-top-color:var(--navy-700)"></span>';
        try { const r = await API.sincronizar(sy.dataset.sync); UI.toast(r.mensagem); carregar(); }
        catch (err) { UI.toast(err.message, 'erro', 7000); carregar(); }
      }
      if (dl) UI.confirmar('Excluir este processo e todas as suas movimentações?', async () => {
        try { await API.excluirProcesso(dl.dataset.del); UI.fecharModal(); UI.toast('Processo excluído.'); carregar(); }
        catch (err) { UI.toast(err.message, 'erro'); }
      }, 'Excluir');
    };
  }

  async function formProcesso(p, recarregar) {
    const [cls, usu] = await Promise.all([clientesOpcoes(), usuariosOpcoes()]);
    if (!cls.length) return UI.toast('Cadastre um cliente antes de criar um processo.', 'aviso', 6000);
    UI.modal({
      titulo: p ? 'Editar processo' : 'Novo processo', largo: true,
      corpo: `<div class="linha">
          ${UI.campo('Número CNJ', 'p-num', 'text', { valor: p?.numero, ph: '0000000-00.0000.0.00.0000', ajuda: 'Validado pelo dígito verificador do CNJ.' })}
          ${UI.select('Fase', 'p-status', STATUS_PROC, { valor: p?.status || 'Fase inicial', req: true })}
        </div>
        <div class="linha">
          ${UI.select('Cliente', 'p-cli', cls, { valor: p?.cliente_id, req: true })}
          ${UI.select('Qualificação do cliente', 'p-qual', ['Autor', 'Réu', 'Requerente', 'Requerido', 'Exequente', 'Executado', 'Apelante', 'Apelado', 'Terceiro interessado'], { valor: p?.qualificacao_cliente, vazio: 'Não definida' })}
        </div>
        <div class="linha">
          ${UI.campo('Parte contrária', 'p-contra', 'text', { valor: p?.parte_contraria })}
          ${UI.select('Qualificação da contrária', 'p-qual2', ['Réu', 'Autor', 'Requerido', 'Requerente', 'Executado', 'Exequente', 'Apelado', 'Apelante'], { valor: p?.qualificacao_contraria, vazio: 'Não definida' })}
        </div>
        <div class="linha">
          ${UI.campo('Ação / Classe', 'p-acao', 'text', { valor: p?.acao, ph: 'Ex.: Ação de Cobrança' })}
          ${UI.select('Advogado responsável', 'p-adv', usu, { valor: p?.advogado_id, vazio: 'Eu mesmo' })}
        </div>
        <div class="linha">
          ${UI.campo('Tribunal', 'p-trib', 'text', { valor: p?.tribunal })}
          ${UI.campo('Vara / Órgão', 'p-vara', 'text', { valor: p?.vara })}
          ${UI.campo('Comarca', 'p-com', 'text', { valor: p?.comarca })}
        </div>
        <div class="linha">
          ${UI.campo('Valor da causa (R$)', 'p-valor', 'number', { valor: p?.valor_causa || 0, attrs: 'min="0" step="0.01"' })}
          ${UI.campo('Honorários (R$)', 'p-hon', 'number', { valor: p?.honorarios || 0, attrs: 'min="0" step="0.01"', ajuda: 'Gera um lançamento a receber automaticamente.' })}
        </div>
        <div class="linha">
          ${UI.campo('Distribuído em', 'p-dist', 'date', { valor: p?.distribuido_em?.slice(0, 10) })}
          ${UI.campo('Prazo fatal', 'p-prazo', 'date', { valor: p?.prazo_fatal?.slice(0, 10), ajuda: 'Aparece na Agenda e no Painel com alerta.' })}
        </div>
        ${UI.campo('Link da pasta de documentos', 'p-link', 'text', { valor: p?.link_documentos })}
        <label class="check" style="margin-top:8px"><input type="checkbox" id="p-mon" ${p?.monitorar ? 'checked' : ''}>
          Monitorar andamentos automaticamente no DataJud</label>`,
      onConfirmar: async () => {
        const d = {
          numero: UI.val('p-num') || null, status: UI.val('p-status'),
          cliente_id: Number(UI.val('p-cli')), advogado_id: Number(UI.val('p-adv')) || null,
          qualificacao_cliente: UI.val('p-qual') || null, parte_contraria: UI.val('p-contra') || null,
          qualificacao_contraria: UI.val('p-qual2') || null, acao: UI.val('p-acao') || null,
          tribunal: UI.val('p-trib') || null, vara: UI.val('p-vara') || null,
          comarca: UI.val('p-com') || null, valor_causa: UI.num('p-valor'),
          honorarios: UI.num('p-hon'), distribuido_em: UI.val('p-dist') || null,
          prazo_fatal: UI.val('p-prazo') || null, link_documentos: UI.val('p-link') || null,
          monitorar: UI.chk('p-mon'),
        };
        if (!d.cliente_id) return UI.toast('Selecione o cliente.', 'erro');
        try {
          p ? await API.editarProcesso(p.id, d) : await API.criarProcesso(d);
          UI.fecharModal(); UI.toast(p ? 'Processo atualizado.' : 'Processo cadastrado.'); recarregar();
        } catch (e) { UI.toast(e.message, 'erro', 8000); }
      },
    });
  }

  async function importarTribunal(recarregar) {
    const cls = await clientesOpcoes();
    if (!cacheTribunais.length) cacheTribunais = await API.tribunais();
    UI.modal({
      titulo: 'Importar processo do tribunal', largo: true,
      corpo: `<p class="muted" style="margin-bottom:16px">
          Consulta a base pública oficial do <b>DataJud / CNJ</b>, que cobre 91 tribunais.
          Informe o número único e o sistema preenche a capa e todo o histórico.</p>
        <div class="linha">
          ${UI.campo('Número CNJ', 'i-num', 'text', { req: true, ph: '0000000-00.0000.0.00.0000' })}
          ${UI.select('Tribunal', 'i-trib', cacheTribunais.map(t => ({ v: t.alias, t: t.nome })), { vazio: 'Detectar pelo número' })}
        </div>
        ${UI.select('Vincular ao cliente', 'i-cli', cls, { req: true })}
        <div style="display:flex;gap:10px;margin-top:6px">
          <button class="btn btn-neutro" id="b-consultar">${UI.icone('busca', 16)} Consultar antes de importar</button>
        </div>
        <div id="previa" class="mt"></div>`,
      rodape: `<button class="btn btn-neutro" data-fechar>Cancelar</button>
               <button class="btn btn-ouro" data-confirmar>Importar processo</button>`,
      onConfirmar: async () => {
        const n = UI.val('i-num'), cid = Number(UI.val('i-cli')), tr = UI.val('i-trib');
        if (!n) return UI.toast('Informe o número do processo.', 'erro');
        if (!cid) return UI.toast('Selecione o cliente.', 'erro');
        try {
          const r = await API.importarCNJ(n, cid, tr);
          UI.fecharModal(); UI.toast(`${r.mensagem} ${r.movimentacoes} movimentação(ões).`); recarregar();
        } catch (e) { UI.toast(e.message, 'erro', 8000); }
      },
    });

    document.getElementById('b-consultar').onclick = async () => {
      const alvo = document.getElementById('previa');
      alvo.innerHTML = '<div class="skeleton" style="height:90px"></div>';
      try {
        const d = await API.consultarCNJ(UI.val('i-num'), UI.val('i-trib'));
        alvo.innerHTML = `<div class="card"><div class="corpo">
          <b style="font-family:var(--font-body)">${E(d.numero)}</b>
          <p class="muted" style="font-size:13px;margin:6px 0">
            ${E(d.classe || '—')} · ${E(d.nome_tribunal || '')} · ${E(d.orgao_julgador || '')}<br>
            Ajuizado em ${UI.data(d.data_ajuizamento)} · ${d.total_movimentos} movimentação(ões)
            ${d._cache ? ' · <span class="pill neutro">do cache</span>' : ''}</p>
          <div style="max-height:170px;overflow:auto;border-top:1px solid var(--line);padding-top:10px">
            ${d.movimentos.slice(0, 12).map(m => `<div style="font-size:12.5px;padding:5px 0;border-bottom:1px solid var(--line)">
              <b style="font-family:var(--font-body)">${UI.data(m.data)}</b> — ${E(m.descricao)}</div>`).join('')}
          </div></div></div>`;
      } catch (e) {
        alvo.innerHTML = `<div class="card" style="border-left:4px solid var(--danger)">
          <div class="corpo" style="font-size:13.5px;color:var(--danger)">${E(e.message)}</div></div>`;
      }
    };
  }

  async function detalheProcesso(id) {
    const p = await API.processo(id);
    UI.modal({
      titulo: p.numero || p.acao || 'Processo', largo: true,
      rodape: '<button class="btn btn-neutro" data-fechar>Fechar</button>',
      corpo: `<div class="grid g4" style="margin-bottom:18px">
          ${UI.kpi('Fase', p.status)}
          ${UI.kpi('Valor da causa', UI.moeda(p.valor_causa))}
          ${UI.kpi('Horas trabalhadas', UI.horas(p.horas_trabalhadas_min), '', 'ouro')}
          ${UI.kpi('Prazo fatal', p.prazo_fatal ? UI.data(p.prazo_fatal) : '—', '', p.prazo_fatal ? 'alerta' : '')}
        </div>
        <p class="muted" style="margin-bottom:16px">
          <b>Cliente:</b> ${E(p.cliente || '—')} (${E(p.qualificacao_cliente || 'sem qualificação')}) ·
          <b>Contrária:</b> ${E(p.parte_contraria || '—')}<br>
          <b>Tribunal:</b> ${E(p.tribunal || '—')} · <b>Vara:</b> ${E(p.vara || '—')} ·
          <b>Comarca:</b> ${E(p.comarca || '—')} · <b>Advogado:</b> ${E(p.advogado || '—')}</p>
        <div class="tabs"><button class="ativo" data-tab="mov">Movimentações (${p.movimentacoes.length})</button>
          <button data-tab="atv">Atividades (${p.atividades.length})</button>
          <button data-tab="fin">Financeiro (${p.financeiro.length})</button></div>
        <div id="tab-mov">${UI.tabela([
          { titulo: 'Data', render: m => UI.data(m.data) },
          { titulo: 'Movimentação', render: m => E(m.descricao) },
          { titulo: 'Origem', render: m => `<span class="pill ${m.origem === 'datajud' ? 'info' : 'neutro'}">${E(m.origem)}</span>` },
        ], p.movimentacoes, { vazio: 'Nenhuma movimentação. Clique em sincronizar para buscar no tribunal.' })}</div>
        <div id="tab-atv" class="escondido">${UI.tabela([
          { titulo: 'Data', render: a => UI.data(a.data) },
          { titulo: 'Atividade', render: a => E(a.atividade) },
          { titulo: 'Duração', render: a => UI.horas(a.duracao_min) },
          { titulo: 'Status', render: a => UI.pillStatus(a.status) },
        ], p.atividades, { vazio: 'Nenhuma atividade lançada.' })}</div>
        <div id="tab-fin" class="escondido">${UI.tabela([
          { titulo: 'Descrição', render: f => E(f.descricao) },
          { titulo: 'Valor', num: true, render: f => UI.moeda(f.valor) },
          { titulo: 'Vencimento', render: f => UI.data(f.vencimento) },
          { titulo: 'Status', render: f => UI.pillStatus(f.status) },
        ], p.financeiro, { vazio: 'Nenhum lançamento financeiro.' })}</div>`,
    });
    document.querySelectorAll('#modal .tabs button').forEach(b => {
      b.onclick = () => {
        document.querySelectorAll('#modal .tabs button').forEach(x => x.classList.remove('ativo'));
        b.classList.add('ativo');
        ['mov', 'atv', 'fin'].forEach(t =>
          document.getElementById('tab-' + t).classList.toggle('escondido', t !== b.dataset.tab));
      };
    });
  }

  /* ================================================================
     5. AGENDA
     ================================================================ */
  async function agenda(el) {
    el.innerHTML = `<div class="barra">
        <select id="f-dias" style="width:auto;min-width:175px">
          <option value="7">Próximos 7 dias</option>
          <option value="14" selected>Próximos 14 dias</option>
          <option value="30">Próximos 30 dias</option>
          <option value="90">Próximos 90 dias</option>
        </select><div class="cresce"></div>
        <button class="btn btn-primario" id="b-nova-tar">${UI.icone('mais', 16)} Nova tarefa</button>
      </div><div id="conteudo-agenda"><div class="skeleton" style="height:230px"></div></div>`;

    async function carregar() {
      const d = await API.agenda(Number(UI.val('f-dias')) || 14);
      const porDia = {};
      d.itens.forEach(i => { (porDia[i.data || 'Sem data'] ||= []).push(i); });
      const atras = d.atrasados.length ? `
        <div class="card" style="border-left:4px solid var(--danger);margin-bottom:18px">
          <header><h3 style="color:var(--danger)">${d.atrasados.length} item(ns) em atraso</h3></header>
          <div class="corpo" style="padding:0">${UI.tabela([
            { titulo: 'Era para', render: i => UI.data(i.data) },
            { titulo: 'Item', render: i => E(i.titulo) },
            { titulo: 'Tipo', render: i => UI.pillStatus(i.prioridade) },
            { titulo: 'Responsável', render: i => E(i.responsavel || '—') },
          ], d.atrasados)}</div></div>` : '';

      const dias = Object.keys(porDia).filter(k => k >= d.hoje).sort().map(dia => {
        const itens = porDia[dia];
        const hoje = dia === d.hoje;
        return `<div class="card" style="margin-bottom:14px${hoje ? ';border-left:4px solid var(--gold-500)' : ''}">
          <header><h3>${UI.data(dia)}${hoje ? ' <span class="pill ouro">Hoje</span>' : ''}</h3>
            <span class="dica">${itens.length} item(ns)</span></header>
          <div class="corpo" style="padding:0">${UI.tabela([
            { titulo: 'Item', render: i => `${i.origem === 'prazo' ? '<span style="color:var(--danger)">⚑</span> ' : ''}<b style="font-family:var(--font-body)">${E(i.titulo)}</b>${i.processo ? `<br><small class="muted">${E(i.processo)}</small>` : ''}` },
            { titulo: 'Tipo', render: i => `<span class="pill neutro">${E(i.tipo)}</span>` },
            { titulo: 'Prioridade', render: i => UI.pillStatus(i.prioridade) },
            { titulo: 'Responsável', render: i => E(i.responsavel || '—') },
          ], itens)}</div></div>`;
      }).join('');

      document.getElementById('conteudo-agenda').innerHTML = atras + (dias ||
        `<div class="card"><div class="vazio">${UI.icone('agenda', 42)}
          <p>Nenhum compromisso no período. Agenda livre.</p></div></div>`);
    }
    await carregar();
    document.getElementById('f-dias').onchange = carregar;
    document.getElementById('b-nova-tar').onclick = () => formAtividade(null, carregar);
  }

  /* ================================================================
     6. ATIVIDADES / TIMESHEET
     ================================================================ */
  const TIPOS_ATV = ['Administrativo', 'Atendimento', 'Consulta', 'Prazo', 'Recurso',
    'Audiência', 'Diligência', 'Petição', 'Reunião'];
  const STATUS_ATV = ['Por fazer', 'Em andamento', 'Pausada', 'Realizada', 'Cancelada'];
  const PRIOS = ['Baixa', 'Média', 'Alta', 'Urgente'];

  async function atividades(el) {
    el.innerHTML = `<div class="barra">
        <select id="a-status" style="width:auto;min-width:160px">
          <option value="">Todos os status</option>${STATUS_ATV.map(s => `<option>${s}</option>`).join('')}</select>
        <select id="a-prio" style="width:auto;min-width:150px">
          <option value="">Todas prioridades</option>${PRIOS.map(s => `<option>${s}</option>`).join('')}</select>
        <div class="cresce"></div>
        <a class="btn btn-neutro" href="${API.urlExportar('atividades')}">${UI.icone('baixar', 16)} Exportar</a>
        <button class="btn btn-primario" id="b-nova-atv">${UI.icone('mais', 16)} Nova atividade</button>
      </div>
      <div id="kpis-atv" class="grid g4" style="margin-bottom:18px"></div>
      <div id="lista-atv"><div class="skeleton" style="height:220px"></div></div>`;

    async function carregar() {
      let p = '?';
      if (UI.val('a-status')) p += `status=${encodeURIComponent(UI.val('a-status'))}&`;
      if (UI.val('a-prio')) p += `prioridade=${encodeURIComponent(UI.val('a-prio'))}&`;
      const lista = await API.atividades(p);
      const tot = lista.reduce((s, a) => s + (a.duracao_min || 0), 0);
      const fat = lista.filter(a => a.faturavel).reduce((s, a) => s + (a.duracao_min || 0), 0);
      const val = lista.filter(a => a.faturavel).reduce((s, a) => s + (a.duracao_min / 60 * (a.valor_hora || 0)), 0);

      document.getElementById('kpis-atv').innerHTML =
        UI.kpi('Atividades', UI.numero(lista.length)) +
        UI.kpi('Horas totais', UI.horas(tot)) +
        UI.kpi('Horas faturáveis', UI.horas(fat), tot ? `${(fat / tot * 100).toFixed(0)}% do total` : '', 'ouro') +
        UI.kpi('Valor gerado', UI.moeda(val), '', 'sucesso');

      document.getElementById('lista-atv').innerHTML = `<div class="card">${UI.tabela([
        { titulo: 'Data', render: a => UI.data(a.data) },
        { titulo: 'Atividade', render: a => `<b style="font-family:var(--font-body)">${E(a.atividade)}</b>
            <br><small class="muted">${E(a.tipo)}${a.processo_numero ? ' · ' + E(a.processo_numero) : ''}${a.cliente ? ' · ' + E(a.cliente) : ''}</small>` },
        { titulo: 'Responsável', render: a => E(a.usuario || '—') },
        { titulo: 'Horário', render: a => a.hora_inicio ? `${E(a.hora_inicio)} — ${E(a.hora_termino || '...')}` : '<span class="muted">—</span>' },
        { titulo: 'Duração', num: true, render: a => `<b>${UI.horas(a.duracao_min)}</b>${a.faturavel ? '<br><small class="pill ouro">faturável</small>' : ''}` },
        { titulo: 'Prioridade', render: a => UI.pillStatus(a.prioridade) },
        { titulo: 'Status', render: a => UI.pillStatus(a.status) },
        { titulo: '', render: a => `<div style="display:flex;gap:5px;justify-content:flex-end">
            ${a.status !== 'Realizada' ? (a.status === 'Em andamento'
              ? `<button class="btn-icone" data-parar="${a.id}" title="Parar cronômetro">${UI.icone('stop', 14)}</button>`
              : `<button class="btn-icone" data-iniciar="${a.id}" title="Iniciar cronômetro">${UI.icone('play', 14)}</button>`) : ''}
            <button class="btn-icone" data-edit="${a.id}" title="Editar">${UI.icone('editar', 15)}</button>
            <button class="btn-icone perigo" data-del="${a.id}" title="Excluir">${UI.icone('lixo', 15)}</button></div>` },
      ], lista, { vazio: 'Nenhuma atividade lançada. Registre suas horas para acompanhar a produtividade.' })}</div>`;
    }
    await carregar();
    document.getElementById('a-status').onchange = carregar;
    document.getElementById('a-prio').onchange = carregar;
    document.getElementById('b-nova-atv').onclick = () => formAtividade(null, carregar);

    document.getElementById('lista-atv').onclick = async (e) => {
      const ini = e.target.closest('[data-iniciar]'), par = e.target.closest('[data-parar]');
      const ed = e.target.closest('[data-edit]'), dl = e.target.closest('[data-del]');
      try {
        if (ini) { await API.iniciarAtividade(ini.dataset.iniciar); UI.toast('Cronômetro iniciado.'); return carregar(); }
        if (par) { const r = await API.pararAtividade(par.dataset.parar); UI.toast(`Concluída: ${UI.horas(r.duracao_min)}.`); return carregar(); }
        if (ed) {
          const lista = await API.atividades('?limite=1000');
          return formAtividade(lista.find(x => String(x.id) === ed.dataset.edit), carregar);
        }
        if (dl) UI.confirmar('Excluir esta atividade?', async () => {
          await API.excluirAtividade(dl.dataset.del); UI.fecharModal(); UI.toast('Atividade excluída.'); carregar();
        }, 'Excluir');
      } catch (err) { UI.toast(err.message, 'erro'); }
    };
  }

  async function formAtividade(a, recarregar) {
    const [cls, usu, procs] = await Promise.all([clientesOpcoes(), usuariosOpcoes(), API.processos('?limite=300')]);
    UI.modal({
      titulo: a ? 'Editar atividade' : 'Nova atividade', largo: true,
      corpo: `${UI.campo('Descrição da atividade', 'a-desc', 'text', { valor: a?.atividade, req: true, ph: 'Ex.: Elaboração de contestação' })}
        <div class="linha">
          ${UI.select('Tipo', 'a-tipo', TIPOS_ATV, { valor: a?.tipo || 'Administrativo' })}
          ${UI.select('Prioridade', 'a-prio2', PRIOS, { valor: a?.prioridade || 'Média' })}
          ${UI.select('Status', 'a-st', STATUS_ATV, { valor: a?.status || 'Por fazer' })}
        </div>
        <div class="linha">
          ${UI.campo('Data', 'a-data', 'date', { valor: a?.data?.slice(0, 10) || new Date().toISOString().slice(0, 10) })}
          ${UI.campo('Hora início', 'a-ini', 'time', { valor: a?.hora_inicio })}
          ${UI.campo('Hora término', 'a-fim', 'time', { valor: a?.hora_termino, ajuda: 'Pode atravessar a meia-noite.' })}
        </div>
        <div class="linha">
          ${UI.select('Processo vinculado', 'a-proc', procs.map(p => ({ v: p.id, t: p.numero || p.acao || `Processo #${p.id}` })), { valor: a?.processo_id, vazio: 'Nenhum' })}
          ${UI.select('Cliente', 'a-cli', cls, { valor: a?.cliente_id, vazio: 'Nenhum' })}
          ${UI.select('Responsável', 'a-usu', usu, { valor: a?.usuario_id, vazio: 'Eu mesmo' })}
        </div>
        <div class="linha">
          ${UI.campo('Valor da hora (R$)', 'a-vh', 'number', { valor: a?.valor_hora || 0, attrs: 'min="0" step="10"' })}
          ${UI.campo('Duração planejada (min)', 'a-plan', 'number', { valor: a?.duracao_planejada_min || 0, attrs: 'min="0" step="15"' })}
        </div>
        <label class="check"><input type="checkbox" id="a-fat" ${a?.faturavel !== 0 ? 'checked' : ''}>
          Atividade faturável — ao concluir, gera cobrança automática no Financeiro</label>`,
      onConfirmar: async () => {
        const d = {
          atividade: UI.val('a-desc'), tipo: UI.val('a-tipo'), prioridade: UI.val('a-prio2'),
          status: UI.val('a-st'), data: UI.val('a-data') || null,
          hora_inicio: UI.val('a-ini') || null, hora_termino: UI.val('a-fim') || null,
          processo_id: Number(UI.val('a-proc')) || null, cliente_id: Number(UI.val('a-cli')) || null,
          usuario_id: Number(UI.val('a-usu')) || null, valor_hora: UI.num('a-vh'),
          duracao_planejada_min: Number(UI.val('a-plan')) || 0, faturavel: UI.chk('a-fat'),
        };
        if (d.atividade.length < 3) return UI.toast('Descreva a atividade.', 'erro');
        try {
          a ? await API.editarAtividade(a.id, d) : await API.criarAtividade(d);
          UI.fecharModal(); UI.toast(a ? 'Atividade atualizada.' : 'Atividade registrada.'); recarregar();
        } catch (e) { UI.toast(e.message, 'erro', 7000); }
      },
    });
  }

  /* ================================================================
     7. FINANCEIRO
     ================================================================ */
  async function financeiro(el) {
    el.innerHTML = `<div class="barra">
        <select id="fi-tipo" style="width:auto;min-width:145px">
          <option value="">Receitas e despesas</option>
          <option value="receita">Somente receitas</option>
          <option value="despesa">Somente despesas</option></select>
        <select id="fi-status" style="width:auto;min-width:145px">
          <option value="">Todos os status</option>
          ${['Pendente', 'Pago', 'Atrasado', 'Cancelado'].map(s => `<option>${s}</option>`).join('')}</select>
        <div class="cresce"></div>
        <button class="btn btn-neutro" id="b-atrasos">${UI.icone('alerta', 16)} Verificar atrasos</button>
        <a class="btn btn-neutro" href="${API.urlExportar('financeiro')}">${UI.icone('baixar', 16)} Exportar</a>
        <button class="btn btn-primario" id="b-novo-lanc">${UI.icone('mais', 16)} Novo lançamento</button>
      </div>
      <div id="kpis-fin" class="grid g4" style="margin-bottom:18px"></div>
      <div class="grid g2" style="margin-bottom:18px">
        <div class="card"><header><h3>Fluxo de caixa</h3><span class="dica">Últimos 12 meses</span></header>
          <div class="corpo" id="graf-fin"></div></div>
        <div class="card"><header><h3>Por categoria</h3></header><div class="corpo" id="cat-fin"></div></div>
      </div>
      <div id="lista-fin"><div class="skeleton" style="height:200px"></div></div>`;

    async function carregar() {
      let p = '?';
      if (UI.val('fi-tipo')) p += `tipo=${UI.val('fi-tipo')}&`;
      if (UI.val('fi-status')) p += `status=${encodeURIComponent(UI.val('fi-status'))}&`;
      const [res, lista] = await Promise.all([API.resumoFinanceiro(), API.financeiro(p)]);

      document.getElementById('kpis-fin').innerHTML =
        UI.kpi('A receber', UI.moeda(res.a_receber),
          res.inadimplencia ? `<span style="color:var(--danger)">${UI.moeda(res.inadimplencia)} vencido</span>` : 'Nada vencido', 'ouro') +
        UI.kpi('Recebido', UI.moeda(res.recebido), '', 'sucesso') +
        UI.kpi('A pagar', UI.moeda(res.a_pagar), '', 'alerta') +
        UI.kpi('Saldo realizado', UI.moeda(res.saldo_realizado),
          `Previsto: ${UI.moeda(res.saldo_previsto)}`, res.saldo_realizado >= 0 ? 'sucesso' : 'perigo');

      document.getElementById('graf-fin').innerHTML = UI.graficoFluxo(res.por_mes);
      document.getElementById('cat-fin').innerHTML = UI.barras(
        res.por_categoria.slice(0, 9).map(c => ({
          rotulo: `${c.categoria} (${c.tipo})`, valor: c.total,
          texto: UI.moeda(c.total), cor: c.tipo === 'receita' ? 'ok' : 'danger' })));

      document.getElementById('lista-fin').innerHTML = `<div class="card">${UI.tabela([
        { titulo: 'Descrição', render: f => `<b style="font-family:var(--font-body)">${E(f.descricao)}</b>
            <br><small class="muted">${E(f.categoria || 'Sem categoria')}${f.cliente ? ' · ' + E(f.cliente) : ''}</small>` },
        { titulo: 'Tipo', render: f => `<span class="pill ${f.tipo === 'receita' ? 'ok' : 'danger'}">${f.tipo === 'receita' ? 'Receita' : 'Despesa'}</span>` },
        { titulo: 'Valor', num: true, render: f => `<b style="color:${f.tipo === 'receita' ? 'var(--ok)' : 'var(--danger)'}">${UI.moeda(f.valor)}</b>` },
        { titulo: 'Vencimento', render: f => `${UI.data(f.vencimento)}${f.vencido ? '<br><span class="pill danger">vencido</span>' : ''}` },
        { titulo: 'Pagamento', render: f => UI.data(f.pagamento) },
        { titulo: 'Status', render: f => UI.pillStatus(f.status) },
        { titulo: '', render: f => `<div style="display:flex;gap:5px;justify-content:flex-end">
            ${f.status !== 'Pago' && f.status !== 'Cancelado' ? `<button class="btn btn-ouro btn-min" data-baixar="${f.id}">Dar baixa</button>` : ''}
            <button class="btn-icone perigo" data-del="${f.id}" title="Excluir">${UI.icone('lixo', 15)}</button></div>` },
      ], lista, { vazio: 'Nenhum lançamento financeiro.' })}</div>`;
    }
    await carregar();
    document.getElementById('fi-tipo').onchange = carregar;
    document.getElementById('fi-status').onchange = carregar;
    document.getElementById('b-novo-lanc').onclick = () => formLancamento(carregar);
    document.getElementById('b-atrasos').onclick = async () => {
      try { const r = await API.verificarAtrasos();
        UI.toast(r.atualizados ? `${r.atualizados} lançamento(s) marcado(s) como atrasado.` : 'Nenhum atraso encontrado.',
          r.atualizados ? 'aviso' : 'ok'); carregar();
      } catch (e) { UI.toast(e.message, 'erro'); }
    };
    document.getElementById('lista-fin').onclick = async (e) => {
      const b = e.target.closest('[data-baixar]'), d = e.target.closest('[data-del]');
      if (b) return baixa(b.dataset.baixar, carregar);
      if (d) UI.confirmar('Excluir este lançamento?', async () => {
        try { await API.excluirLancamento(d.dataset.del); UI.fecharModal(); UI.toast('Lançamento excluído.'); carregar(); }
        catch (err) { UI.toast(err.message, 'erro', 7000); }
      }, 'Excluir');
    };
  }

  function baixa(id, recarregar) {
    UI.modal({
      titulo: 'Dar baixa no lançamento',
      corpo: UI.select('Forma de pagamento', 'b-forma',
        ['PIX', 'Transferência', 'Boleto', 'Cartão', 'Dinheiro', 'Cheque'], { valor: 'PIX' }),
      onConfirmar: async () => {
        try { await API.baixarLancamento(id, UI.val('b-forma'));
          UI.fecharModal(); UI.toast('Baixa registrada com sucesso.'); recarregar();
        } catch (e) { UI.toast(e.message, 'erro'); }
      },
    });
  }

  async function formLancamento(recarregar) {
    const [cls, procs] = await Promise.all([clientesOpcoes(), API.processos('?limite=300')]);
    UI.modal({
      titulo: 'Novo lançamento', largo: true,
      corpo: `<div class="linha">
          ${UI.select('Tipo', 'n-tipo', [{ v: 'receita', t: 'Receita (entrada)' }, { v: 'despesa', t: 'Despesa (saída)' }], { req: true })}
          ${UI.select('Categoria', 'n-cat', ['Honorários', 'Êxito', 'Consultoria', 'Custas', 'Diligências', 'Salários', 'Aluguel', 'Software', 'Impostos', 'Marketing', 'Outros'], { vazio: 'Sem categoria' })}
        </div>
        ${UI.campo('Descrição', 'n-desc', 'text', { req: true, ph: 'Ex.: Honorários contratuais — 1ª parcela' })}
        <div class="linha">
          ${UI.campo('Valor (R$)', 'n-valor', 'number', { req: true, attrs: 'min="0.01" step="0.01"' })}
          ${UI.campo('Vencimento', 'n-venc', 'date')}
          ${UI.select('Status', 'n-status', ['Pendente', 'Pago', 'Cancelado'], { valor: 'Pendente' })}
        </div>
        <div class="linha">
          ${UI.select('Cliente', 'n-cli', cls, { vazio: 'Nenhum' })}
          ${UI.select('Processo', 'n-proc', procs.map(p => ({ v: p.id, t: p.numero || p.acao || `Processo #${p.id}` })), { vazio: 'Nenhum' })}
        </div>`,
      onConfirmar: async () => {
        const d = {
          tipo: UI.val('n-tipo'), categoria: UI.val('n-cat') || null, descricao: UI.val('n-desc'),
          valor: UI.num('n-valor'), vencimento: UI.val('n-venc') || null, status: UI.val('n-status'),
          cliente_id: Number(UI.val('n-cli')) || null, processo_id: Number(UI.val('n-proc')) || null,
        };
        if (d.valor <= 0) return UI.toast('Informe um valor maior que zero.', 'erro');
        if (d.descricao.length < 3) return UI.toast('Informe a descrição.', 'erro');
        try { await API.criarLancamento(d); UI.fecharModal(); UI.toast('Lançamento registrado.'); recarregar(); }
        catch (e) { UI.toast(e.message, 'erro', 7000); }
      },
    });
  }

  /* ================================================================
     8. DOCUMENTOS
     ================================================================ */
  async function documentos(el) {
    el.innerHTML = `<div class="barra">
        <div class="cresce"><span class="muted" style="font-size:13px">
          Até 25 MB por arquivo. Cada documento recebe um hash SHA-256 de integridade.</span></div>
        <button class="btn btn-primario" id="b-upload">${UI.icone('mais', 16)} Enviar documento</button>
      </div><div id="lista-doc"><div class="skeleton" style="height:180px"></div></div>`;

    async function carregar() {
      const lista = await API.documentos();
      document.getElementById('lista-doc').innerHTML = `<div class="card">${UI.tabela([
        { titulo: 'Documento', render: d => `<b style="font-family:var(--font-body)">${E(d.nome)}</b>
            <br><small class="muted">${(d.tamanho / 1024).toFixed(0)} KB · ${E((d.sha256 || '').slice(0, 12))}…</small>` },
        { titulo: 'Categoria', render: d => `<span class="pill neutro">${E(d.categoria || 'Outro')}</span>` },
        { titulo: 'Vínculo', render: d => E(d.processo_numero || d.cliente || '—') },
        { titulo: 'Enviado por', render: d => `${E(d.enviado_por || '—')}<br><small class="muted">${UI.dataHora(d.criado_em)}</small>` },
        { titulo: '', render: d => `<div style="display:flex;gap:5px;justify-content:flex-end">
            <a class="btn-icone" href="/api/documentos/${d.id}/baixar" title="Baixar">${UI.icone('baixar', 15)}</a>
            <button class="btn-icone perigo" data-del="${d.id}" title="Excluir">${UI.icone('lixo', 15)}</button></div>` },
      ], lista, { vazio: 'Nenhum documento enviado.' })}</div>`;
    }
    await carregar();

    document.getElementById('b-upload').onclick = async () => {
      const [cls, procs] = await Promise.all([clientesOpcoes(), API.processos('?limite=300')]);
      UI.modal({
        titulo: 'Enviar documento',
        corpo: `<div class="campo"><label for="d-file">Arquivo <span class="req">*</span></label>
            <input type="file" id="d-file">
            <div class="ajuda">Aceitos: PDF, Word, Excel, imagens, TXT, ZIP e P7S. Máximo 25 MB.</div></div>
          ${UI.select('Categoria', 'd-cat', ['Petição', 'Contrato', 'Procuração', 'Documento pessoal', 'Decisão', 'Comprovante', 'Parecer', 'Outro'], { valor: 'Outro' })}
          <div class="linha">
            ${UI.select('Processo', 'd-proc', procs.map(p => ({ v: p.id, t: p.numero || p.acao || `Processo #${p.id}` })), { vazio: 'Nenhum' })}
            ${UI.select('Cliente', 'd-cli', cls, { vazio: 'Nenhum' })}
          </div>`,
        onConfirmar: async () => {
          const f = document.getElementById('d-file').files[0];
          if (!f) return UI.toast('Selecione um arquivo.', 'erro');
          const fd = new FormData();
          fd.append('arquivo', f);
          fd.append('categoria', UI.val('d-cat'));
          if (UI.val('d-proc')) fd.append('processo_id', UI.val('d-proc'));
          if (UI.val('d-cli')) fd.append('cliente_id', UI.val('d-cli'));
          try { await API.enviarDocumento(fd); UI.fecharModal(); UI.toast('Documento enviado.'); carregar(); }
          catch (e) { UI.toast(e.message, 'erro', 7000); }
        },
      });
    };

    document.getElementById('lista-doc').onclick = (e) => {
      const d = e.target.closest('[data-del]');
      if (d) UI.confirmar('Excluir este documento?', async () => {
        try { await API.excluirDocumento(d.dataset.del); UI.fecharModal(); UI.toast('Documento excluído.'); carregar(); }
        catch (err) { UI.toast(err.message, 'erro'); }
      }, 'Excluir');
    };
  }

  /* ================================================================
     9. RELATÓRIOS
     ================================================================ */
  async function relatorios(el) {
    el.innerHTML = `<div class="tabs">
        <button class="ativo" data-r="prod">Produtividade</button>
        <button data-r="rent">Rentabilidade por processo</button>
      </div><div id="rel"><div class="skeleton" style="height:220px"></div></div>`;

    async function prod() {
      const d = await API.produtividade(90);
      document.getElementById('rel').innerHTML = `<div class="card">
        <header><h3>Produtividade — últimos 90 dias</h3></header>
        <div class="corpo" style="padding:0">${UI.tabela([
          { titulo: 'Profissional', render: r => `<b style="font-family:var(--font-body)">${E(r.advogado)}</b><br><small class="muted">${E(r.papel || '')}</small>` },
          { titulo: 'Atividades', num: true, render: r => UI.numero(r.atividades) },
          { titulo: 'Concluídas', num: true, render: r => `${UI.numero(r.concluidas)} <small class="muted">(${r.atividades ? (r.concluidas / r.atividades * 100).toFixed(0) : 0}%)</small>` },
          { titulo: 'Horas', num: true, render: r => UI.horas(r.minutos) },
          { titulo: 'Faturáveis', num: true, render: r => `${UI.horas(r.min_faturaveis)}<br><small class="muted">${r.minutos ? (r.min_faturaveis / r.minutos * 100).toFixed(0) : 0}% aproveitamento</small>` },
          { titulo: 'Valor gerado', num: true, render: r => `<b style="color:var(--ok)">${UI.moeda(r.valor_gerado)}</b>` },
        ], d, { vazio: 'Sem atividades no período.' })}</div></div>`;
    }
    async function rent() {
      const d = await API.rentabilidade();
      document.getElementById('rel').innerHTML = `<div class="card">
        <header><h3>Rentabilidade por processo</h3>
          <span class="dica">Receita recebida × custo em horas</span></header>
        <div class="corpo" style="padding:0">${UI.tabela([
          { titulo: 'Processo', render: r => `<b style="font-family:var(--font-body)">${E(r.numero || r.acao || '#' + r.id)}</b><br><small class="muted">${E(r.cliente || '')}</small>` },
          { titulo: 'Status', render: r => UI.pillStatus(r.status) },
          { titulo: 'Causa', num: true, render: r => UI.moeda(r.valor_causa) },
          { titulo: 'Horas', num: true, render: r => UI.horas(r.minutos) },
          { titulo: 'Recebido', num: true, render: r => `<b style="color:var(--ok)">${UI.moeda(r.recebido)}</b>` },
          { titulo: 'Custos', num: true, render: r => UI.moeda(r.custos) },
          { titulo: 'Resultado', num: true, render: r => {
              const v = r.recebido - r.custos;
              return `<b style="color:${v >= 0 ? 'var(--ok)' : 'var(--danger)'}">${UI.moeda(v)}</b>`; } },
        ], d, { vazio: 'Sem dados de rentabilidade.' })}</div></div>`;
    }
    await prod();
    el.querySelectorAll('.tabs button').forEach(b => b.onclick = () => {
      el.querySelectorAll('.tabs button').forEach(x => x.classList.remove('ativo'));
      b.classList.add('ativo');
      b.dataset.r === 'prod' ? prod() : rent();
    });
  }

  /* ================================================================
     10. AUDITORIA
     ================================================================ */
  async function auditoria(el) {
    el.innerHTML = `<div class="barra">
        ${UI.busca('q-aud', 'Filtrar por ação, entidade ou usuário...')}
        <span class="muted" style="font-size:12.5px">Registro imutável — não há como editar ou apagar.</span>
      </div><div id="lista-aud"><div class="skeleton" style="height:240px"></div></div>`;

    async function carregar(f = '') {
      const lista = await API.auditoria(f);
      document.getElementById('lista-aud').innerHTML = `<div class="card">${UI.tabela([
        { titulo: 'Quando', render: a => UI.dataHora(a.criado_em) },
        { titulo: 'Usuário', render: a => E(a.usuario_email || 'sistema') },
        { titulo: 'Ação', render: a => `<span class="pill ${a.sucesso ? 'info' : 'danger'}">${E(a.acao)}</span>` },
        { titulo: 'Entidade', render: a => `${E(a.entidade || '—')}${a.entidade_id ? ' #' + E(a.entidade_id) : ''}` },
        { titulo: 'Detalhes', render: a => `<small class="muted" style="word-break:break-word">${E((a.detalhes || '').slice(0, 130))}</small>` },
        { titulo: 'IP', render: a => `<small class="muted">${E(a.ip || '—')}</small>` },
      ], lista, { vazio: 'Nenhum registro de auditoria.' })}</div>`;
    }
    await carregar();
    let t;
    document.getElementById('q-aud').oninput = (e) => {
      clearTimeout(t); t = setTimeout(() => carregar(e.target.value), 330);
    };
  }

  /* ================================================================
     11. CONFIGURAÇÕES
     ================================================================ */
  async function config(el, sessao) {
    const ehAdmin = ['admin', 'socio'].includes(sessao.usuario.papel);
    el.innerHTML = `<div class="grid g2">
        <div class="card"><header><h3>Minha conta</h3></header><div class="corpo">
          <p class="muted" style="margin-bottom:16px">
            <b>${E(sessao.usuario.nome)}</b><br>${E(sessao.usuario.email)}<br>
            Perfil: <span class="pill info">${E(sessao.usuario.papel)}</span></p>
          ${UI.campo('Senha atual', 's-atual', 'password')}
          ${UI.campo('Nova senha', 's-nova', 'password', { ajuda: 'Mínimo 10 caracteres, com maiúscula, minúscula, número e símbolo.' })}
          ${UI.campo('Confirmar nova senha', 's-conf', 'password')}
          <button class="btn btn-primario" id="b-senha">Alterar senha</button>
        </div></div>

        <div class="card"><header><h3>Exportar dados</h3>
          <span class="dica">CSV compatível com Excel</span></header><div class="corpo">
          <p class="muted" style="margin-bottom:14px">Seus dados são seus. Baixe a qualquer momento.</p>
          <div style="display:grid;gap:9px">
            ${['clientes', 'processos', 'atividades', 'financeiro', 'leads'].map(e =>
              `<a class="btn btn-neutro" href="${API.urlExportar(e)}">${UI.icone('baixar', 16)}
                 Exportar ${e}</a>`).join('')}
          </div></div></div>
      </div>
      ${ehAdmin ? `<div class="card mt"><header><h3>Equipe do escritório</h3>
        <button class="btn btn-primario btn-min" id="b-novo-usu">${UI.icone('mais', 15)} Novo usuário</button>
        </header><div class="corpo" style="padding:0" id="lista-usu"></div></div>` : ''}`;

    document.getElementById('b-senha').onclick = async () => {
      const a = UI.val('s-atual'), n = UI.val('s-nova'), c = UI.val('s-conf');
      if (!a || !n) return UI.toast('Preencha a senha atual e a nova.', 'erro');
      if (n !== c) return UI.toast('A confirmação não confere com a nova senha.', 'erro');
      try { await API.trocarSenha(a, n); UI.toast('Senha alterada com sucesso.');
        ['s-atual', 's-nova', 's-conf'].forEach(i => document.getElementById(i).value = '');
      } catch (e) { UI.toast(e.message, 'erro', 7000); }
    };

    if (!ehAdmin) return;

    async function carregarUsuarios() {
      const us = await API.usuarios();
      document.getElementById('lista-usu').innerHTML = UI.tabela([
        { titulo: 'Nome', render: u => `<b style="font-family:var(--font-body)">${E(u.nome)}</b><br><small class="muted">${E(u.email)}</small>` },
        { titulo: 'Perfil', render: u => `<span class="pill info">${E(u.papel)}</span>` },
        { titulo: 'OAB', render: u => E(u.oab || '—') },
        { titulo: 'Último acesso', render: u => u.ultimo_login ? UI.dataHora(u.ultimo_login) : '<span class="muted">nunca</span>' },
        { titulo: 'Situação', render: u => u.ativo ? '<span class="pill ok">Ativo</span>' : '<span class="pill neutro">Inativo</span>' },
        { titulo: '', render: u => `<button class="btn btn-neutro btn-min" data-tog="${u.id}">
            ${u.ativo ? 'Desativar' : 'Reativar'}</button>` },
      ], us);
    }
    await carregarUsuarios();

    document.getElementById('lista-usu').onclick = async (e) => {
      const t = e.target.closest('[data-tog]');
      if (!t) return;
      try { await API.alternarUsuario(t.dataset.tog); UI.toast('Situação alterada.'); invalidarCache(); carregarUsuarios(); }
      catch (err) { UI.toast(err.message, 'erro', 6000); }
    };

    document.getElementById('b-novo-usu').onclick = () => {
      UI.modal({
        titulo: 'Novo usuário',
        corpo: `${UI.campo('Nome completo', 'u-nome', 'text', { req: true })}
          ${UI.campo('E-mail', 'u-email', 'email', { req: true })}
          ${UI.campo('Senha provisória', 'u-senha', 'password', { req: true, ajuda: 'Mín. 10 caracteres com maiúscula, minúscula, número e símbolo.' })}
          <div class="linha">
            ${UI.select('Perfil de acesso', 'u-papel', [
              { v: 'advogado', t: 'Advogado — processos e clientes' },
              { v: 'socio', t: 'Sócio — acesso amplo e auditoria' },
              { v: 'estagiario', t: 'Estagiário — somente leitura e tarefas' },
              { v: 'financeiro', t: 'Financeiro — receitas e despesas' },
              { v: 'recepcao', t: 'Recepção — clientes e agendamentos' },
              { v: 'admin', t: 'Administrador — controle total' },
            ], { valor: 'advogado' })}
            ${UI.campo('OAB', 'u-oab', 'text', { ph: 'OAB/MA 00000' })}
          </div>`,
        onConfirmar: async () => {
          try {
            await API.criarUsuario({
              nome: UI.val('u-nome'), email: UI.val('u-email'), senha: UI.val('u-senha'),
              papel: UI.val('u-papel'), oab: UI.val('u-oab') || null,
            });
            UI.fecharModal(); UI.toast('Usuário criado.'); invalidarCache(); carregarUsuarios();
          } catch (e) { UI.toast(e.message, 'erro', 8000); }
        },
      });
    };
  }


  /* ================================================================
     12. SEGURANÇA (MFA)
     ================================================================ */
  async function seguranca(el) {
    const st = await API.mfaStatus();
    el.innerHTML = `<div class="grid g2">
      <div class="card"><header><h3>Verificação em duas etapas</h3>
        ${st.ativo ? '<span class="pill ok">Ativa</span>' : '<span class="pill warn">Desativada</span>'}
      </header><div class="corpo">
        <p class="muted" style="margin-bottom:16px">
          Protege a conta mesmo que alguém descubra sua senha. A cada acesso o sistema
          pede um código de 6 dígitos gerado no seu celular.</p>
        ${st.ativo ? `
          <p style="font-size:13.5px;margin-bottom:14px">
            Ativada em <b>${UI.dataHora(st.confirmado_em)}</b><br>
            Códigos de recuperação disponíveis:
            <b style="color:${st.codigos_recuperacao_restantes <= 2 ? 'var(--danger)' : 'var(--ok)'}">
              ${st.codigos_recuperacao_restantes}</b> de 10</p>
          <div style="display:flex;gap:9px;flex-wrap:wrap">
            <button class="btn btn-neutro" id="b-regen">Gerar novos códigos</button>
            <button class="btn btn-perigo" id="b-desativar">Desativar</button>
          </div>`
        : `<button class="btn btn-ouro" id="b-ativar-mfa">
             ${UI.icone('auditoria', 16)} Ativar verificação em duas etapas</button>`}
      </div></div>

      <div class="card"><header><h3>Aplicativos compatíveis</h3></header><div class="corpo">
        <p class="muted" style="margin-bottom:12px">Use qualquer um destes no seu celular:</p>
        <ul style="font-size:13.5px;line-height:2;list-style:none">
          <li>✓ Google Authenticator</li>
          <li>✓ Microsoft Authenticator</li>
          <li>✓ Authy</li>
          <li>✓ 1Password / Bitwarden</li>
        </ul>
        <p class="muted" style="font-size:12.5px;margin-top:12px">
          O código muda a cada 30 segundos e funciona mesmo sem internet no celular.</p>
      </div></div></div>`;

    const btnAtivar = document.getElementById('b-ativar-mfa');
    if (btnAtivar) btnAtivar.onclick = async () => {
      let d;
      try { d = await API.mfaIniciar(); }
      catch (e) { return UI.toast(e.message, 'erro'); }
      UI.modal({
        titulo: 'Ativar verificação em duas etapas', largo: true,
        corpo: `<div style="display:grid;grid-template-columns:auto 1fr;gap:26px;align-items:start">
            <div style="background:#fff;padding:12px;border:1px solid var(--line);border-radius:12px">
              ${d.qrcode_svg || '<p class="muted" style="width:200px;text-align:center">QR indisponível — use o código abaixo</p>'}
            </div>
            <div>
              <p style="font-size:13.5px;margin-bottom:14px">${E(d.instrucoes)}</p>
              <div class="campo"><label>Ou digite este código no aplicativo</label>
                <input type="text" value="${E(d.segredo)}" readonly
                  style="font-family:monospace;letter-spacing:2px;font-size:13px"></div>
              ${UI.campo('Código de 6 dígitos do aplicativo', 'm-cod', 'text',
                { req: true, ph: '000000', attrs: 'maxlength="6" inputmode="numeric" autocomplete="one-time-code"' })}
            </div></div>`,
        rodape: `<button class="btn btn-neutro" data-fechar>Cancelar</button>
                 <button class="btn btn-ouro" data-confirmar>Confirmar e ativar</button>`,
        onConfirmar: async () => {
          try {
            const r = await API.mfaConfirmar(UI.val('m-cod'));
            UI.fecharModal();
            mostrarCodigos(r.codigos_recuperacao, () => seguranca(el));
          } catch (e) { UI.toast(e.message, 'erro', 7000); }
        },
      });
    };

    const btnDes = document.getElementById('b-desativar');
    if (btnDes) btnDes.onclick = () => UI.modal({
      titulo: 'Desativar verificação em duas etapas',
      corpo: `<p class="muted" style="margin-bottom:14px">
          Sua conta ficará protegida apenas pela senha. Confirme com sua senha atual.</p>
        ${UI.campo('Senha atual', 'd-senha', 'password', { req: true })}`,
      rodape: `<button class="btn btn-neutro" data-fechar>Cancelar</button>
               <button class="btn btn-perigo" data-confirmar>Desativar</button>`,
      onConfirmar: async () => {
        try { await API.mfaDesativar(UI.val('d-senha'));
          UI.fecharModal(); UI.toast('Verificação em duas etapas desativada.', 'aviso');
          seguranca(el);
        } catch (e) { UI.toast(e.message, 'erro'); }
      },
    });

    const btnRegen = document.getElementById('b-regen');
    if (btnRegen) btnRegen.onclick = () => UI.modal({
      titulo: 'Gerar novos códigos de recuperação',
      corpo: `<p class="muted" style="margin-bottom:14px">
          Os códigos anteriores deixarão de funcionar.</p>
        ${UI.campo('Senha atual', 'r-senha', 'password', { req: true })}`,
      onConfirmar: async () => {
        try { const r = await API.mfaRegenerar(UI.val('r-senha'));
          UI.fecharModal(); mostrarCodigos(r.codigos_recuperacao, () => seguranca(el));
        } catch (e) { UI.toast(e.message, 'erro'); }
      },
    });
  }

  function mostrarCodigos(codigos, aoFechar) {
    UI.modal({
      titulo: 'Guarde seus códigos de recuperação',
      corpo: `<div class="card" style="border-left:4px solid var(--warn);margin-bottom:16px">
          <div class="corpo" style="font-size:13.5px">
            <b style="font-family:var(--font-body)">Anote em local seguro.</b>
            Cada código funciona uma única vez e serve para entrar caso você perca o celular.
            Eles não serão exibidos novamente.</div></div>
        <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:9px;
                    font-family:monospace;font-size:15px">
          ${codigos.map(c => `<div style="background:var(--surface-2);border:1px solid var(--line);
             padding:10px;border-radius:8px;text-align:center;letter-spacing:1px">${E(c)}</div>`).join('')}
        </div>
        <button class="btn btn-neutro mt btn-bloco" id="b-copiar">Copiar todos</button>`,
      rodape: `<button class="btn btn-primario" data-confirmar>Já anotei, concluir</button>`,
      onConfirmar: () => { UI.fecharModal(); aoFechar && aoFechar(); },
    });
    document.getElementById('b-copiar').onclick = () => {
      navigator.clipboard?.writeText(codigos.join('\n'))
        .then(() => UI.toast('Códigos copiados.'))
        .catch(() => UI.toast('Copie manualmente.', 'aviso'));
    };
  }

  /* ================================================================
     13. LICENÇA E BACKUP
     ================================================================ */
  async function sistema(el) {
    el.innerHTML = `<div class="tabs">
        <button class="ativo" data-s="lic">Licença</button>
        <button data-s="bkp">Backup e restauração</button>
      </div><div id="painel-sistema"><div class="skeleton" style="height:220px"></div></div>`;

    async function licenca() {
      const [l, planos] = await Promise.all([API.licenca(), API.planos()]);
      const cor = l.expirado ? 'perigo' : l.licenciado ? 'sucesso' : 'alerta';
      document.getElementById('painel-sistema').innerHTML = `
        <div class="grid g4" style="margin-bottom:18px">
          ${UI.kpi('Situação', l.licenciado ? 'Licenciado' : 'Avaliação', E(l.mensagem), cor)}
          ${UI.kpi('Plano', E(l.plano), '', 'ouro')}
          ${UI.kpi('Usuários', `${l.usuarios_ativos} / ${l.max_usuarios}`,
              l.usuarios_ativos >= l.max_usuarios ? 'Limite atingido' : 'Dentro do limite',
              l.usuarios_ativos >= l.max_usuarios ? 'alerta' : '')}
          ${UI.kpi(l.licenciado ? 'Vence em' : 'Avaliação',
              l.dias_restantes >= 0 ? `${l.dias_restantes} dias` : 'Vencida',
              l.validade ? UI.data(l.validade) : '', l.dias_restantes < 30 ? 'alerta' : '')}
        </div>
        <div class="grid g2">
          <div class="card"><header><h3>Ativar licença</h3></header><div class="corpo">
            ${l.licenciado ? `<p class="muted" style="margin-bottom:14px">
                <b>${E(l.razao_social || '')}</b><br>CNPJ ${E(l.cnpj || '')}</p>` : ''}
            ${UI.campo('CNPJ do escritório', 'lc-cnpj', 'text',
              { valor: l.cnpj || '', req: true, ph: '00.000.000/0001-00' })}
            ${UI.campo('Razão social', 'lc-razao', 'text', { valor: l.razao_social || '', req: true })}
            ${UI.campo('Chave de licença', 'lc-chave', 'text',
              { req: true, ph: 'JT-XXXXXXXXX-XXXXXXXXXXXXXXXX',
                ajuda: 'A chave é vinculada ao CNPJ e não funciona em outro escritório.' })}
            <button class="btn btn-ouro btn-bloco" id="b-ativar-lic">Ativar licença</button>
          </div></div>
          <div class="card"><header><h3>Planos</h3></header><div class="corpo" style="padding:0">
            ${UI.tabela([
              { titulo: 'Plano', render: p => `<b style="font-family:var(--font-body)">${E(p.nome)}</b>${p.nome === l.plano ? ' <span class="pill ok">atual</span>' : ''}` },
              { titulo: 'Usuários', num: true, render: p => p.max_usuarios >= 999 ? 'Ilimitado' : p.max_usuarios },
              { titulo: 'Recursos', render: p => `<small class="muted">${E(p.recursos.join(', '))}</small>` },
            ], planos)}
          </div></div></div>`;

      document.getElementById('b-ativar-lic').onclick = async () => {
        try {
          const r = await API.ativarLicenca({
            cnpj: UI.val('lc-cnpj'), razao_social: UI.val('lc-razao'), chave: UI.val('lc-chave') });
          UI.toast(r.mensagem); licenca();
        } catch (e) { UI.toast(e.message, 'erro', 8000); }
      };
    }

    async function backup() {
      const d = await API.backups();
      document.getElementById('painel-sistema').innerHTML = `
        <div class="grid g4" style="margin-bottom:18px">
          ${UI.kpi('Backups guardados', UI.numero(d.itens.length))}
          ${UI.kpi('Último backup', d.ultimo ? UI.tempoRelativo(d.ultimo.criado_em) : 'nenhum',
              d.ultimo ? UI.dataHora(d.ultimo.criado_em) : '', d.ultimo ? 'sucesso' : 'alerta')}
          ${UI.kpi('Espaço usado', (d.espaco_usado / 1048576).toFixed(1) + ' MB')}
          ${UI.kpi('Automático', d.agendador_ativo ? 'Ligado' : 'Desligado',
              `A cada ${d.intervalo_horas}h · guarda ${d.retencao_dias} dias`,
              d.agendador_ativo ? 'sucesso' : 'perigo')}
        </div>
        <div class="barra">
          <div class="cresce"><span class="muted" style="font-size:12.5px">
            Pasta: <code>${E(d.pasta)}</code></span></div>
          <button class="btn btn-neutro" id="b-limpar-bkp">Limpar antigos</button>
          <button class="btn btn-primario" id="b-criar-bkp">${UI.icone('mais', 16)} Fazer backup agora</button>
        </div>
        <div class="card">${UI.tabela([
          { titulo: 'Arquivo', render: b => `<b style="font-family:var(--font-body)">${E(b.arquivo)}</b>
              <br><small class="muted">${E((b.sha256 || '').slice(0, 16))}…</small>` },
          { titulo: 'Tipo', render: b => `<span class="pill ${b.tipo === 'manual' ? 'info' : 'neutro'}">${E(b.tipo)}</span>` },
          { titulo: 'Tamanho', num: true, render: b => (b.tamanho / 1024).toFixed(0) + ' KB' },
          { titulo: 'Criado em', render: b => `${UI.dataHora(b.criado_em)}<br><small class="muted">${UI.tempoRelativo(b.criado_em)}</small>` },
          { titulo: 'Arquivo', render: b => b.existe ? '<span class="pill ok">disponível</span>' : '<span class="pill danger">ausente</span>' },
          { titulo: '', render: b => `<div style="display:flex;gap:5px;justify-content:flex-end">
              ${b.existe ? `<a class="btn-icone" href="${API.urlBackup(b.id)}" title="Baixar">${UI.icone('baixar', 15)}</a>` : ''}
              <button class="btn-icone perigo" data-del="${b.id}" title="Excluir">${UI.icone('lixo', 15)}</button></div>` },
        ], d.itens, { vazio: 'Nenhum backup ainda. O primeiro automático ocorre em até 1 hora.' })}</div>`;

      document.getElementById('b-criar-bkp').onclick = async (ev) => {
        ev.target.disabled = true;
        try { const r = await API.criarBackup(); UI.toast(r.mensagem); backup(); }
        catch (e) { UI.toast(e.message, 'erro'); ev.target.disabled = false; }
      };
      document.getElementById('b-limpar-bkp').onclick = () =>
        UI.confirmar('Remover backups além do período de retenção? Os 3 mais recentes são sempre preservados.',
          async () => { const r = await API.limparBackups(d.retencao_dias);
            UI.fecharModal(); UI.toast(r.mensagem); backup(); }, 'Limpar');
      document.querySelector('#painel-sistema .card').onclick = (ev) => {
        const b = ev.target.closest('[data-del]');
        if (b) UI.confirmar('Excluir este backup permanentemente?', async () => {
          try { await API.excluirBackup(b.dataset.del); UI.fecharModal(); UI.toast('Backup excluído.'); backup(); }
          catch (e) { UI.toast(e.message, 'erro'); }
        }, 'Excluir');
      };
    }

    await licenca();
    el.querySelectorAll('.tabs button').forEach(b => b.onclick = () => {
      el.querySelectorAll('.tabs button').forEach(x => x.classList.remove('ativo'));
      b.classList.add('ativo');
      b.dataset.s === 'lic' ? licenca() : backup();
    });
  }

  return { painel, clientes, funil, processos, agenda, atividades,
           financeiro, documentos, relatorios, auditoria, config,
           seguranca, sistema };
})();
