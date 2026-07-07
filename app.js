/* ==========================================================================
   MARKET INTEL DASHBOARD - CORE APPLICATION JAVASCRIPT
   Objetivo: Inteligência de dados imobiliários com agregação por itens únicos
   ========================================================================== */

// 1. VARIÁVEIS GERAIS DE ESTADO DA APLICAÇÃO
let dadosOriginais = [];
let dadosFiltrados = [];
let graficoBairrosInstance = null;
let graficoStatusInstance = null;

// Lista canônica de colunas que representam itens de lazer para processamento dinâmico
const colunasLazer = [
    'Academia_Interna', 'Academia_Externa', 'Beach_Point', 'Bicicletario', 
    'Churrasqueira', 'Coworking', 'Delivery', 'Espaco_Gourmet', 'Espaco_Kids', 
    'Bike_Sharing', 'Espaco_Teen', 'Espaco_Zen', 'Grab_Go', 'Lavanderia', 
    'Lounge', 'Market', 'Pet_Care', 'Pet_Park', 'Piscina', 'Playground', 
    'Pub_Jogos', 'Quadra', 'Sala_Ioga_Pilates', 'Sala_Reuniao', 'Salao_Festas', 
    'Sala_Massagem', 'Sauna', 'Ambientes_Extras'
];

// 2. INICIALIZAÇÃO DA APLICAÇÃO (DOM READY)
document.addEventListener('DOMContentLoaded', () => {
    carregarDados();
    configurarEventosFiltros();
});

// 3. CARGA E PREPARAÇÃO DOS DADOS VIA PAPAPARSE
function carregarDados() {
    Papa.parse('dados_concorrencia.csv', {
        download: true,
        header: true,
        skipEmptyLines: true,
        complete: function(results) {
            dadosOriginais = results.data;
            dadosFiltrados = [...dadosOriginais];
            
            // Popular os componentes visuais pela primeira vez
            inicializarFiltrosDinamicos();
            atualizarDashboard();
        },
        error: function(err) {
            console.error("Erro crítico ao ler a base de dados CSV: ", err);
        }
    });
}

// 4. CONFIGURAÇÃO DOS ESCUTADORES DE FILTROS
function configurarEventosFiltros() {
    const filtrosSelect = ['filter-bairro', 'filter-tipologia', 'filter-status', 'filter-construtora'];
    filtrosSelect.forEach(id => {
        const elemento = document.getElementById(id);
        if (elemento) {
            elemento.addEventListener('change', aplicarFiltros);
        }
    });

    const btnClear = document.getElementById('btn-clear-filters');
    if (btnClear) {
        btnClear.addEventListener('click', limparTodosOsFiltros);
    }
}

// 5. CRIAÇÃO DINÂMICA DAS OPÇÕES DOS SELECTS (DISTINCT)
function inicializarFiltrosDinamicos() {
    popularSelectUnico('filter-bairro', 'Bairro');
    popularSelectUnico('filter-tipologia', 'Tipologia');
    popularSelectUnico('filter-status', 'Status');
    popularSelectUnico('filter-construtora', 'Construtora');
}

function popularSelectUnico(idElemento, nomeColuna) {
    const select = document.getElementById(idElemento);
    if (!select) return;

    // Extrai valores únicos ignorando registros vazios
    const valoresUnicos = [...new Set(dadosOriginais.map(item => item[nomeColuna]).filter(v => v && v.trim() !== ''))];
    valoresUnicos.sort();

    // Mantém apenas a primeira opção ("Todos") e adiciona as novas
    select.innerHTML = `<option value="">Todos</option>`;
    valoresUnicos.forEach(valor => {
        const opt = document.createElement('option');
        opt.value = valor;
        opt.textContent = valor;
        select.appendChild(opt);
    });
}

// 6. PIPELINE DE FILTRAGEM DE DADOS
function aplicarFiltros() {
    const fBairro = document.getElementById('filter-bairro')?.value || '';
    const fTipologia = document.getElementById('filter-tipologia')?.value || '';
    const fStatus = document.getElementById('filter-status')?.value || '';
    const fConstrutora = document.getElementById('filter-construtora')?.value || '';

    dadosFiltrados = dadosOriginais.filter(item => {
        return (fBairro === '' || item.Bairro === fBairro) &&
               (fTipologia === '' || item.Tipologia === fTipologia) &&
               (fStatus === '' || item.Status === fStatus) &&
               (fConstrutora === '' || item.Construtora === fConstrutora);
    });

    atualizarDashboard();
}

function limparTodosOsFiltros() {
    ['filter-bairro', 'filter-tipologia', 'filter-status', 'filter-construtora'].forEach(id => {
        const elemento = document.getElementById(id);
        if (elemento) elemento.value = '';
    });
    dadosFiltrados = [...dadosOriginais];
    atualizarDashboard();
}

// 7. ATUALIZAÇÃO DA CAMADA VISUAL (RE-RENDER)
function atualizarDashboard() {
    atualizarKPIs();
    renderizarGraficoBairros();
    renderizarGraficoStatus();
    renderizarPainelComparativo();
}

// 8. CÁLCULO DE KPIS COM ESTRUTURAS DISTINCT (CHAVE DA CORREÇÃO)
function atualizarKPIs() {
    // A) Mapeia empreendimentos de forma única por nome
    const empreendimentosUnicos = [...new Set(dadosFiltrados.map(item => item.Empreendimento))];
    const totalEmpreendimentos = empreendimentosUnicos.length;

    // B) Mapeia bairros de forma única
    const totalBairros = [...new Set(dadosFiltrados.map(item => item.Bairro))].length;

    // C) Mapeia construtoras de forma única
    const totalConstrutoras = [...new Set(dadosFiltrados.map(item => item.Construtora))].length;

    // D) Média Real de Lazer por Empreendimento (Ignorando inflação de linhas duplicadas)
    let somaLazerProjetosUnicos = 0;
    const mapeamentoJaProcessado = new Set();

    dadosFiltrados.forEach(item => {
        if (!mapeamentoJaProcessado.has(item.Empreendimento)) {
            mapeamentoJaProcessado.add(item.Empreendimento);
            somaLazerProjetosUnicos += parseInt(item.Total_Lazer || 0, 10);
        }
    });

    const mediaLazer = totalEmpreendimentos > 0 ? (somaLazerProjetosUnicos / totalEmpreendimentos).toFixed(1) : 0;

    // Vinculação com os IDs do arquivo HTML
    if(document.getElementById('kpi-total-empreendimentos')) document.getElementById('kpi-total-empreendimentos').textContent = totalEmpreendimentos;
    if(document.getElementById('kpi-total-bairros')) document.getElementById('kpi-total-bairros').textContent = totalBairros;
    if(document.getElementById('kpi-total-construtoras')) document.getElementById('kpi-total-construtoras').textContent = totalConstrutoras;
    if(document.getElementById('kpi-media-lazer')) document.getElementById('kpi-media-lazer').textContent = mediaLazer;
}

// 9. RENDERIZAÇÃO DOS GRÁFICOS SEM DUPLICIDADE CONTABILIZADA
function renderizarGraficoBairros() {
    const ctx = document.getElementById('chart-bairros');
    if (!ctx) return;

    // Agrupa empreendimentos de forma única por Bairro usando Sets
    const mapaBairros = {};
    dadosFiltrados.forEach(item => {
        if (!mapaBairros[item.Bairro]) {
            mapaBairros[item.Bairro] = new Set();
        }
        mapaBairros[item.Bairro].add(item.Empreendimento);
    });

    const labels = Object.keys(mapaBairros);
    const valoresReal = Object.values(mapaBairros).map(set => set.size);

    if (graficoBairrosInstance) graficoBairrosInstance.destroy();

    graficoBairrosInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Qtd. de Empreendimentos',
                data: valoresReal,
                backgroundColor: '#3b82f6',
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
        }
    });
}

function renderizarGraficoStatus() {
    const ctx = document.getElementById('chart-status');
    if (!ctx) return;

    // Agrupa empreendimentos de forma única por Status usando Sets
    const mapaStatus = {};
    dadosFiltrados.forEach(item => {
        if (!mapaStatus[item.Status]) {
            mapaStatus[item.Status] = new Set();
        }
        mapaStatus[item.Status].add(item.Empreendimento);
    });

    const labels = Object.keys(mapaStatus);
    const valoresReal = Object.values(mapaStatus).map(set => set.size);

    if (graficoStatusInstance) graficoStatusInstance.destroy();

    graficoStatusInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: valoresReal,
                backgroundColor: ['#10b981', '#f59e0b', '#3b82f6', '#ef4444']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom', labels: { boxWidth: 12 } } }
        }
    });
}

// 10. ARQUITETURA DA MATRIZ COMPARATIVA (TABELA DINÂMICA)
function renderizarPainelComparativo() {
    const head = document.getElementById('compare-head');
    const body = document.getElementById('compare-body');
    const checkboxesContainer = document.getElementById('compare-checkboxes');
    
    if (!head || !body) return;

    // Consolida apenas 1 registro por nome de empreendimento para popular as colunas da tabela
    const listaProjetosExibicao = [];
    const nomesProcessados = new Set();

    dadosFiltrados.forEach(item => {
        if (!nomesProcessados.has(item.Empreendimento)) {
            nomesProcessados.add(item.Empreendimento);
            listaProjetosExibicao.push(item);
        }
    });

    // Se o container de checkboxes existir, renderiza as opções de seleção de colunas
    if (checkboxesContainer && checkboxesContainer.children.length === 0) {
        listaProjetosExibicao.forEach((p, idx) => {
            const label = document.createElement('label');
            label.className = 'flex items-center space-x-2 p-2 rounded hover:bg-gray-100 cursor-pointer text-sm text-gray-700';
            label.innerHTML = `
                <input type="checkbox" value="${p.Empreendimento}" checked class="rounded text-blue-600 focus:ring-blue-500">
                <span class="truncate">${p.Empreendimento}</span>
            `;
            // Escutador para atualizar a visibilidade das colunas ao clicar
            label.querySelector('input').addEventListener('change', () => alternarColunasTabela());
            checkboxesContainer.appendChild(label);
        });
    }

    // A) CONSTRUÇÃO DO CABEÇALHO DA TABELA
    let htmlHead = `<tr><th class="text-left bg-gray-100 z-20 sticky left-0 font-semibold text-gray-600">Atributos / Lazer</th>`;
    listaProjetosExibicao.forEach(p => {
        htmlHead += `<th class="col-emp-${-1}" data-emp="${p.Empreendimento}">${p.Empreendimento}</th>`;
    });
    htmlHead += `</tr>`;
    head.innerHTML = htmlHead;

    // B) CONSTRUÇÃO DAS LINHAS DE METADADOS MACRO
    let htmlBody = ``;
    
    // Metadado: Construtora
    htmlBody += `<tr><td class="font-semibold bg-gray-50 sticky left-0 z-10">Construtora</td>`;
    listaProjetosExibicao.forEach(p => { htmlBody += `<td data-emp="${p.Empreendimento}">${p.Construtora}</td>`; });
    htmlBody += `</tr>`;

    // Metadado: Bairro
    htmlBody += `<tr><td class="font-semibold bg-gray-50 sticky left-0 z-10">Bairro</td>`;
    listaProjetosExibicao.forEach(p => { htmlBody += `<td data-emp="${p.Empreendimento}">${p.Bairro}</td>`; });
    htmlBody += `</tr>`;

    // Metadado: Status da Obra
    htmlBody += `<tr><td class="font-semibold bg-gray-50 sticky left-0 z-10">Status</td>`;
    listaProjetosExibicao.forEach(p => { htmlBody += `<td data-emp="${p.Empreendimento}">${p.Status}</td>`; });
    htmlBody += `</tr>`;

    // C) VARREDURA DINÂMICA DA MATRIZ DE ITENS DE LAZER
    colunasLazer.forEach(coluna => {
        // Formata o nome técnico da coluna (ex: "Pet_Care" vira "Pet Care")
        const nomeFormatado = coluna.replace(/_/g, ' ');
        htmlBody += `<tr><td class="sticky left-0 bg-white font-medium text-gray-700 shadow-sm z-10">${nomeFormatado}</td>`;
        
        listaProjetosExibicao.forEach(p => {
            const valorCelula = p[coluna] ? p[coluna].trim() : '';
            if (valorCelula !== '') {
                // Se o campo possui conteúdo, exibe o marcador positivo (Sim)
                htmlBody += `<td class="text-center td-feature-yes" data-emp="${p.Empreendimento}" title="${valorCelula}">✔</td>`;
            } else {
                // Se o campo está em branco, exibe o marcador de ausência (Não)
                htmlBody += `<td class="text-center td-feature-no text-gray-300" data-emp="${p.Empreendimento}">─</td>`;
            }
        });
        htmlBody += `</tr>`;
    });

    body.innerHTML = htmlBody;
    alternarColunasTabela(); // Aplica o estado inicial de visibilidade
}

// 11. CONTROLE DE VISIBILIDADE DE COLUNAS NA MATRIZ COMPARATIVA
function alternarColunasTabela() {
    const checkboxesContainer = document.getElementById('compare-checkboxes');
    if (!checkboxesContainer) return;

    const checkboxes = checkboxesContainer.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(cb => {
        const nomeEmp = cb.value;
        const visivel = cb.checked;
        
        // Seleciona todas as células (th e td) que pertencem a este empreendimento específico
        const celulas = document.querySelectorAll(`[data-emp="${nomeEmp}"]`);
        celulas.forEach(celula => {
            if (visivel) {
                celula.style.display = '';
            } else {
                celula.style.display = 'none';
            }
        });
    });
}
