import pkg from 'pg';
const { Pool } = pkg;
const pool = new Pool({
  connectionString: 'postgres://theaiq:TheAIQ!@2026@localhost:5432/hrms'
});

pool.query("SELECT id, email, role, branch_id FROM users WHERE id = 'd0e3d07f-d30a-439c-a997-94d7ce5b355e'")
  .then(res => {
    console.log(JSON.stringify(res.rows, null, 2));
    pool.end();
  })
  .catch(e => {
    console.error('Error:', e.message);
    pool.end();
  });
