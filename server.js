require('./config/db');
const app = require('express')();
const port = 2000;
const UserRouter = require('./api/User'); 
const bodyParser = require('express').json;
const cors = require('cors');

app.use(cors({
    origin: "https://pisciumweb.web.app",
}))

app.use(bodyParser());

app.use('/user', UserRouter)
app.listen(port, () => {
    console.log(`Server is running on ${port}`)
})