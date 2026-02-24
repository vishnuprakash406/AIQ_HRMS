import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';
import { pool } from '../../db/pool.js';

const otpStore = new Map(); // In-memory placeholder; replace with DB/Redis.
const PASSWORD_MAX_AGE_MS = 90 * 24 * 60 * 60 * 1000; // 90 days.

// Demo users; replace with DB-backed users.
const demoUser = {
  id: 'demo-user-1',
  email: 'employee@example.com',
  phone: '1234567890',
  role: 'employee',
  passwordHash: bcrypt.hashSync('Password123!', 8),
  passwordSetAt: Date.now() - 10 * 24 * 60 * 60 * 1000 // currently valid (<90d); change older to force expiry.
};

const userByUsername = new Map([
  [demoUser.email, demoUser],
  [demoUser.phone, demoUser]
]);

const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_HASH = bcrypt.hashSync('admin123', 8); // Demo only; replace with DB record.

function findUser(username) {
  if (!username) return null;
  const key = username.trim().toLowerCase();
  return userByUsername.get(key) || null;
}

async function issueOtp(username) {
  if (!username) return;
  const key = username.trim().toLowerCase();
  const otp = String(Math.floor(100000 + Math.random() * 900000));
  const hash = await bcrypt.hash(otp, 8);
  otpStore.set(key, { hash, expiresAt: Date.now() + env.otpExpirySeconds * 1000 });
  console.log(`DEBUG OTP for ${key}: ${otp}`);
}

function signTokens(user) {
  const access = jwt.sign(user, env.jwtSecret, { expiresIn: env.jwtAccessTtl });
  const refresh = jwt.sign({ sub: user.sub }, env.jwtSecret, { expiresIn: env.jwtRefreshTtl });
  return { access, refresh };
}

export async function requestOtp(req, res) {
  const { phone, username } = req.body;
  const target = username || phone;
  if (!target) return res.status(400).json({ message: 'username or phone required' });
  
  try {
    // Check if user exists in database
    const result = await pool.query(
      'SELECT id FROM users WHERE LOWER(email) = $1 OR LOWER(phone) = $1',
      [(target || '').toLowerCase()]
    );
    
    if (result.rows.length === 0) {
      return res.status(400).json({ message: 'User not found' });
    }
  } catch (err) {
    console.error('Request OTP error:', err);
    return res.status(500).json({ message: 'Error requesting OTP' });
  }
  
  await issueOtp(target);
  return res.json({ message: 'OTP sent' });
}

export async function verifyOtp(req, res) {
  try {
    const { phone, username, otp } = req.body;
    const target = (username || phone || '').trim().toLowerCase();
    const entry = otpStore.get(target);
    if (!entry || entry.expiresAt < Date.now()) {
      return res.status(400).json({ message: 'OTP expired' });
    }
    const ok = await bcrypt.compare(otp, entry.hash);
    if (!ok) return res.status(400).json({ message: 'Invalid OTP' });
    otpStore.delete(target);
    
    // Try to find user in database
    const result = await pool.query(
      'SELECT email, phone, role FROM users WHERE LOWER(email) = $1 OR LOWER(phone) = $1',
      [target]
    );
    
    let userEmail, userPhone, userRole;
    if (result.rows.length > 0) {
      const dbUser = result.rows[0];
      userEmail = dbUser.email;
      userPhone = dbUser.phone;
      userRole = dbUser.role;
    } else {
      // Fallback to in-memory user if not in database
      const inMemoryUser = findUser(target);
      userEmail = inMemoryUser?.email;
      userPhone = inMemoryUser?.phone;
      userRole = inMemoryUser?.role || 'employee';
    }
    
    const user = { sub: userEmail || userPhone || target, role: userRole || 'employee' };
    return res.json({ ...signTokens(user), user });
  } catch (err) {
    console.error('Verify OTP error:', err);
    return res.status(500).json({ message: 'Error verifying OTP' });
  }
}

export async function adminLogin(req, res) {
  const { email, password } = req.body;
  // TODO: replace with DB lookup; this is a stub admin user.
  const emailLower = (email || '').toLowerCase().trim();
  if (emailLower !== ADMIN_EMAIL.toLowerCase()) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }
  const valid = await bcrypt.compare(password, ADMIN_HASH);
  if (!valid) return res.status(401).json({ message: 'Invalid credentials' });
  const user = { sub: emailLower, role: 'admin' };
  return res.json({ ...signTokens(user), user });
}

export async function refreshToken(req, res) {
  const { refresh } = req.body;
  try {
    const payload = jwt.verify(refresh, env.jwtSecret);
    const user = { sub: payload.sub, role: payload.role || 'employee' };
    return res.json({ ...signTokens(user), user });
  } catch (err) {
    return res.status(401).json({ message: 'Invalid refresh token' });
  }
}

export async function loginPassword(req, res) {
  try {
    const { password, username } = req.body;
    const usernameRaw = (username || '').trim().toLowerCase();
    
    // Try to find user in database by email or phone
    const result = await pool.query(
      'SELECT id, email, phone, full_name, password_hash, role, company_id FROM users WHERE (LOWER(email) = $1 OR LOWER(phone) = $1)',
      [usernameRaw]
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check license if user belongs to a company
    if (user.company_id) {
      const licenseResult = await pool.query(
        `SELECT 
          is_active,
          CEIL(EXTRACT(EPOCH FROM (license_end_date - CURRENT_TIMESTAMP)) / 86400) as calculated_remaining_days
         FROM company_licenses 
         WHERE company_id = $1`,
        [user.company_id]
      );

      if (licenseResult.rows.length === 0) {
        return res.status(403).json({ message: '❌ No license found for your company' });
      }

      const license = licenseResult.rows[0];
      if (!license.is_active || license.calculated_remaining_days <= 0) {
        return res.status(403).json({ 
          message: `❌ Company license has expired. Remaining days: ${Math.max(0, license.calculated_remaining_days)}` 
        });
      }
    }
    
    const payload = { sub: user.email || user.phone, role: user.role };
    return res.json({ ...signTokens(payload), user: payload });
  } catch (err) {
    console.error('Login password error:', err);
    return res.status(500).json({ message: 'Error logging in' });
  }
}

export async function resetPasswordWithOtp(req, res) {
  try {
    const { username, otp, newPassword } = req.body;
    const usernameRaw = (username || '').trim().toLowerCase();
    const entry = otpStore.get(usernameRaw);
    if (!entry || entry.expiresAt < Date.now()) return res.status(400).json({ message: 'OTP expired' });
    const ok = await bcrypt.compare(otp, entry.hash);
    if (!ok) return res.status(400).json({ message: 'Invalid OTP' });
    otpStore.delete(usernameRaw);
    
    // Update password in database
    const passwordHash = await bcrypt.hash(newPassword, 8);
    const result = await pool.query(
      'UPDATE users SET password_hash = $1 WHERE LOWER(email) = $2 OR LOWER(phone) = $2 RETURNING email, phone, role',
      [passwordHash, usernameRaw]
    );
    
    if (result.rows.length === 0) {
      return res.status(400).json({ message: 'User not found' });
    }
    
    const user = result.rows[0];
    const payload = { sub: user.email || user.phone, role: user.role };
    return res.json({ message: 'Password reset', ...signTokens(payload), user: payload });
  } catch (err) {
    console.error('Reset password error:', err);
    return res.status(500).json({ message: 'Error resetting password' });
  }
}

export async function createEmployee(req, res) {
  try {
    const { email, phone, fullName, role = 'employee', password, designation } = req.body;
    
    if (!email && !phone) {
      return res.status(400).json({ message: 'email or phone is required' });
    }
    
    const emailLower = email ? email.toLowerCase() : null;
    const phoneLower = phone ? phone.toLowerCase() : null;
    
    const passwordHash = password ? await bcrypt.hash(password, 8) : await bcrypt.hash(Math.random().toString(36).substring(2, 15), 8);
    
    const result = await pool.query(
      'INSERT INTO users (email, phone, full_name, password_hash, role) VALUES ($1, $2, $3, $4, $5) RETURNING id, email, phone, full_name, role, created_at',
      [emailLower, phoneLower, fullName, passwordHash, role]
    );

    const employee = result.rows[0];
    if (designation) {
      await pool.query(
        'INSERT INTO employee_profiles (user_id, designation) VALUES ($1, $2) ON CONFLICT (user_id) DO UPDATE SET designation = EXCLUDED.designation, updated_at = now()',
        [employee.id, designation]
      );
    }
    
    return res.json({ message: 'Employee created', employee });
  } catch (err) {
    console.error('Create employee error:', err);
    if (err.code === '23505') {
      return res.status(400).json({ message: 'Email or phone already exists' });
    }
    return res.status(500).json({ message: 'Error creating employee' });
  }
}

export async function resetEmployeePassword(req, res) {
  try {
    const { userId, newPassword } = req.body;
    
    if (!userId || !newPassword) {
      return res.status(400).json({ message: 'userId and newPassword are required' });
    }
    
    const passwordHash = await bcrypt.hash(newPassword, 8);
    
    const result = await pool.query(
      'UPDATE users SET password_hash = $1 WHERE id = $2 RETURNING id, email, phone, full_name, role',
      [passwordHash, userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Employee not found' });
    }
    
    return res.json({ message: 'Password reset successfully', employee: result.rows[0] });
  } catch (err) {
    console.error('Reset employee password error:', err);
    return res.status(500).json({ message: 'Error resetting password' });
  }
}

export async function getAllEmployees(req, res) {
  try {
    const result = await pool.query(
      `SELECT u.id, u.email, u.phone, u.full_name, u.role, u.attendance_mode, u.created_at,
              ep.designation
       FROM users u
       LEFT JOIN employee_profiles ep ON ep.user_id = u.id
       WHERE u.role = $1
       ORDER BY u.created_at DESC`,
      ['employee']
    );
    
    return res.json({ employees: result.rows });
  } catch (err) {
    console.error('Get all employees error:', err);
    return res.status(500).json({ message: 'Error fetching employees' });
  }
}

export async function updateAttendanceMode(req, res) {
  try {
    const { userId } = req.params;
    const { attendanceMode } = req.body;
    
    // Validate attendance mode
    if (!['geofencing', 'location_tracking'].includes(attendanceMode)) {
      return res.status(400).json({ message: 'Invalid attendance mode. Must be geofencing or location_tracking' });
    }
    
    const result = await pool.query(
      'UPDATE users SET attendance_mode = $1 WHERE id = $2 RETURNING id, email, full_name, attendance_mode',
      [attendanceMode, userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Employee not found' });
    }
    
    return res.json({ message: 'Attendance mode updated successfully', employee: result.rows[0] });
  } catch (err) {
    console.error('Update attendance mode error:', err);
    return res.status(500).json({ message: 'Error updating attendance mode' });
  }
}
