import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import passport from 'passport';
import './config/passport'; // Strategy initialization

// Route Imports
import authroute from './routes/authRoutes';
import categoryroute from './routes/categoryRoutes';
import productroute from './routes/productRoutes';
import orderroute from './routes/orderRoutes';
import paymentroute from './routes/paymentRoutes';
import userroute from './routes/userRoutes';

const app = express();

// 1. GLOBAL SECURITY & CORS
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  })
);

// 2. BODY PARSERS (Must be before routes)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// 3. AUTHENTICATION (Modern JWT approach - NO SESSIONS)
// We remove app.use(session(...)) because we are stateless
app.use(passport.initialize());

// 4. ROUTES
app.use('/api/auth', authroute);
app.use('/api/category', categoryroute);
app.use('/api/product', productroute);
app.use('/api/order', orderroute);
app.use('/api/payment', paymentroute);
app.use('/api/user', userroute);

// 5. ERROR HANDLING (Production Standard)
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || "Internal Server Error",
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
});

export default app;