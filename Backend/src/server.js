import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import { db, users, complaints } from './db.js';
import { eq } from 'drizzle-orm';
import { authMiddleware, adminMiddleware } from './middleware/auth.js';
import { generateOtp, sendOtpEmail } from './services/email.js';
import { generateAiQuestion } from './services/ai.js';

const app = express();
const PORT = Number(process.env.BACKEND_PORT || 3000);
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://127.0.0.1:5500';
const JWT_SECRET = process.env.JWT_SECRET || 'change-me';
const COOKIE_NAME = 'session';

app.use(
  cors({
    origin: FRONTEND_ORIGIN,
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

app.get('/', (req, res) => {
  res.send('Complaint Registration backend is running. Use /api/auth, /api/ai/question, /api/complaints or /api/admin/complaints.');
});

function createSessionToken(user) {
  return jwt.sign(
    {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function sendAuthCookie(res, token) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: false,
    secure: false,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

app.post('/api/auth/send-otp', async (req, res) => {
  const { name, email } = req.body;
  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email are required' });
  }

  try {
    const otp = generateOtp();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

    const existingUser = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (existingUser.length > 0 && existingUser[0].is_verified) {
      return res.status(400).json({ error: 'Email is already registered' });
    }

    if (existingUser.length > 0) {
      await db
        .update(users)
        .set({ name, otp, otp_expiry: otpExpiry, is_verified: false })
        .where(eq(users.email, email));
    } else {
      await db.insert(users).values({ name, email, password: '', role: 'user', otp, otp_expiry: otpExpiry, is_verified: false });
    }

    await sendOtpEmail(email, name, otp);
    return res.json({ message: 'OTP sent to your email' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Unable to send OTP email' });
  }
});

app.post('/api/auth/register', async (req, res) => {
  const { email, otp, password } = req.body;
  if (!email || !otp || !password) {
    return res.status(400).json({ error: 'Email, OTP, and password are required' });
  }

  try {
    const usersFound = await db.select().from(users).where(eq(users.email, email)).limit(1);
    const user = usersFound[0];
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    if (user.is_verified) {
      return res.status(400).json({ error: 'User already verified' });
    }
    if (String(user.otp) !== String(otp)) {
      return res.status(400).json({ error: 'OTP is invalid' });
    }
    if (!user.otp_expiry || new Date(user.otp_expiry) < new Date()) {
      return res.status(400).json({ error: 'OTP has expired' });
    }

    await db
      .update(users)
      .set({ password, is_verified: true, otp: null, otp_expiry: null })
      .where(eq(users.email, email));

    return res.json({ message: 'Registration complete' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const usersFound = await db.select().from(users).where(eq(users.email, email)).limit(1);
    const user = usersFound[0];
    if (!user || !user.is_verified || user.password !== password) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = createSessionToken(user);
    sendAuthCookie(res, token);

    return res.json({ name: user.name, email: user.email, role: user.role });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Login failed' });
  }
});

app.post('/api/auth/logout', (req, res) => {
  res.clearCookie(COOKIE_NAME, { httpOnly: false, secure: false, sameSite: 'lax' });
  return res.json({ message: 'Logged out' });
});

app.get('/api/auth/me', authMiddleware, (req, res) => {
  return res.json({ name: req.user.name, email: req.user.email, role: req.user.role });
});

app.post('/api/ai/question', authMiddleware, async (req, res) => {
  const { complaint_text } = req.body;
  if (!complaint_text) {
    return res.status(400).json({ error: 'Complaint text is required' });
  }

  try {
    const question = await generateAiQuestion(complaint_text);
    return res.json({ ai_question: question });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to generate AI question' });
  }
});

app.post('/api/complaints', authMiddleware, async (req, res) => {
  const { complaint_text, ai_question, ai_answer } = req.body;
  if (!complaint_text || !ai_question || !ai_answer) {
    return res.status(400).json({ error: 'Complaint text, AI question and answer are required' });
  }

  try {
    const [created] = await db
      .insert(complaints)
      .values({ user_id: req.user.id, complaint_text, ai_question, user_answer: ai_answer })
      .returning();

    return res.json(created);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Unable to save complaint' });
  }
});

app.get('/api/complaints/my', authMiddleware, async (req, res) => {
  try {
    const rows = await db
      .select()
      .from(complaints)
      .where(eq(complaints.user_id, req.user.id))
      .orderBy(complaints.created_at.desc);

    return res.json(rows);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Unable to fetch complaints' });
  }
});

app.get('/api/admin/complaints', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const rows = await db
      .select({
        id: complaints.id,
        complaint_text: complaints.complaint_text,
        ai_question: complaints.ai_question,
        user_answer: complaints.user_answer,
        created_at: complaints.created_at,
        user_name: users.name,
        user_email: users.email,
      })
      .from(complaints)
      .leftJoin(users, eq(complaints.user_id, users.id))
      .orderBy(complaints.created_at.desc);

    return res.json(rows);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Unable to load admin complaints' });
  }
});

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
