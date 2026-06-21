const mongoose = require('mongoose');
const config = require('./env');

// MongoDB ulanish konfiguratsiyasi
const connectDB = async () => {
  try {
    const mongoURI = config.db.uri;

    if (!mongoURI) {
      throw new Error('MONGO_URI muhit o\'zgaruvchisi (environment variable) topilmadi!');
    }

    // Mongoose ulanish sozlamalari
    // Billion-scale uchun optimallashtirilgan parametrlar:
    const options = {
      maxPoolSize: 100,             // Bir vaqtning o'zida maksimal 100 ta ulanish (scalability)
      minPoolSize: 10,              // Har doim ochiq turadigan minimal ulanish
      serverSelectionTimeoutMS: 5000, // Agar 5 soniya ichida server topilmasa, to'xtatish (fail fast)
      socketTimeoutMS: 45000,       // Uzoq so'rovlarni 45 soniyadan keyin uzish (xavfsizlik)
      family: 4,                    // IPv4 orqali ulanishni majburiy qilish (ba'zida barqarorlik uchun)
    };

    const conn = await mongoose.connect(mongoURI, options);

    console.log(`✅ MongoDB Muvaffaqiyatli ulandi: ${conn.connection.host}`);

    // Xavfsizlik va monitoring uchun event listeners
    mongoose.connection.on('error', (err) => {
      console.error(`❌ MongoDB xatolik yuz berdi: ${err.message}`);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️ MongoDB ulanishi uzildi. Qayta ulanishga urinilmoqda...');
    });

  } catch (error) {
    console.error(`🔥 MongoDB ulanishda kritik xatolik: ${error.message}`);
    process.exit(1); // Ulanish bo'lmasa, ilovani to'xtatish (crash for restart)
  }
};

// Graceful Shutdown (Dastur o'chayotganda ulanishni toza yopish)
process.on('SIGINT', async () => {
  await mongoose.connection.close();
  console.log('🛑 MongoDB ulanishi dastur to\'xtatilgani sababli yopildi.');
  process.exit(0);
});

module.exports = connectDB;