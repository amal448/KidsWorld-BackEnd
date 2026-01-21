import mongoose from 'mongoose';
import Category from '../models/category';
import Product from '../models/product';
import User from '../models/user';
import bcrypt from 'bcrypt';
import 'dotenv/config';

const CATEGORIES = [
    { name: 'Toys & Games', slug: 'toys-games', description: 'Fun and engaging toys for all ages' },
    { name: 'Books', slug: 'books', description: 'Educational and entertaining books' },
    { name: 'Clothing', slug: 'clothing', description: 'Kids fashion and apparel' },
    { name: 'Electronics', slug: 'electronics', description: 'Educational tech gadgets' },
    { name: 'Sports & Outdoors', slug: 'sports-outdoors', description: 'Sports equipment and outdoor gear' },
    { name: 'Art & Craft Supplies', slug: 'art-craft-supplies', description: 'Creative supplies for kids' },
    { name: 'Puzzles & Brain Games', slug: 'puzzles-brain-games', description: 'Educational puzzles and games' },
    { name: 'School Supplies', slug: 'school-supplies', description: 'Essential school items' },
    { name: 'Bikes & Scooters', slug: 'bikes-scooters', description: 'Riding toys and vehicles' },
    { name: 'Building Blocks', slug: 'building-blocks', description: 'Construction and building sets' },
];

const PRODUCT_NAMES = [
    'LEGO Classic Set',
    'Wooden Puzzle Game',
    'Kids Backpack',
    'Drawing Art Set',
    'Bicycle Helmet',
    'Adventure Book Series',
    'Science Kit Experiment',
    'Action Figure Set',
    'Educational Flashcards',
    'Board Game Pack',
    'Roller Skates',
    'Paint by Numbers Kit',
    'Coding Robot Toy',
    'Kids Sneakers',
    'Building Block Castle',
    'Science Experiment Kit',
    'Audio Headphones',
    'Skateboard Deck',
    'Sticker Collection',
    'Telescope for Kids',
    'Scooter with Lights',
    'Math Learning Game',
    'DIY Crafting Box',
    'Sports Ball Set',
    'Reading Book Collection',
    'Bluetooth Speaker',
    'Kids Watch',
    'Model Building Kit',
    'Outdoor Tent Playset',
    'Electronic Learning Pad',
];

const COLORS = ['Red', 'Blue', 'Green', 'Yellow', 'Purple', 'Orange', 'Pink', 'Black', 'White'];

const generateProducts = (categories: any[]) => {
    const products = [];
    let productIndex = 0;

    for (let i = 0; i < 30; i++) {
        const category = categories[i % 10]; // Distribute products across categories
        const productName = PRODUCT_NAMES[productIndex % PRODUCT_NAMES.length];
        const price = Math.floor(Math.random() * (150 - 20 + 1)) + 20; // 20-150
        const colors = [COLORS[Math.floor(Math.random() * COLORS.length)], COLORS[Math.floor(Math.random() * COLORS.length)]];

        products.push({
            name: `${productName} ${i + 1}`,
            description: `High-quality ${productName.toLowerCase()} perfect for kids. Safe, durable, and fun!`,
            price,
            category: category._id,
            colors: [...new Set(colors)],
            images: [
                {
                    url: `https://res.cloudinary.com/dmmnc8hj0/image/upload/v1768933829/kids-world-shop/zahkpfriu70xdjuaszfd.jpg`,
                    public_id: `product_${i + 1}_image_1`,
                    color: colors[0],
                },
                {
                    url: `https://res.cloudinary.com/dmmnc8hj0/image/upload/v1768933829/kids-world-shop/zahkpfriu70xdjuaszfd.jpg`,
                    public_id: `product_${i + 1}_image_2`,
                    color: colors[1],
                }
            ],
           
            isFeatured: Math.random() > 0.7, // 30% are featured
            status: ['active', 'active', 'active', 'active', 'out_of_stock'][Math.floor(Math.random() * 5)],
            specifications: {
                'Material': ['Plastic', 'Wood', 'Metal', 'Fabric'][Math.floor(Math.random() * 4)],
                'Age Group': ['3-5 years', '5-8 years', '8-12 years', '12+ years'][Math.floor(Math.random() * 4)],
                'Weight': `${Math.floor(Math.random() * 2000 + 100)}g`,
                'Dimensions': `${Math.floor(Math.random() * 50 + 10)}x${Math.floor(Math.random() * 50 + 10)}x${Math.floor(Math.random() * 50 + 10)}cm`,
            },
            ratings: Math.floor(Math.random() * 5) + 1,
            numReviews: Math.floor(Math.random() * 100),
        });

        productIndex++;
    }

    return products;
};

const seedAdmin = async () => {
    try {
        const adminExists = await User.findOne({ role: 'admin' });

        if (!adminExists) {
            const hashedPassword = await bcrypt.hash('Admin@KidsWorld2026', 12);

            await User.create({
                name: 'Super Admin',
                email: 'admin@kidsworld.com',
                password: hashedPassword,
                role: 'admin',
                isVerified: true
            });
            console.log('✅ Initial Admin created successfully');
        } else {
            console.log('ℹ️ Admin already exists, skipping admin seed');
        }
    } catch (error) {
        console.error('❌ Admin seed failed:', error);
    }
};

const seedDatabase = async () => {
    try {
        const mongoUri = process.env.MONGO_URI;
        if (!mongoUri) {
            throw new Error('MONGO_URI is not defined in environment variables');
        }

        await mongoose.connect(mongoUri);
        console.log('✅ Connected to MongoDB');

        // Clear existing data
        await Category.deleteMany({});
        await Product.deleteMany({});
        console.log('✅ Cleared existing categories and products');

        // Seed categories
        const createdCategories = await Category.insertMany(CATEGORIES);
        console.log(`✅ Created ${createdCategories.length} categories`);

        // Seed products
        const products = generateProducts(createdCategories);
        const createdProducts = await Product.insertMany(products);
        console.log(`✅ Created ${createdProducts.length} products`);

        // Seed admin
        await seedAdmin();

        console.log('\n📊 Seed Summary:');
        console.log(`   - Categories: ${createdCategories.length}`);
        console.log(`   - Products: ${createdProducts.length}`);
        console.log(`   - Average products per category: ${(createdProducts.length / createdCategories.length).toFixed(1)}`);

        await mongoose.disconnect();
        console.log('✅ Database connection closed');
    } catch (error) {
        console.error('❌ Seed Error:', error);
        process.exit(1);
    }
};

seedDatabase();
