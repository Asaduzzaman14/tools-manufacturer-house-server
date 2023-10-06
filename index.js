require('dotenv').config();
const express = require('express');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
const port = process.env.PORT || 5000;
const cors = require('cors');

var jwt = require('jsonwebtoken');

app.use(cors());
app.use(express.json());


const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);


const uri = `mongodb+srv://${process.env.DB_PARTS}:${process.env.DB_PASS}@cluster0.8cczehf.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverApi: ServerApiVersion.v1
});


function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send({ meassge: 'unAutorize Access' });
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET_KEY, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: 'Forbidden access' });
        }
        req.decoded = decoded;
        next();
    });

}

const run = async () => {
    try {

        await client.connect();
        const toolsCollection = client.db('manufacturer-parts').collection('parts');
        const usersCollection = client.db('manufacturer-parts').collection('users');
        const reviewCollection = client.db('manufacturer-parts').collection('reviews');
        const orderCollection = client.db('manufacturer-parts').collection('orders');
        const userInfoCollection = client.db('manufacturer-parts').collection('Information');
        const paymentsCollection = client.db('manufacturer-parts').collection('payments');
        app.get('/parts', async (req, res) => {
            const tools = await toolsCollection.find({}).toArray();
            res.send(tools);
        });

        app.post('/create-payment-intent', verifyJWT, async (req, res) => {
            const body = req.body;
            const price = body.totalPrice;
            const amount = price * 100;
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: 'usd',
                payment_method_types: ['card']
            });
            res.send({ clientSecret: paymentIntent.client_secret });
        });


        app.delete('/deleteTols/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const result = await toolsCollection.deleteOne(filter);
            res.send(result);
        });

        app.post('/tool', async (req, res) => {
            const tool = req.body;
            const result = await toolsCollection.insertOne(tool);
            res.send(result);

        });

        app.patch('/tool/:id', verifyJWT, async (req, res) => {

            const id = req.params.id;
            const payment = req.body;
            console.log('payment', payment);
            const filter = { _id: ObjectId(id) };
            const updatedDoc = {
                $set: {
                    paid: true,
                    transectionId: payment.transectionId,
                }
            };

            const result = await paymentsCollection.insertOne(payment);
            const updateOrder = await orderCollection.updateOne(filter, updatedDoc);
            res.send(updatedDoc);
        });


        // order tool
        app.post('/order', async (req, res) => {
            const tools = req.body;
            const result = await orderCollection.insertOne(tools);
            res.send(result);
        });

        app.get('/payorder/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const tool = await orderCollection.findOne(query);
            res.send(tool);
        });



        // get my orders 
        app.get('/orders', verifyJWT, async (req, res) => {
            const email = req.query.email;
            // console.log(email);
            const decodedEmail = req.decoded.email;
            if (email === decodedEmail) {
                const myOrders = await orderCollection.find({ email }).toArray();
                res.send(myOrders);
            }
            else {
                return res.status(403).send({ message: "Forbidden access" });
            }
        });


        //  get all orders 
        app.get('/manageOrders', verifyJWT, async (req, res) => {
            const orders = await orderCollection.find().toArray();
            res.send(orders);
        });




        app.patch('/tool/:id', async (req, res) => {
            const id = req.params.id;
            const newQuantity = req.body;
            // console.log(newQuantity);
            const filter = { _id: ObjectId(id) };
            const options = { upsert: true };
            const updateDoc = {
                $set: { availableQuantity: newQuantity.availableQuantity }

            };
            const result = await toolsCollection.updateOne(filter, updateDoc, options);
            res.send(result);
        });


        // get single tool by id 
        app.get('/tool/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const tool = await toolsCollection.findOne(query);
            res.send(tool);
        });

        // post user review
        app.post('/review', async (req, res) => {
            const review = req.body;
            const result = await reviewCollection.insertOne(review);
            res.send(result);
        });

        // get all review
        app.get('/review', async (req, res) => {
            const reviews = await reviewCollection.find().toArray();
            res.send(reviews);
        });

        // post user 

        app.put('/user/:email', async (req, res) => {
            const email = req.params.email;
            const user = req.body;
            const filter = { email: email };
            const options = { upsert: true };
            const updateDoc = {
                $set: user,
            };
            const result = await usersCollection.updateOne(filter, updateDoc, options);
            const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET_KEY, { expiresIn: '1d' });
            res.send({ result, token });
        });

        // get all user
        app.get('/user', async (req, res) => {
            const users = await usersCollection.find().toArray();
            res.send(users);
        });

        //
        app.get('/admin/:email', async (req, res) => {

            const email = req.params.email;
            const user = await usersCollection.findOne({ email: email });
            const isAdmin = user.role === "admin";
            // console.log(isAdmin);
            res.send({ admin: isAdmin });

        });

        //  make admin
        app.put('/user/admin/:email', async (req, res) => {
            const email = req.params.email;
            const filter = { email: email };
            const updateDoc = {
                $set: { role: 'admin' },
            };
            const result = await usersCollection.updateOne(filter, updateDoc);
            res.send(result);
        });
        app.delete('/deleteOrder/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const result = await orderCollection.deleteOne(filter);
            res.send(result);
        });

        //save user data 

        app.post('/userinfo', async (req, res) => {
            const userInfo = req.body;
            const query = { email: userInfo.email };
            const users = await userInfoCollection.findOne(query);
            if (!users) {
                const result = await userInfoCollection.insertOne(userInfo);
                return res.send({ success: true, info: result });
            }
            else {
                return;
            }

        });

        app.patch('/userinfo/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;
            // console.log(email);
            const user = req.body;
            const filter = { email: email };
            const options = { upsert: true };
            const updateDoc = {
                $set: user,
            };
            const result = await userInfoCollection.updateOne(filter, updateDoc, options);
            res.send(updateDoc);
        });


        app.get('/profilrdetail/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email: email };
            const users = await userInfoCollection.find(query).toArray();
            res.send(users);
        });
    } finally {
    }
};

run().catch((err) => console.log(err));
console.log('hello');

app.get('/', (req, res) => {
    res.send('Menufacturerr is runing');
});

app.listen(port, () => {
    console.log(`Menufacturerr lisining is ${port}`);
});