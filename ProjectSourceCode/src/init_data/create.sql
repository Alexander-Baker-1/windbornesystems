DROP TABLE IF EXISTS users;
CREATE TABLE users (
  username VARCHAR(255) PRIMARY KEY,
  password VARCHAR(255) NOT NULL,
  fullname VARCHAR(255) NOT NULL,
  goals VARCHAR(700)
);

DROP TABLE IF EXISTS MuscleGroup;
CREATE TABLE MuscleGroup (
    muscle_group_id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL
);

DROP TABLE IF EXISTS Exercise;
CREATE TABLE Exercise (
    exercise_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    difficulty_level VARCHAR(20),  -- E.g., beginner, intermediate, advanced
    type VARCHAR(10) CHECK (type IN ('Push', 'Pull', 'Other')),  -- Push or Pull classification
    muscle_group_id INT,
    FOREIGN KEY (muscle_group_id) REFERENCES MuscleGroup(muscle_group_id)
);

DROP TABLE IF EXISTS user_exercises;
CREATE TABLE user_exercises (
  exercise_id INTEGER NOT NULL REFERENCES Exercise (exercise_id),
  username VARCHAR(255) NOT NULL REFERENCES users (username),
  PRIMARY KEY (exercise_id, username) -- ensures unique user-exercise combinations
);

DROP TABLE IF EXISTS FavoriteRecipe;
CREATE TABLE FavoriteRecipe (
    recipe_id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    username VARCHAR(255) NOT NULL REFERENCES users(username)
);


