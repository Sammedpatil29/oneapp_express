const express = require('express');
const Razorpay = require('razorpay');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
app.use(cors());
app.use(bodyParser.json());

const razorpay = new Razorpay({
  key_id: 'rzp_test_mumd7Md1QvW8oy',
  key_secret: 'XBW57RY49na0TOBJWiCOH41G'
});

app.post('/create-order', async (req, res) => {
  const { amount } = req.body; // amount in rupees

  const options = {
    amount: amount * 100, // convert to paise
    currency: 'INR',
    receipt: 'order_rcptid_' + new Date().getTime()
  };

  try {
    const order = await razorpay.orders.create(options);
    res.json({ orderId: order.id });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error creating order');
  }
});

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});
