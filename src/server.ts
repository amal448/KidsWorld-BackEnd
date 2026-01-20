import 'dotenv/config'
import app from './app.ts'
import { connectDB } from './config/DbConnect.ts'

const PORT =process.env.PORT 

const startServer =async()=>{
    await connectDB();

    app.listen(PORT,()=>{
        console.log(`Server running on port ${PORT}`);
        
    })
}
startServer();