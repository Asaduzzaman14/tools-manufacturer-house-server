const express = require('express');
const cors = require('cors');
var jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()

const app = express()

const port = process.env.PORT || 5000;

app.use(cors())
app.use(express())

const uri = `mongodb+srv://${process.env.DB_PARTS}:${process.env.DB_PASS}@cluster0.8cczehf.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });


function verifyJWT(req, res, next) {
    const authHeader = req.header.authorization;
    if (!authHeader) {
        return express.status(401).send({ meassge: 'UnAutorize Access' })
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET_KEY, function (err, decoded) {
        // console.log(err);
        if (err) {
            return res.status(403).send({ message: 'Forbidden access' })
        }
        req.decoded = decoded;
        next();
    })

}


async function run() {
    // equire('crypto').randomBytes(64).toString('hex')
    await client.connect()
    const toolsCollaction = client.db('manufacturer-parts').collection('parts')





    app.get('/parts', async (req, res) => {
        const tools = await toolsCollaction.find().toArray()
        res.send(tools)
    })


    app.get('/tool/:id', async (req, res) => {
        const id = req.params.id
        console.log(id);
        const query = { _id: ObjectId(id) }
        const tool = await toolsCollaction.findOne(query)
        res.send(tool)
    })






    app.put('/user/:email', async (req, res) => {
        const email = req.params.email;
        const user = req.body;
        const filter = { email: email };
        const options = { upsert: true };
        const updateDoc = {
            $set: user,
        };

        const result = await userCollection.updateOne(filter, updateDoc, options);
        const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1d' })
        res.send({ result, token });

    })









}



run().catch(console.dir())



app.get('/', (req, res) => {
    res.send('Menufacturerr is run')
})

app.listen(port, () => {
    console.log(`Menufacturerr lisining is ${port}`);
})