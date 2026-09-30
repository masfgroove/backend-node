const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const nodemailer = require('nodemailer');
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

// Configuração do Transportador de E-mail (Nodemailer)
const transporter = nodemailer.createTransport({
    host: process.env.MAIL_HOST || 'smtp.gmail.com',
    port: process.env.MAIL_PORT || 465,
    secure: true, // true para porta 465, false para outras
    auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS
    }
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

// 3. Rota de Leads / Cotação Expressa (Com gravação no DB e Envio de E-mail)
// 3. Rota de Leads / Cotação Expressa (Com gravação no DB e Envio de E-mail)
app.post('/api/leads', async (req, res) => {
    const { nome, email, telefone, empresa, servico } = req.body;

    try {
        // 1. Grava no banco de dados MySQL na HostGator
        await dbPool.query(
            'INSERT INTO leads (nome, email, telefone, empresa, servico) VALUES (?, ?, ?, ?, ?)', 
            [nome, email, telefone, empresa, servico]
        );
        
        // 2. Prepara e envia o e-mail de notificação com await
        const mailOptions = {
            from: `"ASC Logística" <${process.env.MAIL_USER}>`,
            to: process.env.MAIL_USER,
            subject: `Nova Cotação Recebida - ${nome || 'Cliente'}`,
            html: `
                <h2>Nova Cotação / Lead Registrado</h2>
                <p><strong>Nome:</strong> ${nome || 'Não informado'}</p>
                <p><strong>E-mail:</strong> ${email || 'Não informado'}</p>
                <p><strong>Telefone:</strong> ${telefone || 'Não informado'}</p>
                <p><strong>Empresa:</strong> ${empresa || 'Não informada'}</p>
                <p><strong>Serviço:</strong> ${servico || 'Não informado'}</p>
                <br>
                <hr>
                <small>Mensagem automática enviada pelo sistema da ASC Logística.</small>
            `
        };

        try {
            const info = await transporter.sendMail(mailOptions);
            console.log("E-mail enviado com sucesso:", info.response);
        } catch (mailErr) {
            console.error("ERRO DETALHADO DO GMAIL/NODEMAILER:", mailErr.message);
        }

        res.json({ success: true, message: 'Cotação registrada e e-mail processado!' });
    } catch (error) {
        console.error("Erro ao salvar lead/cotação:", error);
        res.status(500).json({ success: false, message: 'Erro interno ao salvar cotação' });
    }
});

// 2. Rota de Cadastro corrigida com data e role
app.post('/api/auth/cadastro', async (req, res) => {
    const { email, senha, senhaHash, role } = req.body;
    const senhaFinal = senha || senhaHash;
    const cargoFinal = role || 2;

    try {
        const [existente] = await dbPool.query(
            'SELECT * FROM usuarios_admin WHERE email = ?', 
            [email]
        );

        if (existente.length > 0) {
            return res.status(400).json({ success: false, message: 'Este e-mail já está cadastrado.' });
        }

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

// 4. Rota para listar todos os leads
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