// ----------------------------------   DEPENDENCIES  ----------------------------------------------
const express = require('express');
const app = express();
const handlebars = require('express-handlebars');
const path = require('path');
const pgp = require('pg-promise')();
const bodyParser = require('body-parser');
const session = require('express-session');
const bcrypt = require('bcryptjs'); //  To hash passwords

// -------------------------------------  APP CONFIG   ----------------------------------------------

// create `ExpressHandlebars` instance and configure the layouts and partials dir.
const hbs = handlebars.create({
  extname: 'hbs',
  layoutsDir: __dirname + '/src/views/layouts',
  partialsDir: __dirname + '/src/views/partials',
});

// Register `hbs` as our view engine using its bound `engine()` function.
app.engine('hbs', hbs.engine);
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, '/src/views'));
app.use(bodyParser.json());
// set Session
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    saveUninitialized: true,
    resave: true,
  })
);
app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);
app.use(
  '/static',
  express.static(path.resolve(__dirname, 'src/resources'))
);

// -------------------------------------  DB CONFIG AND CONNECT   ---------------------------------------
const dbConfig = {
  host: process.env.HOST,
  port: 5432,
  database: process.env.POSTGRES_DB,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
};
const db = pgp(dbConfig);

// db test
db.connect()
  .then(obj => {
    // Can check the server version here (pg-promise v10.1.0+):
    console.log('Database connection successful');
    obj.done(); // success, release the connection;
  })
  .catch(error => {
    console.log('ERROR', error.message || error);
  });

const user = {
  username: undefined,
  first_name: undefined,
  last_name: undefined,
};

// -------------------------------------  ROUTES for register.hbs   ---------------------------------------------- 
app.get('/welcome', (req, res) => {
  res.json({ status: 'success', message: 'Welcome!' });
});

app.get('/register', (req, res) => {
  const message = req.session.message || '';
  const error = req.session.error || false;
  req.session.message = '';
  req.session.error = false;
  res.render('pages/register', { message, error });
});

// Register
app.post('/register', async (req, res) => {
  console.log('Request body:', req.body);
  try {
    const { fullname, username, password } = req.body;
    console.log('Username:', fullname);
    console.log('Username:', username);
    console.log('Password:', password);
    console.log('Username:', username);
    const existingUser = await db.oneOrNone('SELECT * FROM users WHERE username = $1', [username]);
    console.log('Existing user:', existingUser);
    if (existingUser) {
      console.log('Username already taken');
      req.session.message = 'Username is already taken, please choose another one.';
      req.session.error = true;
      return  res.render('pages/register', {
        message: `Username is already taken, please choose another one.`,
      });
    }
    console.log('Attempting to insert new user into database');
    const hash = await bcrypt.hash(password, 10);
    await db.query('INSERT INTO users (fullname, username, password ) VALUES ($1, $2, $3)', [fullname, username, hash]);
    req.session.message = 'Registration successful! Please log in.';
    req.session.error = false;
    return res.render('pages/login', {
      message: `Account created`,
    });
  } catch (err) {
    console.error('Error inserting into users table:', err);
    req.session.message = 'An error occurred during registration. Please try again.';
    req.session.error = true;
    return res.redirect('/register');
  }
});

// -------------------------------------  ROUTES for login.hbs   ----------------------------------------------

app.get('/', (req, res) => {
  res.redirect('pages/home'); //this will call the /login route in the API
});

app.get('/login', (req, res) => {
  res.render('pages/login');
});

// Login submission
app.post('/login', (req, res) => {
  const username = req.body.username;
  const password = req.body.password; // Assuming the password is also sent in the request body
  const query = 'SELECT * FROM users WHERE users.username = $1 LIMIT 1';

  // Array containing the username as a parameter to safely pass to the query
  const values = [username];

  db.one(query, values)
    .then(data => {
      // Verify the password (assuming 'data.password' contains a hashed password)
      if (bcrypt.compareSync(password, data.password)) {
        const user = {
          username: data.username,
          fullname: data.fullname,
        };

        // Store the user object in the session
        req.session.user = user;
        req.session.save();

        // Redirect to the home page after successful login
        res.redirect('/home');
      } else {
        // Password does not match
        res.render('pages/login', {
          message: `Incorrect login information`,
        });
      }
    })
    .catch(err => {
      console.log(err);
      // In case no user is found or another error occurs
      res.render('pages/login', {
        message: `Incorrect login information`,
      });
    });
});

// Authentication middleware.
const auth = (req, res, next) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }
  next();
};

app.use(auth);

// -------------------------------------  ROUTES for home.hbs   ----------------------------------------------

app.get('/home', (req, res) => {
  res.render('pages/home', {
    username: req.session.user.username,
    fullname: req.session.user.fullname,
  });
});

// -------------------------------------  ROUTES for profile.hbs   ----------------------------------------------

app.get('/profile', async (req, res) => {
  // Check if the user object exists in the session and extract the username
  let username;
  if (req.session.user) {
    username = req.session.user.username;
  } else {
    console.error('Username not found in session');
    return res.status(400).send('User is not logged in');
  }

  console.log("Access profile for:", username);

  try {
    // Fetch user's goals
    const user = await db.oneOrNone('SELECT goals FROM users WHERE username = $1', [username]);
    if (!user) {
      console.error('User not found in the database');
      return res.status(404).send('User not found');
    }

    // Fetch favorite recipes
    const myFavoriteRecipe = await db.any('SELECT name FROM FavoriteRecipe WHERE username = $1', [username]);
    console.log('Fetched recipes:', myFavoriteRecipe);

    // Render the profile page with user data and recipes
    res.render('pages/profile', {
      fullname: req.session.user.fullname,
      password: req.session.user.password, // Use the password from the session if needed
      recipes: myFavoriteRecipe,
      goals: user.goals // Pass the goals to the template
    });
  } catch (err) {
    console.error('Error fetching profile data:', err);
    res.status(500).send('Internal server error');
  }
});

app.post('/update-goals', async (req, res) => {
  let username;

  if (req.session.user) {
    username = req.session.user.username;
  } else {
    console.error('Username not found in session');
    return res.status(400).send('User is not logged in');
  }

  const newGoals = req.body.goals; // Extract goals from the form submission

  try {
    // Update the goals field for the user
    await db.none('UPDATE Users SET goals = $1 WHERE username = $2', [newGoals, username]);
    console.log(`Goals updated for user: ${username}`);

    // Fetch the updated goals
    const updatedGoals = await db.one('SELECT goals FROM users WHERE username = $1', [username]);

    // Fetch the favorite recipes
    const favoriteRecipes = await db.any('SELECT * FROM FavoriteRecipe');

    // Render the profile page with updated goals and recipes
    res.render('pages/profile', {
      message: `Goals updated successfully`,
      goals: updatedGoals.goals, // Pass the updated goals to the template
      recipes: favoriteRecipes,  // Pass the favorite recipes to the template
    });
  } catch (err) {
    console.error('Error updating goals:', err);
    res.status(500).send('Internal server error');
  }
});

app.post('/profile', (req, res) => {
  const user = req.session.user; // Get the user object from the session
  const newPassword = req.body.newPassword;

  if (!user || !newPassword) {
    console.error('User is not logged in or new password is not provided');
    return res.status(400).send('User must be logged in and new password must be provided');
  }

  bcrypt.hash(newPassword, 10, (err, hashedPassword) => {
    if (err) {
      console.error('Error hashing password:', err);
      return res.status(500).send('Internal server error');
    }

    const updateQuery = 'UPDATE users SET password = $1 WHERE username = $2';

    db.none(updateQuery, [hashedPassword, user.username]) // Use the username from the user object
      .then(() => {
        console.log('Password updated successfully');
        res.render('pages/profile', {
        message: `Password updated successfully`,
      });
      })
      .catch(err => {
        console.error('Error updating password:', err);
        res.status(500).send('Internal server error');
      });
  });
});

app.post('/remove-recipe', async (req, res) => {
  const recipeName = req.body.recipeName; // Extract the recipe name from the form submission

  const deleteQuery = 'DELETE FROM FavoriteRecipe WHERE name = $1';
  const selectQuery = 'SELECT * FROM FavoriteRecipe';

  try {
    // Delete the specified recipe
    await db.none(deleteQuery, [recipeName]);

    // Query the updated list of recipes
    const recipes = await db.any(selectQuery);

    // Render the profile page with the updated list
    res.render('pages/profile', {
      message: `Recipe removed: ${recipeName}`,
      recipes: recipes, // Pass the updated list of recipes
    });
  } catch (err) {
    console.error('Error removing recipe:', err);
    res.status(500).send('Internal server error');
  }
});

// -------------------------------------  ROUTES for exercise.hbs   ----------------------------------------------

app.post('/exercises', (req, res) => {
  const taken = req.query.taken; // Indicates if exercises are "taken" or not
  const muscle_group_id = req.body.muscle_group_id; // Extract muscle group ID from request body
  const username = req.session.user.username; // Get username from session

  // Define queries
  const user_exercises = `
    SELECT e.*
    FROM Exercise e
    JOIN user_exercises ue ON e.exercise_id = ue.exercise_id
    WHERE ue.username = $1
  `;

  const exercise_not_taken = `
    SELECT * 
    FROM Exercise e
    WHERE e.muscle_group_id = $1 
    AND NOT EXISTS (
      SELECT 1 
      FROM user_exercises ue 
      WHERE ue.exercise_id = e.exercise_id AND ue.username = $2
    )
  `;

  // Determine which query to use and set appropriate parameters
  const query = taken ? user_exercises : exercise_not_taken;
  const params = taken ? [username] : [muscle_group_id, username];

  // Execute the query
  db.any(query, params)
    .then(exercises => {
      console.log(exercises); // Debugging purposes
      res.render('pages/exercises', {
        exercises
      });
    })
    .catch(err => {
      console.error(err.message); // Log the error
      res.render('pages/exercises', {
        exercises: [],
        error: true,
        message: err.message,
      });
    });
});

// Handle POST request (Add exercise)
app.post('/user_exercises', (req, res) => {
  const { exercise_id, muscle_group_id } = req.body;
  const username = req.session.user.username; // Get username from session or request body
  const taken = req.query.taken; // Indicates whether to show "taken" exercises

  // Ensure username is present (optional but recommended to handle errors)
  if (!username) {
    return res.status(400).send('Username is required');
  }

  // Queries to fetch exercises
  const user_exercises_query = `
    SELECT e.*
    FROM Exercise e
    JOIN user_exercises ue ON e.exercise_id = ue.exercise_id
    WHERE ue.username = $1
  `;

  const exercises_not_taken_query = `
    SELECT * 
    FROM Exercise e
    WHERE e.muscle_group_id = $1 
    AND NOT EXISTS (
      SELECT 1 
      FROM user_exercises ue 
      WHERE ue.exercise_id = e.exercise_id AND ue.username = $2
    )
  `;

  // Insert the exercise_id into user_exercises if not already taken
  db.oneOrNone('SELECT * FROM user_exercises WHERE exercise_id = $1 AND username = $2', [exercise_id, username])
    .then(exercise => {
      if (exercise) {
        req.session.message = 'Exercise already added';
        req.session.error = true;

        // Fetch the appropriate exercises list based on the `taken` flag
        const query = taken ? user_exercises_query : exercises_not_taken_query;
        const params = taken ? [username] : [muscle_group_id, username];

        return db.any(query, params).then(exercises => {
          return res.render('pages/exercises', {
            exercises,
            message: req.session.message,
            error: req.session.error,
          });
        });
      }

      // Insert new exercise
      db.none('INSERT INTO user_exercises (exercise_id, username) VALUES ($1, $2)', [exercise_id, username])
        .then(() => {
          req.session.message = 'Exercise successfully added';
          req.session.error = false;

          // Fetch the updated exercises list based on the `taken` flag
          const query = taken ? user_exercises_query : exercises_not_taken_query;
          const params = taken ? [username] : [muscle_group_id, username];

          return db.any(query, params).then(exercises => {
            return res.render('pages/exercises', {
              exercises,
              message: req.session.message,
              error: req.session.error,
            });
          });
        })
        .catch(err => {
          req.session.message = 'Error adding exercise: ' + err.message;
          req.session.error = true;
          return res.render('pages/exercises', {
            exercises: [],
            message: req.session.message,
            error: req.session.error,
          });
        });
    })
    .catch(err => {
      req.session.message = 'Error checking exercise: ' + err.message;
      req.session.error = true;
      return res.render('pages/exercises', {
        exercises: [],
        message: req.session.message,
        error: req.session.error,
      });
    });
});

// -------------------------------------  ROUTES for workouts.hbs   ----------------------------------------------

app.get('/workouts', (req, res) => {
  const user = req.session.user;

  if (!user || !user.username) {
    return res.status(401).render('pages/login', {
      message: 'Please log in to access your workouts.',
    });
  }

  const user_exercises = `
    SELECT e.*, mg.name AS muscle_group_name
    FROM Exercise e
    JOIN user_exercises ue ON e.exercise_id = ue.exercise_id
    JOIN MuscleGroup mg ON e.muscle_group_id = mg.muscle_group_id
    WHERE ue.username = $1
    ORDER BY e.muscle_group_id
  `;

  db.any(user_exercises, [user.username])
    .then(exercises => {
      res.render('pages/workouts', {
        exercises,
      });
    })
    .catch(err => {
      console.error(err.message);
      res.render('pages/exercises', {
        exercises: [],
        error: true,
        message: 'Failed to load workouts: ' + err.message,
      });
    });
});


app.post('/workouts', (req, res) => {
  const { exercise_id } = req.body;  // Get exercise_id from request body
  const username = req.session.user.username; // Get username from session

  // Ensure username is present
  if (!username) {
    return res.status(400).send('Username is required');
  }

  // Query to check if the exercise exists for the user
  const user_exercises_query = `
    SELECT e.*, mg.name AS muscle_group_name
    FROM Exercise e
    JOIN user_exercises ue ON e.exercise_id = ue.exercise_id
    JOIN MuscleGroup mg ON e.muscle_group_id = mg.muscle_group_id
    WHERE ue.username = $1 AND e.exercise_id = $2
  `;

  // Check if the exercise exists for the user
  db.oneOrNone(user_exercises_query, [username, exercise_id])
    .then(exercise => {
      if (!exercise) {
        return res.status(400).send('Exercise not found for this user');
      }

      // Proceed with the deletion
      db.none('DELETE FROM user_exercises WHERE exercise_id = $1 AND username = $2', [exercise_id, username])
        .then(() => {
          req.session.message = 'Exercise successfully removed';
          req.session.error = false;

          // Query to fetch updated list of exercises for the user
          const exercises_query = `
            SELECT e.*, mg.name AS muscle_group_name
            FROM Exercise e
            JOIN user_exercises ue ON e.exercise_id = ue.exercise_id
            JOIN MuscleGroup mg ON e.muscle_group_id = mg.muscle_group_id
            WHERE ue.username = $1
            ORDER BY e.muscle_group_id
          `;

          return db.any(exercises_query, [username])
            .then(exercises => {
              return res.render('pages/workouts', {
                exercises,
                message: req.session.message,
                error: req.session.error,
              });
            });
        })
        .catch(err => {
          req.session.message = 'Error removing exercise: ' + err.message;
          req.session.error = true;
          return res.render('pages/workouts', {
            exercises: [],
            message: req.session.message,
            error: req.session.error,
          });
        });
    })
    .catch(err => {
      req.session.message = 'Error checking exercise: ' + err.message;
      req.session.error = true;
      return res.render('pages/workouts', {
        exercises: [],
        message: req.session.message,
        error: req.session.error,
      });
    });
});


// -------------------------------------  ROUTES for logout.hbs   ----------------------------------------------

app.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).send('Failed to log out.');
    }
    res.render('pages/logout');  
  });
});

// -------------------------------------  ROUTES for recipes.hbs   ----------------------------------------------


const axios = require('axios');

app.get('/recipes', (req, res) => {
  const query = req.query.q || 'vegan'; // Default search term
  axios({
    url: `https://api.edamam.com/api/recipes/v2`,
    method: 'GET',
    headers: {
      'Accept-Encoding': 'application/json',
    },
    params: {
      type: 'public',
      app_id: "d3d14f62",
      app_key: process.env.RECIPE_KEY,
      q: query,
    },
  })
    .then(results => {
      // Preprocess recipes data
      const recipes = results.data.hits.map(hit => {
        const { recipe } = hit;
        return {
          label: recipe.label,
          image: recipe.image,
          url: recipe.url,
          calories: recipe.calories.toFixed(1), // Preprocess calories
          protein: recipe.totalNutrients.PROCNT
            ? recipe.totalNutrients.PROCNT.quantity.toFixed(1)
            : 'N/A', // Handle missing protein info
          proteinUnit: recipe.totalNutrients.PROCNT
            ? recipe.totalNutrients.PROCNT.unit
            : '',
        };
      });

      res.render('pages/recipes', { recipes, query });
    })
    .catch(error => {
      console.error('Error fetching recipes:', error.message);
      res.status(500).send('Error fetching recipes');
    });
});

app.post('/favorite-recipe', async (req, res) => {
  const recipeName = req.body.name;
  const username = req.session?.user?.username; // Assume username is stored in the session

  console.log('Session data at favorite-recipe:', req.session?.user);
  console.log('Inserting recipe:', { recipeName, username });

  if (!recipeName || !username) {
      return res.status(400).json({ error: 'Recipe name and user authentication are required.' });
  }

  const insertQuery = 'INSERT INTO FavoriteRecipe (name, username) VALUES ($1, $2) RETURNING recipe_id, name, username';
  const selectQuery = 'SELECT * FROM FavoriteRecipe WHERE username = $1';

  try {
      // Insert the recipe for the specific user
      const insertedRecipe = await db.one(insertQuery, [recipeName, username]);

      // Query the updated list of recipes for the user
      const recipes = await db.any(selectQuery, [username]);

      // Respond with the updated list
      res.status(201).json({ 
          message: `Recipe favorited: ${recipeName}`, 
          recipe: insertedRecipe, 
          allRecipes: recipes 
      });
  } catch (error) {
      console.error('Error favoriting recipe:', error);
      res.status(500).json({ error: 'Internal server error' });
  }
});




// -------------------------------------  START THE SERVER   ----------------------------------------------

module.exports = app.listen(3000);
console.log('Server is listening on port 3000');