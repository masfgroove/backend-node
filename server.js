const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
require('dotenv').config();

const app = express();

// Configurações
app.use(cors());
app.use(express.json());

// Conexão com o Banco de Dados MySQL
const dbPool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'silvi334_DB01',
    port: process.env.DB_PORT || 3306
});

// Teste de conexão ao iniciar
dbPool.getConnection()
    .then(connection => {
        console.log("Conectado ao banco de dados silvi334_DB01 com sucesso!");
        connection.release();
    })
    .catch(err => {
        console.error("Erro ao conectar no banco:", err.message);
    });

// Rota de teste
app.get('/', (req, res) => {
    res.send('API Node.js da ASG Logística rodando perfeitamente!');
});

// 1. Rota de Login (Compatível com password ou senhaHash)
app.post('/api/auth/login', async (req, res) => {
    const { email, password, senhaHash } = req.body;
    
    // Aceita tanto 'password' quanto 'senhaHash' vindo do front-end
    const senhaUtilizada = password || senhaHash;

    try {
        const [usuarios] = await dbPool.query(
            'SELECT * FROM usuarios_admin WHERE email = ? AND senha_hash = ?', 
            [email, senhaUtilizada]
        );

        if (usuarios.length > 0) {
            res.json({ success: true, message: 'Login aprovado!', user: usuarios[0] });
        } else {
            res.status(401).json({ success: false, message: 'E-mail ou senha incorretos.' });
        }
    } catch (error) {
        console.error("Erro no login:", error);
        res.status(500).json({ success: false, message: 'Erro interno no servidor' });
    }
});

// 3. Rota de Leads / Cotação Expressa
// Rota de Leads / Cotação Expressa com Envio de E-mail para Teste
app.post('/api/leads', async (req, res) => {
    const { nome, email, telefone, empresa, servico } = req.body;

    try {
        // 1. Salva no Banco de Dados MySQL Externo
        await dbPool.query(
            'INSERT INTO leads (nome, email, telefone, empresa, servico) VALUES (?, ?, ?, ?, ?)', 
            [nome, email, telefone, empresa, servico]
        );

        // 2. Configura o Transporter do Nodemailer para o Gmail
        const transporter = nodemailer.createTransport({
            host: process.env.MAIL_HOST,
            port: process.env.MAIL_PORT,
            secure: true, // true para porta 465
            auth: {
                user: process.env.MAIL_USER,
                pass: process.env.MAIL_PASS
            }
        });

        // 3. Configura o conteúdo do e-mail de teste
        const mailOptions = {
            from: `"Site ASC Logística (Teste)" <${process.env.MAIL_USER}>`,
            to: 'masfgroove369@gmail.com', // Você recebe a cotação no seu próprio e-mail para validar
            subject: `[TESTE] Nova Cotação Expressa: ${servico} - ${empresa || nome}`,
            html: `
                <div style="font-family: Arial, sans-serif; color: #333; padding: 20px; background-color: #f8fafc; border-radius: 10px;">
                    <h2 style="color: #ea580c;">Nova Cotação Recebida (Ambiente de Teste)</h2>
                    <p>Detalhes do cliente e da solicitação:</p>
                    <ul style="list-style: none; padding: 0;">
                        <li style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;"><strong>Nome:</strong> ${nome}</li>
                        <li style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;"><strong>E-mail do Cliente:</strong> ${email}</li>
                        <li style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;"><strong>Telefone/WhatsApp:</strong> ${telefone}</li>
                        <li style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;"><strong>Empresa:</strong> ${empresa || 'Não informada'}</li>
                        <li style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;"><strong>Serviço/Modal:</strong> ${servico}</li>
                    </ul>
                    <p style="margin-top: 20px; font-size: 12px; color: #64748b;">Dados salvos com sucesso no banco MySQL externo (silvi334_DB01).</p>
                </div>
            `
        };

        // Dispara o e-mail
        await transporter.sendMail(mailOptions);

        res.json({ success: true, message: 'Cotação registrada no banco e e-mail de teste enviado com sucesso!' });
    } catch (error) {
        console.error("Erro ao salvar lead / enviar e-mail:", error);
        res.status(500).json({ success: false, message: 'Erro interno ao processar cotação' });
    }
});

// 2. Rota de Cadastro corrigida com data e role
app.post('/api/auth/cadastro', async (req, res) => {
    const { email, senha, senhaHash, role } = req.body;
    const senhaFinal = senha || senhaHash;
    const cargoFinal = role || 2; // Define 2 como padrão se não vier nada

    try {
        const [existente] = await dbPool.query(
            'SELECT * FROM usuarios_admin WHERE email = ?', 
            [email]
        );

        if (existente.length > 0) {
            return res.status(400).json({ success: false, message: 'Este e-mail já está cadastrado.' });
        }

        // Incluindo role e data_criacao (NOW()) na inserção
        await dbPool.query(
            'INSERT INTO usuarios_admin (email, senha_hash, role, data_criacao) VALUES (?, ?, ?, NOW())', 
            [email, senhaFinal, cargoFinal]
        );

        res.json({ success: true, message: 'Usuário cadastrado com sucesso!' });
    } catch (error) {
        console.error("Erro no cadastro:", error);
        res.status(500).json({ success: false, message: 'Erro interno ao cadastrar usuário' });
    }
});

// 4. Rota para listar todos os leads (Necessária para a Tabela do Admin)
app.get('/api/leads', async (req, res) => {
    try {
        const [leads] = await dbPool.query('SELECT * FROM leads ORDER BY id DESC');
        res.json(leads);
    } catch (error) {
        console.error("Erro ao buscar leads:", error);
        res.status(500).json({ success: false, message: 'Erro interno ao buscar leads' });
    }
});




// Iniciar o servidor
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`Servidor Node.js rodando na porta ${PORT}`);
});