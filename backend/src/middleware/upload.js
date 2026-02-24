import fs from 'fs';
import path from 'path';
import multer from 'multer';

const uploadsRoot = path.join(process.cwd(), 'uploads');
const onboardingDir = path.join(uploadsRoot, 'onboarding');

if (!fs.existsSync(uploadsRoot)) {
  fs.mkdirSync(uploadsRoot);
}

if (!fs.existsSync(onboardingDir)) {
  fs.mkdirSync(onboardingDir);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, onboardingDir);
  },
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const unique = `${Date.now()}_${safeName}`;
    cb(null, unique);
  }
});

export const onboardingUpload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }
});
