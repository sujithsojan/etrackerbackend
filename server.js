const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const app = express();

dotenv.config();

app.use(cors());
app.use(bodyParser.json());


mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', () => {
  console.log('Connected to MongoDB');
});

// Expense Schema
const expenseSchema = new mongoose.Schema({
  userId: String,
  date: String,
  category: String,
  description: String,
  amount: Number,
});

// User Schema with email and password
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true }
});

// Expense and User Models
const Expense = mongoose.model('Expense', expenseSchema);
const User = mongoose.model('User', userSchema);

// Register New User
app.post('/users', (req, res) => {
  const { email, password } = req.body;

  // Check if the user already exists
  User.findOne({ email: email })
    .then((existingUser) => {
      if (existingUser) {
        return res.status(400).json({ message: 'User already exists' });
      }

      // Hash the password before saving the user
      bcrypt.hash(password, 10, (err, hashedPassword) => {
        if (err) {
          return res.status(500).json({ message: 'Error hashing password' });
        }

        const newUser = new User({
          email: email,
          password: hashedPassword,
        });

        newUser.save()
          .then((savedUser) => {
            return res.status(201).json(savedUser); // User created successfully
          })
          .catch((err) => {
            console.log(err);
            return res.status(500).json({ message: 'Error saving user' });
          });
      });
    })
    .catch((err) => {
      console.log(err);
      return res.status(500).json({ message: 'Server error' });
    });
});

app.post('/auth/login', (req, res) => {
  const { email, password } = req.body;

  // Find the user by email
  User.findOne({ email: email })
    .then((user) => {
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Compare the provided password with the stored hashed password
      bcrypt.compare(password, user.password, (err, isMatch) => {
        if (err) {
          return res.status(500).json({ message: 'Error comparing passwords' });
        }

        if (!isMatch) {
          return res.status(401).json({ message: 'Incorrect password' });
        }

        // // Generate a JWT token
        // const token = jwt.sign(
        //   { userId: user._id, email: user.email },
        //   'your_jwt_secret_key', // Replace with a secure secret key
        //   { expiresIn: '1h' }
        // );

        const token = jwt.sign(
          { userId: user._id, email: user.email },
          'jwt_token', 
          { expiresIn: '1h' }
        );

        // Return the token and userId
        return res.status(200).json({
          message: 'Login successful',
          token,
          userId: user._id, // Include the userId in the response
        });
      });
    })
    .catch((err) => {
      console.log(err);
      return res.status(500).json({ message: 'Server error' });
    });
});


// Expense Routes
app.post('/expenses', (req, res) => {
  const expense = new Expense(req.body);
  expense.save()
    .then((newExpense) => {
      return res.status(200).json(newExpense);
    })
    .catch((err) => {
      console.log(err);
      res.status(500).json({ message: 'Error saving expense' });
    });
});

app.get('/expenses', (req, res) => {
  Expense.find()
    .then((expenses) => {
      return res.status(200).json(expenses);
    })
    .catch((err) => {
      console.log(err);
      res.status(500).json({ message: 'Error fetching expenses' });
    });
});

// Server
// app.listen(3000, () => {
//   console.log('Server running on port 3000');
// });
const port = process.env.PORT; 
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});