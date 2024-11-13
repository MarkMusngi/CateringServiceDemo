const path = require('path');
const express = require('express');
const session = require('express-session');
const exphbs = require('express-handlebars');
const bodyParser = require('body-parser');
const { connectToDatabase } = require('./routes/db');

const app = express();
const port = 3000;

// Session Management
app.use(session({
  secret: 'CSSWENG-DEFLORENCE', // Replace with a random string for production
  resave: false,
  saveUninitialized: false
}));

// Set the directory for static assets (e.g., CSS, JavaScript)
app.use(express.static(path.join(__dirname, 'public')));

// Set the directory for views (containing hbs templates)
app.set('views', path.join(__dirname, 'views'));

// Configure Handlebars
const hbs = exphbs.create({
  extname: '.hbs',
  defaultLayout: 'main',
  layoutsDir: path.join(__dirname, 'views', 'layouts'),
  helpers: {
    eq: function (v1, v2) {
      return v1 === v2;
    }
  }
});

app.engine('hbs', hbs.engine);
app.set('view engine', 'hbs');

// Middleware to parse form data
app.use(bodyParser.urlencoded({ extended: true }));

// Include the routes from separate files
const indexRoutes = require('./routes/index');
const adminRoutes = require('./routes/admin');

// Mount the routes on the app
app.use('/', indexRoutes);
app.use('/', adminRoutes);

connectToDatabase().then(() => {
  app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });
}).catch(error => {
  console.error('Failed to connect to database', error);
  process.exit(1);
});

