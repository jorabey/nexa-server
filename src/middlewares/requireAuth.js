const jwt = require('jsonwebtoken');
const { AuthError } = require('../utils/appErrors');
const User = require('../models/User');
const config = require('../config/env');

const requireAuth = async (req, res, next) => {
  try {
    // 1. Tokenni olish
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AuthError('Autentifikatsiya uchun token talab qilinadi.');
    }

    const token = authHeader.split(' ')[1];

    // 2. Tokenni dekodlash va tekshirish
    // Agar token muddati o'tgan bo'lsa yoki noto'g'ri bo'lsa, jwt.verify xato beradi
    const decoded = jwt.verify(token, config.jwt.accessSecret);

    // 3. Bazadan foydalanuvchini topish (TEZLIK UCHUN lean() ishlatamiz)
    // Parol va keraksiz ma'lumotlarni o'qimaymiz
    const user = await User.findById(decoded.id)
      .select('-password')
      .lean();

    if (!user) {
      throw new AuthError('Foydalanuvchi topilmadi.');
    }

    // 4. XAVFSIZLIK: Bloklanganligini tekshirish
    if (user.isBlocked) {
      throw new AuthError('Ushbu akkaunt vaqtinchalik bloklangan.');
    }

    // 5. User ni request obyektiga biriktirish (Keyingi controllerlar foydalanishi uchun)
    req.user = user;
    next();
    
  } catch (err) {
    // Agar JWT muddati o'tgan bo'lsa, aniq xabar qaytarish
    if (err.name === 'TokenExpiredError') {
      return next(new AuthError('Token muddati o\'tgan. Iltimos, qayta login qiling.'));
    }
    // Boshqa barcha xatoliklar (noto'g'ri token va h.k.)
    return next(new AuthError('Autentifikatsiya muvaffaqiyatsiz tugadi.'));
  }
};

module.exports = requireAuth;