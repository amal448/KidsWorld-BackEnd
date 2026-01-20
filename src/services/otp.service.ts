import crypto from 'crypto';
import redis from '../config/redis.js';
import { sendEmail } from '../config/nodeMailer.js';

class OtpService {

  /**
   * 1️⃣ Check OTP rate limit (MAX 3 per hour)
   */
  static async checkOtpRestrictions(email: string): Promise<void> {
    const key = `otp_limit:${email}`;
    const count = await redis.get(key);

    if (count && Number(count) >= 3) {
      throw new Error('Too many OTP requests. Try again after 1 hour.');
    }
  }

  /**
   * 2️⃣ Generate + store + send OTP
   */
static async generateAndSendOtp(email: string, name: string): Promise<void> {
    const otp = crypto.randomInt(100000, 999999).toString();

    // 1. Store in Redis
    await redis.set(`otp:${email}`, otp, 'EX', 300);

    // 2. Handle Rate Limiting
    const limitKey = `otp_limit:${email}`;
    const count = await redis.incr(limitKey);
    if (count === 1) await redis.expire(limitKey, 3600);

    // 3. Trigger Email Service
    // 'otp-template' refers to your .ejs file name in your templates folder
    await sendEmail(email, "Verify Your Eshop Account", "user-activation-mail", { 
        name, 
        otp 
    });

    console.log(`OTP sent to ${email}`);
  }

  static async verifyOtp(email: string, otp: string): Promise<void> {
    const storedOtp = await redis.get(`otp:${email}`);

    if (!storedOtp) throw new Error('OTP expired. Please request a new one.');
    if (storedOtp !== otp) throw new Error('Invalid OTP code.');

    // Valid OTP? Delete it so it's one-time use
    await redis.del(`otp:${email}`);
  }
}

export default OtpService;
