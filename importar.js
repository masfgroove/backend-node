const fs = require('fs');
const mysql = require('mysql2/promise');
require('dotenv').config(); // Carrega as credenciais do seu arquivo .env

async function importarLeads() {
    // 1. Conecta usando as variáveis do .env (que você já configurou)
    const dbPool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT || 3306
    });

    try {
        console.log("Lendo o arquivo empresas.json...");
        
        // Lê o arquivo JSON da pasta
        const arquivoConteudo = fs.readFileSync('empresas.json', 'utf-8');
        const empresas = JSON.parse(arquivoConteudo);

        console.log(`Encontradas ${empresas.length} empresas. Importando para o banco: ${process.env.DB_NAME}...`);

        let importadosCount = 0;

        for (let emp of empresas) {
            const nome = "Contato Comercial";
            const email = (emp.email && emp.email !== 'Não informado') ? emp.email : 'contato@naoinformado.com';
            const telefone = emp.telefone || 'Não informado';
            const empresaNome = `${emp.nome} (Site: ${emp.site})`;
            const servico = `Prospecção - ${emp.regiao || 'Tatuapé'}`;

            // Verifica duplicidade pelo nome da empresa
            const [existente] = await dbPool.query(
                'SELECT id FROM leads WHERE empresa LIKE ?', 
                [`%${emp.nome}%`]
            );

            if (existente.length === 0) {
                await dbPool.query(
                    'INSERT INTO leads (nome, email, telefone, empresa, servico) VALUES (?, ?, ?, ?, ?)',
                    [nome, email, telefone, empresaNome, servico]
                );
                importadosCount++;
                console.log(`[Importado] ${emp.nome}`);
            } else {
                console.log(`[Pulado] ${emp.nome} já existe.`);
            }
        }

        console.log(`\nImportação finalizada! ${importadosCount} novos leads adicionados.`);
        
        await dbPool.end();
        process.exit(0);

    } catch (error) {
        console.error("Erro ao conectar ou importar:", error);
        process.exit(1);
    }
}

importarLeads();