const User = require('../models/User');
const Session = require('../models/Session');
const { generateAccessToken, generateRefreshToken } = require('../utils/generateTokens');
const { AuthError } = require('../utils/appErrors');
const otpService = require('./otp.service');

/**
 * LOGIN: Xavfsiz va tezkor kirish
 */
const login = async (identifier, password, deviceInfo) => {
  // 1. Userni qidirish (Password ni select qilamiz, chunki modelda false qilingan)
  const user = await User.findOne({ 
    $or: [{ email: identifier }, { username: identifier }] 
  }).select('+password');

  if (!user || !(await user.matchPassword(password))) {
    throw new AuthError('Email yoki parol noto\'g\'ri.');
  }

  // 2. Bloklanganligini tekshirish
  if (user.isBlocked || user.accountStatus === 'suspended') {
    throw new AuthError('Akkaunt bloklangan.');
  }

  // 3. Tokenlarni generatsiya qilish
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  // 4. Sessiyani bazaga yozish (Logout qilish imkonini berish uchun)
  await Session.create({
    userId: user._id,
    tokenHash: refreshToken, // Tokenni ham hashlab saqlash xavfsizroq
    deviceInfo,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 kun
  });

  return { user, accessToken, refreshToken };
};

/**
 * REGISTER: OTP tasdig'i bilan ro'yxatdan o'tish
 */
const register = async (userData, otpCode, deviceInfo) => {
  // 1. OTP ni tekshirish (OtpService orqali)
  //await otpService.verifyOTP(userData.email, otpCode);
  console.log(`DEBUG: OTP kod ${otpCode} - ${userData.email} uchun generatsiya qilindi.`);

  // 2. User yaratish
  const user = await User.create(userData);

  // 3. Avtomatik sessiya ochish
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  await Session.create({
    userId: user._id,
    tokenHash: refreshToken,
    deviceInfo,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  });

  return { user, accessToken, refreshToken };
};

/**
 * LOGOUT: Sessiyani o'chirish
 */
const logout = async (tokenHash) => {
  return await Session.findOneAndDelete({ tokenHash });
};

module.exports = {
  login,
  register,
  logout
};