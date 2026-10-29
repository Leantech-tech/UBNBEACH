const fs = require('fs');
const { Client } = require('pg');

for (const raw of fs.readFileSync('server/.env', 'utf8').split(/\r?\n/)) {
  const line = raw.trim();
  if (!line || line.startsWith('#')) continue;
  const equal = line.indexOf('=');
  if (equal < 1) continue;
  const key = line.slice(0, equal).trim();
  let value = line.slice(equal + 1).trim();
  if ((value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
  if (process.env[key] === undefined) process.env[key] = value;
}

async function main() {
  const client = new Client({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    connectionTimeoutMillis: 7000,
    query_timeout: 10000,
  });
  try {
    await client.connect();
    const { rows } = await client.query(`
      SELECT table_name, string_agg(column_name, ', ' ORDER BY ordinal_position) AS columns
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name ~* '(reserva|imove|pacote|tarifa|preco|periodo|calendario|sazonal|temporada|foto|imagem)'
      GROUP BY table_name
      ORDER BY table_name
    `);
    for (const row of rows) console.log(`${row.table_name}: ${row.columns}`);
    const packages = await client.query(`
      SELECT i.titulo AS imovel, p.nome AS pacote, p.data_inicio, p.data_fim, p.valor_pacote
      FROM imovel_pacotes p JOIN imoveis i ON i.id = p.imovel_id
      WHERE p.data_fim >= CURRENT_DATE
      ORDER BY p.data_inicio, i.titulo LIMIT 30
    `);
    console.log('Pacotes futuros:', JSON.stringify(packages.rows));
    const captions = await client.query(`
      SELECT COALESCE(NULLIF(trim(legenda), ''), '(sem legenda)') AS legenda, count(*) AS quantidade
      FROM imovel_midias WHERE tipo = 'FOTO'
      GROUP BY 1 ORDER BY count(*) DESC LIMIT 20
    `);
    console.log('Legendas de fotos:', JSON.stringify(captions.rows));
    const christmasBookings = await client.query(`
      SELECT i.titulo AS imovel, r.entrada::date, r.saida::date,
             r.valor_diaria, r.taxa_limpeza, r.valor_total, r.status, r.origem
      FROM reservas r JOIN imoveis i ON i.id = r.imovel_id
      WHERE i.titulo ILIKE '%Carvalho%'
        AND r.entrada < DATE '2026-12-28'
        AND r.saida > DATE '2026-12-20'
      ORDER BY r.criado_em DESC LIMIT 10
    `);
    console.log('Reservas Natal sem dados de cliente:', JSON.stringify(christmasBookings.rows));
    const types = await client.query(`
      SELECT table_name, column_name, data_type
      FROM information_schema.columns
      WHERE table_schema='public'
        AND ((table_name='imovel_pacotes' AND column_name IN ('data_inicio','data_fim','valor_pacote'))
          OR (table_name='imoveis' AND column_name IN ('latitude','longitude','ocultar_endereco')))
      ORDER BY table_name, column_name
    `);
    console.log('Tipos relevantes:', JSON.stringify(types.rows));
  } finally {
    await client.end();
  }
}

main().catch(error => { console.error(error.message); process.exitCode = 1; });
