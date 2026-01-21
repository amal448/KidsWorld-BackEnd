import 'dotenv/config'
import app from './app'
import { connectDB } from './config/DbConnect'

const PORT =process.env.PORT 

const startServer =async()=>{
    await connectDB();

    app.listen(PORT,()=>{
        console.log(`Server running on port ${PORT}`);
        
    })
}
startServer();