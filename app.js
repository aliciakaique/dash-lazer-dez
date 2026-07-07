// Dicionário de Categorias de Lazer baseado na análise de mercado
const CATEGORY_MAP = {
    'Academia_Interna': 'Bem-Estar',
    'Academia_Externa': 'Bem-Estar',
    'Beach_Point': 'Serviços',
    'Bicicletario': 'Mobilidade',
    'Churrasqueira': 'Social/Eventos',
    'Coworking': 'Trabalho/Estudo',
    'Delivery': 'Serviços',
    'Espaco_Gourmet': 'Social/Eventos',
    'Espaco_Kids': 'Infantil',
    'Bike_Sharing': 'Mobilidade',
    'Espaco_Teen': 'Entretenimento',
    'Espaco_Zen': 'Bem-Estar',
    'Grab_Go': 'Serviços',
    'Lavanderia': 'Serviços',
    'Lounge': 'Bem-Estar',
    'Market': 'Serviços',
    'Pet_Care': 'Pet',
    'Pet_Park': 'Pet',
    'Piscina': 'Aquático',
    'Playground': 'Infantil',
    'Pub_Jogos': 'Entretenimento',
    'Quadra': 'Esporte',
    'Sala_Ioga_Pilates': 'Bem-Estar',
    'Sala_Reuniao': 'Trabalho/Estudo',
    'Salao_Festas': 'Social/Eventos',
    'Sala_Massagem': 'Bem-Estar',
    'Sauna': 'Bem-Estar',
    'Ambientes_Extras': 'Diferenciais'
};

const LAZER_COLUMNS = Object.keys(CATEGORY_MAP);

let globalData = [];
let filteredData = [];
let charts = {};

// Inicialização da Aplicação
document.addEventListener('DOMContentLoaded', () => {
    Papa.parse('dados_concorrencia.csv', {
        download: true,
        header: true,
        skipEmptyLines: true,
        complete: function(results) {
            globalData = results.data;
            filteredData = [...globalData];
            initDashboard();
        },
        error: function(err) {
            console.error("Erro ao ler o CSV: ", err);
            alert("Erro ao carregar os dados. Verifique se o arquivo dados_concorrencia.csv está na mesma pasta.");
        }
    });
});

function initDashboard() {
    populateFilters();
    updateDashboard();
    setupEventListeners();
}

function setupEventListeners() {
    document.getElementById('filter-bairro').addEventListener('change', handleFilterChange);
    document.getElementById('filter-tipologia').addEventListener('change', handleFilterChange);
    document.getElementById('filter-status').addEventListener('change', handleFilterChange);
    document.getElementById('btn-clear-filters').addEventListener('click', () => {
        document.getElementById('filter-bairro').value = 'Todos';
        document.getElementById('filter-tipologia').value = 'Todos';
        document.getElementById('filter-status').value = 'Todos';
        handleFilterChange();
    });
    document.getElementById('select-profile').addEventListener('change', updateProfileCard);
    // Delegação de eventos para checkboxes dinâmicos de comparação
    document.getElementById('compare-checkboxes').addEventListener('change', (e) => {
        if(e.target.tagName === 'INPUT') updateComparisonTable();
    });
}

function getUniqueValues(column) {
    const values = globalData.map(row => row[column]).filter(v => v);
    // Algumas colunas têm múltiplos valores (ex: Tipologia "ST, 1Q"), então dividimos e aparamos
    let splitValues = [];
    values.forEach(val => {
        val.split(',').forEach(item => {
            let cleanItem = item.trim().replace(/"/g, '');
            if(cleanItem && !splitValues.includes(cleanItem)) {
                splitValues.push(cleanItem);
            }
        });
    });
    return splitValues.sort();
}

function populateFilters() {
    const bairros = [...new Set(globalData.map(d => d.Bairro))].sort();
    const statusObj = [...new Set(globalData.map(d => d.Status))].sort();
    
    // Bairros
    const bairroSelect = document.getElementById('filter-bairro');
    bairros.forEach(b => b && bairroSelect.add(new Option(b, b)));

    // Status
    const statusSelect = document.getElementById('filter-status');
    statusObj.forEach(s => s && statusSelect.add(new Option(s, s)));

    // Tipologia (como pode ter valores compostos, usa getUniqueValues)
    const tipologias = getUniqueValues('Tipologia');
    const tipoSelect = document.getElementById('filter-tipologia');
    tipologias.forEach(t => tipoSelect.add(new Option(t, t)));

    populateProfileAndCompareSelects();
}

function populateProfileAndCompareSelects() {
    const selectProfile = document.getElementById('select-profile');
    const compareBox = document.getElementById('compare-checkboxes');
    
    selectProfile.innerHTML = '<option value="">Selecione um Empreendimento...</option>';
    compareBox.innerHTML = '';

    filteredData.forEach(d => {
        // Select Profile
        selectProfile.add(new Option(d.Empreendimento, d.Empreendimento));
        
        // Checkboxes Comparison
        const lbl = document.createElement('label');
        lbl.className = 'inline-flex items-center text-xs bg-white border border-gray-200 px-2 py-1 rounded cursor-pointer hover:bg-gray-100';
        lbl.innerHTML = `<input type="checkbox" value="${d.Empreendimento}" class="mr-1 compare-chk form-checkbox h-3 w-3 text-blue-600 rounded-sm"> <span class="truncate max-w-[100px]">${d.Empreendimento}</span>`;
        compareBox.appendChild(lbl);
    });
}

function handleFilterChange() {
    const b = document.getElementById('filter-bairro').value;
    const t = document.getElementById('filter-tipologia').value;
    const s = document.getElementById('filter-status').value;

    filteredData = globalData.filter(d => {
        const matchBairro = b === 'Todos' || d.Bairro === b;
        const matchStatus = s === 'Todos' || d.Status === s;
        const matchTipo = t === 'Todos' || d.Tipologia.includes(t);
        return matchBairro && matchStatus && matchTipo;
    });

    updateDashboard();
    populateProfileAndCompareSelects();
    document.getElementById('profile-card').classList.add('hidden');
    updateComparisonTable();
}

function updateDashboard() {
    updateKPIs();
    updateCharts();
}

function updateKPIs() {
    document.getElementById('kpi-total').innerText = filteredData.length;

    if (filteredData.length === 0) {
        document.getElementById('kpi-avg').innerText = '0';
        document.getElementById('kpi-top').innerText = '-';
        return;
    }

    let totalItems = 0;
    let itemCounts = {};

    filteredData.forEach(row => {
        let countForThisProject = 0;
        LAZER_COLUMNS.forEach(col => {
            if (row[col] && row[col].trim() !== '') {
                countForThisProject++;
                itemCounts[col] = (itemCounts[col] || 0) + 1;
            }
        });
        totalItems += countForThisProject;
    });

    const avg = (totalItems / filteredData.length).toFixed(1);
    document.getElementById('kpi-avg').innerText = avg;

    // Encontrar o mais frequente
    let topItem = '-';
    let maxCount = 0;
    for (const [item, count] of Object.entries(itemCounts)) {
        if (count > maxCount) {
            maxCount = count;
            topItem = item.replace(/_/g, ' '); // Formatar para exibição
        }
    }
    document.getElementById('kpi-top').innerText = `${topItem} (${maxCount})`;
}

function updateCharts() {
    // Calcular dados para Ranking
    let itemCounts = {};
    let categoryCounts = {};

    filteredData.forEach(row => {
        LAZER_COLUMNS.forEach(col => {
            if (row[col] && row[col].trim() !== '') {
                itemCounts[col] = (itemCounts[col] || 0) + 1;
                let cat = CATEGORY_MAP[col];
                categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
            }
        });
    });

    // Chart 1: Ranking (Top 10)
    const sortedItems = Object.entries(itemCounts).sort((a, b) => b[1] - a[1]).slice(0, 10);
    drawChart('chartRanking', 'bar', {
        labels: sortedItems.map(i => i[0].replace(/_/g, ' ')),
        datasets: [{
            label: 'Empreendimentos com este item',
            data: sortedItems.map(i => i[1]),
            backgroundColor: 'rgba(59, 130, 246, 0.7)',
            borderColor: 'rgba(29, 78, 216, 1)',
            borderWidth: 1
        }]
    }, { indexAxis: 'y' });

    // Chart 2: Categorias (Pie/Doughnut)
    const sortedCats = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1]);
    drawChart('chartCategoria', 'doughnut', {
        labels: sortedCats.map(c => c[0]),
        datasets: [{
            data: sortedCats.map(c => c[1]),
            backgroundColor: [
                '#3b82f6', '#10b981', '#f59e0b', '#ef4444', 
                '#8b5cf6', '#ec4899', '#14b8a6', '#64748b'
            ],
            borderWidth: 0
        }]
    }, { maintainAspectRatio: false });
}

function drawChart(canvasId, type, data, extraOptions = {}) {
    const ctx = document.getElementById(canvasId).getContext('2d');
    if (charts[canvasId]) {
        charts[canvasId].destroy();
    }
    
    charts[canvasId] = new Chart(ctx, {
        type: type,
        data: data,
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: type === 'doughnut' ? 'right' : 'top',
                    display: type === 'doughnut'
                }
            },
            ...extraOptions
        }
    });
}

function updateProfileCard() {
    const projName = document.getElementById('select-profile').value;
    const card = document.getElementById('profile-card');
    
    if (!projName) {
        card.classList.add('hidden');
        return;
    }

    const proj = globalData.find(d => d.Empreendimento === projName);
    if (!proj) return;

    document.getElementById('prof-nome').innerText = proj.Empreendimento;
    document.getElementById('prof-construtora').innerText = proj.Construtora || 'N/I';
    document.getElementById('prof-bairro').innerText = proj.Bairro || 'N/I';
    document.getElementById('prof-tipo').innerText = proj.Tipologia || 'N/I';
    document.getElementById('prof-publico').innerText = proj.Publico || 'N/I';
    document.getElementById('prof-entrega').innerText = proj.Entrega || 'N/I';
    document.getElementById('prof-status').innerText = proj.Status || 'N/I';

    const divItens = document.getElementById('prof-itens');
    divItens.innerHTML = '';
    
    LAZER_COLUMNS.forEach(col => {
        if (proj[col] && proj[col].trim() !== '') {
            const span = document.createElement('span');
            span.className = 'badge-item';
            span.innerText = proj[col] !== '1' ? proj[col] : col.replace(/_/g, ' '); 
            divItens.appendChild(span);
        }
    });

    card.classList.remove('hidden');
}

function updateComparisonTable() {
    const checkboxes = document.querySelectorAll('.compare-chk:checked');
    const thead = document.getElementById('compare-head');
    const tbody = document.getElementById('compare-body');
    
    if (checkboxes.length > 3) {
        alert("Por favor, selecione no máximo 3 empreendimentos para comparar.");
        // Uncheck the last one clicked
        checkboxes[checkboxes.length - 1].checked = false;
        return;
    }

    const selectedProjects = Array.from(checkboxes).map(chk => 
        globalData.find(d => d.Empreendimento === chk.value)
    );

    // Reset Table
    thead.innerHTML = `<tr><th class="px-4 py-3 rounded-tl-lg bg-slate-100">Atributo / Item</th></tr>`;
    tbody.innerHTML = '';

    if (selectedProjects.length === 0) {
        tbody.innerHTML = `<tr><td class="px-4 py-4 text-center text-gray-400 italic">Nenhum empreendimento selecionado.</td></tr>`;
        return;
    }

    // Build Headers
    const trHead = thead.querySelector('tr');
    selectedProjects.forEach(proj => {
        const th = document.createElement('th');
        th.className = "px-4 py-3 bg-slate-100 text-blue-800 border-l border-white";
        th.innerText = proj.Empreendimento;
        trHead.appendChild(th);
    });

    // Build Rows: Infos Básicas
    const basicAttributes = [
        { key: 'Construtora', label: 'Construtora' },
        { key: 'Bairro', label: 'Bairro' },
        { key: 'Tipologia', label: 'Tipologia' },
        { key: 'Status', label: 'Status' },
        { key: 'Total_Lazer', label: 'Total Itens Lazer' }
    ];

    basicAttributes.forEach(attr => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td class="px-4 py-2 font-semibold text-slate-700 bg-slate-50">${attr.label}</td>`;
        selectedProjects.forEach(proj => {
            tr.innerHTML += `<td class="px-4 py-2 border-l border-slate-100">${proj[attr.key] || '-'}</td>`;
        });
        tbody.appendChild(tr);
    });

    // Build Rows: Itens de Lazer
    // Apenas mostrar a linha se pelo menos 1 dos projetos selecionados tiver o item
    LAZER_COLUMNS.forEach(col => {
        const anyHasItem = selectedProjects.some(proj => proj[col] && proj[col].trim() !== '');
        
        if (anyHasItem) {
            const tr = document.createElement('tr');
            tr.className = "hover:bg-blue-50/50 transition-colors";
            tr.innerHTML = `<td class="px-4 py-2 text-slate-600 pl-6 border-t border-slate-50"><i class="fa-solid fa-check text-gray-300 mr-2 text-[10px]"></i> ${col.replace(/_/g, ' ')}</td>`;
            
            selectedProjects.forEach(proj => {
                const hasItem = proj[col] && proj[col].trim() !== '';
                const displayVal = hasItem ? '<i class="fa-solid fa-circle-check td-feature-yes"></i>' : '<i class="fa-solid fa-minus td-feature-no"></i>';
                tr.innerHTML += `<td class="px-4 py-2 border-l border-slate-50 text-center">${displayVal}</td>`;
            });
            tbody.appendChild(tr);
        }
    });
}
